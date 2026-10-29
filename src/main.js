import { loadScenario } from './scenario.js';
import { createState, saveState, loadState, clearState, DOGS } from './state.js';
import { visibleCommands, applyCommand, resolveEnding, endingSceneId } from './engine.js';
import { renderStatus, renderArt, renderDialogue, renderCommands, appendFeed, showImage } from './ui/screen.js';
import { titleArt, detectiveShiba, dogPortrait, TITLE_IMAGE } from './ui/art.js';
import { createSound } from './ui/sound.js';
import { initFirebase } from './net/firebase.js';
import { createRoom, joinRoom, watchRoom, claimBuddy, pushState, mergeRemote, generateCode } from './net/room.js';

// ---- PWA: Service Worker 登録（失敗しても遊べる） ----
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {/* 失敗しても遊べる */});
}

const DOG_LABEL = { raizo: '雷蔵', hana: 'はな', kuranosuke: '蔵之介' };
const DOG_TRAIT = { raizo: 'クンクン／鼻がきく', hana: 'ジロリ／嘘を見抜く', kuranosuke: 'へそ天／たまに狂犬' };
const ROUTE_LABEL = { junko: 'じゅんこ', taichi: 'たいち', common: '一同' };
const PARTNER_WAIT_MS = 45000;

const el = {
  game: document.getElementById('game'),
  lobby: document.getElementById('lobby'),
  lobbyBody: document.getElementById('lobby-body'),
  status: document.getElementById('status'),
  art: document.getElementById('art'),
  dialogue: document.getElementById('dialogue'),
  commandList: document.getElementById('command-list'),
  feed: document.getElementById('feed'),
};

const scenario = loadScenario(await fetch('data/scenario.json').then((r) => r.json()));

let state = null;
let route = 'junko';      // 1人プレイで現在操作している視点。2人プレイでは myRoute に固定する。
let typing = null;
const sound = createSound();

// ---- 2人プレイの接続状態 ----
let conn = null;          // null なら1人プレイ（Task14: initFirebase は失敗時に null を返す）
let roomCode = null;
let myRoute = null;       // 2人プレイで自分が操作する側。1人プレイでは null
let partnerWaitCancel = null; // 章末で相手を待つ45秒タイマーの解除関数

function currentScene() {
  return scenario.scenes.get(state.sceneId[route]);
}

function draw() {
  // Task 11 review: renderDialogue を前の呼び出しの文字送りタイマーが残ったまま
  // 呼ぶと余分な段落が出る。新しいシーンを描く前に必ず前回分をスキップさせる。
  typing?.skip();

  const scene = currentScene();
  renderStatus(el.status, {
    locationName: scene.locationName ?? '—',
    buddyLabel: scene.route === 'common' ? ROUTE_LABEL.common : DOG_LABEL[state.buddies[scene.route]],
    routeLabel: ROUTE_LABEL[scene.route],
  });
  renderArt(el.art, scene.art, { route: scene.route, buddies: state.buddies });

  const lines = [];
  if (scene.description) lines.push({ text: scene.description });
  for (const d of scene.dialogue ?? []) lines.push(d);
  const hint = scene.supportHint?.find((h) => h.dog === state.supportDog);
  if (hint) lines.push({ speaker: hint.speaker, text: hint.text });

  renderCommands(el.commandList, [], () => {});
  typing = renderDialogue(el.dialogue, lines, {
    onDone: drawCommands,
    onChar: () => {
      sound.blip();
      // スマホではセリフ欄が内側でスクロールするので、流れている行を常に見せる
      el.dialogue.scrollTop = el.dialogue.scrollHeight;
    },
  });
}

function drawCommands() {
  // 章末で相手を待つタイマーは、コマンドが引き直された時点で一旦解除する。
  // 再度「待つしかない」状態と判定された場合はこの下でまた張り直す。
  cancelPartnerWait();

  const scene = currentScene();

  if (scene.resolvesEnding) {
    // Contract: ch4_answer is a common-route scene. resolveEnding/endingSceneId
    // must land BOTH routes on the ending scene (not just the active one),
    // since after this point the player may still be on either route pointer.
    const ending = resolveEnding(state.flags);
    const endingId = endingSceneId(ending, state.flags);
    state = { ...state, ending, sceneId: { ...state.sceneId, junko: endingId, taichi: endingId } };
    saveState(state, localStorage);
    // 2人プレイ: エンディング確定を部屋にも反映する（失敗は握りつぶしてローカルで続行）。
    if (conn && roomCode) pushState(conn, roomCode, state).catch(() => {});
    return draw();
  }

  if (scene.chapterEnd) {
    const cmds = [];
    // 第1→2章・第2→3章の章送りは各ルート独立に進めてよい。
    // だが ch3→ch4 は共有(common)のフィナーレへの合流であり、片方のルートだけが
    // 先に入ってはならない。合流は pick() 内の bothChapterEnded() が両ルートの
    // 第3章末到達を検知して enterFinale() を自動発火させることで行う。
    // よって nextChapter が共有フィナーレを指す場合は「▶次の章へ」を出さず、
    // 視点切替だけを出して、もう片方のルートを終わらせに行かせる。
    if (scene.nextChapter && scene.nextChapter !== 'ch4_finale_intro') {
      cmds.push({ text: '▶次の章へ', next: scene.nextChapter, route });
    }
    cmds.push(...switchRouteCommand());
    renderCommands(el.commandList, cmds, pick);
    // 2人プレイで、自分は既に第3章末に到達しコマンドが尽きた（=視点固定で
    // 切り替えも出せない）場合、相手の追いつきを待つしかない。45秒待って
    // まだ合流していなければ「▶ひとりで結論を出す」を出す（設計書§5.5）。
    if (conn && roomCode && cmds.length === 0) {
      partnerWaitCancel = waitForPartner();
    }
    return;
  }

  if (scene.sceneId.startsWith('ch4_ending_')) {
    return renderCommands(el.commandList, [{ text: '▶最初から', restart: true }], pick);
  }

  // visibleCommands() は返す各コマンドに既に route: scene.route を刻んでいるので、
  // ここで再度 .map() で同じ値を上書きする必要はない。
  const cmds = visibleCommands(scene, state);
  renderCommands(el.commandList, [...cmds, ...switchRouteCommand()], pick);
}

/**
 * 1人プレイ専用: もう一方の視点へ切り替える。2人プレイでは自分の視点に固定され、
 * このコマンドは常に出さない（互いに相手のルートを操作できてはならない）。
 * 両ルートが同じシーンID（=第4章の合流後）に立っている間は出さない。
 * currentScene().route === 'common' だけで判定すると、片方のルートだけが
 * 先に ch4_finale_intro（common）へ進んだ瞬間に切替ボタンが消えてしまい、
 * もう片方のルート（まだ第3章の途中）に戻れなくなる（詰み）。
 * 両ルートの sceneId が実際に一致しているかどうかで判定する。
 */
function switchRouteCommand() {
  if (conn && roomCode) return [];              // 2人プレイでは自分の視点に固定
  if (state.sceneId.junko === state.sceneId.taichi) return [];
  const other = route === 'junko' ? 'taichi' : 'junko';
  return [{ text: `▶視点を${ROUTE_LABEL[other]}に切り替える`, switchTo: other }];
}

/** 章末で相手が第4章に来ない場合、45秒後に単独結論ボタンを出す。設計書§5.5。 */
function waitForPartner() {
  const timer = setTimeout(() => {
    renderCommands(el.commandList, [
      { text: '▶ひとりで結論を出す', soloFinale: true },
    ], pick);
  }, PARTNER_WAIT_MS);
  return () => clearTimeout(timer);
}

function cancelPartnerWait() {
  partnerWaitCancel?.();
  partnerWaitCancel = null;
}

function pick(cmd) {
  if (cmd.restart) {
    clearState(localStorage);
    return location.reload();
  }
  if (cmd.switchTo) {
    route = cmd.switchTo;
    return draw();
  }
  if (cmd.soloFinale) {
    cancelPartnerWait();
    return enterFinale();
  }

  const before = new Set(Object.keys(state.flags));

  if (cmd.route === 'common' && cmd.next) {
    // Contract: applyCommand THROWS if command.route === 'common' && command.next
    // (writing sceneId.common is meaningless). Apply any flags/counters/deductions
    // normally (route: 'common' with no next is fine), then advance both routes
    // to cmd.next directly ourselves instead of letting applyCommand touch sceneId.
    state = applyCommand(state, { ...cmd, next: undefined });
    state = { ...state, sceneId: { ...state.sceneId, junko: cmd.next, taichi: cmd.next } };
  } else {
    state = applyCommand(state, cmd);
  }
  syncChapters();
  saveState(state, localStorage);

  for (const f of Object.keys(state.flags)) {
    if (!before.has(f) && scenario.feedText[f]) {
      appendFeed(el.feed, scenario.feedText[f]);
      sound.jingle();
    }
  }

  if (bothChapterEnded()) enterFinale();
  else draw();

  // 2人プレイ: 自分の手番の結果を部屋に反映する。断線していてもローカルの
  // 進行を止めてはならない（失敗は握りつぶし、ローカルで続行）。
  if (conn && roomCode) pushState(conn, roomCode, state).catch(() => {});
}

/** chapter はシーンから導出する。createState の初期値以降、ここだけが更新する。 */
function syncChapters() {
  for (const r of ['junko', 'taichi']) {
    const scene = scenario.scenes.get(state.sceneId[r]);
    if (scene?.chapter) state.chapter[r] = scene.chapter;
    state.chapterDone[r] = scene?.chapterEnd === true;
  }
}

/** 両者が第3章の章末に立っている時だけ合流する。1〜2章の章末では合流しない。 */
function bothChapterEnded() {
  return ['junko', 'taichi'].every(
    (r) => state.chapterDone[r] && state.chapter[r] >= 3
  );
}

function enterFinale() {
  state.sceneId.junko = 'ch4_finale_intro';
  state.sceneId.taichi = 'ch4_finale_intro';
  syncChapters();
  saveState(state, localStorage);
  draw();
}

// ---- 2人プレイ: 部屋の購読 ----

/**
 * ゲーム開始後の部屋購読。相手のフラグ・推理・章末到達を取り込む。
 * 自分のルートの sceneId は絶対に上書きしない（自分の操作が巻き戻るため。
 * Task12 が1人プレイのデュアルルート状態で気にしたのと同種の懸念）。
 */
function startWatching() {
  watchRoom(conn, roomCode, (remote) => {
    const beforeFlags = new Set(Object.keys(state.flags));
    const beforeDeductions = state.deductions.length;
    const mine = state.sceneId[myRoute];   // 自分のシーンは相手に上書きさせない
    // 両ルートが既に同じ ch4_* シーン（共有フィナーレ合流後）を指しているなら、
    // ここから先は「自分のシーン」という概念自体がなく、相手の操作（推理を
    // 突き合わせる／エンディング確定）にも追従すべき。その場合は mine への
    // 巻き戻しをせず、mergeRemote が取り込んだ最新値をそのまま使わせる。
    const wasInFinale =
      state.sceneId.junko === state.sceneId.taichi && state.sceneId.junko?.startsWith('ch4_');

    state = mergeRemote(state, remote);
    if (!wasInFinale) state.sceneId[myRoute] = mine;
    syncChapters();
    saveState(state, localStorage);

    for (const f of Object.keys(state.flags)) {
      if (!beforeFlags.has(f) && scenario.feedText[f]) {
        appendFeed(el.feed, scenario.feedText[f]);
        sound.jingle();
      }
    }

    if (bothChapterEnded()) return enterFinale();
    // 共有フィナーレ合流後、相手の操作で自分のシーンが実際に進んだ場合は
    // セリフ・アートも入れ替わるので draw() で全体を再描画する。
    if (wasInFinale && state.sceneId[myRoute] !== mine) return draw();
    // 相手の推理が届いた時だけコマンドを引き直す。自分のシーンは動いていないので draw() はしない
    if (state.deductions.length !== beforeDeductions) drawCommands();
  });
}

/** ホストが部屋作成後、ゲストのバディ確定を待つ。確定したら supportDog を確定してゲーム開始。 */
function watchForPartnerBuddy() {
  const otherRoute = myRoute === 'junko' ? 'taichi' : 'junko';
  const unsub = watchRoom(conn, roomCode, (remote) => {
    const otherBuddy = remote.players?.[otherRoute]?.buddy;
    if (!otherBuddy) return; // まだゲストがバディを選んでいない
    unsub();
    state.buddies[otherRoute] = otherBuddy;
    state.supportDog = DOGS.find((d) => d !== state.buddies.junko && d !== state.buddies.taichi);
    state = mergeRemote(state, remote);
    beginTwoPlayerGame();
  });
}

function beginTwoPlayerGame() {
  route = myRoute;
  syncChapters();
  saveState(state, localStorage);
  el.lobby.hidden = true;
  el.game.hidden = false;
  startWatching();
  draw();
}

// ---- ロビー ----

function showLobbyMessage(text) {
  const p = document.createElement('p');
  p.textContent = text;
  el.lobbyBody.append(p);
  return p;
}

function mkButton(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/** バディ選びのカード（犬の絵＋名前＋得意技） */
function dogButton(dog, onClick) {
  const b = mkButton('', onClick);
  b.className = 'dog-card';
  b.innerHTML = dogPortrait(dog);
  const name = document.createElement('span');
  name.textContent = DOG_LABEL[dog];
  const trait = document.createElement('small');
  trait.textContent = DOG_TRAIT[dog];
  b.append(name, trait);
  return b;
}

/** パネルの下に「もどる」を置く */
function appendBack(onClick = showTitleMenu) {
  const p = document.createElement('p');
  const b = mkButton('もどる', onClick);
  b.classList.add('ghost');
  p.append(b);
  el.lobbyBody.append(p);
}

function showLobbyError(message, retryFn) {
  el.lobbyBody.innerHTML = '';
  showLobbyMessage(message);
  el.lobbyBody.append(mkButton('もう一度', retryFn), mkButton('戻る', showLobby));
}

/** ロビーのトップ。Firebase が使えない（initFirebase が null を返した）場合は
 *  Task14 の設計どおり黙って1人プレイに直行し、3択は出さない。 */
function showLobby() {
  el.lobbyBody.innerHTML = '';
  if (!conn) return showSoloLobby();

  showLobbyMessage('遊び方を選んでください。');
  el.lobbyBody.append(
    mkButton('ひとりで遊ぶ', showSoloLobby),
    mkButton('部屋を作る', showCreateRoom),
    mkButton('部屋に入る', showJoinRoom),
  );
  appendBack();
}

// ---- ロビー（1人プレイ: バディを2頭とも選ぶ） ----
function showSoloLobby() {
  el.lobbyBody.innerHTML = '';
  const picks = {};

  const askFor = (r) => {
    const h = document.createElement('p');
    h.textContent = `${ROUTE_LABEL[r]}のバディを選んでください。`;
    el.lobbyBody.append(h);
    for (const dog of DOGS) {
      if (Object.values(picks).includes(dog)) continue;
      el.lobbyBody.append(dogButton(dog, () => {
        picks[r] = dog;
        el.lobbyBody.innerHTML = '';
        if (r === 'junko') askFor('taichi');
        else start(picks);
      }));
    }
    appendBack();
  };
  askFor('junko');
}

function start(buddies) {
  state = createState({ buddies, start: scenario.start });
  saveState(state, localStorage);
  el.lobby.hidden = true;
  el.game.hidden = false;
  draw();
}

// ---- ロビー（2人プレイ: 部屋を作る。ホスト＝じゅんこ視点に固定） ----
function showCreateRoom() {
  el.lobbyBody.innerHTML = '';
  showLobbyMessage(`あなた（${ROUTE_LABEL.junko}）のバディを選んでください。`);
  for (const dog of DOGS) {
    el.lobbyBody.append(dogButton(dog, () => createRoomWithBuddy(dog)));
  }
  appendBack(showLobby);
}

async function createRoomWithBuddy(hostDog) {
  const code = generateCode();
  // ゲストのバディはまだ未確定。createState は junko !== taichi(null) で通り、
  // supportDog は仮値になるが、watchForPartnerBuddy がゲスト確定後に必ず上書きする。
  const initial = createState({ buddies: { junko: hostDog, taichi: null }, start: scenario.start });

  try {
    await createRoom(conn, code, initial);
  } catch {
    return showLobbyError('部屋を作れませんでした。もう一度お試しください。', showLobby);
  }

  roomCode = code;
  myRoute = 'junko';
  state = initial;

  el.lobbyBody.innerHTML = '';
  showLobbyMessage(`ルームコード: ${code}`);
  showLobbyMessage('相手の参加を待っています…');

  watchForPartnerBuddy();
}

// ---- ロビー（2人プレイ: 部屋に入る。ゲスト＝たいち視点に固定） ----
function showJoinRoom() {
  el.lobbyBody.innerHTML = '';
  showLobbyMessage('ルームコード（4桁）を入力してください。');
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.maxLength = 4;
  input.pattern = '[0-9]{4}';
  el.lobbyBody.append(input, mkButton('入る', () => attemptJoinRoom(input.value.trim())));
}

async function attemptJoinRoom(code) {
  if (!/^\d{4}$/.test(code)) {
    return showLobbyError('4桁の数字で入力してください。', showJoinRoom);
  }
  let room;
  try {
    room = await joinRoom(conn, code);
  } catch (err) {
    return showLobbyError(err.message, showJoinRoom);
  }
  roomCode = code;
  showJoinBuddyPicker(room);
}

function showJoinBuddyPicker(room, notice) {
  el.lobbyBody.innerHTML = '';
  if (notice) showLobbyMessage(notice);
  showLobbyMessage(`あなた（${ROUTE_LABEL.taichi}）のバディを選んでください。`);

  const taken = new Set([room.players?.junko?.buddy, room.players?.taichi?.buddy].filter(Boolean));
  const available = DOGS.filter((d) => !taken.has(d));
  if (available.length === 0) {
    return showLobbyError('この部屋のバディは決まっています。部屋の主にもう一度作ってもらってください。', showLobby);
  }
  for (const dog of available) {
    el.lobbyBody.append(dogButton(dog, () => claimAndJoin(dog, room)));
  }
}

async function claimAndJoin(dog, room) {
  let ok;
  try {
    ok = await claimBuddy(conn, roomCode, 'taichi', dog);
  } catch {
    return showLobbyError('通信に失敗しました。もう一度お試しください。', () => showJoinBuddyPicker(room));
  }

  if (!ok) {
    // claimBuddy が false を返した = 自分の枠(taichi)への書き込みが確定しなかった
    // （多重クリック等）。false を成功扱いにせず、最新のスナップショットで選び直させる。
    let fresh = room;
    try {
      fresh = await joinRoom(conn, roomCode);
    } catch {
      // 取り直せなければ古いスナップショットのままでも案内は続ける
    }
    return showJoinBuddyPicker(fresh, 'その子は相手が連れて行きました。');
  }

  const hostDog = room.players?.junko?.buddy ?? null;
  let skeleton;
  try {
    skeleton = createState({ buddies: { junko: hostDog, taichi: dog }, start: scenario.start });
  } catch {
    // 極めて稀な同時取得の食い違い（ホストのバディが未確定/重複）。作り直させる。
    return showLobbyError('バディの選択が重なりました。もう一度お試しください。', showJoinRoom);
  }

  myRoute = 'taichi';
  state = mergeRemote(skeleton, room);
  beginTwoPlayerGame();
}

// ---- 起動 ----
conn = await initFirebase();

// ---- タイトル画面 ----
const menu = {
  newGame: document.getElementById('menu-new'),
  continue: document.getElementById('menu-continue'),
  options: document.getElementById('menu-options'),
};

function showTitleMenu() {
  el.lobbyBody.innerHTML = '';
  el.lobbyBody.hidden = true;
  el.lobby.classList.remove('choosing');
  menu.continue.disabled = !loadState(localStorage);
  menu.newGame.focus({ preventScroll: true });
}

function openPanel(fill) {
  el.lobby.classList.add('choosing');
  el.lobbyBody.hidden = false;
  fill();
}

function showOptions() {
  el.lobbyBody.innerHTML = '';
  showLobbyMessage('おぷしょん');
  const soundBtn = mkButton('', () => {
    sound.toggle();
    label();
  });
  const label = () => { soundBtn.textContent = `サウンド：${sound.enabled ? 'ON' : 'OFF'}`; soundBtn.setAttribute('aria-pressed', String(sound.enabled)); };
  label();
  el.lobbyBody.append(soundBtn);
  appendBack();
}

menu.newGame.addEventListener('click', () => openPanel(showLobby));
menu.options.addEventListener('click', () => openPanel(showOptions));
menu.continue.addEventListener('click', () => {
  // 再開時は保存されたゲーム状態のみを復元する。2人プレイのルーム接続(conn/myRoute/roomCode)は
  // 永続化していないため、常に1人プレイの両視点切替として再開する(既知の制約)。
  const saved = loadState(localStorage);
  if (!saved) return showTitleMenu();
  state = saved;
  el.lobby.hidden = true;
  el.game.hidden = false;
  draw();
});

// ゲーム中の ≡ でタイトルへ（進行は自動保存されているので「つづきから」で戻れる）
document.getElementById('to-title').addEventListener('click', () => {
  typing?.skip();
  cancelPartnerWait();
  el.game.hidden = true;
  el.lobby.hidden = false;
  showTitleMenu();
});

showImage(document.getElementById('title-art'), TITLE_IMAGE, '柴犬探偵団のタイトル', () =>
  titleArt().replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" '));
document.getElementById('title-icon').innerHTML = detectiveShiba();
showTitleMenu();

// ---- キーボード ----
document.addEventListener('keydown', (e) => {
  if (el.game.hidden) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    typing?.skip();
    return;
  }
  const n = Number(e.key);
  if (Number.isInteger(n) && n >= 1) {
    el.commandList.querySelectorAll('button')[n - 1]?.click();
  }
});
// スマホには Space キーが無いので、セリフ欄のタップでも文字送りを早送りする
el.dialogue.addEventListener('click', () => typing?.skip());

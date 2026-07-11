import { loadScenario } from './scenario.js';
import { createState, saveState, loadState, clearState, DOGS } from './state.js';
import { visibleCommands, applyCommand, resolveEnding, endingSceneId } from './engine.js';
import { renderStatus, renderArt, renderDialogue, renderCommands, appendFeed } from './ui/screen.js';
import { createSound } from './ui/sound.js';

const DOG_LABEL = { raizo: '雷蔵', hana: 'はな', kuranosuke: '蔵之介' };
const ROUTE_LABEL = { junko: 'じゅんこ', taichi: 'たいち', common: '一同' };

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
let route = 'junko';      // 1人プレイで現在操作している視点
let typing = null;
const sound = createSound();

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
    buddyLabel: scene.route === 'common' ? '三頭' : DOG_LABEL[state.buddies[scene.route]],
    routeLabel: ROUTE_LABEL[scene.route],
  });
  renderArt(el.art, scene.art);

  const lines = [];
  if (scene.description) lines.push({ text: scene.description });
  for (const d of scene.dialogue ?? []) lines.push(d);
  const hint = scene.supportHint?.find((h) => h.dog === state.supportDog);
  if (hint) lines.push({ speaker: hint.speaker, text: hint.text });

  renderCommands(el.commandList, [], () => {});
  typing = renderDialogue(el.dialogue, lines, { onDone: drawCommands, onChar: () => sound.blip() });
}

function drawCommands() {
  const scene = currentScene();

  if (scene.resolvesEnding) {
    // Contract: ch4_answer is a common-route scene. resolveEnding/endingSceneId
    // must land BOTH routes on the ending scene (not just the active one),
    // since after this point the player may still be on either route pointer.
    const ending = resolveEnding(state.flags);
    const endingId = endingSceneId(ending, state.flags);
    state = { ...state, ending, sceneId: { ...state.sceneId, junko: endingId, taichi: endingId } };
    saveState(state, localStorage);
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
    return renderCommands(el.commandList, cmds, pick);
  }

  if (scene.sceneId.startsWith('ch4_ending_')) {
    return renderCommands(el.commandList, [{ text: '▶最初から', restart: true }], pick);
  }

  const cmds = visibleCommands(scene, state).map((c) => ({ ...c, route: scene.route }));
  renderCommands(el.commandList, [...cmds, ...switchRouteCommand()], pick);
}

/**
 * 1人プレイ専用: もう一方の視点へ切り替える。
 * 両ルートが同じシーンID（=第4章の合流後）に立っている間は出さない。
 * currentScene().route === 'common' だけで判定すると、片方のルートだけが
 * 先に ch4_finale_intro（common）へ進んだ瞬間に切替ボタンが消えてしまい、
 * もう片方のルート（まだ第3章の途中）に戻れなくなる（詰み）。
 * 両ルートの sceneId が実際に一致しているかどうかで判定する。
 */
function switchRouteCommand() {
  if (state.sceneId.junko === state.sceneId.taichi) return [];
  const other = route === 'junko' ? 'taichi' : 'junko';
  return [{ text: `▶視点を${ROUTE_LABEL[other]}に切り替える`, switchTo: other }];
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

// ---- ロビー（1人プレイ: バディを2頭とも選ぶ） ----
function showLobby() {
  el.lobbyBody.innerHTML = '';
  const picks = {};

  const askFor = (r) => {
    const h = document.createElement('p');
    h.textContent = `${ROUTE_LABEL[r]}のバディを選んでください。`;
    el.lobbyBody.append(h);
    for (const dog of DOGS) {
      if (Object.values(picks).includes(dog)) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = DOG_LABEL[dog];
      b.addEventListener('click', () => {
        picks[r] = dog;
        el.lobbyBody.innerHTML = '';
        if (r === 'junko') askFor('taichi');
        else start(picks);
      });
      el.lobbyBody.append(b);
    }
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

// ---- 起動 ----
const saved = loadState(localStorage);
if (saved) {
  state = saved;
  el.lobby.hidden = true;
  el.game.hidden = false;
  draw();
} else {
  showLobby();
}

// ---- キーボード ----
document.addEventListener('keydown', (e) => {
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

// ---- 蛍光色の切替 ----
const PHOSPHORS = ['green', 'amber', 'white'];
document.getElementById('phosphor-toggle').addEventListener('click', () => {
  const i = PHOSPHORS.indexOf(document.body.dataset.phosphor);
  document.body.dataset.phosphor = PHOSPHORS[(i + 1) % PHOSPHORS.length];
  localStorage.setItem('shiba_detective_phosphor', document.body.dataset.phosphor);
});
document.body.dataset.phosphor = localStorage.getItem('shiba_detective_phosphor') ?? 'green';

// ---- 効果音トグル ----
const soundBtn = document.getElementById('sound-toggle');
soundBtn.addEventListener('click', () => {
  const on = sound.toggle();
  soundBtn.textContent = on ? 'SOUND ON' : 'SOUND OFF';
  soundBtn.setAttribute('aria-pressed', String(on));
});

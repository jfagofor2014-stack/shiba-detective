const DAY_MS = 86400000;

export function generateCode(rand = Math.random) {
  return String(Math.floor(rand() * 10000)).padStart(4, '0');
}

export function roomPayload(state, { uid, now = Date.now() }) {
  return {
    createdAt: now,
    expiresAt: now + DAY_MS,
    phase: 'playing',
    supportDog: state.supportDog,
    ending: state.ending,
    flags: state.flags,
    counters: state.counters,
    deductions: state.deductions,
    players: {
      junko: { buddy: state.buddies.junko, sceneId: state.sceneId.junko, chapter: state.chapter.junko, chapterDone: state.chapterDone.junko },
      taichi: { buddy: state.buddies.taichi, sceneId: state.sceneId.taichi, chapter: state.chapter.taichi, chapterDone: state.chapterDone.taichi },
    },
    hostUid: uid,
  };
}

/** フラグは単調増加なので和集合、カウンタは最大値を採る。競合しない。 */
export function mergeRemote(state, remote = {}) {
  const flags = { ...state.flags, ...(remote.flags ?? {}) };

  const counters = { ...state.counters };
  for (const [k, v] of Object.entries(remote.counters ?? {})) {
    counters[k] = Math.max(counters[k] ?? 0, v);
  }

  const deductions = [...new Set([...state.deductions, ...(remote.deductions ?? [])])];

  const sceneId = { ...state.sceneId };
  const chapter = { ...state.chapter };
  const chapterDone = { ...state.chapterDone };
  for (const r of ['junko', 'taichi']) {
    const p = remote.players?.[r];
    if (!p) continue;
    if (p.sceneId) sceneId[r] = p.sceneId;
    if (p.chapter) chapter[r] = p.chapter;
    if (typeof p.chapterDone === 'boolean') chapterDone[r] = p.chapterDone;
  }

  return { ...state, flags, counters, deductions, sceneId, chapter, chapterDone,
    ending: remote.ending ?? state.ending };
}

export async function createRoom(conn, code, state) {
  const { api, db, uid } = conn;
  await api.set(api.ref(db, `rooms/${code}`), roomPayload(state, { uid }));
}

export async function joinRoom(conn, code) {
  const { api, db } = conn;
  const snap = await api.get(api.ref(db, `rooms/${code}`));
  if (!snap.exists()) throw new Error('ルームが見つかりません');
  const room = snap.val();
  if (room.expiresAt <= Date.now()) throw new Error('このルームは期限切れです');
  return room;
}

export function watchRoom(conn, code, onChange) {
  const { api, db } = conn;
  return api.onValue(api.ref(db, `rooms/${code}`), (snap) => {
    if (snap.exists()) onChange(snap.val());
  });
}

/** 二人が同時に同じ犬を押した時の唯一の競合。取れたら true。 */
export async function claimBuddy(conn, code, route, dog) {
  const { api, db } = conn;
  const result = await api.runTransaction(
    api.ref(db, `rooms/${code}/players/${route}/buddy`),
    (current) => (current == null ? dog : undefined)   // undefined を返すと中断
  );
  return result.committed && result.snapshot.val() === dog;
}

export async function pushState(conn, code, state) {
  const { api, db } = conn;
  await api.update(api.ref(db, `rooms/${code}`), {
    flags: state.flags,
    counters: state.counters,
    deductions: state.deductions,
    ending: state.ending,
    [`players/junko/sceneId`]: state.sceneId.junko,
    [`players/junko/chapter`]: state.chapter.junko,
    [`players/junko/chapterDone`]: state.chapterDone.junko,
    [`players/taichi/sceneId`]: state.sceneId.taichi,
    [`players/taichi/chapter`]: state.chapter.taichi,
    [`players/taichi/chapterDone`]: state.chapterDone.taichi,
  });
}

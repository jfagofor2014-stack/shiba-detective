export const KNOWN_FLAGS = new Set([
  'evidence_mud', 'evidence_black_hair', 'heard_shadow', 'suspicious_father',
  'info_black_cat', 'info_satoru_bag', 'found_empty_box', 'taichi_delay',
]);
export const KNOWN_COUNTERS = new Set(['taichi_mitsumeru']);

export function loadScenario(json) {
  const scenes = new Map();
  for (const scene of json.scenes) {
    if (scenes.has(scene.sceneId)) throw new Error(`duplicate sceneId: ${scene.sceneId}`);
    scenes.set(scene.sceneId, scene);
  }
  return { scenes, start: json.start, feedText: json.feedText ?? {} };
}

export function validateScenario(scenario) {
  const errors = [];
  const { scenes, start } = scenario;

  for (const [id, scene] of scenes) {
    for (const cmd of scene.commands ?? []) {
      if (!scenes.has(cmd.next)) errors.push(`${id}: next の参照先が存在しない -> ${cmd.next}`);
      if (cmd.setFlag && !KNOWN_FLAGS.has(cmd.setFlag)) errors.push(`${id}: 未知のフラグ -> ${cmd.setFlag}`);
      if (cmd.count && !KNOWN_COUNTERS.has(cmd.count)) errors.push(`${id}: 未知のカウンタ -> ${cmd.count}`);
    }
  }

  const reachable = new Set();
  const queue = [start.junko, start.taichi, 'ch4_finale_intro'].filter((id) => scenes.has(id));
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const cmd of scenes.get(id).commands ?? []) {
      if (scenes.has(cmd.next)) queue.push(cmd.next);
    }
  }
  // エンディングシーンは main.js が直接遷移させるため、到達判定から除外する
  for (const id of scenes.keys()) {
    if (id.startsWith('ch4_ending_')) continue;
    if (!reachable.has(id)) errors.push(`到達不能なシーン: ${id}`);
  }
  return errors;
}

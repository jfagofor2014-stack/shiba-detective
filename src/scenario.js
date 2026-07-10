export const KNOWN_FLAGS = new Set([
  'evidence_mud', 'evidence_black_hair', 'heard_shadow', 'suspicious_father',
  'info_black_cat', 'info_satoru_bag', 'found_empty_box', 'taichi_delay',
]);
export const KNOWN_COUNTERS = new Set(['taichi_mitsumeru']);
// Chapter 3 で使われる推理ID（まだシーンは存在しないが、validateScenario で検証するために先出しする）
export const KNOWN_DEDUCTIONS = new Set(['cat', 'hair', 'mud']);

const VALID_CONDITION_DOGS = new Set(['raizo', 'hana', 'kuranosuke']);
// evaluate() (src/engine.js) が理解できる condition ノードのキー一覧。
// これ以外のキー、またはこの中の複数キーが同じノードに乗っていると evaluate() は
// 最初に見つけたキーだけで判定し、残りを黒歴史のように無視する。
const CONDITION_KEYS = [
  'flag', 'buddy', 'buddyNot', 'support', 'deduction', 'countAtLeast', 'allOf', 'anyOf', 'not',
];

function validateCondition(condition, id, errors) {
  if (condition == null) return;
  if (typeof condition !== 'object' || Array.isArray(condition)) {
    errors.push(`${id}: condition ノードがオブジェクトではない -> ${JSON.stringify(condition)}`);
    return;
  }

  const keys = Object.keys(condition);
  const recognizedKeys = keys.filter((k) => CONDITION_KEYS.includes(k));
  const unknownKeys = keys.filter((k) => !CONDITION_KEYS.includes(k));

  for (const key of unknownKeys) {
    errors.push(`${id}: condition内に未知のキー -> ${key}`);
  }
  if (recognizedKeys.length === 0) {
    errors.push(`${id}: condition内に認識可能なキーがない -> ${JSON.stringify(condition)}`);
  } else if (recognizedKeys.length > 1) {
    errors.push(`${id}: condition内に認識可能なキーが複数ある -> ${JSON.stringify(condition)}`);
  }

  if ('flag' in condition && !KNOWN_FLAGS.has(condition.flag)) {
    errors.push(`${id}: condition内の未知のフラグ -> ${condition.flag}`);
  }
  if ('buddy' in condition && !VALID_CONDITION_DOGS.has(condition.buddy)) {
    errors.push(`${id}: condition内の未知の犬ID(buddy) -> ${condition.buddy}`);
  }
  if ('buddyNot' in condition && !VALID_CONDITION_DOGS.has(condition.buddyNot)) {
    errors.push(`${id}: condition内の未知の犬ID(buddyNot) -> ${condition.buddyNot}`);
  }
  if ('support' in condition && !VALID_CONDITION_DOGS.has(condition.support)) {
    errors.push(`${id}: condition内の未知の犬ID(support) -> ${condition.support}`);
  }
  if ('deduction' in condition && !KNOWN_DEDUCTIONS.has(condition.deduction)) {
    errors.push(`${id}: condition内の未知のdeduction -> ${condition.deduction}`);
  }
  if ('countAtLeast' in condition) {
    const value = condition.countAtLeast;
    if (!Array.isArray(value)) {
      errors.push(`${id}: condition内のcountAtLeastが配列ではない -> ${JSON.stringify(value)}`);
    } else {
      const [name, min] = value;
      if (!KNOWN_COUNTERS.has(name)) {
        errors.push(`${id}: condition内の未知のカウンタ -> ${name}`);
      }
      if (typeof min !== 'number') {
        errors.push(`${id}: condition内のcountAtLeastの下限値が数値ではない -> ${JSON.stringify(min)}`);
      }
    }
  }
  if ('allOf' in condition) {
    if (!Array.isArray(condition.allOf)) {
      errors.push(`${id}: condition内のallOfが配列ではない -> ${JSON.stringify(condition.allOf)}`);
    } else {
      for (const child of condition.allOf) validateCondition(child, id, errors);
    }
  }
  if ('anyOf' in condition) {
    if (!Array.isArray(condition.anyOf)) {
      errors.push(`${id}: condition内のanyOfが配列ではない -> ${JSON.stringify(condition.anyOf)}`);
    } else {
      for (const child of condition.anyOf) validateCondition(child, id, errors);
    }
  }
  if ('not' in condition) {
    validateCondition(condition.not, id, errors);
  }
}

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
      if (cmd.next !== undefined && !scenes.has(cmd.next)) {
        errors.push(`${id}: next の参照先が存在しない -> ${cmd.next}`);
      }
      if (cmd.setFlag && !KNOWN_FLAGS.has(cmd.setFlag)) errors.push(`${id}: 未知のフラグ -> ${cmd.setFlag}`);
      if (cmd.count && !KNOWN_COUNTERS.has(cmd.count)) errors.push(`${id}: 未知のカウンタ -> ${cmd.count}`);
      validateCondition(cmd.condition, id, errors);
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

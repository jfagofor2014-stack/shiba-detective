import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, contextFor, visibleCommands, applyCommand, DERIVED_FLAGS, resolveEnding, endingSceneId } from '../src/engine.js';

const ctx = (over = {}) => ({
  flags: {}, counters: {}, buddy: 'raizo', support: 'hana', deductions: [], ...over,
});

test('condition が未指定なら常に真', () => {
  assert.equal(evaluate(undefined, ctx()), true);
  assert.equal(evaluate(null, ctx()), true);
});

test('flag はフラグの有無を見る', () => {
  assert.equal(evaluate({ flag: 'evidence_mud' }, ctx()), false);
  assert.equal(evaluate({ flag: 'evidence_mud' }, ctx({ flags: { evidence_mud: true } })), true);
});

test('buddy と buddyNot はバディを見る', () => {
  assert.equal(evaluate({ buddy: 'raizo' }, ctx()), true);
  assert.equal(evaluate({ buddy: 'hana' }, ctx()), false);
  assert.equal(evaluate({ buddyNot: 'hana' }, ctx()), true);
  assert.equal(evaluate({ buddyNot: 'raizo' }, ctx()), false);
});

test('support はお留守番の犬を見る', () => {
  assert.equal(evaluate({ support: 'hana' }, ctx()), true);
  assert.equal(evaluate({ support: 'kuranosuke' }, ctx()), false);
});

test('countAtLeast はカウンタの下限を見る', () => {
  const c = ctx({ counters: { taichi_mitsumeru: 3 } });
  assert.equal(evaluate({ countAtLeast: ['taichi_mitsumeru', 3] }, c), true);
  assert.equal(evaluate({ countAtLeast: ['taichi_mitsumeru', 4] }, c), false);
  assert.equal(evaluate({ countAtLeast: ['taichi_mitsumeru', 1] }, ctx()), false);
});

test('deduction は届いた推理を見る', () => {
  assert.equal(evaluate({ deduction: 'cat' }, ctx()), false);
  assert.equal(evaluate({ deduction: 'cat' }, ctx({ deductions: ['cat'] })), true);
});

test('allOf / anyOf / not を組み合わせられる', () => {
  const c = ctx({ flags: { a: true }, buddy: 'kuranosuke' });
  assert.equal(evaluate({ allOf: [{ flag: 'a' }, { buddy: 'kuranosuke' }] }, c), true);
  assert.equal(evaluate({ allOf: [{ flag: 'a' }, { flag: 'b' }] }, c), false);
  assert.equal(evaluate({ anyOf: [{ flag: 'b' }, { buddy: 'kuranosuke' }] }, c), true);
  assert.equal(evaluate({ anyOf: [{ flag: 'b' }, { buddy: 'hana' }] }, c), false);
  assert.equal(evaluate({ not: { flag: 'b' } }, c), true);
  assert.equal(evaluate({ not: { flag: 'a' } }, c), false);
});

test('allOf が空配列なら真', () => {
  assert.equal(evaluate({ allOf: [] }, ctx()), true);
});

test('未知のキーは例外を投げる', () => {
  assert.throws(() => evaluate({ unknownKey: 'x' }, ctx()), /unknown condition/);
});

const baseState = (over = {}) => ({
  buddies: { junko: 'raizo', taichi: 'kuranosuke' },
  supportDog: 'hana',
  sceneId: { junko: 'ch1_junko_living', taichi: 'ch1_taichi_entrance' },
  chapter: { junko: 1, taichi: 1 },
  chapterDone: { junko: false, taichi: false },
  flags: {},
  counters: {},
  deductions: [],
  ending: null,
  ...over,
});

test('contextFor は route ごとのバディを載せる', () => {
  const s = baseState();
  assert.equal(contextFor(s, 'junko').buddy, 'raizo');
  assert.equal(contextFor(s, 'taichi').buddy, 'kuranosuke');
  assert.equal(contextFor(s, 'junko').support, 'hana');
});

test('visibleCommands は条件を満たすコマンドだけ返す', () => {
  const scene = {
    sceneId: 'x', route: 'taichi',
    commands: [
      { text: 'A', next: 'a' },
      { text: 'B', next: 'b', condition: { buddyNot: 'hana' } },
      { text: 'C', next: 'c', condition: { flag: 'nope' } },
    ],
  };
  const got = visibleCommands(scene, baseState()).map((c) => c.text);
  assert.deepEqual(got, ['A', 'B']);
});

test('visibleCommands は commands 未定義のシーンで空配列を返す', () => {
  assert.deepEqual(visibleCommands({ sceneId: 'x', route: 'common' }, baseState()), []);
});

test('applyCommand は setFlag を立て、シーンを進める', () => {
  const s = baseState();
  const next = applyCommand(s, { text: '', next: 'ch1_junko_sofa', setFlag: 'evidence_mud', route: 'junko' });
  assert.equal(next.flags.evidence_mud, true);
  assert.equal(next.sceneId.junko, 'ch1_junko_sofa');
  assert.equal(next.sceneId.taichi, 'ch1_taichi_entrance');
});

test('applyCommand は元の state を破壊しない', () => {
  const s = baseState();
  applyCommand(s, { next: 'x', setFlag: 'evidence_mud', route: 'junko' });
  assert.deepEqual(s.flags, {});
  assert.equal(s.sceneId.junko, 'ch1_junko_living');
});

test('applyCommand は count でカウンタを増やす', () => {
  let s = baseState();
  s = applyCommand(s, { next: 'x', count: 'taichi_mitsumeru', route: 'taichi' });
  assert.equal(s.counters.taichi_mitsumeru, 1);
  s = applyCommand(s, { next: 'y', count: 'taichi_mitsumeru', route: 'taichi' });
  assert.equal(s.counters.taichi_mitsumeru, 2);
});

test('みつめる3回で taichi_delay が導出される', () => {
  let s = baseState();
  for (let i = 0; i < 2; i++) {
    s = applyCommand(s, { next: 'x', count: 'taichi_mitsumeru', route: 'taichi' });
  }
  assert.equal(s.flags.taichi_delay, undefined);
  s = applyCommand(s, { next: 'x', count: 'taichi_mitsumeru', route: 'taichi' });
  assert.equal(s.flags.taichi_delay, true);
});

test('applyCommand は sendDeduction を deductions に積む', () => {
  const s = applyCommand(baseState(), { next: 'x', sendDeduction: 'cat', route: 'junko' });
  assert.deepEqual(s.deductions, ['cat']);
});

test('sendDeduction は重複を積まない', () => {
  let s = applyCommand(baseState(), { next: 'x', sendDeduction: 'cat', route: 'junko' });
  s = applyCommand(s, { next: 'y', sendDeduction: 'cat', route: 'junko' });
  assert.deepEqual(s.deductions, ['cat']);
});

// --- Fix 1: applyCommand は sceneId / deductions のエイリアスを返してはいけない ---

test('applyCommand は next も sendDeduction も無い場合でも sceneId と deductions を新しい参照で返す', () => {
  const s = baseState();
  const next = applyCommand(s, { text: '', setFlag: 'evidence_mud', route: 'junko' });
  assert.notEqual(next.sceneId, s.sceneId);
  assert.deepEqual(next.sceneId, s.sceneId);
  assert.notEqual(next.deductions, s.deductions);
  assert.deepEqual(next.deductions, s.deductions);
});

// --- Fix 2: DERIVED_FLAGS は評価対象の route を明示し、実行コマンドの route に依存しない ---

test('DERIVED_FLAGS の各エントリは route を明示する', () => {
  const entry = DERIVED_FLAGS.find((d) => d.flag === 'taichi_delay');
  assert.equal(entry.route, 'taichi');
});

test('taichi_delay の導出は、みつめるを積んだコマンドの route が junko でも成立する', () => {
  let s = baseState();
  for (let i = 0; i < 3; i++) {
    s = applyCommand(s, { next: 'x', count: 'taichi_mitsumeru', route: 'junko' });
  }
  assert.equal(s.flags.taichi_delay, true);
});

// --- Fix 3: command.route は scene.route から必ず引き継がれる ---

test('visibleCommands は各コマンドに scene.route を付与する（元のコマンドは変更しない）', () => {
  const scene = {
    sceneId: 'x', route: 'taichi',
    commands: [{ text: 'A', next: 'a' }],
  };
  const got = visibleCommands(scene, baseState());
  assert.equal(got[0].route, 'taichi');
  assert.equal(scene.commands[0].route, undefined);
});

test('applyCommand は command.route が無いと例外を投げる', () => {
  assert.throws(() => applyCommand(baseState(), { next: 'x' }), /command\.route/);
});

test('applyCommand は command.route が不正な値だと例外を投げる', () => {
  assert.throws(() => applyCommand(baseState(), { next: 'x', route: 'nope' }), /command\.route/);
});

test('applyCommand は route:"common" に next が付いていると例外を投げる', () => {
  assert.throws(() => applyCommand(baseState(), { next: 'x', route: 'common' }), /command\.route/);
});

test('resolveEnding: A条件のみで A', () => {
  assert.equal(resolveEnding({ suspicious_father: true, found_empty_box: true }), 'A');
});

test('resolveEnding: B条件のみで B', () => {
  assert.equal(resolveEnding({ evidence_black_hair: true, info_black_cat: true }), 'B');
});

test('resolveEnding: 両方揃うと D', () => {
  assert.equal(resolveEnding({
    suspicious_father: true, found_empty_box: true,
    evidence_black_hair: true, info_black_cat: true,
  }), 'D');
});

test('resolveEnding: 片方ずつ欠けると C', () => {
  assert.equal(resolveEnding({ suspicious_father: true, evidence_black_hair: true }), 'C');
});

test('resolveEnding: フラグ皆無でも C（詰みを作らない）', () => {
  assert.equal(resolveEnding({}), 'C');
});

test('resolveEnding: taichi_delay は判定に影響しない', () => {
  assert.equal(resolveEnding({ taichi_delay: true }), 'C');
  assert.equal(resolveEnding({ taichi_delay: true, suspicious_father: true, found_empty_box: true }), 'A');
});

test('endingSceneId: C は taichi_delay で分岐する', () => {
  assert.equal(endingSceneId('C', {}), 'ch4_ending_c');
  assert.equal(endingSceneId('C', { taichi_delay: true }), 'ch4_ending_c_delay');
  assert.equal(endingSceneId('A', { taichi_delay: true }), 'ch4_ending_a');
  assert.equal(endingSceneId('D', {}), 'ch4_ending_d');
});

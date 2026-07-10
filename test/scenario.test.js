import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadScenario, validateScenario, KNOWN_DEDUCTIONS } from '../src/scenario.js';

const raw = JSON.parse(readFileSync(new URL('../data/scenario.json', import.meta.url), 'utf8'));

test('シナリオが読み込める', () => {
  const s = loadScenario(raw);
  assert.ok(s.scenes.size > 0);
  assert.equal(s.scenes.get('ch1_junko_living').route, 'junko');
});

test('リンク切れ・未定義フラグ・孤立シーンがない', () => {
  assert.deepEqual(validateScenario(loadScenario(raw)), []);
});

test('validateScenario は存在しない next を検出する', () => {
  const broken = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [{ sceneId: 'a', route: 'junko', chapter: 1, commands: [{ text: 'x', next: 'nowhere' }] }],
  });
  const errors = validateScenario(broken);
  assert.ok(errors.some((e) => e.includes('nowhere')));
});

test('validateScenario は到達不能シーンを検出する', () => {
  const orphan = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [
      { sceneId: 'a', route: 'junko', chapter: 1, chapterEnd: true },
      { sceneId: 'lost', route: 'junko', chapter: 1, chapterEnd: true },
    ],
  });
  assert.ok(validateScenario(orphan).some((e) => e.includes('lost')));
});

test('validateScenario は未知のフラグ名を検出する', () => {
  const bad = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [
      { sceneId: 'a', route: 'junko', chapter: 1, commands: [{ text: 'x', next: 'b', setFlag: 'bogus_flag' }] },
      { sceneId: 'b', route: 'junko', chapter: 1, chapterEnd: true },
    ],
  });
  assert.ok(validateScenario(bad).some((e) => e.includes('bogus_flag')));
});

function scenarioWithCondition(condition) {
  return loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [
      { sceneId: 'a', route: 'junko', chapter: 1, commands: [{ text: 'x', next: 'b', condition }] },
      { sceneId: 'b', route: 'junko', chapter: 1, chapterEnd: true },
    ],
  });
}

test('validateScenario は condition 内の誤字フラグを検出する', () => {
  const bad = scenarioWithCondition({ flag: 'evidnce_mud' });
  assert.ok(validateScenario(bad).some((e) => e.includes('a') && e.includes('evidnce_mud')));
});

test('validateScenario は condition ノードに認識可能なキーが複数あるとエラーになる', () => {
  const bad = scenarioWithCondition({ flag: 'evidence_mud', buddy: 'hana' });
  assert.ok(validateScenario(bad).length > 0);
});

test('validateScenario は condition ノードの未知キー（誤字した2番目のキー）を検出する', () => {
  const bad = scenarioWithCondition({ flag: 'evidence_mud', buddyy: 'hana' });
  assert.ok(validateScenario(bad).some((e) => e.includes('buddyy')));
});

test('validateScenario は condition ノードに認識可能なキーが1つもないとエラーになる', () => {
  const bad = scenarioWithCondition({});
  assert.ok(validateScenario(bad).length > 0);
});

test('validateScenario は allOf の中の不正なノードを検出する', () => {
  const bad = scenarioWithCondition({ allOf: [{ flag: 'evidence_mud' }, { flag: 'bogus_nested' }] });
  assert.ok(validateScenario(bad).some((e) => e.includes('bogus_nested')));
});

test('validateScenario は not の中の不正なノードを検出する', () => {
  const bad = scenarioWithCondition({ not: { buddyNot: 'shiro' } });
  assert.ok(validateScenario(bad).some((e) => e.includes('shiro')));
});

test('validateScenario は buddyNot の未知の犬IDを検出する', () => {
  const bad = scenarioWithCondition({ buddyNot: 'shiro' });
  assert.ok(validateScenario(bad).some((e) => e.includes('shiro')));
});

test('validateScenario は buddy / support の未知の犬IDを検出する', () => {
  const badBuddy = scenarioWithCondition({ buddy: 'shiro' });
  assert.ok(validateScenario(badBuddy).some((e) => e.includes('shiro')));
  const badSupport = scenarioWithCondition({ support: 'shiro' });
  assert.ok(validateScenario(badSupport).some((e) => e.includes('shiro')));
});

test('validateScenario は countAtLeast の未知カウンタ名を検出する', () => {
  const bad = scenarioWithCondition({ countAtLeast: ['bogus_counter', 3] });
  assert.ok(validateScenario(bad).some((e) => e.includes('bogus_counter')));
});

test('validateScenario は countAtLeast の第2要素が数値でない場合を検出する', () => {
  const bad = scenarioWithCondition({ countAtLeast: ['taichi_mitsumeru', 'three'] });
  assert.ok(validateScenario(bad).length > 0);
});

test('validateScenario は allOf / anyOf の値が配列でない場合を検出する', () => {
  const badAllOf = scenarioWithCondition({ allOf: 'not-an-array' });
  assert.ok(validateScenario(badAllOf).length > 0);
  const badAnyOf = scenarioWithCondition({ anyOf: 'not-an-array' });
  assert.ok(validateScenario(badAnyOf).length > 0);
});

test('validateScenario は KNOWN_DEDUCTIONS 外の deduction 値を検出する', () => {
  assert.deepEqual([...KNOWN_DEDUCTIONS].sort(), ['cat', 'hair', 'mud']);
  const bad = scenarioWithCondition({ deduction: 'bogus_deduction' });
  assert.ok(validateScenario(bad).some((e) => e.includes('bogus_deduction')));
});

test('validateScenario は既知の deduction 値ではエラーにならない', () => {
  const ok = scenarioWithCondition({ deduction: 'mud' });
  assert.deepEqual(validateScenario(ok), []);
});

test('validateScenario は condition が無い/null でもエラーにならない', () => {
  const noCondition = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [
      { sceneId: 'a', route: 'junko', chapter: 1, commands: [{ text: 'x', next: 'b' }] },
      { sceneId: 'b', route: 'junko', chapter: 1, chapterEnd: true },
    ],
  });
  assert.deepEqual(validateScenario(noCondition), []);

  const nullCondition = scenarioWithCondition(null);
  assert.deepEqual(validateScenario(nullCondition), []);
});

test('validateScenario は next の無いコマンドをエラーにしない', () => {
  const ok = loadScenario({
    start: { junko: 'a', taichi: 'a' },
    feedText: {},
    scenes: [
      { sceneId: 'a', route: 'junko', chapter: 1, chapterEnd: true, commands: [{ text: 'x' }] },
    ],
  });
  assert.deepEqual(validateScenario(ok), []);
});

test('章末シーンは nextChapter を持つ（最終章を除く）', () => {
  const s = loadScenario(raw);
  for (const [id, scene] of s.scenes) {
    if (scene.chapterEnd && scene.chapter < 4) {
      assert.ok(scene.nextChapter, `${id} に nextChapter がない`);
      assert.ok(s.scenes.has(scene.nextChapter), `${id}: nextChapter の参照先が存在しない`);
    }
  }
});

test('第2章の「みつめる」は2箇所あり、はなの時は出ない', () => {
  const s = loadScenario(raw);
  const lookCmds = [...s.scenes.values()]
    .flatMap((sc) => sc.commands ?? [])
    .filter((c) => c.count === 'taichi_mitsumeru');
  assert.equal(lookCmds.length, 2);
  for (const c of lookCmds) {
    assert.deepEqual(c.condition, { buddyNot: 'hana' });
  }
});

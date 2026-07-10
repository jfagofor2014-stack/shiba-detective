import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadScenario, validateScenario, KNOWN_DEDUCTIONS } from '../src/scenario.js';
import { visibleCommands, applyCommand, resolveEnding } from '../src/engine.js';
import { ART_IDS } from '../src/ui/art.js';

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

test('章末シーンは nextChapter を持つ（現時点の最終章を除く）', () => {
  // データに存在する最大章より前の章末だけが nextChapter を要求される。
  // 章を1つずつ足していく開発中も、各段階でこの不変条件は成立する。
  const s = loadScenario(raw);
  const maxChapter = Math.max(...[...s.scenes.values()].map((sc) => sc.chapter ?? 0));
  for (const [id, scene] of s.scenes) {
    if (scene.chapterEnd && scene.chapter < maxChapter) {
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

test('送れる推理と受け取れる推理が一対一で対応する', () => {
  const s = loadScenario(raw);
  const cmds = [...s.scenes.values()].flatMap((sc) => sc.commands ?? []);
  const sent = new Set(cmds.filter((c) => c.sendDeduction).map((c) => c.sendDeduction));
  const received = new Set(
    cmds.filter((c) => c.condition?.deduction).map((c) => c.condition.deduction)
  );
  assert.deepEqual([...sent].sort(), ['cat', 'hair', 'mud']);
  assert.deepEqual([...received].sort(), ['cat', 'hair', 'mud']);
});

test('推理を送るコマンドは対応するフラグを条件に持つ', () => {
  const s = loadScenario(raw);
  const byDeduction = Object.fromEntries(
    [...s.scenes.values()].flatMap((sc) => sc.commands ?? [])
      .filter((c) => c.sendDeduction).map((c) => [c.sendDeduction, c.condition])
  );
  assert.deepEqual(byDeduction.cat, { flag: 'info_black_cat' });
  assert.deepEqual(byDeduction.hair, { flag: 'evidence_black_hair' });
  assert.deepEqual(byDeduction.mud, { flag: 'evidence_mud' });
});

test('found_empty_box は雷蔵と蔵之介の2経路でのみ取れる', () => {
  const s = loadScenario(raw);
  const setters = [...s.scenes.values()]
    .flatMap((sc) => (sc.commands ?? []).map((c) => [sc.sceneId, c]))
    .filter(([, c]) => c.setFlag === 'found_empty_box')
    .map(([id]) => id);
  assert.deepEqual(setters.sort(), ['ch3_taichi_kuranosuke_rage', 'ch3_taichi_raizo']);
});

test('蔵之介の狂犬化は info_satoru_bag を要求する（乱数を使わない）', () => {
  const s = loadScenario(raw);
  const rage = s.scenes.get('ch3_taichi_buddy').commands
    .find((c) => c.next === 'ch3_taichi_kuranosuke_rage');
  assert.deepEqual(rage.condition, {
    allOf: [{ buddy: 'kuranosuke' }, { flag: 'info_satoru_bag' }],
  });
});

const BUDDY_ASSIGNMENTS = [
  ['raizo', 'hana'], ['raizo', 'kuranosuke'],
  ['hana', 'raizo'], ['hana', 'kuranosuke'],
  ['kuranosuke', 'raizo'], ['kuranosuke', 'hana'],
];

// あるバディ配分で到達しうるフラグ集合をすべて列挙する（フラグは単調増加なので有限）
function reachableFlagSets(scenario, junkoBuddy, taichiBuddy) {
  const dogs = ['raizo', 'hana', 'kuranosuke'];
  const support = dogs.find((d) => d !== junkoBuddy && d !== taichiBuddy);
  const initial = {
    buddies: { junko: junkoBuddy, taichi: taichiBuddy },
    supportDog: support,
    sceneId: { ...scenario.start },
    chapter: { junko: 1, taichi: 1 },
    chapterDone: { junko: false, taichi: false },
    flags: {}, counters: {}, deductions: [], ending: null,
  };

  const seen = new Set();
  const results = new Set();
  const stack = [initial];

  // カウンタは 3 で頭打ちにする。taichi_delay の導出は 3 以上で同じ挙動になるため、
  // 4回目以降を別状態として数えると探索が停止しない。
  const key = (s) =>
    JSON.stringify([
      s.sceneId,
      Object.keys(s.flags).sort(),
      Object.fromEntries(Object.entries(s.counters).map(([k, v]) => [k, Math.min(v, 3)])),
      [...s.deductions].sort(),
    ]);

  while (stack.length) {
    const s = stack.pop();
    const k = key(s);
    if (seen.has(k)) continue;
    seen.add(k);
    results.add(JSON.stringify(Object.keys(s.flags).sort()));

    for (const route of ['junko', 'taichi']) {
      const scene = scenario.scenes.get(s.sceneId[route]);
      if (!scene) continue;
      if (scene.chapterEnd) {
        if (scene.nextChapter && scenario.scenes.has(scene.nextChapter)) {
          stack.push({ ...s, sceneId: { ...s.sceneId, [route]: scene.nextChapter } });
        }
        continue;
      }
      for (const cmd of visibleCommands(scene, s)) {
        stack.push(applyCommand(s, { ...cmd, route }));
      }
    }
  }
  return [...results].map((r) => JSON.parse(r));
}

function endingsFor(scenario, junkoBuddy, taichiBuddy) {
  const set = new Set();
  for (const flagList of reachableFlagSets(scenario, junkoBuddy, taichiBuddy)) {
    const flags = Object.fromEntries(flagList.map((f) => [f, true]));
    set.add(resolveEnding(flags));
  }
  return set;
}

test('エンディングシーンが4種そろっている（Cの派生を含めて5）', () => {
  const s = loadScenario(raw);
  for (const id of ['ch4_ending_a', 'ch4_ending_b', 'ch4_ending_c', 'ch4_ending_c_delay', 'ch4_ending_d']) {
    assert.ok(s.scenes.has(id), `${id} が無い`);
  }
});

test('たいちが雷蔵か蔵之介なら A・B・C・D すべてに到達できる', () => {
  const s = loadScenario(raw);
  for (const [j, t] of BUDDY_ASSIGNMENTS.filter(([, t]) => t !== 'hana')) {
    const got = endingsFor(s, j, t);
    for (const e of ['A', 'B', 'C', 'D']) {
      assert.ok(got.has(e), `バディ(${j}/${t}) でエンディング ${e} に到達できない`);
    }
  }
});

test('たいちがはなの時は found_empty_box が取れず、A・D に到達しない', () => {
  const s = loadScenario(raw);
  for (const [j, t] of BUDDY_ASSIGNMENTS.filter(([, t]) => t === 'hana')) {
    const got = endingsFor(s, j, t);
    assert.ok(!got.has('A'), `バディ(${j}/${t}) で A に到達してしまう`);
    assert.ok(!got.has('D'), `バディ(${j}/${t}) で D に到達してしまう`);
    assert.ok(got.has('B'), `バディ(${j}/${t}) で B に到達できない`);
    assert.ok(got.has('C'), `バディ(${j}/${t}) で C に到達できない`);
  }
});

test('taichi_delay はどのバディ配分でも「みつめる」が出る時だけ立つ', () => {
  const s = loadScenario(raw);
  const withHana = reachableFlagSets(s, 'raizo', 'hana');
  assert.ok(!withHana.some((fs) => fs.includes('taichi_delay')));
  const withRaizo = reachableFlagSets(s, 'hana', 'raizo');
  assert.ok(withRaizo.some((fs) => fs.includes('taichi_delay')));
});

test('シナリオの art はすべて実在する', () => {
  const s = loadScenario(raw);
  for (const [id, scene] of s.scenes) {
    if (scene.art) assert.ok(ART_IDS.includes(scene.art), `${id}: 未知の art -> ${scene.art}`);
  }
});

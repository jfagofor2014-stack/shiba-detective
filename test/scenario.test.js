import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadScenario, validateScenario } from '../src/scenario.js';

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

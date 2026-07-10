import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typewriter } from '../src/ui/typewriter.js';

// schedule を即時実行に差し替えると、同期的に全文が流れる
const immediate = (fn) => { fn(); return 0; };

test('1文字ずつ onChar が呼ばれ、最後に onDone', () => {
  const chars = [];
  let done = false;
  typewriter('あいう', { onChar: (c) => chars.push(c), onDone: () => { done = true; }, schedule: immediate });
  assert.deepEqual(chars, ['あ', 'い', 'う']);
  assert.equal(done, true);
});

test('サロゲートペアを壊さない', () => {
  const chars = [];
  typewriter('🐕柴', { onChar: (c) => chars.push(c), onDone: () => {}, schedule: immediate });
  assert.deepEqual(chars, ['🐕', '柴']);
});

test('skip() で残りを一気に流し、onDone を1度だけ呼ぶ', () => {
  const chars = [];
  let doneCount = 0;
  const pending = [];
  const deferred = (fn) => { pending.push(fn); return pending.length; };
  const t = typewriter('あいうえお', { onChar: (c) => chars.push(c), onDone: () => doneCount++, schedule: deferred });
  pending.shift()();          // 「あ」だけ流す
  assert.deepEqual(chars, ['あ']);
  t.skip();
  assert.deepEqual(chars, ['あ', 'い', 'う', 'え', 'お']);
  assert.equal(doneCount, 1);
  t.skip();                   // 2度目の skip は無視される
  assert.equal(doneCount, 1);
});

test('空文字は即 onDone', () => {
  let done = false;
  typewriter('', { onChar: () => assert.fail('呼ばれてはいけない'), onDone: () => { done = true; }, schedule: immediate });
  assert.equal(done, true);
});

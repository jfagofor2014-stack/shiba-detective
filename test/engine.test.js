import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/engine.js';

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

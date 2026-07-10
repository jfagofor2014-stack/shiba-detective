import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, saveState, loadState, clearState, STORAGE_KEY } from '../src/state.js';

const fakeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
};

test('createState はお留守番の犬を自動で決める', () => {
  const s = createState({
    buddies: { junko: 'raizo', taichi: 'kuranosuke' },
    start: { junko: 'a', taichi: 'b' },
  });
  assert.equal(s.supportDog, 'hana');
  assert.deepEqual(s.flags, {});
  assert.deepEqual(s.chapter, { junko: 1, taichi: 1 });
  assert.equal(s.ending, null);
});

test('createState は同じ犬を2人が選ぶと例外', () => {
  assert.throws(
    () => createState({ buddies: { junko: 'raizo', taichi: 'raizo' }, start: { junko: 'a', taichi: 'b' } }),
    /same buddy/
  );
});

test('save してから load すると同じ state が返る', () => {
  const st = fakeStorage();
  const s = createState({ buddies: { junko: 'hana', taichi: 'raizo' }, start: { junko: 'a', taichi: 'b' } });
  s.flags.evidence_mud = true;
  saveState(s, st);
  assert.deepEqual(loadState(st), s);
});

test('保存が無ければ load は null', () => {
  assert.equal(loadState(fakeStorage()), null);
});

test('壊れたJSONが入っていても load は null を返す', () => {
  const st = fakeStorage();
  st.setItem(STORAGE_KEY, '{ broken');
  assert.equal(loadState(st), null);
});

test('clearState で消える', () => {
  const st = fakeStorage();
  saveState(createState({ buddies: { junko: 'hana', taichi: 'raizo' }, start: { junko: 'a', taichi: 'b' } }), st);
  clearState(st);
  assert.equal(loadState(st), null);
});

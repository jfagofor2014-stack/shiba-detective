export const STORAGE_KEY = 'shiba_detective_state';
export const DOGS = ['raizo', 'hana', 'kuranosuke'];

export function createState({ buddies, start }) {
  if (buddies.junko === buddies.taichi) throw new Error('same buddy chosen by both players');
  const supportDog = DOGS.find((d) => d !== buddies.junko && d !== buddies.taichi);
  return {
    buddies: { ...buddies },
    supportDog,
    sceneId: { ...start },
    chapter: { junko: 1, taichi: 1 },
    chapterDone: { junko: false, taichi: false },
    flags: {},
    counters: {},
    deductions: [],
    ending: null,
  };
}

export function saveState(state, storage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearState(storage) {
  storage.removeItem(STORAGE_KEY);
}

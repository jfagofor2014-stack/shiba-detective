export function createSound() {
  let ctx = null;
  let enabled = false;
  let lastBlipAt = -Infinity;
  const BLIP_MIN_INTERVAL = 0.015; // seconds of AudioContext time

  const ensure = () => (ctx ??= new (window.AudioContext ?? window.webkitAudioContext)());

  const tone = (freq, ms, gainValue = 0.03) => {
    if (!enabled) return;
    const ac = ensure();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + ms / 1000);
  };

  return {
    get enabled() { return enabled; },
    toggle() { enabled = !enabled; if (enabled) ensure(); return enabled; },
    blip() {
      if (!enabled) return;
      const now = ensure().currentTime;
      if (now - lastBlipAt < BLIP_MIN_INTERVAL) return;
      lastBlipAt = now;
      tone(880, 12);
    },
    jingle() { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 90, 0.05), i * 90)); },
  };
}

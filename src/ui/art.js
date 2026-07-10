const wrap = (body) =>
  `<svg viewBox="0 0 160 100" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;

const S = {
  living: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="20" y="52" width="60" height="28" fill="none" stroke="currentColor"/>
    <rect x="24" y="44" width="14" height="8" fill="none" stroke="currentColor"/>
    <rect x="44" y="44" width="14" height="8" fill="none" stroke="currentColor"/>
    <rect x="100" y="20" width="40" height="30" fill="none" stroke="currentColor"/>
    <line x1="120" y1="20" x2="120" y2="50" stroke="currentColor"/>
    <rect x="96" y="66" width="44" height="4" fill="currentColor"/>`,
  entrance: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="56" y="24" width="48" height="72" fill="none" stroke="currentColor"/>
    <circle cx="96" cy="60" r="2" fill="currentColor"/>
    <rect x="24" y="84" width="16" height="6" fill="none" stroke="currentColor"/>
    <rect x="120" y="84" width="16" height="6" fill="none" stroke="currentColor"/>`,
  slope: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <path d="M4 88 L156 40" fill="none" stroke="currentColor"/>
    <path d="M4 96 L156 48" fill="none" stroke="currentColor"/>
    <rect x="30" y="52" width="18" height="24" fill="none" stroke="currentColor"/>
    <rect x="70" y="38" width="18" height="24" fill="none" stroke="currentColor"/>
    <rect x="110" y="24" width="18" height="24" fill="none" stroke="currentColor"/>`,
  nikuten: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="20" y="16" width="120" height="14" fill="none" stroke="currentColor"/>
    <text x="80" y="27" font-size="9" text-anchor="middle" fill="currentColor" font-family="monospace">INOUE</text>
    <rect x="28" y="48" width="104" height="34" fill="none" stroke="currentColor"/>
    <circle cx="50" cy="64" r="6" fill="none" stroke="currentColor"/>
    <circle cx="70" cy="64" r="6" fill="none" stroke="currentColor"/>
    <circle cx="90" cy="64" r="6" fill="none" stroke="currentColor"/>`,
  shimabaraya: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <path d="M20 34 L80 12 L140 34" fill="none" stroke="currentColor"/>
    <rect x="28" y="34" width="104" height="52" fill="none" stroke="currentColor"/>
    <rect x="44" y="52" width="24" height="34" fill="none" stroke="currentColor"/>
    <rect x="92" y="52" width="24" height="20" fill="none" stroke="currentColor"/>`,
  station: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <rect x="16" y="30" width="128" height="40" fill="none" stroke="currentColor"/>
    <line x1="16" y1="78" x2="144" y2="78" stroke="currentColor"/>
    <line x1="16" y1="86" x2="144" y2="86" stroke="currentColor"/>
    <rect x="60" y="42" width="40" height="28" fill="none" stroke="currentColor"/>`,
  kichi: `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <line x1="4" y1="72" x2="156" y2="72" stroke="currentColor"/>
    <rect x="16" y="40" width="30" height="32" fill="none" stroke="currentColor"/>
    <rect x="56" y="28" width="30" height="44" fill="none" stroke="currentColor"/>
    <rect x="96" y="46" width="30" height="26" fill="none" stroke="currentColor"/>
    <line x1="140" y1="20" x2="140" y2="72" stroke="currentColor"/>
    <circle cx="140" cy="18" r="3" fill="currentColor"/>`,
  raizo: dogFace('RAIZO', 'sharp'),
  hana: dogFace('HANA', 'calm'),
  kuranosuke: dogFace('KURANOSUKE', 'wide'),
};

function dogFace(name, mood) {
  const eyes =
    mood === 'sharp' ? `<rect x="56" y="44" width="10" height="4" fill="currentColor"/><rect x="94" y="44" width="10" height="4" fill="currentColor"/>`
    : mood === 'calm' ? `<rect x="56" y="44" width="10" height="6" fill="currentColor"/><rect x="94" y="44" width="10" height="6" fill="currentColor"/>`
    : `<circle cx="61" cy="46" r="4" fill="currentColor"/><circle cx="99" cy="46" r="4" fill="currentColor"/>`;
  return `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>
    <path d="M46 40 L54 18 L68 34" fill="none" stroke="currentColor"/>
    <path d="M114 40 L106 18 L92 34" fill="none" stroke="currentColor"/>
    <ellipse cx="80" cy="56" rx="34" ry="30" fill="none" stroke="currentColor"/>
    ${eyes}
    <rect x="74" y="62" width="12" height="6" fill="currentColor"/>
    <path d="M80 68 L80 74 M80 74 Q72 80 66 74 M80 74 Q88 80 94 74" fill="none" stroke="currentColor"/>
    <text x="80" y="94" font-size="7" text-anchor="middle" fill="currentColor" font-family="monospace">${name}</text>`;
}

export const ART_IDS = Object.keys(S);
export function art(id) {
  return wrap(S[id] ?? `<rect x="4" y="4" width="152" height="92" fill="none" stroke="currentColor"/>`);
}

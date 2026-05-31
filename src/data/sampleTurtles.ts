// Bundled sample "turtle photos" as inline SVG data URIs so the prototype works
// fully offline with no asset pipeline. Each is a cute pastel turtle scene.

function svg(bg: string, shell: string, shellDark: string, accent: string): string {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>
    <rect width='400' height='400' fill='${bg}'/>
    <circle cx='70' cy='70' r='26' fill='${accent}' opacity='0.5'/>
    <circle cx='330' cy='110' r='18' fill='${accent}' opacity='0.5'/>
    <ellipse cx='200' cy='320' rx='150' ry='30' fill='${shellDark}' opacity='0.18'/>
    <ellipse cx='200' cy='235' rx='120' ry='90' fill='${shell}'/>
    <ellipse cx='200' cy='235' rx='80' ry='60' fill='${shellDark}'/>
    <path d='M200 195 l34 26 -13 40 -42 0 -13 -40 z' fill='${shell}' opacity='0.85'/>
    <circle cx='200' cy='130' r='46' fill='${shell}'/>
    <circle cx='184' cy='124' r='7' fill='#3a4a3f'/>
    <circle cx='216' cy='124' r='7' fill='#3a4a3f'/>
    <circle cx='186' cy='122' r='2.4' fill='#fff'/>
    <circle cx='218' cy='122' r='2.4' fill='#fff'/>
    <path d='M186 146 q14 14 28 0' stroke='#3a4a3f' stroke-width='4' fill='none' stroke-linecap='round'/>
    <circle cx='168' cy='140' r='8' fill='#ff9eb5' opacity='0.55'/>
    <circle cx='232' cy='140' r='8' fill='#ff9eb5' opacity='0.55'/>
    <circle cx='96' cy='300' r='22' fill='${shell}'/>
    <circle cx='304' cy='300' r='22' fill='${shell}'/>
    <path d='M0 350 Q100 340 200 355 Q300 365 400 350 L400 400 L0 400 Z' fill='${shellDark}' opacity='0.13'/>
    <circle cx='128' cy='292' r='8' fill='none' stroke='${accent}' stroke-width='2' opacity='0.55'/>
    <circle cx='146' cy='272' r='5' fill='none' stroke='${accent}' stroke-width='1.5' opacity='0.45'/>
    <circle cx='270' cy='282' r='6' fill='none' stroke='${accent}' stroke-width='1.5' opacity='0.5'/>
    <path d='M196 78 c0-6 -10-6 -10 0 c0 8 10 14 10 14 c0 0 10-6 10-14 c0-6 -10-6 -10 0 z' fill='${accent}' opacity='0.75'/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

export interface SampleTurtle {
  id: string;
  label: string;
  url: string;
}

export const SAMPLE_TURTLES: SampleTurtle[] = [
  { id: "mint", label: "Minty", url: svg("#d8f3e0", "#8fd6a8", "#5fb083", "#ffd6a5") },
  { id: "blue", label: "Splashy", url: svg("#d9ecfb", "#8fbdf0", "#5f8ed6", "#ffc4d6") },
  { id: "pink", label: "Rosie", url: svg("#fbe2ec", "#f7a8c4", "#e26d97", "#bfe3ff") },
  { id: "lilac", label: "Violet", url: svg("#ece4fb", "#c3b3f0", "#8f78d6", "#ffe1a8") },
  { id: "sand", label: "Sandy", url: svg("#fbf0d9", "#ffcf73", "#e6a230", "#9fdcc0") },
  { id: "moss", label: "Mossy", url: svg("#e6f0d9", "#aacf73", "#7fa83f", "#ffd6e0") },
];

/** Playful placeholder "AI-generated" turtle (used by AI Rescue in the prototype). */
export function generateAiTurtle(seed: string): string {
  const palettes = [
    ["#e7defb", "#b39ddb", "#7e57c2", "#ffe1a8"],
    ["#dbf3ff", "#7fd3f0", "#3aa7d6", "#ffc4d6"],
    ["#ffe6f0", "#ff9ec4", "#e2629b", "#bfe3ff"],
  ];
  const p = palettes[Math.abs(hash(seed)) % palettes.length];
  return svg(p[0], p[1], p[2], p[3]);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

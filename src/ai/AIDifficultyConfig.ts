import type { AIDifficultyParams, HeuristicWeights } from './types';

interface AnchorPoint {
  level: number;
  thinkDelayMin: number;
  thinkDelayMax: number;
  actionInterval: number;
  mistakeRate: number;
  mistakeTopN: number;
  weights: HeuristicWeights;
  useHold: boolean;
  kickSearch: boolean;
  twoPieceLookahead: boolean;
}

const ANCHORS: readonly AnchorPoint[] = [
  {
    level: 1,
    thinkDelayMin: 2000, thinkDelayMax: 2400,
    actionInterval: 260, mistakeRate: 0.45, mistakeTopN: 10,
    weights: { height: 0.2, holes: 0.1, lines: 0.4, bumpiness: 0.05, well: 0.0, tspin: 0.0 },
    useHold: false, kickSearch: false, twoPieceLookahead: false,
  },
  {
    level: 25,
    thinkDelayMin: 900, thinkDelayMax: 1200,
    actionInterval: 170, mistakeRate: 0.20, mistakeTopN: 5,
    weights: { height: 0.5, holes: 0.3, lines: 0.7, bumpiness: 0.2, well: 0.1, tspin: 0.0 },
    useHold: false, kickSearch: false, twoPieceLookahead: false,
  },
  {
    level: 50,
    thinkDelayMin: 450, thinkDelayMax: 650,
    actionInterval: 110, mistakeRate: 0.08, mistakeTopN: 3,
    weights: { height: 0.8, holes: 0.6, lines: 1.0, bumpiness: 0.35, well: 0.3, tspin: 0.1 },
    useHold: true, kickSearch: false, twoPieceLookahead: false,
  },
  {
    level: 75,
    thinkDelayMin: 200, thinkDelayMax: 350,
    actionInterval: 70, mistakeRate: 0.03, mistakeTopN: 3,
    weights: { height: 1.2, holes: 1.0, lines: 1.3, bumpiness: 0.55, well: 0.5, tspin: 0.3 },
    useHold: true, kickSearch: true, twoPieceLookahead: true,
  },
  {
    level: 100,
    thinkDelayMin: 50, thinkDelayMax: 120,
    actionInterval: 30, mistakeRate: 0.01, mistakeTopN: 2,
    weights: { height: 1.8, holes: 1.5, lines: 2.0, bumpiness: 0.8, well: 0.8, tspin: 0.5 },
    useHold: true, kickSearch: true, twoPieceLookahead: true,
  },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpWeights(a: HeuristicWeights, b: HeuristicWeights, t: number): HeuristicWeights {
  return {
    height: lerp(a.height, b.height, t),
    holes: lerp(a.holes, b.holes, t),
    lines: lerp(a.lines, b.lines, t),
    bumpiness: lerp(a.bumpiness, b.bumpiness, t),
    well: lerp(a.well, b.well, t),
    tspin: lerp(a.tspin, b.tspin, t),
  };
}

export function getDifficultyConfig(level: number): AIDifficultyParams {
  const clamped = Math.max(1, Math.min(100, level));

  // Find surrounding anchor points
  let lower = ANCHORS[0]!;
  let upper = ANCHORS[ANCHORS.length - 1]!;

  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (clamped >= ANCHORS[i]!.level && clamped <= ANCHORS[i + 1]!.level) {
      lower = ANCHORS[i]!;
      upper = ANCHORS[i + 1]!;
      break;
    }
  }

  const range = upper.level - lower.level;
  const t = range === 0 ? 0 : (clamped - lower.level) / range;

  return {
    thinkDelayMin: Math.round(lerp(lower.thinkDelayMin, upper.thinkDelayMin, t)),
    thinkDelayMax: Math.round(lerp(lower.thinkDelayMax, upper.thinkDelayMax, t)),
    actionInterval: Math.round(lerp(lower.actionInterval, upper.actionInterval, t)),
    mistakeRate: lerp(lower.mistakeRate, upper.mistakeRate, t),
    mistakeTopN: Math.round(lerp(lower.mistakeTopN, upper.mistakeTopN, t)),
    weights: lerpWeights(lower.weights, upper.weights, t),
    useHold: clamped >= 40,
    kickSearch: clamped >= 60,
    twoPieceLookahead: clamped >= 65,
  };
}

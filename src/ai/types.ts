export interface AIPlacement {
  targetCol: number;
  targetRotation: number;
  useHold: boolean;
  score: number;
}

export interface AIDifficultyParams {
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

export interface HeuristicWeights {
  height: number;
  holes: number;
  lines: number;
  bumpiness: number;
  well: number;
  tspin: number;
}

export enum AIState {
  WAITING_FOR_PIECE = 'waiting',
  REQUEST_SENT = 'request_sent',
  THINKING = 'thinking',
  EXECUTING = 'executing',
}

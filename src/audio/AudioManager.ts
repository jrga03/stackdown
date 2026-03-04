export enum Sound {
  MOVE = 'move',
  ROTATE = 'rotate',
  LOCK = 'lock',
  LINE_CLEAR = 'line_clear',
  QUAD = 'quad',
  TSPIN = 'tspin',
  LEVEL_UP = 'level_up',
  GAME_OVER = 'game_over',
}

export class AudioManager {
  play(_sound: Sound): void {
    // Stub -- no audio yet
  }

  setVolume(_volume: number): void {
    // Stub
  }

  mute(): void {
    // Stub
  }

  unmute(): void {
    // Stub
  }
}

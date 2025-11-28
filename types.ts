export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Cube {
  id: string;
  position: [number, number, number];
  color: string;
  points: number;
}

export enum GameStatus {
  IDLE = 'IDLE',
  LOADING_MODEL = 'LOADING_MODEL',
  PLAYING = 'PLAYING',
  GENERATING_LEVEL = 'GENERATING_LEVEL',
  GAME_OVER = 'GAME_OVER'
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

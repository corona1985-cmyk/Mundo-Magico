export type AppState =
  | 'HOME'
  | 'SELECT_TEMPLATE'
  | 'CREATOR'
  | 'RESULT'
  | 'GALLERY'
  | 'GAME'
  | 'LEVEL_SELECT'
  | 'AI_GENERATE';

export interface NumberPosition {
  x: number;
  y: number;
}

export interface BaseAnimal {
  id: string;
  name: string;
  icon: string;
  color: string;
  pathData: Record<string, string>;
  detailPath: string;
  numberPositions: Record<string, NumberPosition>;
}

export interface MagicElement {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface MagicPet {
  name: string;
  baseAnimal: string;
  element: string;
  personality: string;
  imageUrl?: string;
  aiImageUrl?: string;
  story?: string;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isMoving?: boolean;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  speed?: number;
  progress?: number;
  moveDir?: number;
}

export interface Hazard {
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
}

export interface Coin {
  x: number;
  y: number;
}

export interface Goal {
  x: number;
  y: number;
}

export interface GameLevel {
  id: number;
  platforms: Platform[];
  hazards: Hazard[];
  coins: Coin[];
  goal: Goal;
  background: string;
}

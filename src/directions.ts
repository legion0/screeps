import { Direction } from './constants';

export function reverseDirection(dir: Direction) {
  switch (dir) {
    case BOTTOM: return TOP;
    case TOP: return BOTTOM;
    case LEFT: return RIGHT;
    case RIGHT: return LEFT;
    case BOTTOM_LEFT: return TOP_RIGHT;
    case BOTTOM_RIGHT: return TOP_LEFT;
    case TOP_LEFT: return BOTTOM_RIGHT;
    case TOP_RIGHT: return BOTTOM_LEFT;
  }
}

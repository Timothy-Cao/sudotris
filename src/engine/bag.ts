import { Rng } from './rng';
import { PieceType, TileColor, NUM_COLORS } from './types';

const BOMB_TYPES: PieceType[] = ['BOMB_ROW', 'BOMB_COL', 'BOMB_3X3'];
const BOMB_INTERVAL = 10; // every 10th piece is a bomb

export interface BagPiece {
  type: PieceType;
  colors: TileColor[];
}

export function createBag(rng: Rng) {
  let queue: PieceType[] = [];
  const buffer: BagPiece[] = [];
  let pieceCount = 0;

  function refill() {
    const bag: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    rng.shuffle(bag);
    queue.push(...bag);
  }

  function generatePiece(): BagPiece {
    pieceCount++;

    // Every 10th piece is a bomb
    if (pieceCount % BOMB_INTERVAL === 0) {
      const bombType = BOMB_TYPES[Math.floor(rng.next() * BOMB_TYPES.length)];
      return { type: bombType, colors: [] }; // bombs have no colors
    }

    if (queue.length === 0) refill();
    const type = queue.shift()!;
    const allColors: TileColor[] = Array.from({ length: NUM_COLORS }, (_, i) => (i + 1) as TileColor);
    const colors = rng.sampleWithout(allColors, 4) as TileColor[];
    return { type, colors };
  }

  function ensureBuffer(n: number = 4) {
    while (buffer.length < n) buffer.push(generatePiece());
  }

  function next(): BagPiece {
    ensureBuffer();
    const piece = buffer.shift()!;
    ensureBuffer();
    return piece;
  }

  function peekN(count: number): BagPiece[] {
    ensureBuffer(count + 1);
    return buffer.slice(0, count);
  }

  return { next, peekN };
}

export type Bag = ReturnType<typeof createBag>;

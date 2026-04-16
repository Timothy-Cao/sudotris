import { Rng } from './rng';
import { PieceType, TileColor, NUM_COLORS } from './types';

export interface BagPiece {
  type: PieceType;
  colors: TileColor[];
}

export function createBag(rng: Rng) {
  let queue: PieceType[] = [];
  const buffer: BagPiece[] = [];

  function refill() {
    const bag: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    rng.shuffle(bag);
    queue.push(...bag);
  }

  function generatePiece(): BagPiece {
    if (queue.length === 0) refill();
    const type = queue.shift()!;
    // Fully random colors (with replacement)
    const colors: TileColor[] = Array.from({ length: 4 }, () =>
      (Math.floor(rng.next() * NUM_COLORS) + 1) as TileColor
    );
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

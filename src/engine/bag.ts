import { Rng } from './rng';
import { PieceType, TileColor, NUM_COLORS } from './types';
import { getRowMajorTiles } from './pieces';

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
    const allColors: TileColor[] = Array.from({ length: NUM_COLORS }, (_, i) => (i + 1) as TileColor);
    // Sample 4 unique colors
    const colors = rng.sampleWithout(allColors, 4) as TileColor[];
    // Colors map to tiles in row-major order of the spawn rotation (state 0)
    // The caller uses getRowMajorTiles to assign colors to tile offsets
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

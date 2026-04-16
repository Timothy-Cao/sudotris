import { Rng } from './rng';
import { PieceType, TileColor } from './types';
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
    const allColors: TileColor[] = [1, 2, 3, 4, 5, 6];
    // Sample 4 unique colors
    const colors = rng.sampleWithout(allColors, 4) as TileColor[];
    // Colors map to tiles in row-major order of the spawn rotation (state 0)
    // The caller uses getRowMajorTiles to assign colors to tile offsets
    return { type, colors };
  }

  function ensureBuffer() {
    while (buffer.length < 2) buffer.push(generatePiece());
  }

  function next(): BagPiece {
    ensureBuffer();
    const piece = buffer.shift()!;
    ensureBuffer();
    return piece;
  }

  function peek(): BagPiece {
    ensureBuffer();
    return buffer[0];
  }

  return { next, peek };
}

export type Bag = ReturnType<typeof createBag>;

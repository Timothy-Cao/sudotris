import { BOARD_WIDTH, BOARD_HEIGHT, VISIBLE_HEIGHT } from '../engine/types';
import { CELL_SIZE } from './colors';

const TOTAL_VISIBLE_ROWS = 21;

function boardRowToCanvasY(row: number): number {
  return (TOTAL_VISIBLE_ROWS - 1 - row) * CELL_SIZE;
}

interface Animation {
  elapsed: number;
  duration: number;
  draw: (ctx: CanvasRenderingContext2D, progress: number) => void;
}

const activeAnimations: Animation[] = [];

export function addAnimation(anim: Omit<Animation, 'elapsed'>) {
  activeAnimations.push({ ...anim, elapsed: 0 });
}

export function tickAnimations(dt: number) {
  for (let i = activeAnimations.length - 1; i >= 0; i--) {
    activeAnimations[i].elapsed += dt;
    if (activeAnimations[i].elapsed >= activeAnimations[i].duration) {
      activeAnimations.splice(i, 1);
    }
  }
}

export function drawAnimations(ctx: CanvasRenderingContext2D) {
  for (const anim of activeAnimations) {
    const progress = Math.min(anim.elapsed / anim.duration, 1);
    anim.draw(ctx, progress);
  }
}

export function hasActiveAnimations(): boolean {
  return activeAnimations.length > 0;
}

// Line clear animation: white flash that fades out
export function animateLineClear(rows: number[]) {
  addAnimation({
    duration: 400,
    draw: (ctx, progress) => {
      // Flash white -> fade out
      const alpha = 1 - progress;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      for (const r of rows) {
        if (r >= 0 && r < TOTAL_VISIBLE_ROWS) {
          const cy = boardRowToCanvasY(r);
          ctx.fillRect(0, cy, BOARD_WIDTH * CELL_SIZE, CELL_SIZE);
        }
      }

      // Expanding particles
      if (progress < 0.6) {
        const particleAlpha = (0.6 - progress) / 0.6;
        ctx.fillStyle = `rgba(255, 255, 100, ${particleAlpha * 0.6})`;
        for (const r of rows) {
          const cy = boardRowToCanvasY(r) + CELL_SIZE / 2;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = progress * 60;
            const px = (BOARD_WIDTH * CELL_SIZE / 2) + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(px, py, 3 - progress * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    },
  });
}

// Bomb explosion animation: expanding ring + flash
export function animateBombExplosion(
  bombRow: number,
  bombCol: number,
  bombType: 'BOMB_ROW' | 'BOMB_COL' | 'BOMB_3X3'
) {
  addAnimation({
    duration: 500,
    draw: (ctx, progress) => {
      const centerX = bombCol * CELL_SIZE + CELL_SIZE / 2;
      const centerY = boardRowToCanvasY(bombRow) + CELL_SIZE / 2;
      const alpha = 1 - progress;

      if (bombType === 'BOMB_ROW') {
        // Horizontal shockwave
        const spreadX = progress * BOARD_WIDTH * CELL_SIZE;
        const height = CELL_SIZE * (1 + progress * 0.5);
        ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.5})`;
        ctx.fillRect(
          centerX - spreadX / 2,
          centerY - height / 2,
          spreadX,
          height
        );
        // Bright core line
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.7})`;
        ctx.fillRect(
          centerX - spreadX / 2,
          centerY - 2,
          spreadX,
          4
        );
      } else if (bombType === 'BOMB_COL') {
        // Vertical shockwave
        const spreadY = progress * TOTAL_VISIBLE_ROWS * CELL_SIZE;
        const width = CELL_SIZE * (1 + progress * 0.5);
        ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.5})`;
        ctx.fillRect(
          centerX - width / 2,
          centerY - spreadY / 2,
          width,
          spreadY
        );
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.7})`;
        ctx.fillRect(
          centerX - 2,
          centerY - spreadY / 2,
          4,
          spreadY
        );
      } else {
        // 3x3 expanding ring
        const maxRadius = CELL_SIZE * 2.5;
        const radius = progress * maxRadius;
        ctx.strokeStyle = `rgba(255, 150, 50, ${alpha * 0.8})`;
        ctx.lineWidth = 4 * (1 - progress);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner flash
        const flashAlpha = Math.max(0, 1 - progress * 2);
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 200, 100, ${flashAlpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(centerX, centerY, CELL_SIZE * 1.5 * (1 - progress), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Central flash for all bomb types
      if (progress < 0.2) {
        const flashAlpha = (0.2 - progress) / 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, CELL_SIZE * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });
}

// Penalty row animation: red flash on the row before it's removed
export function animatePenaltyRow(rows: number[]) {
  addAnimation({
    duration: 350,
    draw: (ctx, progress) => {
      const alpha = (1 - progress) * 0.6;
      ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      for (const r of rows) {
        if (r >= 0 && r < TOTAL_VISIBLE_ROWS) {
          const cy = boardRowToCanvasY(r);
          ctx.fillRect(0, cy, BOARD_WIDTH * CELL_SIZE, CELL_SIZE);
        }
      }
    },
  });
}

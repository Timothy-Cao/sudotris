# Sudotris — Design Spec

Daily puzzle game: Sudoku color-uniqueness constraint meets Tetris stacking mechanics. 5-minute timed, date-seeded, score-attack.

## Stack

- Next.js (App Router, TypeScript), Tailwind CSS
- HTML5 Canvas for game rendering
- Pure TS engine with zero React/DOM dependencies
- localStorage for settings and high scores

## Game Model

### Board

- 6 columns x 21 rows internally
- Rows 0-17: visible playfield (row 0 = bottom, row 17 = top)
- Rows 18-20: spawn zone (3 rows above visible board, not rendered)
- Each cell: empty or `{ color: 1-6 }`
- Color doubles as the number displayed on the tile

### Locked Rows

- Tracked as a `Set<number>` of row indices
- Visually distinct (dimmed/hatched overlay)
- Cannot be cleared — permanently consume playfield space
- Shift down when rows below them are cleared

### Line Clear Logic (evaluated bottom-up after each piece lock)

1. Is the row full (all 6 cells occupied)?
2. Yes + all 6 colors unique → clear the row, everything above shifts down (including locked rows)
3. Yes + colors not unique → the lowest non-locked row becomes locked
4. Multiple full rows evaluated independently in a single frame

### Pieces

- Standard 7 tetrominoes: I, O, T, S, Z, J, L
- 4x4 bounding box representation with rotation states
- Each piece's 4 tiles assigned 4 distinct colors (sampled without replacement from 1-6) at spawn time
- Colors are bound to tile positions within the bounding box and rotate with the piece

### Piece Bag

- Standard 7-bag randomizer: shuffle all 7 pieces, deal in order, repeat
- Seeded from current UTC date string (`YYYY-MM-DD`)
- Color assignment also uses the same seeded RNG stream

## Movement & Rotation

### SRS (Super Rotation System)

- 4 rotation states: 0 (spawn), R (CW), 2 (180), L (CCW)
- Standard SRS kick tables:
  - J/L/S/Z/T: standard wall kick data
  - I: separate I-piece kick data
  - O: no kicks (single state effectively)
- On rotation attempt: try base position, then up to 4 kick offsets. First valid placement wins.

### Gravity

- Fixed gravity speed for MVP (1 row per second)
- No speed increase — the game is timed, not survival

### Lock Delay

- 0.5 second lock delay when piece is resting on a surface
- Resets on successful move or rotate (max 15 resets, standard modern Tetris)
- After lock delay expires or max resets hit, piece locks immediately

### Input Handling

- **DAS** (Delayed Auto Shift): delay before horizontal auto-repeat starts. Default 133ms.
- **ARR** (Auto Repeat Rate): interval for repeat moves once DAS triggers. Default 10ms. 0 = instant teleport to wall.
- **SDF** (Soft Drop Factor): multiplier for soft drop gravity. Default 20x. Can be set to infinity (instant).
- All configurable via settings page, persisted in localStorage.

### Default Controls (rebindable)

| Action       | Default Key |
| ------------ | ----------- |
| Move left    | ArrowLeft   |
| Move right   | ArrowRight  |
| Rotate CW    | ArrowUp     |
| Rotate CCW   | Control     |
| Rotate 180   | KeyA        |
| Hard drop    | Space       |
| Soft drop    | ArrowDown   |

### Ghost Piece

- Semi-transparent colored rendering at the lowest valid position directly below the active piece
- Colors match the active piece's tile colors

## Game Flow

### Daily Puzzle

- RNG seed = `YYYY-MM-DD` (UTC)
- All players get identical piece + color sequences for a given day

### Timer

- 5-minute countdown, displayed prominently
- Game ends when timer reaches 0

### Top-Out

- If any tile of a locking piece occupies rows 18-20 (spawn zone), game over immediately

### Game States

- `menu` → shows today's date, personal best score, play button
- `playing` → active game with timer running
- `gameover` → final score, lines cleared, option to return to menu

### Next Piece Preview

- Single next piece shown beside the board (expandable to hold queue later)

## Scoring

- 1 point per line cleared
- Game state tracks (for future multiplier infrastructure):
  - Combo counter (consecutive lock-downs that clear at least one line)
  - T-spin detection flag
  - Lines cleared per lock (single/double/triple/tetris)
- These are tracked but not scored in MVP

## UI

### Pages

- `/` — Game page: centered canvas, timer, score, next piece preview, settings link
- `/settings` — Key rebinding + DAS/ARR/SDF sliders, persisted to localStorage

### Visual Design

- Dark background
- 6 distinct saturated colors for tiles, each with its number (1-6) overlaid
- Locked rows: dimmed or hatched overlay
- Ghost piece: semi-transparent outline with matching colors
- Clean, minimal UI around the board

## Project Structure

```
src/
  app/                      # Next.js App Router
    page.tsx                # Game page (mounts canvas)
    settings/page.tsx       # Settings page
    layout.tsx              # Root layout, global styles
  engine/                   # Pure TS, zero React/DOM deps
    types.ts                # Board, Piece, GameState, Config types
    board.ts                # Board logic (place, clear, lock rows)
    pieces.ts               # Piece defs, rotation states, SRS kick tables
    rng.ts                  # Seeded PRNG (mulberry32 or similar)
    bag.ts                  # 7-bag randomizer using seeded RNG
    game.ts                 # Game loop orchestrator (tick, input, state transitions)
    input.ts                # Input handler (DAS/ARR, key mapping)
    scoring.ts              # Score tracking, combo/t-spin/multi-line infra
  renderer/
    canvas.ts               # Canvas drawing (board, piece, ghost, locked rows, numbers)
  hooks/
    useGame.ts              # Bridge: engine <-> canvas <-> React lifecycle
    useSettings.ts          # localStorage read/write for settings
  components/
    GameCanvas.tsx          # Canvas wrapper component
    NextPiecePreview.tsx    # Next piece display
    Timer.tsx               # Countdown timer
    ScoreDisplay.tsx        # Score display
```

### Key Architectural Constraint

`engine/` must have zero imports from React, DOM APIs, or Next.js. It is pure game logic, testable in isolation. The React layer is a thin shell that mounts a canvas and bridges user input to the engine.

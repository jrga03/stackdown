# React UI Spec

React manages the menu system, HUD, settings, and overlays. The actual game rendering is handled imperatively by the Canvas 2D renderer — React creates the `<canvas>` element but never draws to it.

## Screen Flow

```
MainMenu ──→ ModeSelectScreen ──→ GameScreen (playing) ──→ GameOverScreen
                                      │          ↑                │
                                      ↓          │                │
                                 PauseOverlay ───┘                │
                                                                  │
MainMenu ←────────────────────────────────────────────────────────┘
                │
                ↓
         SettingsScreen
                │
                ↓
           MainMenu
```

### Screens

| Screen | Description |
|--------|-------------|
| `MainMenu` | Title screen with "Play", "Settings" buttons |
| `ModeSelectScreen` | Mode toggle (Marathon/Practice), level picker, Start/Back buttons |
| `GameScreen` | Active game — contains canvas, HUD, and overlays |
| `PauseOverlay` | Semi-transparent overlay with "Resume", "Restart", "Quit" |
| `GameOverScreen` | Final score display with "Play Again", "Main Menu" |
| `SettingsScreen` | Key bindings, DAS/ARR tuning, volume |

---

## Component Tree

```
<App>
  ├─ <MainMenu />                    (when screen === 'menu')
  ├─ <ModeSelectScreen />            (when screen === 'mode-select')
  ├─ <SettingsScreen />              (when screen === 'settings')
  ├─ <GameScreen>                    (when screen === 'game')
  │    <div className="game-layout">
  │      <div className="side-panel left">
  │        <HoldPiece />             ← separate small <canvas>
  │      </div>
  │      <div className="playfield-container">
  │        <canvas ref={canvasRef} /> ← main game canvas
  │      </div>
  │      <div className="side-panel right">
  │        <NextQueue />             ← separate small <canvas>
  │        <ScoreDisplay />
  │        <LevelDisplay />
  │        <LinesDisplay />
  │        {gameMode === 'practice' && <TimerDisplay />}
  │      </div>
  │    </div>
  │    {isPaused && <PauseOverlay />}
  │    {isGameOver && <GameOverScreen />}
  └─ </GameScreen>
```

### Overlay Behavior

- **Pause overlay:** Renders on top of the frozen canvas (canvas stops updating while paused). Blocks all game input. Menu buttons (Resume, Restart, Quit) are clickable.
- **Game over overlay:** Renders on top of the final game state. Blocks all game input. Menu buttons (Play Again, Main Menu) are clickable.

---

## Canvas–React Boundary

### Principle

React owns the DOM. The renderer owns the pixels.

### How It Works

1. React creates a `<canvas>` element and provides it via `ref`.
2. `GameSession` receives the canvas ref and creates a `GameRenderer` that draws imperatively.
3. React **never** calls `getContext()` or draws to the canvas.
4. The game loop runs via `requestAnimationFrame`, completely independent of React's render cycle.
5. State flows from engine to React via a throttled callback — React re-renders HUD elements at ~10fps, not 60fps.

### Why This Design

- Canvas 2D rendering at 60fps doesn't benefit from React's diffing — it's pure imperative drawing.
- React re-renders are expensive and unnecessary for pixel-level changes.
- Separating concerns means React handles what it's good at (declarative UI) and Canvas handles what it's good at (fast drawing).

---

## `useGameSession` Hook

The primary hook that creates and manages the game session lifecycle.

```typescript
interface GameConfig {
  mode: GameMode;        // 'marathon' | 'practice'
  startLevel: number;    // 1-15
}

function useGameSession(canvasRef: RefObject<HTMLCanvasElement>, config: GameConfig) {
  const [gameState, setGameState] = useState<GameUIState>({
    score: 0,
    level: config.startLevel,
    linesCleared: 0,
    holdPiece: null,
    nextQueue: [],
    isPaused: false,
    isGameOver: false,
    combo: -1,
    backToBack: false,
    gameMode: config.mode,
    remainingMs: config.mode === 'practice' ? 120_000 : null,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const session = new GameSession(canvasRef.current, {
      mode: config.mode,
      startLevel: config.startLevel,
    });

    // Throttled state updates to React (~10fps)
    session.onStateUpdate((snapshot) => {
      setGameState({
        score: snapshot.score,
        level: snapshot.level,
        linesCleared: snapshot.linesCleared,
        holdPiece: snapshot.holdPiece,
        nextQueue: snapshot.nextQueue,
        isPaused: snapshot.isPaused,
        isGameOver: snapshot.isGameOver,
        combo: snapshot.combo,
        backToBack: snapshot.backToBack,
        gameMode: snapshot.gameMode,
        remainingMs: snapshot.remainingMs,
      });
    });

    session.start();

    return () => session.destroy();
  }, [canvasRef, config]);

  // Wrap session methods in stable callbacks (session is not exposed directly)
  const pause = useCallback(() => sessionRef.current?.pause(), []);
  const resume = useCallback(() => sessionRef.current?.resume(), []);
  const restart = useCallback(() => sessionRef.current?.restart(), []);
  const quit = useCallback(() => sessionRef.current?.destroy(), []);

  return { gameState, pause, resume, restart, quit };
}
```

### Throttling

State updates are pushed to React at a `REACT_UPDATE_INTERVAL` of 100ms (~10fps). This is sufficient for HUD elements (score, level, lines) that don't need frame-perfect updates.

```typescript
// Inside GameSession
private lastReactUpdate = 0;
private REACT_UPDATE_INTERVAL = 100; // ms

private maybeUpdateReact(snapshot: GameSnapshot): void {
  const now = performance.now();
  if (now - this.lastReactUpdate < this.REACT_UPDATE_INTERVAL) return;
  this.lastReactUpdate = now;
  this.stateCallback?.(snapshot);
}
```

### Cleanup

`GameSession.destroy()` performs the following cleanup chain:
1. Stops the `GameLoop` (cancels the `requestAnimationFrame` callback).
2. Calls `KeyboardManager.detach()` (removes DOM event listeners, clears DAS state).
3. Calls `GameRenderer.destroy()` (releases `OffscreenCanvas` caches).
4. Calls `EventBus.removeAllListeners()` (prevents stale callbacks).

---

## HUD Components

### ScoreDisplay

Displays the current score. Updates via throttled state from `useGameSession`.

```tsx
function ScoreDisplay({ score }: { score: number }) {
  return (
    <div className="hud-item">
      <div className="hud-label">SCORE</div>
      <div className="hud-value">{score.toLocaleString()}</div>
    </div>
  );
}
```

### LevelDisplay

Displays the current level (1–15).

### LinesDisplay

Displays total lines cleared.

### HoldPiece

Renders the held piece on a **separate small canvas**.

```tsx
function HoldPiece({ pieceType }: { pieceType: PieceType | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (pieceType) {
      PieceRenderer.drawPiecePreview(ctx, pieceType, cellSize);
    }
  }, [pieceType]); // Only re-renders when held piece changes

  return (
    <div className="hud-item">
      <div className="hud-label">HOLD</div>
      <canvas ref={canvasRef} width={100} height={60} />
    </div>
  );
}
```

### NextQueue

Renders the next 5 pieces on a **separate small canvas**. Only re-renders when the queue changes.

```tsx
function NextQueue({ queue }: { queue: PieceType[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    queue.slice(0, 5).forEach((pieceType, i) => {
      PieceRenderer.drawPiecePreview(ctx, pieceType, cellSize, 0, i * cellHeight);
    });
  }, [queue]); // Only re-renders when queue changes

  return (
    <div className="hud-item">
      <div className="hud-label">NEXT</div>
      <canvas ref={canvasRef} width={100} height={300} />
    </div>
  );
}
```

### TimerDisplay

Displays the remaining time in practice mode as a MM:SS countdown. Only rendered when `gameMode === 'practice'`.

```tsx
function TimerDisplay({ remainingMs }: { remainingMs: number }) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isWarning = remainingMs <= 10_000;

  return (
    <div className={`hud-item ${isWarning ? 'timer-warning' : ''}`}>
      <div className="hud-label">TIME</div>
      <div className="hud-value">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  );
}
```

When `remainingMs <= 10000`, the component adds a `timer-warning` class that applies red color and a CSS pulse animation.

### ComboPopup

React-based combo notification (separate from the canvas text popup system). Appears when a combo event fires via the EventBus.

### Task Scope

- **Task 5.2 (HUD Components):** ScoreDisplay, LevelDisplay, LinesDisplay, HoldPiece, NextQueue.
- **Task 5.8 (Timer Display):** TimerDisplay (practice mode only).

---

## Menu Components

### MainMenu

```tsx
function MainMenu({ onPlay, onSettings }: MainMenuProps) {
  return (
    <div className="main-menu">
      <h1>STACKDOWN</h1>
      <Button onClick={onPlay}>PLAY</Button>
      <Button onClick={onSettings}>SETTINGS</Button>
    </div>
  );
}
```

MainMenu's `onPlay` navigates to the `'mode-select'` screen (not directly to `'game'`).

### ModeSelectScreen

Allows the player to choose between Marathon and Practice modes before starting a game.

```tsx
interface ModeSelectProps {
  onStart: (config: GameConfig) => void;
  onBack: () => void;
}

function ModeSelectScreen({ onStart, onBack }: ModeSelectProps) {
  const [mode, setMode] = useState<GameMode>('marathon');
  const [startLevel, setStartLevel] = useState(1);

  return (
    <div className="mode-select">
      <h2>SELECT MODE</h2>

      <div className="mode-toggle">
        <Button
          onClick={() => setMode('marathon')}
          active={mode === 'marathon'}
        >MARATHON</Button>
        <Button
          onClick={() => setMode('practice')}
          active={mode === 'practice'}
        >PRACTICE</Button>
      </div>

      <div className="mode-description">
        {mode === 'marathon'
          ? 'Clear lines to advance through 15 levels. Game ends on top-out.'
          : 'Fixed gravity level. Score as high as you can in 2 minutes.'}
      </div>

      {mode === 'practice' && (
        <div className="level-picker">
          <label>Level: {startLevel}</label>
          <input
            type="range" min={1} max={15} value={startLevel}
            onChange={(e) => setStartLevel(Number(e.target.value))}
          />
        </div>
      )}

      <Button onClick={() => onStart({ mode, startLevel: mode === 'practice' ? startLevel : 1 })}>
        START
      </Button>
      <Button onClick={onBack}>BACK</Button>
    </div>
  );
}
```

### PauseOverlay

Semi-transparent overlay rendered on top of the game canvas when paused.

```tsx
function PauseOverlay({ onResume, onRestart, onQuit }: PauseOverlayProps) {
  return (
    <div className="pause-overlay">
      <h2>PAUSED</h2>
      <Button onClick={onResume}>RESUME</Button>
      <Button onClick={onRestart}>RESTART</Button>
      <Button onClick={onQuit}>QUIT</Button>
    </div>
  );
}
```

### GameOverScreen

Shows final score and options. Displays "TIME'S UP!" for practice mode timeout or "GAME OVER" for top-out. Shows a "NEW PERSONAL BEST!" indicator when `isNewBest` is true.

```tsx
interface GameOverProps {
  score: number;
  level: number;
  lines: number;
  gameMode: GameMode;
  reason: 'topout' | 'timeout';
  isNewBest: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

function GameOverScreen({ score, level, lines, gameMode, reason, isNewBest, onPlayAgain, onMainMenu }: GameOverProps) {
  return (
    <div className="game-over">
      <h2>{reason === 'timeout' ? "TIME'S UP!" : 'GAME OVER'}</h2>
      {isNewBest && <div className="new-best">NEW PERSONAL BEST!</div>}
      <div className="mode-label">{gameMode === 'marathon' ? 'Marathon' : 'Practice'}</div>
      <div className="final-stats">
        <div>Score: {score.toLocaleString()}</div>
        <div>Level: {level}</div>
        <div>Lines: {lines}</div>
      </div>
      <Button onClick={onPlayAgain}>PLAY AGAIN</Button>
      <Button onClick={onMainMenu}>MAIN MENU</Button>
    </div>
  );
}
```

### SettingsScreen

Allows configuring:
- Key bindings (with a "press a key" capture dialog)
- DAS delay (ms)
- ARR interval (ms)
- Soft drop ARR (ms)

Settings are persisted to `localStorage`.

---

## State Management

### App-Level State

```typescript
type Screen = 'menu' | 'mode-select' | 'game' | 'settings';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({ mode: 'marathon', startLevel: 1 });

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    setScreen('game');
  };

  return (
    <>
      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('mode-select')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'mode-select' && (
        <ModeSelectScreen
          onStart={handleStartGame}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'game' && (
        <GameScreen gameConfig={gameConfig} onQuit={() => setScreen('menu')} />
      )}
      {screen === 'settings' && (
        <SettingsScreen onBack={() => setScreen('menu')} />
      )}
    </>
  );
}
```

### Settings Persistence

```typescript
function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('stackdown-settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('stackdown-settings', JSON.stringify(next));
      return next;
    });
  };

  return { settings, updateSettings };
}
```

---

## Personal Bests Persistence

Personal best scores are stored per mode in `localStorage`.

```typescript
const PERSONAL_BESTS_KEY = 'stackdown-personal-bests';

interface PersonalBests {
  marathon: number;
  practice: number;
}

const DEFAULT_PERSONAL_BESTS: PersonalBests = { marathon: 0, practice: 0 };
```

### `usePersonalBests` Hook

```typescript
function usePersonalBests() {
  const [bests, setBests] = useState<PersonalBests>(() => {
    const saved = localStorage.getItem(PERSONAL_BESTS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_PERSONAL_BESTS;
  });

  const checkAndUpdate = (mode: GameMode, score: number): boolean => {
    const key = mode === 'marathon' ? 'marathon' : 'practice';
    if (score > bests[key]) {
      const next = { ...bests, [key]: score };
      setBests(next);
      localStorage.setItem(PERSONAL_BESTS_KEY, JSON.stringify(next));
      return true; // new personal best
    }
    return false;
  };

  return { bests, checkAndUpdate };
}
```

`checkAndUpdate(mode, score)` returns `true` if the score is a new personal best (used to set `isNewBest` on `GameOverScreen`). Called when the game over event fires.

---

## Layout

### Game Screen Layout

```css
.game-layout {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 20px;
  height: 100vh;
  padding: 20px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 120px;
}

.playfield-container {
  /* Canvas size is set programmatically based on window height */
}
```

### Responsive Sizing

The canvas and cell size are computed based on the window height:

```typescript
const cellSize = Math.floor((windowHeight - padding) / VISIBLE_HEIGHT);
const canvasWidth = cellSize * BOARD_WIDTH;
const canvasHeight = cellSize * VISIBLE_HEIGHT;
```

This ensures the playfield fits the screen vertically, and the cell size is always a whole number for crisp rendering.

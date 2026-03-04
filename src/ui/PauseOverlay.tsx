interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseOverlay({ onResume, onRestart, onQuit }: PauseOverlayProps) {
  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>PAUSED</h2>
        <button className="menu-button" onClick={onResume}>RESUME</button>
        <button className="menu-button" onClick={onRestart}>RESTART</button>
        <button className="menu-button" onClick={onQuit}>QUIT</button>
      </div>
    </div>
  );
}

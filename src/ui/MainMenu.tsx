import './MainMenu.css';

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
}

export function MainMenu({ onPlay, onSettings }: MainMenuProps) {
  return (
    <div className="main-menu">
      <h1 className="game-title">STACKDOWN</h1>
      <div className="menu-buttons">
        <button className="menu-button" onClick={onPlay}>
          PLAY
        </button>
        <button className="menu-button" onClick={onSettings}>
          SETTINGS
        </button>
      </div>
    </div>
  );
}

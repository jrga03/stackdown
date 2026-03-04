import { useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import './MainMenu.css';

interface MainMenuProps {
  onPlay: () => void;
  onSettings: () => void;
}

export function MainMenu({ onPlay, onSettings }: MainMenuProps) {
  const items: MenuItemType[] = useMemo(
    () => [
      { kind: 'button', onActivate: onPlay },
      { kind: 'button', onActivate: onSettings },
    ],
    [onPlay, onSettings],
  );

  const { getItemProps } = useMenuNavigation({ items });

  return (
    <div className="main-menu">
      <h1 className="game-title">STACKDOWN</h1>
      <div className="menu-buttons">
        <button className={`menu-button ${getItemProps(0).className}`} onMouseEnter={getItemProps(0).onMouseEnter} onClick={getItemProps(0).onClick}>
          PLAY
        </button>
        <button className={`menu-button ${getItemProps(1).className}`} onMouseEnter={getItemProps(1).onMouseEnter} onClick={getItemProps(1).onClick}>
          SETTINGS
        </button>
      </div>
    </div>
  );
}

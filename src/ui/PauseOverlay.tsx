import { useMemo } from 'react';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';

interface PauseOverlayProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PauseOverlay({ onResume, onRestart, onQuit }: PauseOverlayProps) {
  const items: MenuItemType[] = useMemo(
    () => [
      { kind: 'button', onActivate: onResume },
      { kind: 'button', onActivate: onRestart },
      { kind: 'button', onActivate: onQuit },
    ],
    [onResume, onRestart, onQuit],
  );

  const { getItemProps } = useMenuNavigation({ items, onEscape: onResume });

  return (
    <div className="overlay">
      <div className="overlay-content">
        <h2>PAUSED</h2>
        <button className={`menu-button ${getItemProps(0).className}`} onMouseEnter={getItemProps(0).onMouseEnter} onClick={getItemProps(0).onClick}>RESUME</button>
        <button className={`menu-button ${getItemProps(1).className}`} onMouseEnter={getItemProps(1).onMouseEnter} onClick={getItemProps(1).onClick}>RESTART</button>
        <button className={`menu-button ${getItemProps(2).className}`} onMouseEnter={getItemProps(2).onMouseEnter} onClick={getItemProps(2).onClick}>QUIT</button>
      </div>
    </div>
  );
}

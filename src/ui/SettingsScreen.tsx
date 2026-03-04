import { useState, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useMenuNavigation, type MenuItemType } from '../hooks/useMenuNavigation';
import './MainMenu.css';

interface SettingsScreenProps {
  onBack: () => void;
}

const BINDING_KEYS = [
  'moveLeft', 'moveRight', 'softDrop', 'hardDrop',
  'rotateCW', 'rotateCCW', 'rotate180', 'hold', 'pause',
] as const;

const BINDING_LABELS: Record<string, string> = {
  moveLeft: 'Move Left', moveRight: 'Move Right', softDrop: 'Soft Drop',
  hardDrop: 'Hard Drop', rotateCW: 'Rotate CW', rotateCCW: 'Rotate CCW',
  rotate180: 'Rotate 180', hold: 'Hold', pause: 'Pause',
};

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const [capturingKey, setCapturingKey] = useState<string | null>(null);

  const handleKeyCapture = (bindingKey: string) => {
    setCapturingKey(bindingKey);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      updateSettings({
        keyBindings: { ...settings.keyBindings, [bindingKey]: e.code },
      });
      setCapturingKey(null);
      window.removeEventListener('keydown', handler, { capture: true });
    };
    window.addEventListener('keydown', handler, { capture: true });
  };

  const items: MenuItemType[] = useMemo(() => {
    const list: MenuItemType[] = [];

    // 9 keybind items
    for (const key of BINDING_KEYS) {
      list.push({ kind: 'keybind', onCapture: () => handleKeyCapture(key) });
    }

    // 3 slider items
    list.push({
      kind: 'slider', value: settings.dasDelay, min: 50, max: 300, step: 10,
      onChange: (v) => updateSettings({ dasDelay: v }),
    });
    list.push({
      kind: 'slider', value: settings.arrInterval, min: 0, max: 100, step: 1,
      onChange: (v) => updateSettings({ arrInterval: v }),
    });
    list.push({
      kind: 'slider', value: settings.softDropArr, min: 0, max: 100, step: 1,
      onChange: (v) => updateSettings({ softDropArr: v }),
    });

    // 2 buttons
    list.push({ kind: 'button', onActivate: resetToDefaults });
    list.push({ kind: 'button', onActivate: onBack });

    return list;
  }, [settings, onBack]);

  const { getItemProps } = useMenuNavigation({
    items,
    onEscape: onBack,
    enabled: capturingKey === null,
  });

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>SETTINGS</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '300px' }}>
        <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', letterSpacing: '2px' }}>KEY BINDINGS</h3>
        {BINDING_KEYS.map((key, i) => (
          <div
            key={key}
            className={`menu-row ${getItemProps(i).className}`}
            onMouseEnter={getItemProps(i).onMouseEnter}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}
          >
            <span>{BINDING_LABELS[key]}</span>
            <button
              className="menu-button"
              style={{ padding: '6px 16px', fontSize: '14px', minWidth: '120px' }}
              onClick={getItemProps(i).onClick}
            >
              {capturingKey === key ? 'Press a key...' : settings.keyBindings[key as keyof typeof settings.keyBindings]}
            </button>
          </div>
        ))}
      </div>

      {(() => {
        const s = BINDING_KEYS.length;
        return (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '300px' }}>
              <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', letterSpacing: '2px' }}>TIMING</h3>
              <div
                className={`menu-row ${getItemProps(s).className}`}
                onMouseEnter={getItemProps(s).onMouseEnter}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px' }}
              >
                <span>DAS Delay: {settings.dasDelay}ms</span>
                <input type="range" min={50} max={300} value={settings.dasDelay}
                  onChange={(e) => updateSettings({ dasDelay: Number(e.target.value) })} />
              </div>
              <div
                className={`menu-row ${getItemProps(s + 1).className}`}
                onMouseEnter={getItemProps(s + 1).onMouseEnter}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px' }}
              >
                <span>ARR: {settings.arrInterval}ms</span>
                <input type="range" min={0} max={100} value={settings.arrInterval}
                  onChange={(e) => updateSettings({ arrInterval: Number(e.target.value) })} />
              </div>
              <div
                className={`menu-row ${getItemProps(s + 2).className}`}
                onMouseEnter={getItemProps(s + 2).onMouseEnter}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px' }}
              >
                <span>Soft Drop ARR: {settings.softDropArr}ms</span>
                <input type="range" min={0} max={100} value={settings.softDropArr}
                  onChange={(e) => updateSettings({ softDropArr: Number(e.target.value) })} />
              </div>
            </div>

            <div className="menu-buttons">
              <button
                className={`menu-button ${getItemProps(s + 3).className}`}
                onMouseEnter={getItemProps(s + 3).onMouseEnter}
                onClick={getItemProps(s + 3).onClick}
              >
                RESET TO DEFAULTS
              </button>
              <button
                className={`menu-button ${getItemProps(s + 4).className}`}
                onMouseEnter={getItemProps(s + 4).onMouseEnter}
                onClick={getItemProps(s + 4).onClick}
              >
                BACK
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}

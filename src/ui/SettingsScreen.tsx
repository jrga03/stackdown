import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import './MainMenu.css';

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, updateSettings, resetToDefaults } = useSettings();
  const [capturingKey, setCapturingKey] = useState<string | null>(null);

  const handleKeyCapture = (bindingKey: string) => {
    setCapturingKey(bindingKey);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      updateSettings({
        keyBindings: { ...settings.keyBindings, [bindingKey]: e.code },
      });
      setCapturingKey(null);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler);
  };

  const bindingLabels: Record<string, string> = {
    moveLeft: 'Move Left', moveRight: 'Move Right', softDrop: 'Soft Drop',
    hardDrop: 'Hard Drop', rotateCW: 'Rotate CW', rotateCCW: 'Rotate CCW',
    rotate180: 'Rotate 180', hold: 'Hold', pause: 'Pause',
  };

  return (
    <div className="main-menu">
      <h2 style={{ fontSize: '36px', letterSpacing: '4px', margin: 0 }}>SETTINGS</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '300px' }}>
        <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', letterSpacing: '2px' }}>KEY BINDINGS</h3>
        {Object.entries(bindingLabels).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{label}</span>
            <button
              className="menu-button"
              style={{ padding: '6px 16px', fontSize: '14px', minWidth: '120px' }}
              onClick={() => handleKeyCapture(key)}
            >
              {capturingKey === key ? 'Press a key...' : settings.keyBindings[key as keyof typeof settings.keyBindings]}
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '300px' }}>
        <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', letterSpacing: '2px' }}>TIMING</h3>
        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
          DAS Delay: {settings.dasDelay}ms
          <input type="range" min={50} max={300} value={settings.dasDelay}
            onChange={(e) => updateSettings({ dasDelay: Number(e.target.value) })} />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
          ARR: {settings.arrInterval}ms
          <input type="range" min={0} max={100} value={settings.arrInterval}
            onChange={(e) => updateSettings({ arrInterval: Number(e.target.value) })} />
        </label>
        <label style={{ display: 'flex', justifyContent: 'space-between' }}>
          Soft Drop ARR: {settings.softDropArr}ms
          <input type="range" min={0} max={100} value={settings.softDropArr}
            onChange={(e) => updateSettings({ softDropArr: Number(e.target.value) })} />
        </label>
      </div>

      <div className="menu-buttons">
        <button className="menu-button" onClick={resetToDefaults}>RESET TO DEFAULTS</button>
        <button className="menu-button" onClick={onBack}>BACK</button>
      </div>
    </div>
  );
}

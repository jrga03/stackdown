import { useState } from 'react';
import { MainMenu } from './ui/MainMenu';
import { ModeSelectScreen } from './ui/ModeSelectScreen';
import { GameScreen } from './ui/GameScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { ScoreboardScreen } from './ui/ScoreboardScreen';
import { GameMode, type GameConfig } from './engine';

type Screen = 'menu' | 'mode-select' | 'game' | 'settings' | 'scoreboard';

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    mode: GameMode.MARATHON,
    startLevel: 1,
  });

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    setScreen('game');
  };

  return (
    <>
      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('mode-select')}
          onScores={() => setScreen('scoreboard')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'mode-select' && (
        <ModeSelectScreen
          onStart={handleStartGame}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'scoreboard' && (
        <ScoreboardScreen
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          gameConfig={gameConfig}
          onQuit={() => setScreen('menu')}
        />
      )}
    </>
  );
}

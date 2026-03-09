import { useState } from 'react';
import { MainMenu } from './ui/MainMenu';
import { ModeSelectScreen } from './ui/ModeSelectScreen';
import { GameScreen } from './ui/GameScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { ScoreboardScreen } from './ui/ScoreboardScreen';
import { VersusPreMatchScreen } from './ui/VersusPreMatchScreen';
import { VersusScreen } from './ui/VersusScreen';
import { useVersusLevel } from './hooks/useVersusLevel';
import { GameMode, type GameConfig } from './engine';

type Screen = 'menu' | 'mode-select' | 'game' | 'settings' | 'scoreboard' | 'versus-prematch' | 'versus';

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    mode: GameMode.MARATHON,
    startLevel: 1,
  });
  const [versusGravity, setVersusGravity] = useState(1);
  const [versusKey, setVersusKey] = useState(0);
  const { level: versusLevel, rankLabel } = useVersusLevel();

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    setScreen('game');
  };

  const handleStartVersus = (gravityLevel: number) => {
    setVersusGravity(gravityLevel);
    setVersusKey((k) => k + 1);
    setScreen('versus');
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
          onVersus={() => setScreen('versus-prematch')}
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
      {screen === 'versus-prematch' && (
        <VersusPreMatchScreen
          currentLevel={versusLevel}
          rankLabel={rankLabel}
          onStart={handleStartVersus}
          onBack={() => setScreen('mode-select')}
        />
      )}
      {screen === 'versus' && (
        <VersusScreen
          key={versusKey}
          gravityLevel={versusGravity}
          onQuit={() => setScreen('menu')}
          onRematch={handleStartVersus}
        />
      )}
    </>
  );
}

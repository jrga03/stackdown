import { useState } from 'react';
import { MainMenu } from './ui/MainMenu';
import { ModeSelectScreen } from './ui/ModeSelectScreen';
import { GameConfigScreen } from './ui/GameConfigScreen';
import { GameScreen } from './ui/GameScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { ScoreboardScreen } from './ui/ScoreboardScreen';
import { StatsScreen } from './ui/StatsScreen';
import { VersusPreMatchScreen } from './ui/VersusPreMatchScreen';
import { VersusScreen } from './ui/VersusScreen';
import { MenuBackground } from './ui/MenuBackground';
import { usePlayerXP } from './hooks/usePlayerXP';
import { usePlayerStats } from './hooks/usePlayerStats';
import { GameMode, type GameConfig } from './engine';

type Screen = 'menu' | 'mode-select' | 'marathon-config' | 'practice-config' | 'game' | 'settings' | 'scoreboard' | 'stats' | 'versus-prematch' | 'versus';

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    mode: GameMode.MARATHON,
    startLevel: 1,
  });
  const [versusGravity, setVersusGravity] = useState(1);
  const [versusKey, setVersusKey] = useState(0);
  const playerXP = usePlayerXP();
  const playerStats = usePlayerStats();

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    setScreen('game');
  };

  const handleStartVersus = (gravityLevel: number) => {
    setVersusGravity(gravityLevel);
    setVersusKey((k) => k + 1);
    setScreen('versus');
  };

  const isMenuScreen = screen !== 'game' && screen !== 'versus';

  return (
    <>
      {isMenuScreen && <MenuBackground />}
      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('mode-select')}
          onScores={() => setScreen('scoreboard')}
          onStats={() => setScreen('stats')}
          onSettings={() => setScreen('settings')}
          playerLevel={playerXP.level}
          rankLabel={playerXP.rankLabel}
        />
      )}
      {screen === 'mode-select' && (
        <ModeSelectScreen
          onMarathon={() => setScreen('marathon-config')}
          onPractice={() => setScreen('practice-config')}
          onVersus={() => setScreen('versus-prematch')}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'marathon-config' && (
        <GameConfigScreen
          mode={GameMode.MARATHON}
          onStart={handleStartGame}
          onBack={() => setScreen('mode-select')}
        />
      )}
      {screen === 'practice-config' && (
        <GameConfigScreen
          mode={GameMode.PRACTICE}
          onStart={handleStartGame}
          onBack={() => setScreen('mode-select')}
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
      {screen === 'stats' && (
        <StatsScreen
          stats={playerStats.stats}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          gameConfig={gameConfig}
          onQuit={() => setScreen('menu')}
          addXP={playerXP.addXP}
          recordGame={playerStats.recordGame}
        />
      )}
      {screen === 'versus-prematch' && (
        <VersusPreMatchScreen
          currentLevel={playerXP.level}
          rankLabel={playerXP.rankLabel}
          onStart={handleStartVersus}
          onBack={() => setScreen('mode-select')}
        />
      )}
      {screen === 'versus' && (
        <VersusScreen
          key={versusKey}
          gravityLevel={versusGravity}
          playerXP={playerXP}
          onQuit={() => setScreen('menu')}
          onRematch={handleStartVersus}
          recordGame={playerStats.recordGame}
        />
      )}
    </>
  );
}

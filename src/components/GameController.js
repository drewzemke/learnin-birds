import { useEffect, useRef } from 'react';
import GameDisplay from './GameDisplay';
import { useStore } from '../state/stateManagement';
import { GameState } from '../state/gameStore';
import GameCanvas from './ui-elements/GameCanvas';
import CanvasContainer from './ui-elements/CanvasContainer';
import {
  PlayerDeadOverlay,
  PlayerIntroOverlay,
  PlayerPausedOverlay,
} from './ui-elements/overlays/PlayerOverlays';
import { PlayerScoreOverlay } from './ui-elements/overlays/ScoreOverlays';
import useControls from '../hooks/useControls';

// This is the main component for interacting with the game state.
// It captures player control and passes it to the state, displays
// various overlays based on the game state, and finally passes information
// to the GameDisplay component to show the pipe, bird, etc positions.
export default function GameController({ isPlayerHuman }) {
  // We need the height and width to properly adjust the canvas size
  const gameSettings = useStore(state => state.gameSettings);
  const { gameWidth, gameHeight } = gameSettings;

  const actions = useStore(state => state.actions);

  // Initialize the model
  useEffect(() => {
    actions.init(isPlayerHuman);
    return actions.unInit;
    // eslint-disable-next-line
  }, []);

  // Display various overlays based on the game state
  const gameState = useStore(state => state.gameState);

  // We need to pass information to the overlay screens as necessary
  const { score, lastRoundScore, round, numAlive } = useStore(state => ({
    score: state.score,
    lastRoundScore: state.lastRoundScore,
    round: state.round,
    numAlive: state.neuralNets.length,
  }));

  // We need to make a ref to the CanvasContainer div to pass into
  // the game engine (for click handling purposes)
  const containerRef = useRef();

  // And we need a ref to the gamestate to pass to the event handlers...
  // For some reason passing just the gamestate doesn't work
  const gameStateRef = useRef();
  gameStateRef.current = gameState;

  useControls(actions, isPlayerHuman, gameStateRef, containerRef);

  // Get the information we need to pass to the GameDisplay
  const { birds, pipes } = useStore(state => ({
    birds: state.birds,
    pipes: state.pipes,
  }));

  return (
    <CanvasContainer containerRef={containerRef}>
      <GameCanvas
        gameWidth={gameWidth}
        gameHeight={gameHeight}
      >
        <GameDisplay
          birds={birds}
          pipes={pipes}
          gameSettings={gameSettings}
        />
      </GameCanvas>
      {isPlayerHuman ? <PlayerScoreOverlay score={score} /> : null}
      {gameState === GameState.PLAYER_INTRO_SCREEN ? (
        <PlayerIntroOverlay />
      ) : null}
      {gameState === GameState.PLAYER_PAUSED ? <PlayerPausedOverlay /> : null}
      {gameState === GameState.PLAYER_DEAD ? (
        <PlayerDeadOverlay score={score} />
      ) : null}
    </CanvasContainer>
  );
}
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Loader2, Play, RefreshCw, Trophy } from 'lucide-react';

import HandTracker from './components/HandTracker';
import GameScene from './components/GameScene';
import { generateLevel } from './services/geminiService';
import { Cube, GameStatus } from './types';

function App() {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  // Use Ref instead of State for high-frequency updates (60fps)
  const handPosRef = useRef({ x: 0.5, y: 0.5 });
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [difficulty, setDifficulty] = useState(1);

  // Handle Hand Updates from Webcam - updates Ref directly
  const handleHandMove = useCallback((x: number, y: number) => {
    handPosRef.current = { x, y };
  }, []);

  // Handle Cube Eating
  const handleCubeEat = useCallback((id: string, points: number) => {
    // Play sound effect (optional)
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    setScore(prev => prev + points);
    setCubes(prev => prev.filter(c => c.id !== id));
  }, []);

  // Check Win Condition
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && cubes.length === 0) {
      setGameStatus(GameStatus.GAME_OVER);
    }
  }, [cubes.length, gameStatus]);

  // Core function to load a specific level
  const startLevel = async (level: number) => {
    if (gameStatus === GameStatus.GENERATING_LEVEL) return;
    
    setGameStatus(GameStatus.GENERATING_LEVEL);
    setCubes([]); // Clear immediately to avoid lingering state
    
    try {
      const newLevel = await generateLevel(level);
      setCubes(newLevel);
      setGameStatus(GameStatus.PLAYING);
    } catch (error) {
      console.error("Failed to generate level", error);
      setGameStatus(GameStatus.IDLE);
    }
  };

  // Button Handlers
  const handleStartGame = () => {
    setScore(0);
    setDifficulty(1);
    startLevel(1);
  };

  const handleNextLevel = () => {
    const nextDiff = Math.min(difficulty + 1, 10);
    setDifficulty(nextDiff);
    startLevel(nextDiff);
  };

  const handleRestart = () => {
    setScore(0);
    setDifficulty(1);
    startLevel(1);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      
      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
          <GameScene 
            handPosRef={handPosRef} 
            cubes={cubes} 
            onCubeEat={handleCubeEat} 
            status={gameStatus}
          />
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} radius={0.6} />
            <Vignette eskil={false} offset={0.1} darkness={0.5} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Headless Hand Tracker (Webcam Logic) */}
      <HandTracker 
        onHandMove={handleHandMove} 
        setGameStatus={(s) => {
            // Only update status if we aren't already in a specific flow state
            if (gameStatus === GameStatus.IDLE || gameStatus === GameStatus.LOADING_MODEL) {
                setGameStatus(s);
            }
        }} 
      />

      {/* HUD & UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-wider filter drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
              NEON FINGER
            </h1>
            <p className="text-gray-400 text-sm mt-1">Powered by MediaPipe</p>
          </div>
          
          <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 text-3xl font-bold score-font text-yellow-400">
                <Trophy className="w-6 h-6" />
                <span>{score}</span>
             </div>
             <div className="text-sm text-gray-500">LEVEL {difficulty}</div>
          </div>
        </div>

        {/* Center Prompts - Container is pointer-events-none to pass clicks through empty space, children are auto */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {gameStatus === GameStatus.LOADING_MODEL && (
            <div className="flex flex-col items-center gap-4 bg-black/80 p-8 rounded-2xl border border-cyan-500/30 backdrop-blur-sm pointer-events-auto z-20">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <div className="text-xl font-bold text-white">Initializing Vision...</div>
              <p className="text-gray-400 text-sm">Please allow camera access</p>
            </div>
          )}

          {gameStatus === GameStatus.IDLE && (
            <div className="text-center bg-black/70 p-10 rounded-3xl border border-white/10 backdrop-blur-md pointer-events-auto z-20">
              <h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
              <button 
                onClick={handleStartGame}
                className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.6)] flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5 fill-current" />
                START GAME
              </button>
              <p className="mt-4 text-gray-400 text-sm max-w-md">
                Raise your index finger to control the light. Collect all the neon cubes.
              </p>
            </div>
          )}

          {gameStatus === GameStatus.GENERATING_LEVEL && (
             <div className="flex flex-col items-center gap-3 bg-black/80 p-6 rounded-xl border border-purple-500/30 pointer-events-auto z-20">
               <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
               <div className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                 Generating Level {difficulty}...
               </div>
             </div>
          )}

          {gameStatus === GameStatus.GAME_OVER && (
            <div className="text-center bg-black/80 p-10 rounded-3xl border border-green-500/30 backdrop-blur-md animate-in fade-in zoom-in duration-300 pointer-events-auto z-20">
              <h2 className="text-5xl font-bold mb-2 text-green-400 score-font">CLEARED!</h2>
              <p className="text-2xl text-white mb-8">Score: {score}</p>
              
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={handleRestart}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-full font-bold transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restart
                </button>
                <button 
                  onClick={handleNextLevel}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-black rounded-full font-bold transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Next Level
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="text-center text-xs text-gray-600 pb-2 pointer-events-auto">
           Show your full hand to the camera. Use your index finger to point.
        </div>
      </div>
    </div>
  );
}

export default App;
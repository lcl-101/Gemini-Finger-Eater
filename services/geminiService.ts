import { Cube } from '../types';

const NEON_COLORS = ['#00FFFF', '#FF00FF', '#00FF00', '#FFFF00', '#FF1493', '#00BFFF'];

export const generateLevel = async (difficulty: number): Promise<Cube[]> => {
  // Simulate a very short delay for smooth UI transition
  await new Promise(resolve => setTimeout(resolve, 300));

  const baseCount = 5;
  const countMultiplier = 3;
  const cubeCount = baseCount + difficulty * countMultiplier;
  
  const cubes: Cube[] = [];

  for (let i = 0; i < cubeCount; i++) {
    // Generate random positions within the visible viewport
    // X range: approx -6 to 6
    // Y range: approx -3.5 to 3.5
    const x = (Math.random() * 12) - 6;
    const y = (Math.random() * 7) - 3.5;
    
    cubes.push({
      id: `cube-${Date.now()}-${i}`,
      position: [x, y, 0],
      color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
      // Points based on difficulty or random 10-50
      points: Math.floor(Math.random() * 5 + 1) * 10 
    });
  }

  return cubes;
};
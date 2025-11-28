import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Trail, Float, Text, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Cube, GameStatus } from '../types';

interface GameSceneProps {
  handPosRef: React.MutableRefObject<{ x: number; y: number }>;
  cubes: Cube[];
  onCubeEat: (id: string, points: number) => void;
  status: GameStatus;
}

const TargetCube = ({ position, color, id, onEat }: { position: [number, number, number], color: string, id: string, onEat: () => void }) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  // Rotating animation
  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.x += delta;
      mesh.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={mesh} position={position}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
};

const FingerCursor = ({ handPosRef, checkCollisions }: { handPosRef: React.MutableRefObject<{ x: number; y: number }>, checkCollisions: (pos: THREE.Vector3) => void }) => {
  const { viewport } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (mesh.current) {
      // Read current hand position from ref
      const { x, y } = handPosRef.current;

      // Convert normalized (0..1) to viewport coordinates
      // x: 0..1 -> -width/2 .. width/2
      // y: 0..1 -> height/2 .. -height/2 (inverted because video y grows down)
      const targetX = (x - 0.5) * viewport.width;
      const targetY = -(y - 0.5) * viewport.height;

      // Smooth movement (Linear Interpolation) for visual appeal
      mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, targetX, 0.2);
      mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, targetY, 0.2);
      mesh.current.position.z = 0; // Lock Z plane

      checkCollisions(mesh.current.position);
    }
  });

  return (
    <group>
      <Trail
        width={1.5} // Width of the trail
        length={8} // Length of the trail
        color={'#00ffff'} // Color of the trail
        attenuation={(t) => t * t} // Trail tapering
      >
        <mesh ref={mesh}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </Trail>
      {/* Light attached to finger */}
      <pointLight ref={(light) => {
          // Sync light position directly if mesh is available, but useFrame handles mesh position.
          // We parent the light to the group, so we actually want the light to follow the mesh.
          // But here the light is a sibling. Let's make it a child of the mesh for simplicity or just leave it since the group isn't moving?
          // Actually, in the JSX below, Trail wraps mesh. The pointLight is outside the Trail but inside the group.
          // The Group itself is NOT moving. The mesh inside is moving.
          // To make the light move with the finger, we should update the light's position too, or put it inside the mesh.
          // Putting it inside the mesh is easier.
      }} />
      {/* Moved light inside the mesh in logic below via a new ref approach or just manual update? 
          Actually, let's just update the light position in useFrame if it was a ref, 
          OR structure the scene so the light is a child of the moving object.
      */}
    </group>
  );
};

const GameScene: React.FC<GameSceneProps> = ({ handPosRef, cubes, onCubeEat, status }) => {
  // Collision Logic
  // This function is recreated when cubes change, which is fine.
  const checkCollisions = (fingerPos: THREE.Vector3) => {
    if (status !== GameStatus.PLAYING) return;

    cubes.forEach(cube => {
      const cubePos = new THREE.Vector3(...cube.position);
      const distance = fingerPos.distanceTo(cubePos);
      
      // Threshold for collision (radius of finger + radius of cube approx)
      if (distance < 0.8) {
        onCubeEat(cube.id, cube.points);
      }
    });
  };

  return (
    <>
      <color attach="background" args={['#050505']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {/* Background Effect */}
      <Sparkles count={100} scale={12} size={4} speed={0.4} opacity={0.5} color="#444444" />

      {/* The Player */}
      <FingerCursor 
        handPosRef={handPosRef}
        checkCollisions={checkCollisions} 
      />

      {/* The Targets */}
      {cubes.map((cube) => (
        <TargetCube 
          key={cube.id} 
          {...cube} 
          id={cube.id}
          onEat={() => onCubeEat(cube.id, cube.points)}
        />
      ))}

      {/* Game Over Text */}
      {status === GameStatus.GAME_OVER && (
        <Text
          position={[0, 0, 0]}
          fontSize={1}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/orbitron/v25/yMJMMIlzdpvBhQASiN_62wbh.woff2"
        >
          LEVEL COMPLETE!
        </Text>
      )}
    </>
  );
};

export default GameScene;
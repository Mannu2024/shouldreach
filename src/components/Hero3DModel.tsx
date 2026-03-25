import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, useScroll, useTransform } from 'motion/react';

function AbstractShape() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.005;
      
      // React to mouse movement
      const targetX = (state.pointer.x * Math.PI) / 4;
      const targetY = (state.pointer.y * Math.PI) / 4;
      
      meshRef.current.rotation.y += 0.05 * (targetX - meshRef.current.rotation.y);
      meshRef.current.rotation.x += 0.05 * (targetY - meshRef.current.rotation.x);
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} scale={1.5}>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <meshPhysicalMaterial 
          color="#4f46e5" 
          roughness={0.1}
          metalness={0.8}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={2}
        />
      </mesh>
    </Float>
  );
}

export default function Hero3DModel() {
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 500], [1, 0.5]);
  const rotate = useTransform(scrollY, [0, 500], [0, 90]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <motion.div 
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ scale, rotate, opacity }}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <AbstractShape />
        <Environment preset="city" />
        <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      </Canvas>
    </motion.div>
  );
}

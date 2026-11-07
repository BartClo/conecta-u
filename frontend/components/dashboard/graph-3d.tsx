"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import { useRef } from "react";
import type { Group } from "three";
import { COLOR_SWATCH } from "@/lib/colors";
import type { Curso } from "@/lib/types";

// Visual composition (ui-ux-pro-max brief: center node + up to ~10 course
// nodes around it, billboarded labels, slow idle rotation):
// - RADIUS 3.2: keeps 10 evenly-spaced nodes from overlapping at NODE_RADIUS 0.45
// - camera z 9 / fov 45: frames the full ring with margin, slight elevation (y 4.5) for depth
// - rotation 0.12 rad/s: slow enough to read labels while implying "alive" idle state
// - Text (drei) billboards toward the camera automatically — simplest native option
//   over an HTML overlay, since labels must stay attached to rotating 3D nodes
const RADIUS = 3.2;
const CENTER_NODE_RADIUS = 0.65;
const COURSE_NODE_RADIUS = 0.45;
const ROTATION_SPEED = 0.12;

export function computeNodePositions(
  count: number,
  radius: number,
): [number, number, number][] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [
      number,
      number,
      number,
    ];
  });
}

function RotatingGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * ROTATION_SPEED;
  });
  return <group ref={groupRef}>{children}</group>;
}

interface Graph3DProps {
  cursos: Curso[];
  userInitial: string;
}

export function Graph3D({ cursos, userInitial }: Graph3DProps) {
  const positions = computeNodePositions(cursos.length, RADIUS);

  return (
    <div className="h-80 w-full rounded-xl border bg-card">
      <Canvas camera={{ position: [0, 4.5, 9], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={0.8} />
        <RotatingGroup>
          <mesh>
            <sphereGeometry args={[CENTER_NODE_RADIUS, 32, 32]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <Text position={[0, 1, 0]} fontSize={0.4} color="white">
            {userInitial}
          </Text>
          {cursos.map((curso, i) => (
            <group key={curso.id} position={positions[i]}>
              <mesh>
                <sphereGeometry args={[COURSE_NODE_RADIUS, 32, 32]} />
                <meshStandardMaterial
                  color={COLOR_SWATCH[curso.color] ?? "#888888"}
                />
              </mesh>
              <Text position={[0, 0.7, 0]} fontSize={0.25} color="white">
                {curso.nombre}
              </Text>
              <Line
                points={[
                  [0, 0, 0],
                  [-positions[i][0], -positions[i][1], -positions[i][2]],
                ]}
                color="#555555"
                lineWidth={1}
              />
            </group>
          ))}
        </RotatingGroup>
      </Canvas>
    </div>
  );
}

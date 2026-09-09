'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, useTexture } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { Group, MathUtils, Mesh, SRGBColorSpace } from 'three'
import lipImage from '../asset/Lip.png'

function Lip() {
  const group = useRef<Group>(null)
  const front = useRef<Mesh>(null)
  const texture = useTexture(lipImage.src)
  texture.colorSpace = SRGBColorSpace
  const depthLayers = useMemo(() => Array.from({ length: 9 }, (_, index) => index), [])

  useFrame((state, delta) => {
    if (!group.current || !front.current) return
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, state.pointer.y * 0.12, 3, delta)
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, -0.14 + state.pointer.x * 0.2, 3, delta)
    group.current.rotation.z = MathUtils.damp(group.current.rotation.z, state.pointer.x * -0.035, 3, delta)
    front.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.45) * 0.012
  })

  return (
    <Float speed={1.35} rotationIntensity={0.07} floatIntensity={0.28} floatingRange={[-0.08, 0.08]}>
      <group ref={group} rotation={[0.03, -0.14, -0.02]}>
        {depthLayers.map((layer) => (
          <mesh key={layer} position={[0, 0, -0.025 - layer * 0.018]} scale={[1 - layer * 0.004, 1 - layer * 0.004, 1]}>
            <planeGeometry args={[5.15, 5.15]} />
            <meshBasicMaterial map={texture} color="#7d073e" transparent alphaTest={0.08} opacity={0.72} depthWrite={false} />
          </mesh>
        ))}
        <mesh ref={front}>
          <planeGeometry args={[5.15, 5.15, 32, 32]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.035} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </Float>
  )
}

export default function HeroLip() {
  return (
    <div className="hero-lip" aria-label="Floating chrome-pink lips">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 5.7], fov: 42 }} gl={{ alpha: true, antialias: true }}>
        <Lip />
      </Canvas>
      <div className="lip-halo" />
    </div>
  )
}

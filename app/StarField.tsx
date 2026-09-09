'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import type { Points as ThreePoints } from 'three'

function Stars() {
  const ref = useRef<ThreePoints>(null)
  const points = useMemo(() => {
    const data = new Float32Array(850 * 3)
    for (let i = 0; i < data.length; i += 3) {
      data[i] = (Math.random() - 0.5) * 14
      data[i + 1] = (Math.random() - 0.5) * 8
      data[i + 2] = (Math.random() - 0.5) * 4
    }
    return data
  }, [])
  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.012
    ref.current.rotation.x = state.pointer.y * 0.015
  })
  return <Points ref={ref} positions={points} stride={3} frustumCulled={false}>
    <PointMaterial transparent color="#ff3d98" size={0.012} sizeAttenuation depthWrite={false} opacity={0.7} />
  </Points>
}

export default function StarField() {
  return <div className="stars" aria-hidden="true"><Canvas camera={{ position: [0, 0, 4] }}><Stars /></Canvas></div>
}

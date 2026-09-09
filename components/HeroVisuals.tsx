'use client'

import dynamic from 'next/dynamic'

const StarField = dynamic(() => import('./StarField'), { ssr: false })
const HeroLip = dynamic(() => import('./HeroLip'), { ssr: false })

export default function HeroVisuals() {
  return <><StarField /><HeroLip /></>
}

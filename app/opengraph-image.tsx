import { ImageResponse } from 'next/og'
export const alt = 'LIPS — Music People Culture'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default function Image() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#050305', color: '#ff3292' }}><div style={{ fontSize: 180, fontStyle: 'italic' }}>LIPS.</div><div style={{ fontSize: 30, color: 'white', letterSpacing: 8 }}>MUSIC PEOPLE CULTURE</div><div style={{ fontSize: 24, marginTop: 48, color: '#ffacd3' }}>VANCOUVER · AFTER DARK</div></div>, size)
}

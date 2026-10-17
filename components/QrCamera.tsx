'use client'

import { useEffect, useRef, useState } from 'react'

export default function QrCamera({ onScan, disabled }: { onScan: (value: string) => void; disabled: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const callback = useRef(onScan)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { callback.current = onScan }, [onScan])

  useEffect(() => {
    if (!active || disabled) return
    let cancelled = false
    let stream: MediaStream | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const element = video.current
    const stop = () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach(track => track.stop())
      if (element) element.srcObject = null
    }
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('UNAVAILABLE')
        const { default: jsQR } = await import('jsqr')
        if (cancelled) return
        const camera = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
        stream = camera
        if (cancelled || !element) { camera.getTracks().forEach(track => track.stop()); return }
        element.srcObject = camera
        await element.play()
        if (cancelled) return
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('UNAVAILABLE')
        const scan = () => {
          if (cancelled) return
          try {
            if (element.readyState >= 2 && element.videoWidth > 0) {
              canvas.width = Math.min(element.videoWidth, 720)
              canvas.height = Math.round(element.videoHeight * canvas.width / element.videoWidth)
              context.drawImage(element, 0, 0, canvas.width, canvas.height)
              const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
              const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })
              if (code?.data) {
                stop()
                setActive(false)
                callback.current(code.data)
                return
              }
            }
            timer = setTimeout(scan, 180)
          } catch {
            stop(); setActive(false); setError('読み取りに失敗しました。カメラを再開するか、URLを入力してください。')
          }
        }
        scan()
      } catch (cause) {
        stream?.getTracks().forEach(track => track.stop())
        if (cancelled) return
        stop(); setActive(false)
        const name = cause instanceof Error ? cause.name : ''
        setError(name === 'NotAllowedError' ? 'カメラの使用を許可してください。HTTPS接続またはlocalhostが必要です。' : name === 'NotFoundError' ? 'カメラが見つかりません。QRのURLを入力してください。' : 'カメラを開始できません。HTTPS接続とカメラの使用許可を確認してください。')
      }
    }
    const hide = () => { if (document.hidden) { stop(); setActive(false) } }
    document.addEventListener('visibilitychange', hide)
    void start()
    return () => { document.removeEventListener('visibilitychange', hide); stop() }
  }, [active, disabled])

  return <div className="qr-camera">
    <div className="admin-actions"><button type="button" disabled={disabled} onClick={() => { setError(''); setActive(value => !value) }}>{active ? 'カメラを停止' : 'カメラでQRを読み取る'}</button></div>
    {active && !disabled && <div className="qr-camera-view"><video ref={video} autoPlay playsInline muted aria-label="チェックイン用QRカメラ"/><div className="qr-camera-guide" aria-hidden="true"/><p>枠の中にチケットのQRを合わせてください</p></div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <p className="camera-privacy">映像はこの端末内で処理します。録画・アップロードは行いません。</p>
  </div>
}

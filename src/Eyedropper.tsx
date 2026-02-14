import { useEffect, useRef, useState, useCallback, type RefObject } from 'react'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  onPick: (color: string) => void
  onCancel: () => void
}

export function Eyedropper({ videoRef, onPick, onCancel }: Props) {
  const [pos, setPos] = useState<[number, number] | null>(null)
  const [hex, setHex] = useState<string | null>(null)
  const cRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const mountedRef = useRef(true)
  const labelRef = useRef<HTMLDivElement | null>(null)

  const sample = useCallback((x: number, y: number) => {
    const videoEl = videoRef.current
    if (!videoEl || !videoEl.videoWidth) return null
    const r = videoEl.getBoundingClientRect()
    const mx = x - r.left, my = y - r.top
    if (mx < 0 || my < 0 || mx > r.width || my > r.height) return null
    const c = cRef.current
    c.width = videoEl.videoWidth; c.height = videoEl.videoHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(videoEl, 0, 0)
    const p = ctx.getImageData(
      Math.floor(mx * videoEl.videoWidth / r.width),
      Math.floor(my * videoEl.videoHeight / r.height), 1, 1
    ).data
    return '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('')
  }, [videoRef])

  const makeCursor = (fill: string) => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='14' fill='${fill}' stroke='white' stroke-width='2.5'/><circle cx='16' cy='16' r='2' fill='white'/></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, crosshair`
  }

  useEffect(() => {
    mountedRef.current = true

    // Create a style element that forces cursor on EVERYTHING
    const style = document.createElement('style')
    style.textContent = '* { cursor: crosshair !important; }'
    document.head.appendChild(style)

    // Create floating label
    const label = document.createElement('div')
    label.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;font-size:11px;font-family:monospace;color:#fff;background:rgba(0,0,0,0.9);padding:3px 8px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:none;'
    document.body.appendChild(label)
    labelRef.current = label

    const move = (e: MouseEvent) => {
      if (!mountedRef.current) return
      const color = sample(e.clientX, e.clientY)
      
      // Update label position and text
      label.style.display = 'block'
      label.style.left = (e.clientX + 24) + 'px'
      label.style.top = (e.clientY + 24) + 'px'
      
      if (color) {
        label.textContent = color
        label.style.color = '#fff'
        // Update cursor to show the color
        style.textContent = `* { cursor: ${makeCursor(color)} !important; }`
      } else {
        label.textContent = 'hover over video'
        label.style.color = 'rgba(255,255,255,0.5)'
        style.textContent = '* { cursor: crosshair !important; }'
      }
    }

    const click = (e: MouseEvent) => {
      if (!mountedRef.current) return
      const c = sample(e.clientX, e.clientY)
      if (c) {
        mountedRef.current = false
        e.stopPropagation()
        e.preventDefault()
        cleanup()
        onPick(c)
      }
    }

    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        mountedRef.current = false
        cleanup()
        onCancel()
      }
    }

    const cleanup = () => {
      document.removeEventListener('mousemove', move, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', esc, true)
      style.remove()
      label.remove()
    }

    document.addEventListener('mousemove', move, true)
    document.addEventListener('keydown', esc, true)
    
    const t = setTimeout(() => {
      if (mountedRef.current) document.addEventListener('click', click, true)
    }, 150)

    return () => {
      mountedRef.current = false
      clearTimeout(t)
      cleanup()
    }
  }, [sample, onPick, onCancel])

  // No React DOM needed - everything is done via direct DOM manipulation
  return null
}

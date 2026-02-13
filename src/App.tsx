import { useState, useCallback, useRef, useEffect } from 'react'
import { LiveChromaKey } from './LiveChromaKey'
import { motion, AnimatePresence } from 'motion/react'

const CHECKERBOARD = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='10' height='10' fill='%23222'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23222'/%3E%3Crect x='10' width='10' height='10' fill='%23181818'/%3E%3Crect y='10' width='10' height='10' fill='%23181818'/%3E%3C/svg%3E")`

const PRESET_COLORS = [
  { hex: '#00ff00', label: 'Green' },
  { hex: '#00cc00', label: 'Dark Green' },
  { hex: '#0000ff', label: 'Blue' },
  { hex: '#ff00ff', label: 'Magenta' },
]

const BG_PRESETS = [
  { value: 'checkerboard', label: 'Transparent' },
  { value: '#ffffff', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#1a1a2e', label: 'Dark Navy' },
  { value: '#0f3460', label: 'Deep Blue' },
  { value: '#e94560', label: 'Coral' },
  { value: 'custom', label: 'Custom' },
]

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoName, setVideoName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [color, setColor] = useState('#00ff00')
  const [similarity, setSimilarity] = useState(0.35)
  const [blend, setBlend] = useState(0.15)
  const [despill, setDespill] = useState(true)
  const [chromaActive, setChromaActive] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [bgMode, setBgMode] = useState('checkerboard')
  const [customBg, setCustomBg] = useState('#2d1b69')
  const [copied, setCopied] = useState(false)
  const [eyedropper, setEyedropper] = useState(false)
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const samplerCanvas = useRef<HTMLCanvasElement | null>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setVideoName(file.name)
  }, [videoUrl])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const sampleColorAt = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoElRef.current
    if (!video || video.videoWidth === 0) return null

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const scaleX = video.videoWidth / rect.width
    const scaleY = video.videoHeight / rect.height
    const vx = Math.floor(x * scaleX)
    const vy = Math.floor(y * scaleY)

    if (!samplerCanvas.current) {
      samplerCanvas.current = document.createElement('canvas')
    }
    const canvas = samplerCanvas.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const pixel = ctx.getImageData(vx, vy, 1, 1).data
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('')
    return hex
  }

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!eyedropper) return
    const hex = sampleColorAt(e)
    if (hex) {
      setColor(hex)
      setChromaActive(true)
      setEyedropper(false)
      setHoveredColor(null)
    }
  }

  const handlePreviewMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!eyedropper) return
    const hex = sampleColorAt(e)
    if (hex) setHoveredColor(hex)
  }

  const getPreviewBg = (): React.CSSProperties => {
    if (!chromaActive || showOriginal) return { backgroundColor: '#111' }
    if (bgMode === 'checkerboard') return { backgroundImage: CHECKERBOARD }
    if (bgMode === 'custom') return { backgroundColor: customBg }
    return { backgroundColor: bgMode }
  }

  const generateCode = () => {
    const props: string[] = [`src="${videoName || 'your-video.mp4'}"`]
    if (color !== '#00ff00') props.push(`color="${color}"`)
    if (similarity !== 0.35) props.push(`similarity={${similarity}}`)
    if (blend !== 0.15) props.push(`blend={${blend}}`)
    if (!despill) props.push(`despill={false}`)
    return `<ChromaKeyVideo\n  ${props.join('\n  ')}\n/>`
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generateCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setColor('#00ff00')
    setSimilarity(0.35)
    setBlend(0.15)
    setDespill(true)
    setBgMode('checkerboard')
    setChromaActive(false)
  }

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}>
            ▶
          </div>
          <div>
            <h1 style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              chromakey-video-react
            </h1>
            <p style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              playground
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a
            href="https://www.npmjs.com/package/chromakey-video-react"
            target="_blank"
            rel="noopener"
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontFamily: 'var(--font-mono)',
              padding: '6px 12px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            npm ↗
          </a>
          <a
            href="https://github.com/anl331/chromakey-video-react"
            target="_blank"
            rel="noopener"
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontFamily: 'var(--font-mono)',
              padding: '6px 12px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            GitHub ↗
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 1200,
        width: '100%',
        margin: '0 auto',
        padding: '32px 32px 64px',
      }}>
        <AnimatePresence mode="wait">
          {!videoUrl ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 500,
              }}
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  maxWidth: 600,
                  padding: '80px 40px',
                  border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 16,
                  background: isDragging ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: 48,
                  marginBottom: 16,
                  opacity: isDragging ? 1 : 0.5,
                  transition: 'opacity 0.3s',
                }}>
                  🎬
                </div>
                <p style={{
                  fontSize: 18,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: isDragging ? 'var(--accent)' : 'var(--text-primary)',
                }}>
                  {isDragging ? 'Drop it here' : 'Drop a green screen video'}
                </p>
                <p style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                }}>
                  or click to browse
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
              <div style={{
                marginTop: 48,
                padding: '16px 24px',
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                color: 'var(--text-secondary)',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>$</span>{' '}
                <span style={{ color: 'var(--accent)' }}>npm install</span>{' '}
                chromakey-video-react
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Preview + Controls */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 340px',
                gap: 24,
                marginBottom: 24,
              }}>
                {/* Video Preview */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                    }}>
                      {videoName}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!chromaActive && (
                        <div style={{
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          padding: '4px 10px',
                          borderRadius: 5,
                          background: 'var(--accent-glow)',
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          ← use eyedropper or pick a key color to start
                        </div>
                      )}
                      {chromaActive && (
                        <button
                          onClick={() => setShowOriginal(!showOriginal)}
                          style={{
                            fontSize: 12,
                            fontFamily: 'var(--font-mono)',
                            padding: '4px 10px',
                            borderRadius: 5,
                            border: '1px solid var(--border)',
                            background: showOriginal ? 'var(--accent-glow)' : 'transparent',
                            color: showOriginal ? 'var(--accent)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {showOriginal ? 'showing original' : 'show original'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (videoUrl) URL.revokeObjectURL(videoUrl)
                          setVideoUrl(null)
                          setVideoName('')
                        }}
                        style={{
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          padding: '4px 10px',
                          borderRadius: 5,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        ✕ clear
                      </button>
                    </div>
                  </div>

                  <div
                    onClick={handlePreviewClick}
                    onMouseMove={handlePreviewMove}
                    onMouseLeave={() => setHoveredColor(null)}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 400,
                      transition: 'background-color 0.3s',
                      cursor: eyedropper ? 'crosshair' : 'default',
                      ...getPreviewBg(),
                    }}
                  >
                    {(!chromaActive || showOriginal) ? (
                      <video
                        ref={el => { if (el) videoElRef.current = el }}
                        src={videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          maxWidth: '100%',
                          maxHeight: 500,
                          display: 'block',
                        }}
                      />
                    ) : (
                      <LiveChromaKey
                        src={videoUrl}
                        color={color}
                        similarity={similarity}
                        blend={blend}
                        despill={despill}
                        className="preview-canvas"
                        videoRef={videoElRef}
                      />
                    )}
                    {eyedropper && (
                      <div style={{
                        position: 'absolute',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '6px 14px',
                        background: 'rgba(0,0,0,0.8)',
                        borderRadius: 8,
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        pointerEvents: 'none',
                        zIndex: 10,
                      }}>
                        {hoveredColor && (
                          <div style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            background: hoveredColor,
                            border: '1px solid rgba(255,255,255,0.3)',
                          }} />
                        )}
                        {hoveredColor ? `click to select ${hoveredColor}` : 'click on the color to remove'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls Panel */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  overflowY: 'auto',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <h3 style={{
                      fontSize: 14,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                    }}>
                      Controls
                    </h3>
                    <button
                      onClick={reset}
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      reset
                    </button>
                  </div>

                  {/* Key Color */}
                  <div>
                    <label style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      display: 'block',
                      marginBottom: 8,
                    }}>
                      Key Color
                    </label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {PRESET_COLORS.map(p => (
                        <button
                          key={p.hex}
                          onClick={() => { setColor(p.hex); setChromaActive(true) }}
                          title={p.label}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: color === p.hex
                              ? '2px solid var(--accent)'
                              : '2px solid var(--border)',
                            background: p.hex,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                      <div style={{ position: 'relative' }}>
                        <input
                          type="color"
                          value={color}
                          onChange={e => { setColor(e.target.value); setChromaActive(true) }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '2px solid var(--border)',
                            cursor: 'pointer',
                            background: 'var(--bg-tertiary)',
                            padding: 2,
                          }}
                        />
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 2,
                    }}>
                      <button
                        onClick={() => setEyedropper(!eyedropper)}
                        style={{
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          padding: '4px 10px',
                          borderRadius: 5,
                          border: '1px solid var(--border)',
                          background: eyedropper ? 'var(--accent-glow)' : 'transparent',
                          color: eyedropper ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        💧 {eyedropper ? 'picking...' : 'eyedropper'}
                      </button>
                      <span style={{
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                      }}>
                        {color}
                      </span>
                    </div>
                  </div>

                  {/* Similarity */}
                  <SliderControl
                    label="Similarity"
                    value={similarity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={setSimilarity}
                    description="How aggressively to match the key color"
                  />

                  {/* Blend */}
                  <SliderControl
                    label="Blend"
                    value={blend}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={setBlend}
                    description="Soft edge blending range"
                  />

                  {/* Despill */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <label style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                      }}>
                        Despill
                      </label>
                      <button
                        onClick={() => setDespill(!despill)}
                        style={{
                          width: 40,
                          height: 22,
                          borderRadius: 11,
                          border: 'none',
                          background: despill ? 'var(--accent)' : 'var(--bg-elevated)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}
                      >
                        <div style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: 3,
                          left: despill ? 21 : 3,
                          transition: 'left 0.2s',
                        }} />
                      </button>
                    </div>
                    <p style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 4,
                    }}>
                      Remove color spill from edges
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: 'var(--border)' }} />

                  {/* Background Color */}
                  <div>
                    <label style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      display: 'block',
                      marginBottom: 8,
                    }}>
                      Preview Background
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {BG_PRESETS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setBgMode(p.value)}
                          title={p.label}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: bgMode === p.value
                              ? '2px solid var(--accent)'
                              : '2px solid var(--border)',
                            background: p.value === 'checkerboard'
                              ? CHECKERBOARD
                              : p.value === 'custom'
                              ? `conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)`
                              : p.value,
                            backgroundSize: p.value === 'checkerboard' ? '20px 20px' : undefined,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        />
                      ))}
                    </div>
                    {bgMode === 'custom' && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="color"
                          value={customBg}
                          onChange={e => setCustomBg(e.target.value)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '2px solid var(--border)',
                            cursor: 'pointer',
                            background: 'var(--bg-tertiary)',
                            padding: 2,
                          }}
                        />
                        <span style={{
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-muted)',
                        }}>
                          {customBg}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Code Output */}
              <div style={{
                background: 'var(--code-bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-secondary)',
                }}>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}>
                    component code
                  </span>
                  <button
                    onClick={copyCode}
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      padding: '4px 12px',
                      borderRadius: 5,
                      border: '1px solid var(--border)',
                      background: copied ? 'var(--accent-glow)' : 'transparent',
                      color: copied ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {copied ? '✓ copied' : 'copy'}
                  </button>
                </div>
                <pre style={{
                  padding: '20px 24px',
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.7,
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  margin: 0,
                }}>
                  <code>{generateCode()}</code>
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '20px 32px',
        borderTop: '1px solid var(--border)',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-muted)',
      }}>
        Built by{' '}
        <a
          href="https://x.com/_itsanl"
          target="_blank"
          rel="noopener"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
        >
          @_itsanl
        </a>
      </footer>
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  description,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  description: string
}) {
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <label style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-secondary)',
        }}>
          {label}
        </label>
        <span style={{
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent)',
          fontWeight: 500,
        }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--accent)',
          height: 4,
        }}
      />
      <p style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 4,
      }}>
        {description}
      </p>
    </div>
  )
}

export default App

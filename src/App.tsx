import { useState, useCallback, useRef, useEffect } from 'react'
import { LiveChromaKey } from './LiveChromaKey'
import { Eyedropper } from './Eyedropper'
import { motion, AnimatePresence } from 'motion/react'

const CHECKER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23191919'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23191919'/%3E%3Crect x='8' width='8' height='8' fill='%23141414'/%3E%3Crect y='8' width='8' height='8' fill='%23141414'/%3E%3C/svg%3E")`

const KEY_PRESETS = ['#00ff00', '#00cc00', '#0000ff', '#ff00ff']
const BG_OPTIONS = ['checker', '#ffffff', '#000000', '#18181b', '#0c1222', '#1a0a2e', 'custom']

export default function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoName, setVideoName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [active, setActive] = useState(false)
  const [color, setColor] = useState('#00ff00')
  const [similarity, setSimilarity] = useState(0.35)
  const [blend, setBlend] = useState(0.15)
  const [despill, setDespill] = useState(true)
  const [bg, setBg] = useState('checker')
  const [customBg, setCustomBg] = useState('#1a0533')
  const [eyedropper, setEyedropper] = useState(false)
  const [eyedropperKey, setEyedropperKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const [showOrig, setShowOrig] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('video/')) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(f))
    setVideoName(f.name)
    setActive(false)
    setShowOrig(false)
    // Auto-activate eyedropper after a brief delay for the video to render
    setTimeout(() => { setEyedropperKey(k => k + 1); setEyedropper(true) }, 300)
  }, [videoUrl])

  const drop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const handleEyedropperPick = useCallback((c: string) => {
    setColor(c)
    setActive(true)
    setEyedropper(false)
  }, [])

  const handleEyedropperCancel = useCallback(() => {
    setEyedropper(false)
  }, [])

  const pickColor = (c: string) => { setColor(c); setActive(true) }

  const bgStyle = (): React.CSSProperties => {
    if (!active || showOrig) return { background: '#0a0a0a' }
    if (bg === 'checker') return { backgroundImage: CHECKER, backgroundSize: '16px 16px' }
    if (bg === 'custom') return { background: customBg }
    return { background: bg }
  }

  const code = () => {
    const p = [`src="/your-video.mp4" {/* replace with your video path */}`]
    if (color !== '#00ff00') p.push(`color="${color}"`)
    if (similarity !== 0.35) p.push(`similarity={${similarity}}`)
    if (blend !== 0.15) p.push(`blend={${blend}}`)
    if (!despill) p.push(`despill={false}`)
    return `<ChromaKeyVideo\n  ${p.join('\n  ')}\n/>`
  }

  const copyCode = async () => {
    const text = code()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  // Shared styles
  const pill = (isActive: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontFamily: 'var(--mono)',
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid',
    borderColor: isActive ? 'var(--accent)' : 'var(--border)',
    background: isActive ? 'var(--accent-soft)' : 'transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-dim)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Eyedropper */}
      {eyedropper && (
        <Eyedropper
          key={eyedropperKey}
          videoRef={videoElRef}
          onPick={handleEyedropperPick}
          onCancel={handleEyedropperCancel}
        />
      )}

      {/* Top bar */}
      <nav style={{
        height: 48,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
            chromakey-video-react
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: 'var(--mono)',
            color: 'var(--text-muted)',
            background: 'var(--bg-hover)',
            padding: '2px 6px',
            borderRadius: 3,
          }}>
            playground
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'npm', href: 'https://www.npmjs.com/package/chromakey-video-react' },
            { label: 'github', href: 'https://github.com/anl331/chromakey-video-react' },
          ].map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener" style={{
              fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)',
              textDecoration: 'none', padding: '4px 8px', borderRadius: 4,
              border: '1px solid var(--border)', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-active)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >{l.label} ↗</a>
          ))}
        </div>
      </nav>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {!videoUrl ? (
            /* ─── Drop zone ─── */
            <motion.div
              key="drop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 64px' }}
            >
              {/* Hero */}
              <div style={{ textAlign: 'center', maxWidth: 520, marginBottom: 40 }}>
                <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 10, lineHeight: 1.2 }}>
                  Real-time green screen removal
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                  Drop a video, pick the color to remove, fine-tune the settings, and copy the component code. Runs on the GPU via WebGL.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDrop={drop}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%',
                  maxWidth: 480,
                  padding: '48px 40px',
                  borderRadius: 16,
                  border: `1.5px dashed ${dragging ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                  background: dragging ? 'var(--accent-soft)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                  textAlign: 'center',
                  marginBottom: 48,
                }}
              >
                <motion.div
                  animate={{ y: dragging ? -4 : 0 }}
                  style={{ fontSize: 36, marginBottom: 12, opacity: dragging ? 1 : 0.4 }}
                >
                  🎬
                </motion.div>
                <p style={{ fontSize: 15, fontWeight: 500, color: dragging ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
                  {dragging ? 'Drop it' : 'Drop a green screen video'}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  or click to browse
                </p>
              </div>
              <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />

              {/* Install & Usage */}
              <div style={{ width: '100%', maxWidth: 560 }}>
                {/* Install */}
                <div style={{ marginBottom: 32 }}>
                  <p style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Install
                  </p>
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontFamily: 'var(--mono)',
                    fontSize: 13,
                    color: 'var(--text-dim)',
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>$</span>{' '}
                    <span style={{ color: 'var(--accent)' }}>npm install</span> chromakey-video-react
                  </div>
                </div>

                {/* Usage */}
                <div style={{ marginBottom: 32 }}>
                  <p style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Usage
                  </p>
                  <pre style={{
                    padding: '16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: 'var(--text-dim)',
                    overflow: 'auto',
                    margin: 0,
                  }}>
{`import { ChromaKeyVideo } from 'chromakey-video-react';

function App() {
  return (
    <ChromaKeyVideo
      src="/your-video.mp4"
      color="#00ff00"
      similarity={0.35}
      blend={0.15}
    />
  );
}`}
                  </pre>
                </div>

                {/* Props quick ref */}
                <div style={{ marginBottom: 32 }}>
                  <p style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Props
                  </p>
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}>
                    {[
                      { name: 'src', type: 'string', desc: 'Video source URL' },
                      { name: 'color', type: 'string', def: '#00ff00', desc: 'Color to key out' },
                      { name: 'similarity', type: 'number', def: '0.35', desc: 'Match aggressiveness (0-1)' },
                      { name: 'blend', type: 'number', def: '0.15', desc: 'Edge blending range (0-1)' },
                      { name: 'despill', type: 'boolean', def: 'true', desc: 'Remove color spill from edges' },
                      { name: 'loop', type: 'boolean', def: 'true', desc: 'Loop the video' },
                      { name: 'autoPlay', type: 'boolean', def: 'true', desc: 'Auto-play (always muted)' },
                      { name: 'className', type: 'string', desc: 'CSS class for the canvas' },
                    ].map((p, i) => (
                      <div key={p.name} style={{
                        padding: '10px 16px',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'baseline',
                        borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                        fontSize: 12,
                      }}>
                        <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', minWidth: 80 }}>{p.name}</span>
                        <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)', minWidth: 56, fontSize: 11 }}>{p.type}</span>
                        <span style={{ color: 'var(--text-dim)', flex: 1 }}>
                          {p.desc}
                          {p.def && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({p.def})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <a href="https://github.com/anl331/chromakey-video-react" target="_blank" rel="noopener" style={{
                    fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none',
                    padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-active)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
                  >GitHub</a>
                  <a href="https://www.npmjs.com/package/chromakey-video-react" target="_blank" rel="noopener" style={{
                    fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none',
                    padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-active)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
                  >npm</a>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ─── Editor ─── */
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
            >
              {/* Video area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Video toolbar */}
                <div style={{
                  height: 40,
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border)',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {videoName}
                  </span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {!active && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ fontSize: 11, color: 'var(--accent)', marginRight: 8, fontFamily: 'var(--mono)' }}
                      >
                        pick a color to start →
                      </motion.span>
                    )}
                    {active && (
                      <button onClick={() => setShowOrig(!showOrig)} style={pill(showOrig)}>
                        {showOrig ? 'original' : 'compare'}
                      </button>
                    )}
                    <button onClick={() => { if (videoUrl) URL.revokeObjectURL(videoUrl); setVideoUrl(null); setActive(false) }} style={pill(false)}>
                      ✕
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'background 0.3s',
                    ...bgStyle(),
                  }}
                >
                  {(!active || showOrig) ? (
                    <video
                      ref={el => { if (el) videoElRef.current = el }}
                      src={videoUrl}
                      autoPlay loop muted playsInline
                      style={{ maxWidth: '70%', maxHeight: '70%', display: 'block', borderRadius: 8 }}
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

                </div>

                {/* Code bar */}
                {active && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    style={{
                      borderTop: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <pre style={{
                        fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-dim)',
                        lineHeight: 1.5, margin: 0, overflow: 'auto', flex: 1,
                      }}>
                        <code>{code()}</code>
                      </pre>
                      <button onClick={copyCode} style={{
                        ...pill(copied), marginLeft: 12, flexShrink: 0,
                      }}>
                        {copied ? '✓' : 'copy'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* ─── Sidebar ─── */}
              <div style={{
                width: 320,
                borderLeft: '1px solid var(--border)',
                background: 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
                overflow: 'auto',
              }}>
                {/* Key color */}
                <Section title="Key Color">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {KEY_PRESETS.map(c => (
                      <button key={c} onClick={() => pickColor(c)} style={{
                        width: 24, height: 24, borderRadius: 6, background: c, border: '2px solid',
                        borderColor: (active && color === c) ? 'var(--text)' : 'transparent',
                        cursor: 'pointer', transition: 'border-color 0.15s',
                        outline: color === c ? 'none' : '1px solid var(--border)',
                      }} />
                    ))}
                    <input type="color" value={color} onChange={e => pickColor(e.target.value)} style={{
                      width: 24, height: 24, borderRadius: 6, background: 'var(--bg-hover)',
                      border: '1px solid var(--border)', padding: 1,
                    }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={() => { if (!eyedropper) setEyedropperKey(k => k + 1); setEyedropper(!eyedropper) }} style={{
                      ...pill(eyedropper), display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M13.354 3.354l-.708-.708L15 .293l.707.707-2.354 2.354zM9 6a1 1 0 112 0 1 1 0 01-2 0zm-7.5 8.5l2-6L10 2l4 4-6.5 6.5-6 2zm2.829-1.171l3.384-1.128L4.5 9.5l-1.128 3.384.957.445z"/></svg>
                      {eyedropper ? 'picking' : 'pick'}
                    </button>
                    {active && (
                      <>
                        <div style={{
                          width: 18, height: 18, borderRadius: 4,
                          background: color, border: '1px solid var(--border-active)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{color}</span>
                      </>
                    )}
                  </div>
                </Section>

                {/* Tuning */}
                <Section title="Tuning">
                  <Slider label="Similarity" value={similarity} onChange={setSimilarity} />
                  <Slider label="Blend" value={blend} onChange={setBlend} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Despill</span>
                    <Toggle on={despill} onToggle={() => setDespill(!despill)} />
                  </div>
                </Section>

                {/* Background */}
                <Section title="Background">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {BG_OPTIONS.map(b => (
                      <button key={b} onClick={() => setBg(b)} style={{
                        width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
                        border: '2px solid', transition: 'border-color 0.15s',
                        borderColor: bg === b ? 'var(--text)' : 'transparent',
                        outline: bg === b ? 'none' : '1px solid var(--border)',
                        background: b === 'checker'
                          ? CHECKER
                          : b === 'custom'
                          ? 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)'
                          : b,
                        backgroundSize: b === 'checker' ? '16px 16px' : undefined,
                      }} />
                    ))}
                  </div>
                  {bg === 'custom' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                      <input type="color" value={customBg} onChange={e => setCustomBg(e.target.value)} style={{
                        width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)', padding: 1,
                      }} />
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{customBg}</span>
                    </div>
                  )}
                </Section>

                {/* Reset */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                  <button onClick={() => { setColor('#00ff00'); setSimilarity(0.35); setBlend(0.15); setDespill(true); setBg('checker'); setActive(false) }}
                    style={{ ...pill(false), width: '100%', textAlign: 'center' }}>
                    reset all
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={{
        height: 32, padding: '0 20px', display: 'flex', alignItems: 'center',
        borderTop: '1px solid var(--border)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          built by{' '}
          <a href="https://alfredonatal.com" target="_blank" rel="noopener"
            style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Alfredo Natal</a>
          {' · '}
          <a href="https://x.com/_itsanl" target="_blank" rel="noopener"
            style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>@_itsanl</a>
        </span>
      </div>
    </div>
  )
}

/* ─── Sub-components ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
      <p style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{value.toFixed(2)}</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
    </div>
  )
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: 32, height: 18, borderRadius: 9, border: 'none',
      background: on ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
      cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: on ? 17 : 3, transition: 'left 0.15s',
      }} />
    </button>
  )
}

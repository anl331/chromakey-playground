import { useRef, useEffect } from 'react'

interface Props {
  src: string
  color: string
  similarity: number
  blend: number
  despill: boolean
  className?: string
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

const VERT = `
  attribute vec2 aPosition;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = vec2((aPosition.x + 1.0) / 2.0, 1.0 - (aPosition.y + 1.0) / 2.0);
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const FRAG = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D uVideo;
  uniform vec3 uKeyColor;
  uniform float uSimilarity;
  uniform float uBlend;
  uniform float uDespill;

  vec2 getDominance(vec3 rgb, vec3 key) {
    float keyMax = max(key.r, max(key.g, key.b));
    float dominant;
    float avg;
    if (keyMax == key.g) {
      dominant = rgb.g;
      avg = (rgb.r + rgb.b) * 0.5;
    } else if (keyMax == key.b) {
      dominant = rgb.b;
      avg = (rgb.r + rgb.g) * 0.5;
    } else {
      dominant = rgb.r;
      avg = (rgb.g + rgb.b) * 0.5;
    }
    return vec2(dominant, avg);
  }

  void main() {
    vec4 color = texture2D(uVideo, vTexCoord);
    float r = color.r;
    float g = color.g;
    float b = color.b;

    vec2 dom = getDominance(vec3(r, g, b), uKeyColor);
    float dominant = dom.x;
    float avg = dom.y;

    float excess = dominant - avg;
    float dominance = excess / (dominant + 0.004);
    float brightness = r + g + b;

    float alpha = 1.0;

    if (excess > 0.12 && brightness > 0.24) {
      if (dominance > uSimilarity) {
        alpha = 0.0;
      } else if (dominance > uSimilarity - uBlend) {
        alpha = 1.0 - smoothstep(uSimilarity - uBlend, uSimilarity, dominance);
      }
    }

    float despilled = dominant;
    if (uDespill > 0.5 && alpha > 0.0 && excess > 0.06) {
      float strength = dominance > 0.15 ? 0.2 : 0.6;
      despilled = avg + excess * strength;
    }

    vec3 result = vec3(r, g, b);
    float keyMax = max(uKeyColor.r, max(uKeyColor.g, uKeyColor.b));
    if (keyMax == uKeyColor.g) {
      result.g = despilled;
    } else if (keyMax == uKeyColor.b) {
      result.b = despilled;
    } else {
      result.r = despilled;
    }

    gl_FragColor = vec4(result, alpha);
  }
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

export function LiveChromaKey({ src, color, similarity, blend, despill, className, videoRef: externalVideoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const uniformsRef = useRef<{
    uKeyColor: WebGLUniformLocation | null
    uSimilarity: WebGLUniformLocation | null
    uBlend: WebGLUniformLocation | null
    uDespill: WebGLUniformLocation | null
  }>({ uKeyColor: null, uSimilarity: null, uBlend: null, uDespill: null })
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef = useRef(0)
  const readyRef = useRef(false)

  // Initialize WebGL once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true })
    if (!gl) return
    glRef.current = gl

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT)
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()!
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    uniformsRef.current = {
      uKeyColor: gl.getUniformLocation(program, 'uKeyColor'),
      uSimilarity: gl.getUniformLocation(program, 'uSimilarity'),
      uBlend: gl.getUniformLocation(program, 'uBlend'),
      uDespill: gl.getUniformLocation(program, 'uDespill'),
    }

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const video = document.createElement('video')
    video.src = src
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    videoRef.current = video
    if (externalVideoRef) externalVideoRef.current = video

    const render = () => {
      if (!readyRef.current || video.paused || video.ended) {
        rafRef.current = requestAnimationFrame(render)
        return
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        gl.viewport(0, 0, canvas.width, canvas.height)
      }

      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      rafRef.current = requestAnimationFrame(render)
    }

    video.addEventListener('loadeddata', () => { readyRef.current = true })
    video.addEventListener('playing', () => { rafRef.current = requestAnimationFrame(render) })
    video.play().catch(() => {})

    return () => {
      cancelAnimationFrame(rafRef.current)
      video.pause()
      video.src = ''
      readyRef.current = false
    }
  }, [src])

  // Update uniforms live (no remount)
  useEffect(() => {
    const gl = glRef.current
    if (!gl) return
    const [kr, kg, kb] = hexToRgb(color)
    gl.uniform3f(uniformsRef.current.uKeyColor, kr, kg, kb)
  }, [color])

  useEffect(() => {
    const gl = glRef.current
    if (!gl) return
    gl.uniform1f(uniformsRef.current.uSimilarity, similarity)
  }, [similarity])

  useEffect(() => {
    const gl = glRef.current
    if (!gl) return
    gl.uniform1f(uniformsRef.current.uBlend, blend)
  }, [blend])

  useEffect(() => {
    const gl = glRef.current
    if (!gl) return
    gl.uniform1f(uniformsRef.current.uDespill, despill ? 1.0 : 0.0)
  }, [despill])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onContextMenu={e => e.preventDefault()}
    />
  )
}

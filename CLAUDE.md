# Chromakey Video React Playground

## Project
Interactive playground/demo site for the `chromakey-video-react` npm package. Users drop a green screen video, fine-tune chroma key settings with sliders, and get copy-paste component code.

## Stack
- Vite + React + TypeScript
- `chromakey-video-react` (the npm package being demoed)
- `motion` (Framer Motion) for animations
- Google Fonts loaded in index.html

## Key Files
- `src/App.tsx` - Main app with drop zone, controls, code output
- `src/LiveChromaKey.tsx` - Custom WebGL chroma key component that updates uniforms live (no remount on slider change)
- `src/index.css` - CSS variables and global styles

## Architecture Notes
- `LiveChromaKey` is a fork of the npm package's component, modified to update WebGL uniforms via useEffect (no key-based remounting). This is critical for buttery smooth slider interaction.
- The `videoRef` prop on LiveChromaKey exposes the hidden video element for the eyedropper to sample pixel colors from original frames.

## Design Direction
- Dark dev-tool aesthetic (think VS Code, Linear, Raycast)
- Fonts: Outfit (body) + JetBrains Mono (code/mono)
- Colors defined as CSS variables in index.css
- Accent color: #22cc88 (teal green)

## IMPORTANT UX REQUIREMENTS
1. When a video is first uploaded, show the ORIGINAL video (not chroma-keyed). User should use the eyedropper or controls to start removing the background.
2. Sliders must be buttery smooth - LiveChromaKey updates WebGL uniforms directly, never remounts.
3. Background color picker lets users preview what the video looks like on different backgrounds.
4. Eyedropper: click on the video preview to sample a pixel color and set it as the key color.
5. Everything should fit on one screen - controls panel next to the video, code output below.

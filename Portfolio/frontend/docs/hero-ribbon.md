# Animated Three.js hero ribbon

The left hero decoration is rendered from fourteen curved Three.js meshes. Its shape,
lighting, and animation are all generated in code. The previous
`src/assets/hero-ribbon.webp` is retained as a visual reference only; the application
neither imports it nor uses it as a texture or fallback.

## Change the motion

In `src/sections/Hero.jsx`:

```jsx
<HeroRibbon speed={0.18} amplitude={0.18} />
```

| Prop | Default | Effect |
| --- | --- | --- |
| `speed` | `0.18` | Main wave phase in radians per second. Try `0.1` for slower motion. `0` pauses it. |
| `amplitude` | `0.18` | How far the surface bends, in scene units. Try `0.1` for less movement or `0.25` for more. |

The default main wave takes about 35 seconds. Smaller secondary waves keep the
movement organic. Vertex positions and surface normals deform together, so
reflections follow the changing folds. Geometry is built once; each animation
frame updates a shared shader uniform without rebuilding meshes or updating React
state.

## Change the design

| File | What to edit |
| --- | --- |
| `src/components/hero/HeroRibbon.jsx` | Canvas, camera, default motion, visibility, and WebGL fallback. |
| `src/components/three/ribbonGeometry.js` | Edges of the upright curl, diagonal top fold, upper arch, large left curve, thin inner fold, descending sheet, and lower return. |
| `src/components/three/ribbonMaterial.js` | Metallic finish, cyan rims, surface detail, and bending shader. |
| `src/components/three/RibbonScene.jsx` | Layer offsets, blue/cyan colors, and fading at the tips. |
| `src/components/three/ribbonEnvironment.js` | Procedurally generated HDR strip lights with smooth falloff. |
| `src/components/three/RibbonGlow.jsx` | Local glow around bright reflections; strength, threshold, and blur weights. |
| `src/App.css` | Left-side placement, fading, and mobile opacity. |

Geometry control points use `[x, y, z]`: x/y are pixel coordinates within the
reference's leftmost 640 by 864 pixels, and z adds depth in scene units.
The orthographic camera preserves that composition
as the canvas resizes. The reflection environment is a small floating-point
texture generated from mathematical strip lights. It contains lighting values
only, with no pixels from the reference image and no downloaded assets.

The large left curve, its cyan inner edge, and the descending lower curl are
separate sheets. Their cross-sections reverse direction along the flow, creating
dark valleys and overlapping folds instead of one rounded band. Narrow tips fade
before they cross the copy. Soft reflection lights avoid rectangular highlights.

Rendering pauses when the ribbon is offscreen, the tab is hidden, or reduced
motion is requested. It resumes from the same phase. The decorative canvas does
not receive pointer input, so the hero links stay clickable. If WebGL cannot run,
a CSS glow keeps the hero usable. Geometry, materials, postprocessing buffers,
and the generated lighting texture are disposed when the ribbon unmounts.

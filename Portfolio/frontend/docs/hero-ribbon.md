# Animated Three.js hero ribbon

The left hero decoration is rendered from five curved Three.js meshes. Its shape,
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
| `src/components/three/ribbonGeometry.js` | Left and right edges of the long S fold, upper curl, and wide sweep. |
| `src/components/three/ribbonMaterial.js` | Metallic finish, cyan rims, surface detail, and bending shader. |
| `src/components/three/RibbonScene.jsx` | Layer offsets, blue colors, and reflection lights. |
| `src/App.css` | Left-side placement, fading, and mobile opacity. |

Geometry control points use `[x, y, z]`: x/y describe the reference composition
from 0 to 1, and z adds depth. The orthographic camera preserves that composition
as the canvas resizes. Studio reflection panels are generated locally with
[Lightformer](https://drei.docs.pmnd.rs/staging/lightformer).

Rendering pauses when the ribbon is offscreen, the tab is hidden, or reduced
motion is requested. It resumes from the same phase. The decorative canvas does
not receive pointer input, so the hero links stay clickable. If WebGL cannot run,
a CSS glow keeps the hero usable.

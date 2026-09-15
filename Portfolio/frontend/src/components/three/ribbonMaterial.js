import { DoubleSide, MeshPhysicalMaterial } from 'three';

const deformation = /* glsl */ `
  uniform float uRibbonTime;
  uniform float uRibbonAmplitude;
  varying vec2 vRibbonUv;

  vec3 bendRibbon(vec3 p) {
    float phase = p.y * 0.65 + uRibbonTime;
    p.x += (sin(phase) + sin(p.y * 1.1 - uRibbonTime * 0.8) * 0.3) * uRibbonAmplitude;
    p.z += sin(p.y * 0.7 + p.x * 0.6 + uRibbonTime * 0.85) * uRibbonAmplitude * 0.8;
    p.y += sin(p.x * 0.65 + uRibbonTime * 0.7) * uRibbonAmplitude * 0.25;
    return p;
  }
`;

export function createRibbonMaterial(uniforms, color = '#007bb8') {
  const material = new MeshPhysicalMaterial({
    color,
    metalness: 0.78,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: DoubleSide,
    envMapIntensity: 1.15,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRibbonTime = uniforms.time;
    shader.uniforms.uRibbonAmplitude = uniforms.amplitude;
    shader.vertexShader = deformation + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', /* glsl */ `
      #include <beginnormal_vertex>
      vec3 ribbonAxis = abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 ribbonTangent = normalize(cross(normal, ribbonAxis));
      vec3 ribbonBitangent = normalize(cross(normal, ribbonTangent));
      vec3 ribbonPosition = bendRibbon(position);
      // Deform the normal as well as the vertices so reflections follow the fold.
      objectNormal = normalize(cross(
        bendRibbon(position + ribbonTangent * 0.01) - ribbonPosition,
        bendRibbon(position + ribbonBitangent * 0.01) - ribbonPosition
      ));
    `);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
      #include <begin_vertex>
      transformed = bendRibbon(position);
      vRibbonUv = uv;
    `);
    shader.fragmentShader = 'varying vec2 vRibbonUv;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', /* glsl */ `
      #include <color_fragment>
      float grain = sin(vRibbonUv.x * 180.0 + sin(vRibbonUv.y * 18.0) * 0.6);
      diffuseColor.rgb *= 0.96 + grain * 0.04;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */ `
      #include <emissivemap_fragment>
      float rim = pow(abs(vRibbonUv.x * 2.0 - 1.0), 38.0);
      float sheen = 0.35 + 0.65 * pow(sin(vRibbonUv.y * 15.0) * 0.5 + 0.5, 3.0);
      float threads = pow(0.5 + 0.5 * sin(vRibbonUv.x * 110.0 + vRibbonUv.y * 7.0), 24.0);
      totalEmissiveRadiance += vec3(0.005, 0.38, 0.56) * rim * sheen;
      totalEmissiveRadiance += vec3(0.0, 0.025, 0.065) * threads * sheen;
    `);
  };
  material.customProgramCacheKey = () => 'hero-ribbon-v2';
  return material;
}

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

export function createRibbonMaterial(uniforms, color, environment, { fadeStart = 0, fadeEnd = 0 } = {}) {
  const material = new MeshPhysicalMaterial({
    color,
    metalness: 0.9,
    roughness: 0.24,
    clearcoat: 0.45,
    clearcoatRoughness: 0.2,
    side: DoubleSide,
    envMap: environment,
    envMapIntensity: 0.75,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRibbonTime = uniforms.time;
    shader.uniforms.uRibbonAmplitude = uniforms.amplitude;
    shader.uniforms.uFadeStart = { value: fadeStart };
    shader.uniforms.uFadeEnd = { value: fadeEnd };
    shader.vertexShader = deformation + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', /* glsl */ `
      #include <beginnormal_vertex>
      vec3 ribbonAxis = abs(normal.y) < 0.99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.);
      vec3 ribbonTangent = normalize(cross(normal, ribbonAxis));
      vec3 ribbonBitangent = normalize(cross(normal, ribbonTangent));
      vec3 ribbonPosition = bendRibbon(position);
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
    shader.fragmentShader = 'varying vec2 vRibbonUv;\nuniform float uFadeStart;\nuniform float uFadeEnd;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', /* glsl */ `
      #include <color_fragment>
      float grain = sin(vRibbonUv.x * 95.0 + sin(vRibbonUv.y * 11.0));
      diffuseColor.rgb *= 0.98 + grain * 0.02;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */ `
      #include <emissivemap_fragment>
      float rim = pow(abs(vRibbonUv.x * 2.0 - 1.0), 48.0);
      float sheen = pow(sin(vRibbonUv.y * 11.0) * 0.5 + 0.5, 3.0);
      totalEmissiveRadiance += vec3(0., 0.18, 0.25) * rim * sheen;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
      float tipFade = mix(1., smoothstep(0., 0.3, vRibbonUv.y), uFadeStart)
        * mix(1., 1. - smoothstep(0.68, 1., vRibbonUv.y), uFadeEnd);
      outgoingLight = min(outgoingLight, vec3(2.0)) * tipFade;
      #include <opaque_fragment>
    `);
  };
  return material;
}

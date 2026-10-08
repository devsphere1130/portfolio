import { DataTexture, EquirectangularReflectionMapping, FloatType, LinearFilter, RGBAFormat } from 'three';

// A small HDR lighting map generated entirely from Gaussian strip lights.
// Smooth falloff avoids rectangular reflections on the polished sheets.
export function createRibbonEnvironment() {
  const width = 512;
  const height = 256;
  const pixels = new Float32Array(width * height * 4);
  const lights = [
    { x: 0.64, y: 0.5, sx: 0.065, sy: 0.36, power: 3, color: [0.02, 0.75, 1] },
    { x: 0.85, y: 0.52, sx: 0.028, sy: 0.44, power: 9, color: [0.65, 0.98, 1] },
    { x: 0.72, y: 0.78, sx: 0.16, sy: 0.048, power: 4, color: [0.8, 0.97, 1] },
    { x: 0.76, y: 0.22, sx: 0.19, sy: 0.04, power: 3, color: [0.04, 0.66, 1] },
    { x: 0.72, y: 0.56, sx: 0.2, sy: 0.4, power: 0.7, color: [0.01, 0.45, 0.8] },
    { x: 0.43, y: 0.48, sx: 0.12, sy: 0.3, power: 2.5, color: [0.01, 0.09, 1] },
  ];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const v = y / height;
      const index = (y * width + x) * 4;
      pixels[index] = 0.0003;
      pixels[index + 1] = 0.001;
      pixels[index + 2] = 0.004;
      pixels[index + 3] = 1;
      for (const light of lights) {
        const dx = (u - light.x - Math.sin(v * 6) * 0.009) / light.sx;
        const dy = (v - light.y) / light.sy;
        const energy = Math.exp(-dx * dx - dy * dy) * light.power;
        for (let channel = 0; channel < 3; channel += 1) {
          pixels[index + channel] += energy * light.color[channel];
        }
      }
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, FloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three';

// Rails are traced in the reference's leftmost 640 x 864 pixels. Keeping these
// coordinates in pixels makes the silhouette straightforward to adjust.
// The third coordinate is depth in scene units; it is never an image texture.
const folds = {
  crown: {
    left: [
      [-48, -100, -0.8], [4, -10, -0.6], [30, 73, -0.2],
      [59, 128, 0.35], [103, 158, 0.9], [163, 176, 0.4],
    ],
    right: [
      [288, -100, -0.4], [229, -10, 0.35], [151, 45, 0.85],
      [120, 99, 1.1], [131, 146, 0.7], [178, 172, 0.3],
    ],
    arch: 0.35,
    roll: 0.13,
  },
  arch: {
    left: [
      [-110, 203, 0.0], [-18, 193, 0.5], [77, 169, 1.2],
      [157, 158, 1.5], [258, 176, 0.95], [372, 217, 0.05],
      [510, 270, -0.65], [621, 310, -0.9],
    ],
    right: [
      [-110, 235, -0.45], [-18, 222, 0.05], [77, 191, 0.75],
      [157, 177, 1.25], [258, 194, 0.95], [372, 226, 0.1],
      [510, 273, -0.65], [621, 312, -0.9],
    ],
    arch: 0.16,
    roll: 0.07,
  },
  body: {
    left: [
      [295, 205, -0.25], [179, 183, 0.1], [77, 207, 0.25],
      [7, 276, 0.25], [-15, 354, 0.1], [12, 435, -0.3],
      [88, 491, -0.5], [151, 565, -0.35], [158, 627, -0.05],
      [153, 695, 0.05], [123, 764, 0.3], [51, 832, 0.7],
      [-38, 896, 0.5], [-105, 968, -0.1],
    ],
    right: [
      [297, 208, -0.25], [181, 204, 0.65], [109, 245, 1.0],
      [73, 313, 1.3], [82, 377, 1.1], [126, 432, 0.7],
      [192, 483, 0.35], [218, 563, 0.6], [229, 630, 0.95],
      [211, 708, 1.0], [184, 781, 0.65], [137, 852, 0.25],
      [80, 913, -0.1], [28, 982, -0.3],
    ],
    arch: 0.32,
    roll: 0.14,
  },
  return: {
    left: [
      [-103, 441, -1.1], [-38, 507, -0.8], [47, 567, -0.3],
      [112, 622, 0.25], [125, 667, 0.7], [85, 713, 1.0],
      [-8, 760, 0.8], [-105, 814, 0.3],
    ],
    right: [
      [-103, 505, -0.7], [-39, 551, -0.25], [33, 596, 0.3],
      [80, 634, 0.9], [87, 665, 1.1], [48, 697, 1.15],
      [-29, 729, 0.7], [-110, 770, 0.05],
    ],
    arch: 0.26,
    roll: 0.1,
  },
};

const toCurve = (points) => new CatmullRomCurve3(
  points.map(([x, y, z]) => new Vector3(x / 64 - 5, (432 - y) / 57.6, z)),
  false,
  'centripetal'
);

export function createRibbonGeometry(name, {
  offset = 0, offsetY = 0, depth = 0, width = 1, phase = 0,
} = {}) {
  const fold = folds[name];
  const left = toCurve(fold.left);
  const right = toCurve(fold.right);
  const lengthSegments = name === 'body' ? 280 : 180;
  const widthSegments = 40;
  const positions = [];
  const uvs = [];
  const indices = [];
  const a = new Vector3();
  const b = new Vector3();
  const point = new Vector3();

  for (let row = 0; row <= lengthSegments; row += 1) {
    const t = row / lengthSegments;
    left.getPoint(t, a);
    right.getPoint(t, b);

    for (let column = 0; column <= widthSegments; column += 1) {
      const u = column / widthSegments;
      point.lerpVectors(a, b, 0.5 + (u - 0.5) * width);
      const envelope = Math.sin(u * Math.PI);
      // Convex folds, a shallow reverse curl, and fine flutes create real
      // changes in the surface normals instead of painted highlight lines.
      const breadth = Math.min(1, a.distanceTo(b) / 0.9);
      const crown = envelope * fold.arch;
      const curl = Math.sin(u * Math.PI * 2 + t * 3.0 + phase) * fold.roll * envelope;
      const flutes = Math.sin(u * Math.PI * 10 + t * 8 + phase) * 0.007 * envelope;
      point.z += (crown + curl + flutes) * breadth + depth;
      point.x += offset / 64;
      point.y -= offsetY / 57.6;
      positions.push(point.x, point.y, point.z);
      uvs.push(u, t);

      if (row < lengthSegments && column < widthSegments) {
        const index = row * (widthSegments + 1) + column;
        const nextRow = index + widthSegments + 1;
        indices.push(index, nextRow, index + 1, index + 1, nextRow, nextRow + 1);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

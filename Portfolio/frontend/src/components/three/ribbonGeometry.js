import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three';

// Rails are traced in the reference's leftmost 640 x 864 pixels. Keeping these
// coordinates in pixels makes the silhouette straightforward to adjust.
// The third coordinate is depth in scene units; it is never an image texture.
const folds = {
  crown: {
    left: [
      [-48, -100, -0.8], [0, -10, -0.6], [13, 72, -0.2],
      [38, 128, 0.35], [86, 158, 0.9], [163, 176, 0.4],
    ],
    right: [
      [58, -100, -0.4], [48, -10, 0.35], [43, 69, 0.85],
      [62, 117, 1.1], [109, 155, 0.7], [178, 172, 0.3],
    ],
    arch: 0.35,
    roll: 0.13,
  },
  wing: {
    left: [
      [320, -70, -0.3], [207, -5, 0.0], [118, 57, 0.4],
      [77, 113, 0.5], [100, 153, 0.7], [164, 174, 0.4],
    ],
    right: [
      [370, -70, -0.4], [241, -5, 0.4], [163, 50, 1.0],
      [117, 102, 1.3], [132, 145, 0.9], [179, 172, 0.3],
    ],
    arch: 0.26,
    roll: 0.08,
  },
  arch: {
    left: [
      [-110, 203, 0.0], [-18, 193, 0.5], [77, 169, 1.2],
      [157, 158, 1.5], [258, 176, 0.95], [372, 217, 0.05],
      [485, 258, -0.65], [544, 272, -0.9],
    ],
    right: [
      [-110, 235, -0.45], [-18, 222, 0.05], [77, 191, 0.75],
      [157, 177, 1.25], [258, 194, 0.95], [372, 226, 0.1],
      [485, 260, -0.65], [544, 273, -0.9],
    ],
    arch: 0.16,
    roll: 0.07,
  },
  body: {
    left: [
      [460, 254, -0.8], [321, 207, -0.35], [180, 183, 0.1],
      [77, 207, -0.2], [7, 276, -0.5], [-15, 354, -0.2],
      [12, 423, 0.1], [85, 484, -0.4], [182, 531, -0.9],
      [246, 579, -1.1],
    ],
    right: [
      [460, 256, -0.8], [321, 211, -0.3], [184, 201, 0.6],
      [103, 244, 1.1], [66, 313, 0.8], [80, 378, 0.1],
      [125, 440, 0.5], [209, 490, 1.0], [250, 543, 0.4],
      [248, 580, -1.1],
    ],
    arch: 0.13,
    roll: 0.21,
  },
  fall: {
    left: [
      [-95, 402, -0.9], [-23, 482, -0.5], [88, 541, 0.1],
      [161, 603, 0.5], [165, 680, 0.8], [122, 759, 0.25],
      [83, 850, -0.6], [70, 955, -0.2],
    ],
    right: [
      [-93, 406, -0.9], [19, 480, -0.1], [154, 542, 0.9],
      [221, 605, 1.3], [230, 680, 0.45], [174, 783, -0.2],
      [150, 862, 0.6], [179, 955, 0.9],
    ],
    arch: 0.08,
    roll: 0.38,
  },
  inner: {
    left: [
      [346, 237, -0.2], [219, 211, 0.2], [122, 228, 0.55],
      [77, 280, 0.5], [63, 346, 0.8], [77, 403, 0.3],
      [126, 459, 0.0], [222, 521, -0.4], [270, 589, -0.6],
    ],
    right: [
      [346, 239, -0.2], [219, 214, 0.2], [130, 235, 0.65],
      [90, 285, 1.0], [88, 346, 1.4], [110, 403, 1.1],
      [149, 453, 0.5], [239, 511, -0.2], [271, 590, -0.6],
    ],
    arch: 0.07,
    roll: 0.1,
  },
  return: {
    left: [
      [-103, 478, -0.6], [-38, 523, -0.3], [47, 566, 0.3],
      [112, 610, 0.8], [130, 661, 1.2], [87, 708, 0.5],
      [-8, 748, -0.2], [-105, 796, -0.6],
    ],
    right: [
      [-103, 518, 0.2], [-39, 551, 0.5], [33, 589, 0.9],
      [85, 625, 1.0], [94, 661, 0.4], [22, 694, 0.0],
      [-45, 713, 0.6], [-110, 734, 1.1],
    ],
    arch: 0.07,
    roll: 0.28,
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
      // A changing reverse fold makes a thin sheet, rather than a convex tube.
      const breadth = Math.min(1, a.distanceTo(b) / 0.9);
      const crown = envelope * fold.arch * Math.cos(t * Math.PI * 2 + phase);
      const curl = Math.sin(u * Math.PI * 2 + t * 5.0 + phase) * fold.roll * envelope;
      const flutes = Math.sin(u * Math.PI * 6 + t * 8 + phase) * 0.009 * envelope;
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

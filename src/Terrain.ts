import * as THREE from 'three';

// Gaussian bump: height * exp(-((x-cx)^2/rx^2 + (z-cz)^2/rz^2))
function gaussian(x: number, z: number, cx: number, cz: number, rx: number, rz: number, h: number): number {
  const dx = (x - cx) / rx;
  const dz = (z - cz) / rz;
  return h * Math.exp(-(dx * dx + dz * dz));
}

export class Terrain {
  private mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const size = 200;
    const segments = 300;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.getHeight(x, z);
      pos.setY(i, h);

      // Vertex color: green grass below 4, blend to white snow above 8
      const t = THREE.MathUtils.clamp((h - 4) / 4, 0, 1);
      // Grass color
      const gr = 0.29 * (1 - t) + 0.94 * t;
      const gg = 0.55 * (1 - t) + 0.96 * t;
      const gb = 0.25 * (1 - t) + 1.0 * t;
      colors[i * 3] = gr;
      colors[i * 3 + 1] = gg;
      colors[i * 3 + 2] = gb;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  getHeight(x: number, z: number): number {
    let h = 0;

    // Big hill in one quadrant
    h += gaussian(x, z, 40, 50, 36, 36, 12);

    // Small rolling hills
    h += gaussian(x, z, -40, -30, 20, 20, 4);
    h += gaussian(x, z, 30, -50, 16, 16, 3);
    h += gaussian(x, z, -50, 40, 24, 24, 5);

    // Ramp ridge (narrow along Z for a launch ramp feel)
    h += gaussian(x, z, -20, 20, 16, 6, 6);

    return h;
  }

  getNormalAt(x: number, z: number): THREE.Vector3 {
    const eps = 0.1;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);

    const normal = new THREE.Vector3(
      (hL - hR) / (2 * eps),
      1,
      (hD - hU) / (2 * eps),
    );
    normal.normalize();
    return normal;
  }

  getGroundInfo(x: number, z: number): { height: number; normal: THREE.Vector3 } {
    return {
      height: this.getHeight(x, z),
      normal: this.getNormalAt(x, z),
    };
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }
}

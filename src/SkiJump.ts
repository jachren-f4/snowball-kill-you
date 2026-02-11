import * as THREE from 'three';

// Tower position
const TX = -70;
const TZ = -70;

// Tower dimensions
const TOWER_HEIGHT = 28;
const PILLAR_RADIUS = 0.4;
const PILLAR_INSET = 2; // half-width between pillars
const CROSS_BEAM_RADIUS = 0.2;

// Elevator
const ELEVATOR_WIDTH = 5;
const ELEVATOR_DEPTH = 5;
const ELEVATOR_SPEED = 5; // units/sec
const ELEVATOR_PAUSE = 1.5; // seconds at top/bottom

// Top platform
const PLATFORM_WIDTH = 6;
const PLATFORM_DEPTH = 8;

// Ramp: angled toward map center (+X, +Z direction)
const RAMP_LENGTH = 35;
const RAMP_WIDTH = 6;

// J-curve profile: h(t) = At³ + Bt² + Ct + D  (t=0 top, t=1 lip)
// h(0) = 28 (tower top), h(1) = 12 (lip height)
// h'(0) = -40 (steep entry), h'(1) = 15 (upward kick at lip)
const CURVE_A = 7;
const CURVE_B = 17;
const CURVE_C = -40;
const CURVE_D = TOWER_HEIGHT; // 28

// Ramp direction: normalized (1,0,1) → toward center from (-70,-70)
const RAMP_DIR_X = Math.SQRT1_2;
const RAMP_DIR_Z = Math.SQRT1_2;

const woodColor = 0x8b6914;
const metalColor = 0x888888;
const rampColor = 0xccccdd;

// ─── Elevator ───

export class Elevator {
  readonly mesh: THREE.Mesh;
  private minY: number;
  private maxY: number;
  private y: number;
  private direction = 1; // 1 = up, -1 = down
  private pauseTimer = 0;
  private footprintMinX: number;
  private footprintMaxX: number;
  private footprintMinZ: number;
  private footprintMaxZ: number;

  constructor(scene: THREE.Scene, baseY: number) {
    this.minY = baseY + 0.1;
    this.maxY = baseY + TOWER_HEIGHT - 0.5;
    this.y = this.minY;

    const geo = new THREE.BoxGeometry(ELEVATOR_WIDTH, 0.3, ELEVATOR_DEPTH);
    const mat = new THREE.MeshStandardMaterial({ color: metalColor, roughness: 0.6, metalness: 0.3 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(TX, this.y, TZ);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Precompute footprint
    const hw = ELEVATOR_WIDTH / 2;
    const hd = ELEVATOR_DEPTH / 2;
    this.footprintMinX = TX - hw;
    this.footprintMaxX = TX + hw;
    this.footprintMinZ = TZ - hd;
    this.footprintMaxZ = TZ + hd;
  }

  update(delta: number) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= delta;
      return;
    }

    this.y += this.direction * ELEVATOR_SPEED * delta;

    if (this.y >= this.maxY) {
      this.y = this.maxY;
      this.direction = -1;
      this.pauseTimer = ELEVATOR_PAUSE;
    } else if (this.y <= this.minY) {
      this.y = this.minY;
      this.direction = 1;
      this.pauseTimer = ELEVATOR_PAUSE;
    }

    this.mesh.position.y = this.y;
  }

  getGroundInfo(x: number, z: number): { height: number; normal: THREE.Vector3 } | null {
    if (
      x >= this.footprintMinX && x <= this.footprintMaxX &&
      z >= this.footprintMinZ && z <= this.footprintMaxZ
    ) {
      return { height: this.y + 0.15, normal: new THREE.Vector3(0, 1, 0) };
    }
    return null;
  }
}

// ─── Top Platform ───

export class TopPlatform {
  readonly mesh: THREE.Mesh;
  private height: number;
  private footprintMinX: number;
  private footprintMaxX: number;
  private footprintMinZ: number;
  private footprintMaxZ: number;

  constructor(scene: THREE.Scene, baseY: number) {
    this.height = baseY + TOWER_HEIGHT;

    // Platform sits adjacent to elevator, extending toward the ramp start
    const px = TX + RAMP_DIR_X * (PLATFORM_DEPTH / 2);
    const pz = TZ + RAMP_DIR_Z * (PLATFORM_DEPTH / 2);

    const geo = new THREE.BoxGeometry(PLATFORM_WIDTH, 0.4, PLATFORM_DEPTH);
    const mat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.8 });
    this.mesh = new THREE.Mesh(geo, mat);

    // Rotate platform to align with ramp direction
    const angle = Math.atan2(RAMP_DIR_X, RAMP_DIR_Z);
    this.mesh.rotation.y = angle;
    this.mesh.position.set(px, this.height, pz);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Compute axis-aligned bounding footprint (slightly generous)
    const hw = PLATFORM_WIDTH / 2 + 0.5;
    const hd = PLATFORM_DEPTH / 2 + 0.5;
    // Since the platform is rotated 45°, use the enclosing AABB
    const extent = Math.max(hw, hd) * Math.SQRT2;
    this.footprintMinX = px - extent;
    this.footprintMaxX = px + extent;
    this.footprintMinZ = pz - extent;
    this.footprintMaxZ = pz + extent;
  }

  getGroundInfo(x: number, z: number): { height: number; normal: THREE.Vector3 } | null {
    if (
      x >= this.footprintMinX && x <= this.footprintMaxX &&
      z >= this.footprintMinZ && z <= this.footprintMaxZ
    ) {
      // Check if point is actually within the rotated rectangle
      const px = this.mesh.position.x;
      const pz = this.mesh.position.z;
      const dx = x - px;
      const dz = z - pz;
      // Rotate into local coords (angle = 45°)
      const localX = dx * RAMP_DIR_Z - dz * RAMP_DIR_X;
      const localZ = dx * RAMP_DIR_X + dz * RAMP_DIR_Z;
      if (Math.abs(localX) <= PLATFORM_WIDTH / 2 && Math.abs(localZ) <= PLATFORM_DEPTH / 2) {
        return { height: this.height + 0.2, normal: new THREE.Vector3(0, 1, 0) };
      }
    }
    return null;
  }
}

// ─── Ramp ───

export class Ramp {
  readonly mesh: THREE.Group;
  private startX: number;
  private startZ: number;
  private baseY: number;
  private halfWidth: number;
  // Perpendicular direction (width axis)
  private perpX = -RAMP_DIR_Z;
  private perpZ = RAMP_DIR_X;

  /** Evaluate J-curve height at parameter t (0=top, 1=lip), relative to baseY */
  private static curveH(t: number): number {
    return CURVE_A * t * t * t + CURVE_B * t * t + CURVE_C * t + CURVE_D;
  }

  /** Derivative of curve: dh/dt */
  private static curveHPrime(t: number): number {
    return 3 * CURVE_A * t * t + 2 * CURVE_B * t + CURVE_C;
  }

  constructor(scene: THREE.Scene, baseY: number) {
    this.baseY = baseY;
    this.halfWidth = RAMP_WIDTH / 2;

    // Ramp starts at the far edge of the top platform
    const platformCenterX = TX + RAMP_DIR_X * (PLATFORM_DEPTH / 2);
    const platformCenterZ = TZ + RAMP_DIR_Z * (PLATFORM_DEPTH / 2);
    this.startX = platformCenterX + RAMP_DIR_X * (PLATFORM_DEPTH / 2);
    this.startZ = platformCenterZ + RAMP_DIR_Z * (PLATFORM_DEPTH / 2);

    this.mesh = new THREE.Group();
    scene.add(this.mesh);

    this.buildCurvedSurface();
    this.buildSideRails();
  }

  private buildCurvedSurface() {
    const segments = 30;
    const positions: number[] = [];
    const indices: number[] = [];

    // Generate vertex rows along the curve
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const along = t * RAMP_LENGTH;
      const h = Ramp.curveH(t) + this.baseY;
      const cx = this.startX + RAMP_DIR_X * along;
      const cz = this.startZ + RAMP_DIR_Z * along;

      // Left and right vertices
      positions.push(
        cx + this.perpX * this.halfWidth, h, cz + this.perpZ * this.halfWidth,
        cx - this.perpX * this.halfWidth, h, cz - this.perpZ * this.halfWidth,
      );
    }

    // Build triangle strip
    for (let i = 0; i < segments; i++) {
      const row = i * 2;
      const nextRow = (i + 1) * 2;
      // Two triangles per quad
      indices.push(row, nextRow, row + 1);
      indices.push(row + 1, nextRow, nextRow + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: rampColor,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const surface = new THREE.Mesh(geo, mat);
    surface.castShadow = true;
    surface.receiveShadow = true;
    this.mesh.add(surface);
  }

  private buildSideRails() {
    const railMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.8 });
    const segments = 15;

    for (const side of [-1, 1]) {
      const railPositions: number[] = [];
      const railIndices: number[] = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const along = t * RAMP_LENGTH;
        const h = Ramp.curveH(t) + this.baseY;
        const cx = this.startX + RAMP_DIR_X * along + this.perpX * this.halfWidth * side;
        const cz = this.startZ + RAMP_DIR_Z * along + this.perpZ * this.halfWidth * side;

        // Bottom and top of rail
        railPositions.push(cx, h, cz);
        railPositions.push(cx, h + 1.0, cz);
      }

      for (let i = 0; i < segments; i++) {
        const row = i * 2;
        const nextRow = (i + 1) * 2;
        railIndices.push(row, nextRow, row + 1);
        railIndices.push(row + 1, nextRow, nextRow + 1);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
      geo.setIndex(railIndices);
      geo.computeVertexNormals();

      const rail = new THREE.Mesh(geo, railMat);
      rail.castShadow = true;
      this.mesh.add(rail);
    }
  }

  getGroundInfo(x: number, z: number): { height: number; normal: THREE.Vector3 } | null {
    const dx = x - this.startX;
    const dz = z - this.startZ;

    // Distance along ramp direction
    const along = dx * RAMP_DIR_X + dz * RAMP_DIR_Z;
    if (along < -0.5 || along > RAMP_LENGTH + 0.5) return null;

    // Perpendicular distance
    const perp = Math.abs(dx * this.perpX + dz * this.perpZ);
    if (perp > this.halfWidth) return null;

    // J-curve height at this point
    const t = THREE.MathUtils.clamp(along / RAMP_LENGTH, 0, 1);
    const height = Ramp.curveH(t) + this.baseY;

    // Surface normal from curve derivative
    // dh/dt per unit distance = curveHPrime(t) / RAMP_LENGTH
    const slopePerUnit = Ramp.curveHPrime(t) / RAMP_LENGTH;
    // Tangent along ramp: (RAMP_DIR_X, slopePerUnit, RAMP_DIR_Z) (unnormalized)
    // Width tangent: (perpX, 0, perpZ)
    // Normal = width × tangent (points outward/upward from surface)
    const normal = new THREE.Vector3(
      -this.perpZ * slopePerUnit,
      this.perpX * RAMP_DIR_Z - (-this.perpZ) * RAMP_DIR_X,
      this.perpX * slopePerUnit,
    );
    // Simplify: perpX = -RAMP_DIR_Z, perpZ = RAMP_DIR_X
    // Y component = (-RAMP_DIR_Z)*RAMP_DIR_Z - (-RAMP_DIR_X)*RAMP_DIR_X
    //             = -RAMP_DIR_Z² - (-RAMP_DIR_X²) = RAMP_DIR_X² + RAMP_DIR_Z² ... wait, let me just compute directly
    // Actually just use the cross product properly:
    // w = (perpX, 0, perpZ), t_vec = (RAMP_DIR_X, slopePerUnit, RAMP_DIR_Z)
    // w × t_vec = (0*dz - perpZ*slope, perpZ*dx - perpX*dz, perpX*slope - 0*dx)
    // where dx=RAMP_DIR_X, dz=RAMP_DIR_Z, slope=slopePerUnit
    normal.set(
      -this.perpZ * slopePerUnit,
      this.perpZ * RAMP_DIR_X - this.perpX * RAMP_DIR_Z,
      this.perpX * slopePerUnit,
    );
    normal.normalize();

    // Ensure normal points upward
    if (normal.y < 0) normal.negate();

    return { height: height + 0.15, normal };
  }
}

// ─── Tower Structure (visual only) ───

function buildTowerStructure(scene: THREE.Scene, baseY: number) {
  const mat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.8 });

  // 4 pillars
  const pillarGeo = new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, TOWER_HEIGHT, 8);
  const positions = [
    [TX - PILLAR_INSET, TX + PILLAR_INSET],
    [TZ - PILLAR_INSET, TZ + PILLAR_INSET],
  ];

  for (const px of positions[0]) {
    for (const pz of positions[1]) {
      const pillar = new THREE.Mesh(pillarGeo, mat);
      pillar.position.set(px, baseY + TOWER_HEIGHT / 2, pz);
      pillar.castShadow = true;
      scene.add(pillar);
    }
  }

  // Cross beams every 7 units
  const beamGeo = new THREE.CylinderGeometry(CROSS_BEAM_RADIUS, CROSS_BEAM_RADIUS, PILLAR_INSET * 2, 6);
  for (let y = 7; y < TOWER_HEIGHT; y += 7) {
    const beamY = baseY + y;

    // Beams along X (front and back)
    for (const pz of positions[1]) {
      const beam = new THREE.Mesh(beamGeo, mat);
      beam.position.set(TX, beamY, pz);
      beam.rotation.z = Math.PI / 2;
      beam.castShadow = true;
      scene.add(beam);
    }

    // Beams along Z (left and right)
    for (const px of positions[0]) {
      const beam = new THREE.Mesh(beamGeo, mat);
      beam.position.set(px, beamY, TZ);
      beam.rotation.x = Math.PI / 2;
      beam.castShadow = true;
      scene.add(beam);
    }
  }
}

// ─── Public API ───

export interface SkiJumpResult {
  elevator: Elevator;
  ramp: Ramp;
  topPlatform: TopPlatform;
}

export function createSkiJumpTower(
  scene: THREE.Scene,
  getTerrainHeight: (x: number, z: number) => number,
): SkiJumpResult {
  const baseY = getTerrainHeight(TX, TZ);

  buildTowerStructure(scene, baseY);

  const elevator = new Elevator(scene, baseY);
  const topPlatform = new TopPlatform(scene, baseY);
  const ramp = new Ramp(scene, baseY);

  return { elevator, ramp, topPlatform };
}

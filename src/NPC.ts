import * as THREE from 'three';
import { Collectible } from './types';

export class NPC {
  readonly collectible: Collectible;
  private group: THREE.Group;
  private speed: number;
  private target = new THREE.Vector3();
  private retargetTimer = 0;
  private bobPhase = Math.random() * Math.PI * 2;

  constructor(
    model: THREE.Object3D,
    size: number,
    name: string,
    speed: number,
    x: number,
    z: number,
  ) {
    this.group = new THREE.Group();
    this.group.add(model);
    this.group.position.set(x, 0, z);
    this.speed = speed;

    this.collectible = {
      mesh: this.group,
      size,
      name,
      collected: false,
    };

    this.pickTarget();
  }

  private pickTarget() {
    const bounds = 44;
    this.target.set(
      (Math.random() - 0.5) * bounds * 2,
      0,
      (Math.random() - 0.5) * bounds * 2,
    );
    this.retargetTimer = 3 + Math.random() * 4;
  }

  update(delta: number) {
    if (this.collectible.collected) return;

    this.retargetTimer -= delta;
    if (this.retargetTimer <= 0) this.pickTarget();

    // Move toward target
    const pos = this.group.position;
    const dx = this.target.x - pos.x;
    const dz = this.target.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 1) {
      const nx = dx / dist;
      const nz = dz / dist;
      pos.x += nx * this.speed * delta;
      pos.z += nz * this.speed * delta;

      // Face movement direction
      this.group.rotation.y = Math.atan2(nx, nz);
    } else {
      this.pickTarget();
    }

    // Clamp to bounds
    const bounds = 44;
    pos.x = THREE.MathUtils.clamp(pos.x, -bounds, bounds);
    pos.z = THREE.MathUtils.clamp(pos.z, -bounds, bounds);

    // Plushy waddle animation
    this.bobPhase += delta * 6;
    // Bounce up on each step
    pos.y = Math.abs(Math.sin(this.bobPhase)) * 0.25;
    // Side-to-side rock (main wobble)
    this.group.rotation.z = Math.sin(this.bobPhase) * 0.18;
    // Forward-back tilt synced with steps
    this.group.rotation.x = Math.sin(this.bobPhase * 2) * 0.06;
  }

  getMesh(): THREE.Group {
    return this.group;
  }
}

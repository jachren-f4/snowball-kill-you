import * as THREE from 'three';
import { Collectible } from './types';

export class NPC {
  readonly collectible: Collectible;
  private group: THREE.Group;
  private speed: number;
  private target = new THREE.Vector3();
  private retargetTimer = 0;
  private bobPhase = Math.random() * Math.PI * 2;
  private facingAngle = 0;
  private turnWobble = 0;
  private networkControlled = false;
  private networkBaseY = 0;

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

    // In network-controlled mode, skip AI but still animate
    if (this.networkControlled) {
      this.bobPhase += delta * 6;
      // Use host's Y as base, add local bob animation on top
      this.group.position.y = this.networkBaseY;
      this.group.rotation.z = Math.sin(this.bobPhase) * 0.18;
      this.group.rotation.x = Math.sin(this.bobPhase * 2) * 0.06;
      return;
    }

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

      // Smooth turning with wobble
      const targetAngle = Math.atan2(nx, nz);
      let angleDiff = targetAngle - this.facingAngle;
      // Wrap to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      // Kick turn wobble when direction changes sharply
      this.turnWobble += Math.abs(angleDiff) * 0.5;
      this.turnWobble = Math.min(this.turnWobble, 1.5);
      // Lerp toward target angle
      this.facingAngle += angleDiff * Math.min(delta * 4, 1);
      this.group.rotation.y = this.facingAngle;
    } else {
      this.pickTarget();
    }

    // Clamp to bounds
    const bounds = 44;
    pos.x = THREE.MathUtils.clamp(pos.x, -bounds, bounds);
    pos.z = THREE.MathUtils.clamp(pos.z, -bounds, bounds);

    // Decay turn wobble
    this.turnWobble *= Math.exp(-delta * 5);

    // Plushy waddle animation (amplified during turns)
    this.bobPhase += delta * (6 + this.turnWobble * 4);
    // Bounce up on each step (higher during turns)
    pos.y = Math.abs(Math.sin(this.bobPhase)) * (0.25 + this.turnWobble * 0.15);
    // Side-to-side rock (main wobble, exaggerated during turns)
    this.group.rotation.z = Math.sin(this.bobPhase) * (0.18 + this.turnWobble * 0.25);
    // Forward-back tilt synced with steps
    this.group.rotation.x = Math.sin(this.bobPhase * 2) * (0.06 + this.turnWobble * 0.1);
  }

  setNetworkPosition(x: number, y: number, z: number, ry: number) {
    this.networkControlled = true;
    this.group.position.x = x;
    this.group.position.z = z;
    this.group.rotation.y = ry;
    this.facingAngle = ry;
    // Y is set by bob animation in update(), but we store the base Y
    this.networkBaseY = y;
  }

  getNetworkState(): { x: number; y: number; z: number; ry: number } {
    return {
      x: this.group.position.x,
      y: this.group.position.y,
      z: this.group.position.z,
      ry: this.facingAngle,
    };
  }

  getMesh(): THREE.Group {
    return this.group;
  }
}

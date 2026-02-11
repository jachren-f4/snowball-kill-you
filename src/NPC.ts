import * as THREE from 'three';
import { Collectible } from './types';

export type GroundQuery = (x: number, z: number) => { height: number; normal: THREE.Vector3 };

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
  private groundQuery: GroundQuery | null = null;
  private slopeQuat = new THREE.Quaternion();

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

  setGroundQuery(query: GroundQuery) {
    this.groundQuery = query;
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
      this.group.position.y = this.networkBaseY;
      this.applyOrientation(
        Math.sin(this.bobPhase) * 0.18,
        Math.sin(this.bobPhase * 2) * 0.06,
      );
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
    } else {
      this.pickTarget();
    }

    // Clamp to bounds
    const bounds = 44;
    pos.x = THREE.MathUtils.clamp(pos.x, -bounds, bounds);
    pos.z = THREE.MathUtils.clamp(pos.z, -bounds, bounds);

    // Get terrain height
    let groundY = 0;
    if (this.groundQuery) {
      const info = this.groundQuery(pos.x, pos.z);
      groundY = info.height;
      // Smoothly lerp slope quaternion toward terrain normal alignment
      const targetQuat = this.quatFromNormal(info.normal);
      this.slopeQuat.slerp(targetQuat, Math.min(delta * 8, 1));
    }

    // Decay turn wobble
    this.turnWobble *= Math.exp(-delta * 5);

    // Plushy waddle animation (amplified during turns)
    this.bobPhase += delta * (6 + this.turnWobble * 4);
    // Bounce up on each step (higher during turns)
    const bobY = Math.abs(Math.sin(this.bobPhase)) * (0.25 + this.turnWobble * 0.15);
    pos.y = groundY + bobY;

    // Apply slope + waddle orientation
    const wobbleZ = Math.sin(this.bobPhase) * (0.18 + this.turnWobble * 0.25);
    const wobbleX = Math.sin(this.bobPhase * 2) * (0.06 + this.turnWobble * 0.1);
    this.applyOrientation(wobbleZ, wobbleX);
  }

  /** Build a quaternion that aligns the up-vector (0,1,0) to the given terrain normal */
  private quatFromNormal(normal: THREE.Vector3): THREE.Quaternion {
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(up, normal);
    return q;
  }

  /** Combine terrain slope, facing angle, and waddle into final orientation */
  private applyOrientation(wobbleZ: number, wobbleX: number) {
    // Start with slope alignment
    const q = this.slopeQuat.clone();
    // Apply facing direction (Y rotation)
    const yaw = new THREE.Quaternion();
    yaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.facingAngle);
    q.multiply(yaw);
    // Apply waddle on top (local Z and X rotations)
    const waddle = new THREE.Euler(wobbleX, 0, wobbleZ);
    const waddleQ = new THREE.Quaternion().setFromEuler(waddle);
    q.multiply(waddleQ);
    this.group.quaternion.copy(q);
  }

  setNetworkPosition(x: number, y: number, z: number, ry: number) {
    this.networkControlled = true;
    this.group.position.x = x;
    this.group.position.z = z;
    this.facingAngle = ry;
    this.networkBaseY = y;
    // Update slope from terrain if available
    if (this.groundQuery) {
      const info = this.groundQuery(x, z);
      this.slopeQuat.slerp(this.quatFromNormal(info.normal), 0.3);
    }
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

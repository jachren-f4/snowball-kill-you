import * as THREE from 'three';
import { BallState } from './Network';

export class RemoteBall {
  private pivot: THREE.Group;
  private rotator: THREE.Group;
  private mesh: THREE.Mesh;
  radius = 0.5;
  private targetPos = new THREE.Vector3(0, 0.5, 8);
  private targetQuat = new THREE.Quaternion();
  private targetRadius = 0.5;
  private velocity = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.pivot = new THREE.Group();
    this.rotator = new THREE.Group();

    // Same lumpy snowball mesh as the local ball, but with a slight tint
    const geo = new THREE.SphereGeometry(1, 48, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const noise =
        Math.sin(x * 5.3 + y * 3.1) * 0.04 +
        Math.sin(y * 7.2 + z * 4.8) * 0.03 +
        Math.sin(z * 6.1 + x * 2.7) * 0.035 +
        Math.sin(x * 11 + z * 9) * 0.015 +
        Math.sin(x * 17.3 + y * 13.7 + z * 11.1) * 0.01;
      const len = Math.sqrt(x * x + y * y + z * z);
      const scale = 1 + noise;
      pos.setXYZ(i, (x / len) * scale, (y / len) * scale, (z / len) * scale);
    }
    geo.computeVertexNormals();

    // Slight blue tint to distinguish from local ball
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd0e0ff,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.scale.setScalar(this.radius);
    this.mesh.castShadow = true;

    // Snow lumps
    const lumpGeo = new THREE.SphereGeometry(1, 10, 8);
    const lumpMat = new THREE.MeshStandardMaterial({
      color: 0xc8d8ff,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
    for (let i = 0; i < 10; i++) {
      const lump = new THREE.Mesh(lumpGeo, lumpMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.85 + Math.random() * 0.15;
      lump.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      lump.scale.setScalar(0.15 + Math.random() * 0.2);
      this.mesh.add(lump);
    }

    this.rotator.add(this.mesh);
    this.pivot.add(this.rotator);
    this.pivot.position.set(0, this.radius, 8);

    scene.add(this.pivot);
  }

  updateFromNetwork(state: BallState) {
    this.targetPos.set(state.x, state.y, state.z);
    this.targetRadius = state.r;
    this.targetQuat.set(state.qx, state.qy, state.qz, state.qw);
    this.velocity.set(state.vx, 0, state.vz);
  }

  update(delta: number) {
    // Lerp position toward target (with velocity-based prediction)
    const predicted = this.targetPos.clone().add(
      this.velocity.clone().multiplyScalar(delta),
    );
    this.pivot.position.lerp(predicted, Math.min(delta * 15, 1));

    // Lerp rotation
    this.rotator.quaternion.slerp(this.targetQuat, Math.min(delta * 15, 1));

    // Lerp radius
    this.radius += (this.targetRadius - this.radius) * Math.min(delta * 10, 1);
    this.mesh.scale.setScalar(this.radius);
  }

  getPosition(): THREE.Vector3 {
    return this.pivot.position.clone();
  }

  destroy() {
    this.pivot.parent?.remove(this.pivot);
  }

  attachItem(itemMesh: THREE.Object3D, worldPos: THREE.Vector3) {
    if (itemMesh.parent) {
      itemMesh.parent.remove(itemMesh);
    }

    const relativePos = worldPos.clone().sub(this.pivot.position);
    const invQ = this.rotator.quaternion.clone().invert();
    relativePos.applyQuaternion(invQ);

    this.rotator.add(itemMesh);
    itemMesh.position.copy(relativePos);
  }
}

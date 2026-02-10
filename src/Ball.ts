import * as THREE from 'three';

// Snow trail particle
interface SnowParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class Ball {
  private pivot: THREE.Group;
  private rotator: THREE.Group;
  private mesh: THREE.Mesh;
  private scene: THREE.Scene;
  radius = 0.5;
  private velocity = new THREE.Vector3();
  private yVelocity = 0;
  private gravity = -25;
  private grounded = true;
  private speed = 40;
  private damping = 5;
  collectedCount = 0;

  // Stumble wobble
  private wobbleAngle = 0;
  private wobbleDecay = 0;

  // Snow trail
  private trail: SnowParticle[] = [];
  private trailTimer = 0;
  private trailGeo: THREE.SphereGeometry;
  private trailMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pivot = new THREE.Group();
    this.rotator = new THREE.Group();

    // Higher-poly lumpy snowball
    const geo = new THREE.SphereGeometry(1, 48, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Multi-octave noise-like displacement
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

    // Snow material: matte white with subtle blue tint
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf0f4ff,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.scale.setScalar(this.radius);
    this.mesh.castShadow = true;

    // Snow lumps on the surface
    const lumpGeo = new THREE.SphereGeometry(1, 10, 8);
    const lumpMat = new THREE.MeshStandardMaterial({
      color: 0xe8eeff,
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

    // Trail resources
    this.trailGeo = new THREE.SphereGeometry(1, 6, 4);
    this.trailMat = new THREE.MeshStandardMaterial({
      color: 0xf0f4ff,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
  }

  getPosition(): THREE.Vector3 {
    return this.pivot.position.clone();
  }

  getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  update(direction: THREE.Vector3, delta: number) {
    if (direction.lengthSq() > 0.001) {
      this.velocity.x += direction.x * this.speed * delta;
      this.velocity.z += direction.z * this.speed * delta;
    }

    const dampFactor = Math.exp(-this.damping * delta);
    this.velocity.multiplyScalar(dampFactor);

    this.pivot.position.x += this.velocity.x * delta;
    this.pivot.position.z += this.velocity.z * delta;

    // Vertical physics (gravity + hop)
    this.yVelocity += this.gravity * delta;
    this.pivot.position.y += this.yVelocity * delta;

    // Ground check
    if (this.pivot.position.y <= this.radius) {
      this.pivot.position.y = this.radius;
      if (this.yVelocity < -1) {
        // Small bounce on landing
        this.yVelocity = -this.yVelocity * 0.2;
      } else {
        this.yVelocity = 0;
        this.grounded = true;
      }
    } else {
      this.grounded = false;
    }

    // Rolling rotation
    const speed = this.velocity.length();
    if (speed > 0.01) {
      const axis = new THREE.Vector3(
        this.velocity.z,
        0,
        -this.velocity.x,
      ).normalize();
      const angle = (speed * delta) / this.radius;
      this.rotator.rotateOnWorldAxis(axis, angle);
    }

    // Wobble decay
    if (this.wobbleDecay > 0) {
      this.wobbleDecay -= delta * 4;
      if (this.wobbleDecay < 0) this.wobbleDecay = 0;
      const wobble = Math.sin(this.wobbleAngle) * this.wobbleDecay * 0.3;
      this.wobbleAngle += delta * 20;
      this.pivot.rotation.z = wobble;
      this.pivot.rotation.x = Math.cos(this.wobbleAngle * 0.7) * this.wobbleDecay * 0.15;
    } else {
      // Smoothly return to upright
      this.pivot.rotation.z *= 0.9;
      this.pivot.rotation.x *= 0.9;
    }

    // Keep in bounds
    const bounds = 48;
    this.pivot.position.x = THREE.MathUtils.clamp(
      this.pivot.position.x,
      -bounds,
      bounds,
    );
    this.pivot.position.z = THREE.MathUtils.clamp(
      this.pivot.position.z,
      -bounds,
      bounds,
    );

    // Snow trail
    this.updateTrail(delta, speed);
  }

  private updateTrail(delta: number, speed: number) {
    this.trailTimer += delta;
    const spawnInterval = 0.06;
    if (speed > 0.3 && this.grounded && this.trailTimer >= spawnInterval) {
      this.trailTimer = 0;
      this.spawnTrailParticle();
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.trail.splice(i, 1);
      } else {
        const t = p.life / p.maxLife;
        const baseS = p.mesh.userData.baseScale;
        p.mesh.scale.set(baseS * (0.3 + 0.7 * t), baseS * 0.4 * t, baseS * (0.3 + 0.7 * t));
        p.mesh.position.y = baseS * 0.2 * t;
      }
    }
  }

  private spawnTrailParticle() {
    if (this.trail.length > 80) return;

    const particle = new THREE.Mesh(this.trailGeo, this.trailMat);
    const size = this.radius * (0.08 + Math.random() * 0.12);
    const spread = this.radius * 0.6;
    particle.position.set(
      this.pivot.position.x + (Math.random() - 0.5) * spread,
      0.02 + size * 0.5,
      this.pivot.position.z + (Math.random() - 0.5) * spread,
    );
    particle.scale.setScalar(size);
    particle.userData.baseScale = size;
    particle.scale.y *= 0.4;

    const life = 2.0 + Math.random() * 1.5;
    this.scene.add(particle);
    this.trail.push({ mesh: particle, life, maxLife: life });
  }

  attachItem(
    itemMesh: THREE.Object3D,
    worldPos: THREE.Vector3,
    itemSize: number,
  ) {
    if (itemMesh.parent) {
      itemMesh.parent.remove(itemMesh);
    }

    const relativePos = worldPos.clone().sub(this.pivot.position);
    const invQ = this.rotator.quaternion.clone().invert();
    relativePos.applyQuaternion(invQ);

    this.rotator.add(itemMesh);
    itemMesh.position.copy(relativePos);

    this.grow(itemSize);
    this.collectedCount++;
  }

  stumble(direction: THREE.Vector3, overlap: number, itemSize: number) {
    const speed = this.velocity.length();

    // How big is this item relative to the ball?
    const sizeRatio = itemSize / (this.radius * 2);

    if (sizeRatio > 3) {
      // Way too big — hard stop, strong bounce back
      const dot = this.velocity.dot(direction);
      if (dot < 0) {
        this.velocity.addScaledVector(direction, -dot * 1.5);
      }
      this.pivot.position.addScaledVector(direction, overlap + 0.01);
      // Big wobble
      this.wobbleDecay = Math.min(speed * 0.3, 1.5);
      this.wobbleAngle = 0;
      // Small hop from impact
      if (this.grounded && speed > 1) {
        this.yVelocity = Math.min(speed * 0.5, 4);
        this.grounded = false;
      }
    } else {
      // Slightly too big — stumble over it like a speed bump
      // Hop up proportional to speed
      const hopStrength = Math.min(speed * 0.8, 6);
      if (this.grounded) {
        this.yVelocity = hopStrength;
        this.grounded = false;
      }
      // Slow down but don't stop
      this.velocity.multiplyScalar(0.6);
      // Wobble from the bump
      this.wobbleDecay = Math.min(speed * 0.2, 1.0);
      this.wobbleAngle = Math.random() * Math.PI;
      // Push slightly to the side to slide past
      const side = new THREE.Vector3(-direction.z, 0, direction.x);
      this.velocity.addScaledVector(side, speed * 0.2 * (Math.random() > 0.5 ? 1 : -1));
      // Small push out
      this.pivot.position.addScaledVector(direction, overlap * 0.5 + 0.01);
    }
  }

  pushBack(direction: THREE.Vector3, overlap: number) {
    const dot = this.velocity.dot(direction);
    if (dot < 0) {
      this.velocity.addScaledVector(direction, -dot * 1.5);
    }
    this.pivot.position.addScaledVector(direction, overlap + 0.01);
  }

  private grow(itemSize: number) {
    this.radius += itemSize * 0.08;
    this.mesh.scale.setScalar(this.radius);
    this.pivot.position.y = Math.max(this.pivot.position.y, this.radius);
  }
}

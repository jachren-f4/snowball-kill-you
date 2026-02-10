import * as THREE from 'three';

const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)
  || ('ontouchstart' in window && window.innerWidth < 1024);

export class FollowCamera {
  camera: THREE.PerspectiveCamera;
  private currentAngle = Math.PI;
  private targetAngle = Math.PI;
  private distanceMult: number;
  private heightMult: number;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    this.camera.position.set(0, 4, 12);
    // Pull camera back on mobile for better visibility
    this.distanceMult = isMobile ? 1.5 : 1.0;
    this.heightMult = isMobile ? 1.4 : 1.0;
  }

  update(
    ballPosition: THREE.Vector3,
    ballRadius: number,
    moveDir: THREE.Vector3,
    delta: number,
  ) {
    if (moveDir.lengthSq() > 0.01) {
      this.targetAngle = Math.atan2(moveDir.x, moveDir.z);
    }

    let angleDiff = this.targetAngle - this.currentAngle;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    this.currentAngle += angleDiff * 2.5 * delta;

    const distance = Math.max(ballRadius * 5, 4) * this.distanceMult;
    const height = Math.max(ballRadius * 3, 2.5) * this.heightMult;

    const camX = ballPosition.x - Math.sin(this.currentAngle) * distance;
    const camZ = ballPosition.z - Math.cos(this.currentAngle) * distance;
    const camY = ballPosition.y + height;

    const targetPos = new THREE.Vector3(camX, camY, camZ);
    this.camera.position.lerp(targetPos, 4 * delta);
    this.camera.lookAt(ballPosition);
  }
}

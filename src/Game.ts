import * as THREE from 'three';
import { Ball } from './Ball';
import { FollowCamera } from './FollowCamera';
import { Controls } from './Controls';
import { createPark } from './Park';
import { Collectible } from './types';
import { NPC } from './NPC';

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private followCamera: FollowCamera;
  private ball: Ball;
  private controls: Controls;
  private collectibles: Collectible[] = [];
  private npcs: NPC[] = [];
  private clock: THREE.Clock;
  private started = false;
  private loaded = false;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Camera
    this.followCamera = new FollowCamera(
      window.innerWidth / window.innerHeight,
    );

    // Lighting
    this.setupLighting();

    // Ball (added to scene immediately)
    this.ball = new Ball(this.scene);

    // Controls
    this.controls = new Controls();

    // Load park assets asynchronously
    this.loadPark();

    // Clock
    this.clock = new THREE.Clock();

    // Start screen — only enable after models are loaded
    const startScreen = document.getElementById('start-screen')!;
    const startHandler = () => {
      if (!this.loaded) return;
      this.started = true;
      startScreen.style.display = 'none';
      startScreen.removeEventListener('click', startHandler);
      startScreen.removeEventListener('touchstart', startHandler);
    };
    startScreen.addEventListener('click', startHandler);
    startScreen.addEventListener('touchstart', startHandler);

    // Resize
    window.addEventListener('resize', () => this.onResize());
  }

  private async loadPark() {
    const { collectibles, npcs } = await createPark(this.scene);
    this.collectibles = collectibles;
    this.npcs = npcs;
    this.loaded = true;
    const tap = document.querySelector('#start-screen .tap') as HTMLElement;
    if (tap) tap.textContent = 'Tap to Start';
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x606060, 1.2);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 2.0);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x4a8c3f, 0.5);
    this.scene.add(hemi);
  }

  start() {
    this.renderer.setAnimationLoop(() => this.loop());
  }

  private loop() {
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.started) {
      this.update(delta);
    } else {
      // Slowly rotate camera around the park before start
      const t = this.clock.elapsedTime * 0.1;
      this.followCamera.camera.position.set(
        Math.sin(t) * 20,
        8,
        Math.cos(t) * 20,
      );
      this.followCamera.camera.lookAt(0, 0, 0);
    }

    this.renderer.render(this.scene, this.followCamera.camera);
  }

  private update(delta: number) {
    const input = this.controls.getDirection();

    // Transform input relative to camera direction
    const camDir = new THREE.Vector3();
    this.followCamera.camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const camRight = new THREE.Vector3(-camDir.z, 0, camDir.x);

    const worldDir = new THREE.Vector3(
      input.x * camRight.x - input.z * camDir.x,
      0,
      input.x * camRight.z - input.z * camDir.z,
    );

    // Update ball
    this.ball.update(worldDir, delta);

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(delta);
    }

    // Check collisions
    this.checkCollisions();

    // Update camera
    this.followCamera.update(
      this.ball.getPosition(),
      this.ball.radius,
      worldDir,
      delta,
    );

    // Update HUD

  }

  private checkCollisions() {
    const ballPos = this.ball.getPosition();

    for (const item of this.collectibles) {
      if (item.collected) continue;

      const itemPos = new THREE.Vector3();
      item.mesh.getWorldPosition(itemPos);

      const dist = ballPos.distanceTo(itemPos);
      const touchDist = this.ball.radius + item.size * 0.3;

      if (dist < touchDist) {
        if (item.size < this.ball.radius * 1.5) {
          // Small enough — collect it
          item.collected = true;
          this.ball.attachItem(item.mesh, itemPos, item.size);
        } else {
          // Too big — stumble over it
          const pushDir = ballPos.clone().sub(itemPos);
          pushDir.y = 0;
          pushDir.normalize();
          const overlap = touchDist - dist;
          this.ball.stumble(pushDir, overlap, item.size);
        }
      }
    }
  }


  private onResize() {
    this.followCamera.camera.aspect =
      window.innerWidth / window.innerHeight;
    this.followCamera.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

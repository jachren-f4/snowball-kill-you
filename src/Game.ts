import * as THREE from 'three';
import { Ball } from './Ball';
import { FollowCamera } from './FollowCamera';
import { Controls } from './Controls';
import { createHillLevel } from './HillLevel';
import { Collectible } from './types';
import { NPC } from './NPC';
import { Terrain } from './Terrain';
import { Network, BallState, CollectEvent } from './Network';
import { RemoteBall } from './RemoteBall';

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
  private sun!: THREE.DirectionalLight;
  private terrain: Terrain | null = null;

  // NPC collection sounds
  private npcSounds: Record<string, HTMLAudioElement> = {
    'Capuchino Assassino': new Audio('sounds/capuchino.mp3'),
    'Tralalero Tralala': new Audio('sounds/tralalero.mp3'),
    'La Vaca Saturno': new Audio('sounds/lavaca.mp3'),
  };

  // Multiplayer
  private network: Network | null = null;
  private remoteBall: RemoteBall | null = null;
  private npcSyncTimer = 0;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

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

    // Load level assets asynchronously
    this.loadLevel();

    // Clock
    this.clock = new THREE.Clock();

    // Set up multiplayer UI handlers
    this.setupMultiplayerUI();

    // Resize
    window.addEventListener('resize', () => this.onResize());
  }

  private setupMultiplayerUI() {
    const startScreen = document.getElementById('start-screen')!;
    const createBtn = document.getElementById('create-room-btn')!;
    const joinBtn = document.getElementById('join-room-btn')!;
    const joinInput = document.getElementById('join-code-input') as HTMLInputElement;
    const roomCodeDisplay = document.getElementById('room-code-display')!;
    const roomCodeText = document.getElementById('room-code-text')!;
    const connectionStatus = document.getElementById('connection-status')!;
    const soloBtn = document.getElementById('solo-btn')!;
    const tapText = document.querySelector('#start-screen .tap') as HTMLElement;

    // Solo play — original start behavior
    const soloStart = () => {
      if (!this.loaded) return;
      this.started = true;
      startScreen.style.display = 'none';
    };
    soloBtn.addEventListener('click', (e) => { e.stopPropagation(); soloStart(); });
    soloBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); soloStart(); });

    // Create Room
    createBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.loaded) return;

      this.network = new Network();
      const code = this.network.createRoom();

      // Show room code
      roomCodeText.textContent = code;
      roomCodeDisplay.style.display = 'block';
      connectionStatus.textContent = 'Waiting for player...';
      connectionStatus.style.display = 'block';
      createBtn.style.display = 'none';
      joinBtn.style.display = 'none';
      joinInput.style.display = 'none';
      soloBtn.style.display = 'none';

      this.setupNetworkCallbacks(startScreen, tapText, connectionStatus);
    });

    // Join Room
    joinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = joinInput.value.trim();
      if (!code || code.length !== 4) {
        joinInput.style.borderColor = '#ff4444';
        return;
      }
      if (!this.loaded) return;

      this.network = new Network();
      this.network.joinRoom(code);

      connectionStatus.textContent = 'Connecting...';
      connectionStatus.style.display = 'block';
      createBtn.style.display = 'none';
      joinBtn.style.display = 'none';
      joinInput.style.display = 'none';
      soloBtn.style.display = 'none';

      this.setupNetworkCallbacks(startScreen, tapText, connectionStatus);
    });
  }

  private setupNetworkCallbacks(
    startScreen: HTMLElement,
    tapText: HTMLElement,
    connectionStatus: HTMLElement,
  ) {
    if (!this.network) return;

    this.network.onPeerJoin(() => {
      connectionStatus.textContent = 'Player connected!';

      // Create remote ball
      this.remoteBall = new RemoteBall(this.scene);

      if (this.network!.isHost) {
        // Host: show tap to start
        tapText.textContent = 'Tap to Start';
        tapText.style.display = '';
        const hostStart = () => {
          this.started = true;
          startScreen.style.display = 'none';
          // Send start signal multiple times to ensure delivery
          // (data channels may not be fully ready on the first send)
          this.network!.sendGameStart();
          setTimeout(() => this.network?.sendGameStart(), 100);
          setTimeout(() => this.network?.sendGameStart(), 300);
          startScreen.removeEventListener('click', hostStart);
          startScreen.removeEventListener('touchstart', hostStart);
        };
        startScreen.addEventListener('click', hostStart);
        startScreen.addEventListener('touchstart', hostStart);
      } else {
        // Guest: waiting for host to start
        tapText.textContent = 'Waiting for host to start...';
      }
    });

    this.network.onPeerLeave(() => {
      connectionStatus.textContent = 'Player disconnected';
      if (this.remoteBall) {
        this.remoteBall.destroy();
        this.remoteBall = null;
      }
    });

    this.network.onBallState((state: BallState) => {
      this.remoteBall?.updateFromNetwork(state);
      // Fallback: if guest receives ball data but game hasn't started,
      // the GameStart message was likely dropped (data channel race).
      // Auto-start the game.
      if (!this.started && !this.network?.isHost) {
        this.started = true;
        startScreen.style.display = 'none';
      }
    });

    this.network.onCollectEvent((event: CollectEvent) => {
      this.handleRemoteCollect(event);
    });

    this.network.onNPCState((state) => {
      // Guest: apply NPC positions from host
      if (!this.network?.isHost) {
        for (let i = 0; i < state.npcs.length && i < this.npcs.length; i++) {
          const { x, y, z, ry } = state.npcs[i];
          this.npcs[i].setNetworkPosition(x, y, z, ry);
        }
      }
    });

    this.network.onGameStart(() => {
      // Guest receives start signal from host
      this.started = true;
      startScreen.style.display = 'none';
    });
  }

  private handleRemoteCollect(event: CollectEvent) {
    const item = this.collectibles[event.id];
    if (!item) return;

    // Determine if the remote event is from the other player
    const isLocalRole = (this.network?.isHost && event.by === 'host') ||
                        (!this.network?.isHost && event.by === 'guest');

    if (isLocalRole) {
      // Remote is confirming our own collection — nothing to do
      return;
    }

    // Remote player collected this item
    item.collected = true;
    this.playNPCSound(item.name);

    if (this.remoteBall) {
      // Reparent mesh to remote ball (handles case where we also grabbed it locally —
      // Three.js reparenting automatically removes from previous parent)
      const itemPos = new THREE.Vector3();
      item.mesh.getWorldPosition(itemPos);
      this.remoteBall.attachItem(item.mesh, itemPos);
    }
  }

  private async loadLevel() {
    const { collectibles, npcs, terrain } = await createHillLevel(this.scene);
    this.collectibles = collectibles;
    this.npcs = npcs;
    this.terrain = terrain;

    // Wire terrain ground query to ball and camera
    const groundQuery = (x: number, z: number) => terrain.getGroundInfo(x, z);
    this.ball.setGroundQuery(groundQuery);
    this.followCamera.setGroundQuery(groundQuery);

    this.loaded = true;
    const tap = document.querySelector('#start-screen .tap') as HTMLElement;
    if (tap) tap.style.display = 'none';

    // Show multiplayer UI now that models are loaded
    const multiplayerUI = document.getElementById('multiplayer-ui');
    if (multiplayerUI) multiplayerUI.style.display = 'block';
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x606060, 1.2);
    this.scene.add(ambient);

    this.sun = new THREE.DirectionalLight(0xfff5e0, 2.0);
    this.sun.position.set(20, 30, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.camera.left = -50;
    this.sun.shadow.camera.right = 50;
    this.sun.shadow.camera.top = 50;
    this.sun.shadow.camera.bottom = -50;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

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
        12,
        Math.cos(t) * 20,
      );
      this.followCamera.camera.lookAt(0, 3, 0);
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

    // Update NPCs (host runs AI, guest uses network positions)
    for (const npc of this.npcs) {
      npc.update(delta);
    }

    // Check collisions
    this.checkCollisions();

    // Update remote ball
    if (this.remoteBall) {
      this.remoteBall.update(delta);
    }

    // Update camera
    this.followCamera.update(
      this.ball.getPosition(),
      this.ball.radius,
      worldDir,
      delta,
    );

    // Make sun follow ball for proper shadows on hills
    const ballPos = this.ball.getPosition();
    this.sun.position.set(ballPos.x + 20, ballPos.y + 30, ballPos.z + 10);
    this.sun.target.position.copy(ballPos);

    // Network sync
    this.syncNetwork(delta);
  }

  private syncNetwork(delta: number) {
    if (!this.network?.connected) return;

    // Send local ball state every frame
    const pos = this.ball.getPosition();
    const vel = this.ball.getVelocity();
    const quat = this.ball.getRotatorQuaternion();
    const state: BallState = {
      t: 'b',
      x: pos.x, y: pos.y, z: pos.z,
      r: this.ball.radius,
      qx: quat.x, qy: quat.y, qz: quat.z, qw: quat.w,
      vx: vel.x, vz: vel.z,
    };
    this.network.sendBallState(state);

    // Host sends NPC state at ~10fps
    if (this.network.isHost) {
      this.npcSyncTimer += delta;
      if (this.npcSyncTimer >= 0.1) {
        this.npcSyncTimer = 0;
        const npcData = this.npcs.map((npc) => npc.getNetworkState());
        this.network.sendNPCState({ t: 'n', npcs: npcData });
      }
    }
  }

  private checkCollisions() {
    const ballPos = this.ball.getPosition();
    const myRole = this.network?.isHost ? 'host' : 'guest';

    for (let i = 0; i < this.collectibles.length; i++) {
      const item = this.collectibles[i];
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
          this.playNPCSound(item.name);

          // Send collect event to remote player
          if (this.network?.connected) {
            const event: CollectEvent = { t: 'c', id: i, by: myRole };
            this.network.sendCollectEvent(event);
          }
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

  private playNPCSound(name: string) {
    const audio = this.npcSounds[name];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  private onResize() {
    this.followCamera.camera.aspect =
      window.innerWidth / window.innerHeight;
    this.followCamera.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

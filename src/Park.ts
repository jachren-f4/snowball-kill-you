import * as THREE from 'three';
import { Collectible, NPCConfig } from './types';
import { NPC } from './NPC';
import {
  preloadModels, getModel, randomModel, spawnNPCs,
  spread, grid,
} from './models';

// === MATERIALS (environment only) ===
const M = {
  grass: new THREE.MeshLambertMaterial({ color: 0x4a8c3f }),
  grassDark: new THREE.MeshLambertMaterial({ color: 0x3a7030 }),
  path: new THREE.MeshLambertMaterial({ color: 0xc4a574 }),
  water: new THREE.MeshLambertMaterial({
    color: 0x4a90b8,
    transparent: true,
    opacity: 0.7,
  }),
};

// === NPC CONFIGS ===

const NPC_CONFIGS: NPCConfig[] = [
  {
    name: 'Capuchino Assassino',
    modelPath: 'models/brainrot/capuchino.glb',
    size: 1.5,
    speed: 2.0,
    scale: 1.0,
    positions: [[-15, -20], [20, 15]],
  },
  {
    name: 'Tralalero Tralala',
    modelPath: 'models/brainrot/tralalero.fbx',
    texturePath: 'models/brainrot/Tralala_Base_color.png',
    size: 2.5,
    speed: 1.5,
    scale: 0.01,
    positions: [[25, -30], [-30, 25]],
  },
  {
    name: 'La Vaca Saturno',
    modelPath: 'models/brainrot/vaca_saturno.fbx',
    texturePath: 'models/brainrot/La_Vaca_Base_color.png',
    size: 3.5,
    speed: 1.2,
    scale: 0.01,
    positions: [[-35, -35]],
  },
];

// === ENVIRONMENT ===

function createEnvironment(scene: THREE.Scene) {
  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    M.grass,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grass patches
  for (let i = 0; i < 30; i++) {
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(3 + Math.random() * 4, 3 + Math.random() * 4),
      M.grassDark,
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(
      (Math.random() - 0.5) * 80,
      0.005,
      (Math.random() - 0.5) * 80,
    );
    patch.rotation.z = Math.random() * Math.PI;
    patch.receiveShadow = true;
    scene.add(patch);
  }

  // Paths
  const pathGeo = new THREE.PlaneGeometry(1, 1);
  const pathMat = new THREE.MeshLambertMaterial({ color: 0xc4a574 });
  const addPath = (x: number, z: number, w: number, h: number, rot = 0) => {
    const p = new THREE.Mesh(pathGeo, pathMat);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = rot;
    p.scale.set(w, h, 1);
    p.position.set(x, 0.01, z);
    p.receiveShadow = true;
    scene.add(p);
  };
  addPath(0, 0, 3, 96);
  addPath(0, 0, 96, 3);
  const circlePath = new THREE.Mesh(new THREE.RingGeometry(7, 9, 32), pathMat);
  circlePath.rotation.x = -Math.PI / 2;
  circlePath.position.y = 0.01;
  circlePath.receiveShadow = true;
  scene.add(circlePath);
  addPath(-15, -15, 2.5, 30, Math.PI / 4);
  addPath(15, 15, 2.5, 30, Math.PI / 4);
  addPath(15, -15, 2.5, 25, -Math.PI / 4);

  // Pond
  const waterMat = new THREE.MeshLambertMaterial({
    color: 0x4a90b8,
    transparent: true,
    opacity: 0.7,
  });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 24), waterMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(25, 0.02, -20);
  pond.receiveShadow = true;
  scene.add(pond);

  // Pond edge rocks
  for (let a = 0; a < Math.PI * 2; a += 0.5) {
    const stone = randomModel(['qRock1', 'qRock2', 'qRock3'], 0.005 + Math.random() * 0.003);
    stone.position.set(
      25 + Math.cos(a) * 6.3,
      0,
      -20 + Math.sin(a) * 6.3,
    );
    stone.rotation.y = Math.random() * Math.PI * 2;
    scene.add(stone);
  }

  // Perimeter hedges
  for (let i = -48; i <= 48; i += 3) {
    for (const pos of [
      [i, -49],
      [i, 49],
      [-49, i],
      [49, i],
    ] as [number, number][]) {
      const hedge = randomModel(
        ['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'],
        0.03 + Math.random() * 0.005,
      );
      hedge.position.set(pos[0], 0, pos[1]);
      scene.add(hedge);
    }
  }

  // Decorative grass tufts (non-collectible)
  for (let i = 0; i < 60; i++) {
    const g = randomModel(['qGrass', 'qGrass2'], 0.008 + Math.random() * 0.005);
    g.position.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
  }
}

// === ITEM DEFINITIONS ===

interface ItemDef {
  create: () => THREE.Object3D;
  size: number;
  name: string;
  positions: [number, number][];
  randomRotY?: boolean;
}

// === MAIN ===

export async function createPark(
  scene: THREE.Scene,
): Promise<{ collectibles: Collectible[]; npcs: NPC[] }> {
  await preloadModels();

  createEnvironment(scene);

  const collectibles: Collectible[] = [];

  // Quaternius FBX models use centimeter units, so scale ~0.01 = 1 meter
  const items: ItemDef[] = [
    // === TINY (size 0.1-0.2) ===
    {
      create: () => getModel('qFlowers', 0.004),
      size: 0.15,
      name: 'Flowers',
      positions: [
        ...spread(4, 4, 3, 5), ...spread(-12, -5, 5, 5),
        ...spread(-2, 7, 4, 5), ...spread(6, 2, 5, 5),
        ...spread(0, 5, 3, 5), ...spread(12, 8, 5, 4),
        ...spread(-8, -12, 5, 4), ...spread(-10, -8, 6, 4),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qGrass', 'qGrass2'], 0.004),
      size: 0.1,
      name: 'Grass Tuft',
      positions: grid(-30, 30, -30, 30, 15),
      randomRotY: true,
    },

    // === SMALL (size 0.3-0.5) ===
    {
      create: () => randomModel(['qPlant1', 'qPlant2', 'qPlant3'], 0.006),
      size: 0.35,
      name: 'Plant',
      positions: [
        ...spread(0, 0, 10, 6), ...spread(5, 10, 6, 4),
        ...spread(-10, 5, 5, 4), ...grid(-30, 30, -30, 30, 8),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3', 'qRock4', 'qRock5'], 0.004),
      size: 0.3,
      name: 'Small Rock',
      positions: [...spread(25, -20, 8, 5), ...grid(-30, 30, -30, 30, 10)],
      randomRotY: true,
    },

    // === MEDIUM (size 0.6-1.2) ===
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3', 'qRock4', 'qRock5'], 0.01),
      size: 0.6,
      name: 'Rock',
      positions: [[28, -18], [22, -24], [-30, -25], [35, 10], [-25, -35], [15, -30]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qRockMoss1', 'qRockMoss2', 'qRockMoss3'], 0.01),
      size: 0.7,
      name: 'Mossy Rock',
      positions: [[30, -15], [-28, -22], [18, -32], [-35, 12], [10, -28]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qWoodLog', 'qWoodLogMoss'], 0.01),
      size: 0.8,
      name: 'Wood Log',
      positions: [[-22, -12], [28, -28], [-35, 18], [12, -35], [20, 30], [-15, -25]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qTreeStump', 'qTreeStumpMoss'], 0.01),
      size: 0.8,
      name: 'Tree Stump',
      positions: [[4, -18], [-6, 22], [18, 4], [-22, -4], [32, 20], [-28, 10]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qBush1', 'qBush2'], 0.012),
      size: 0.8,
      name: 'Small Bush',
      positions: [...spread(0, 0, 12, 5), ...grid(-35, 35, -35, 35, 10)],
      randomRotY: true,
    },

    // === LARGE (size 1.5-2.5) ===
    {
      create: () => randomModel(['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'], 0.025),
      size: 2.0,
      name: 'Large Bush',
      positions: [
        [-12, -8], [14, -12], [-18, 15], [22, 18],
        [-28, -18], [32, -12], [-25, 32], [10, -35],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qRock1', 'qRock2', 'qRock3', 'qRockMoss1', 'qRockMoss2',
      ], 0.02),
      size: 2.0,
      name: 'Large Rock',
      positions: [[30, -22], [-33, -20], [26, -15], [-38, 10], [36, 28]],
      randomRotY: true,
    },

    // === VERY LARGE (size 3.0-5.5) — Trees ===
    {
      create: () => randomModel([
        'qBirchTree1', 'qBirchTree2', 'qBirchTree3',
        'qBirchTreeAutumn1', 'qBirchTreeAutumn2',
      ], 0.025),
      size: 3.0,
      name: 'Birch Tree',
      positions: [
        [6, -5], [-6, -8], [8, 8], [-10, 10], [15, -8],
        [-16, -12], [0, -15], [18, 12], [-22, -5], [25, -5],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qCommonTree1', 'qCommonTree2', 'qCommonTree3', 'qCommonTree4', 'qCommonTree5',
        'qCommonTreeAutumn1', 'qCommonTreeAutumn2', 'qCommonTreeAutumn3',
      ], 0.035),
      size: 4.0,
      name: 'Tree',
      positions: [
        [-20, -20], [20, -22], [-25, 15], [28, 15], [-32, 0], [32, -8],
        [-18, -35], [22, 35], [-35, 25], [35, -25], [-10, 35], [10, -38],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qWillow1', 'qWillow2', 'qWillow3',
      ], 0.04),
      size: 5.5,
      name: 'Willow Tree',
      positions: [
        [-35, -35], [35, -35], [-35, 35], [38, 35],
        [-40, 0], [40, 0], [0, -40], [0, 40],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qPineTree1', 'qPineTree2', 'qPineTree3', 'qPineTree4',
        'qPineTreeAutumn1', 'qPineTreeAutumn2',
      ], 0.035),
      size: 4.5,
      name: 'Pine Tree',
      positions: [[-38, -20], [38, 20], [-30, 38], [30, -38], [-42, 15], [42, -15]],
      randomRotY: true,
    },
  ];

  // Place all items
  for (const def of items) {
    for (const [x, z] of def.positions) {
      const itemMesh = def.create();
      itemMesh.position.set(x, 0, z);
      if (def.randomRotY) {
        itemMesh.rotation.y = Math.random() * Math.PI * 2;
      }
      scene.add(itemMesh);

      if (def.size >= 1.5) {
        itemMesh.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
          }
        });
      }

      collectibles.push({
        mesh: itemMesh,
        size: def.size,
        name: def.name,
        collected: false,
      });
    }
  }

  // Spawn NPC characters
  const npcs = await spawnNPCs(scene, NPC_CONFIGS);
  for (const npc of npcs) {
    collectibles.push(npc.collectible);
  }

  return { collectibles, npcs };
}

import * as THREE from 'three';
import { Collectible, NPCConfig } from './types';
import { NPC } from './NPC';
import { Terrain } from './Terrain';
import {
  preloadModels, getModel, randomModel, spawnNPCs,
  spread, grid,
} from './models';

// === NPC CONFIGS (placed on flat sections) ===

const NPC_CONFIGS: NPCConfig[] = [
  {
    name: 'Capuchino Assassino',
    modelPath: 'models/brainrot/capuchino.glb',
    size: 1.5,
    speed: 2.0,
    scale: 1.0,
    positions: [[-15, -20], [10, -10]],
  },
  {
    name: 'Tralalero Tralala',
    modelPath: 'models/brainrot/tralalero.fbx',
    texturePath: 'models/brainrot/Tralala_Base_color.png',
    size: 2.5,
    speed: 1.5,
    scale: 0.01,
    positions: [[-30, -30], [30, -30]],
  },
  {
    name: 'La Vaca Saturno',
    modelPath: 'models/brainrot/vaca_saturno.fbx',
    texturePath: 'models/brainrot/La_Vaca_Base_color.png',
    size: 3.5,
    speed: 1.2,
    scale: 0.01,
    positions: [[-35, -10]],
  },
];

// === VISUAL MARKERS ===

function createFlag(scene: THREE.Scene, x: number, z: number, groundY: number) {
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(x, groundY + 2, z);
  pole.castShadow = true;
  scene.add(pole);

  const flagGeo = new THREE.PlaneGeometry(1.5, 1);
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    side: THREE.DoubleSide,
    roughness: 0.6,
  });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(x + 0.75, groundY + 3.5, z);
  flag.castShadow = true;
  scene.add(flag);
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

export async function createHillLevel(
  scene: THREE.Scene,
): Promise<{ collectibles: Collectible[]; npcs: NPC[]; terrain: Terrain }> {
  await preloadModels();

  const terrain = new Terrain(scene);
  const getY = (x: number, z: number) => terrain.getHeight(x, z);

  // Perimeter hedges (at terrain height)
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
      hedge.position.set(pos[0], getY(pos[0], pos[1]), pos[1]);
      scene.add(hedge);
    }
  }

  // Decorative grass tufts (non-collectible)
  for (let i = 0; i < 80; i++) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    const g = randomModel(['qGrass', 'qGrass2'], 0.008 + Math.random() * 0.005);
    g.position.set(x, getY(x, z), z);
    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
  }

  // Flag on hilltop
  createFlag(scene, 20, 25, getY(20, 25));

  const collectibles: Collectible[] = [];

  const items: ItemDef[] = [
    {
      create: () => getModel('qFlowers', 0.004),
      size: 0.15,
      name: 'Flowers',
      positions: [
        ...spread(0, 25, 8, 8),
        ...spread(-5, 22, 6, 5),
        ...spread(5, 28, 6, 5),
        // Flat area flowers
        ...spread(0, -5, 8, 6),
        ...spread(-15, -20, 6, 4),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qGrass', 'qGrass2'], 0.004),
      size: 0.1,
      name: 'Grass Tuft',
      positions: [
        ...grid(-8, 8, 19, 31, 10),
        ...grid(-30, 30, -35, -5, 12),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qPlant1', 'qPlant2', 'qPlant3'], 0.006),
      size: 0.35,
      name: 'Plant',
      positions: [
        ...spread(0, 25, 10, 8),
        ...spread(-3, 20, 5, 4),
        ...grid(-30, 30, -30, 0, 6),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3', 'qRock4', 'qRock5'], 0.004),
      size: 0.3,
      name: 'Small Rock',
      positions: [
        ...spread(0, 25, 10, 6),
        ...grid(-35, 35, -35, -5, 8),
      ],
      randomRotY: true,
    },

    // === MEDIUM (size 0.6-0.8) ===
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3', 'qRock4', 'qRock5'], 0.01),
      size: 0.6,
      name: 'Rock',
      positions: [[-3, 23], [4, 27], [-6, 26], [2, 22], [-30, -20], [25, -15]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qWoodLog', 'qWoodLogMoss'], 0.01),
      size: 0.8,
      name: 'Wood Log',
      positions: [[-4, 24], [3, 26], [-20, -10], [15, -25], [-35, 15]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qBush1', 'qBush2'], 0.012),
      size: 0.8,
      name: 'Small Bush',
      positions: [
        ...spread(0, 25, 8, 4),
        ...grid(-35, 35, -35, -5, 6),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qTreeStump', 'qTreeStumpMoss'], 0.01),
      size: 0.8,
      name: 'Tree Stump',
      positions: [[5, 24], [-5, 28], [-18, -8], [22, -20], [-30, 5]],
      randomRotY: true,
    },

    // === HILLSIDE: a few medium items partway up (risk/reward) ===
    {
      create: () => randomModel(['qRockMoss1', 'qRockMoss2', 'qRockMoss3'], 0.01),
      size: 0.7,
      name: 'Mossy Rock',
      positions: [[15, 20], [25, 20], [18, 30], [22, 32]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'], 0.015),
      size: 1.0,
      name: 'Bush',
      positions: [[12, 22], [28, 22], [15, 28]],
      randomRotY: true,
    },

    // === HILLTOP: large items as reward ===
    {
      create: () => randomModel(['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'], 0.025),
      size: 2.0,
      name: 'Large Bush',
      positions: [[18, 25], [22, 26], [20, 23]],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qRock1', 'qRock2', 'qRock3', 'qRockMoss1', 'qRockMoss2',
      ], 0.02),
      size: 2.0,
      name: 'Large Rock',
      positions: [[21, 27], [17, 24]],
      randomRotY: true,
    },

    // === FLAT AREAS: normal mix (like the park) ===
    {
      create: () => randomModel(['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'], 0.025),
      size: 2.0,
      name: 'Large Bush',
      positions: [
        [-12, -8], [14, -12], [-18, 15], [-28, -18], [32, -12], [10, -35],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qRock1', 'qRock2', 'qRock3', 'qRockMoss1', 'qRockMoss2',
      ], 0.02),
      size: 2.0,
      name: 'Large Rock',
      positions: [[-33, -20], [36, -25], [-38, 10]],
      randomRotY: true,
    },

    // === TREES scattered around (large obstacles, mainly on flat areas & gentle slopes) ===
    {
      create: () => randomModel([
        'qBirchTree1', 'qBirchTree2', 'qBirchTree3',
        'qBirchTreeAutumn1', 'qBirchTreeAutumn2',
      ], 0.025),
      size: 3.0,
      name: 'Birch Tree',
      positions: [
        [6, -5], [-6, -8], [-10, -15], [15, -8],
        [-22, -5], [25, -5], [30, 5], [-30, -25],
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
        [-20, -20], [20, -22], [-32, 0], [32, -8],
        [-18, -35], [-35, 25], [35, -25], [-10, 35],
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
      positions: [[-38, -20], [38, 20], [30, -38], [-42, 15]],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qWillow1', 'qWillow2', 'qWillow3',
      ], 0.04),
      size: 5.5,
      name: 'Willow Tree',
      positions: [
        [-35, -35], [35, -35], [-40, 0], [0, -40],
      ],
      randomRotY: true,
    },

    // === RAMP AREA: items near the ramp ridge to collect on the way up ===
    {
      create: () => randomModel(['qPlant1', 'qPlant2', 'qPlant3'], 0.006),
      size: 0.35,
      name: 'Plant',
      positions: [
        ...spread(-10, 10, 6, 5),
        ...spread(-10, 7, 4, 3),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3'], 0.008),
      size: 0.5,
      name: 'Rock',
      positions: [[-12, 10], [-8, 10], [-10, 12], [-10, 8]],
      randomRotY: true,
    },

    // === SMALL HILLS: items on/around the rolling hills ===
    {
      create: () => randomModel(['qFlowers'], 0.004),
      size: 0.15,
      name: 'Flowers',
      positions: [
        ...spread(-20, -15, 8, 6),
        ...spread(15, -25, 6, 4),
        ...spread(-25, 20, 8, 5),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qBushBerries1', 'qBushBerries2'], 0.012),
      size: 0.8,
      name: 'Berry Bush',
      positions: [[-20, -15], [-22, -13], [15, -25], [13, -23], [-25, 20], [-27, 18]],
      randomRotY: true,
    },
  ];

  // Place all items at terrain height
  for (const def of items) {
    for (const [x, z] of def.positions) {
      const itemMesh = def.create();
      const y = getY(x, z);
      itemMesh.position.set(x, y, z);
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
  const npcs = await spawnNPCs(scene, NPC_CONFIGS, getY);
  for (const npc of npcs) {
    collectibles.push(npc.collectible);
  }

  return { collectibles, npcs, terrain };
}

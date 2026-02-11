import * as THREE from 'three';
import { Collectible, NPCConfig } from './types';
import { NPC } from './NPC';
import { Terrain } from './Terrain';
import {
  preloadModels, getModel, randomModel, spawnNPCs,
  spread, grid,
} from './models';
import { createSkiJumpTower, SkiJumpResult } from './SkiJump';

// === NPC CONFIGS (placed on flat sections) ===

const NPC_CONFIGS: NPCConfig[] = [
  {
    name: 'Capuchino Assassino',
    modelPath: 'models/brainrot/capuchino.glb',
    size: 1.5,
    speed: 2.0,
    scale: 1.0,
    positions: [[-30, -40], [20, -20]],
  },
  {
    name: 'Tralalero Tralala',
    modelPath: 'models/brainrot/tralalero.fbx',
    texturePath: 'models/brainrot/Tralala_Base_color.png',
    size: 2.5,
    speed: 1.5,
    scale: 0.01,
    positions: [[-60, -60], [60, -60]],
  },
  {
    name: 'La Vaca Saturno',
    modelPath: 'models/brainrot/vaca_saturno.fbx',
    texturePath: 'models/brainrot/La_Vaca_Base_color.png',
    size: 3.5,
    speed: 1.2,
    scale: 0.01,
    positions: [[-70, -20]],
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
): Promise<{ collectibles: Collectible[]; npcs: NPC[]; terrain: Terrain; skiJump: SkiJumpResult }> {
  await preloadModels();

  const terrain = new Terrain(scene);
  const getY = (x: number, z: number) => terrain.getHeight(x, z);

  // Perimeter hedges (at terrain height)
  for (let i = -100; i <= 100; i += 6) {
    for (const pos of [
      [i, -101],
      [i, 101],
      [-101, i],
      [101, i],
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
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    const g = randomModel(['qGrass', 'qGrass2'], 0.008 + Math.random() * 0.005);
    g.position.set(x, getY(x, z), z);
    g.rotation.y = Math.random() * Math.PI * 2;
    scene.add(g);
  }

  // Flag on hilltop
  createFlag(scene, 40, 50, getY(40, 50));

  const collectibles: Collectible[] = [];

  const items: ItemDef[] = [
    {
      create: () => getModel('qFlowers', 0.004),
      size: 0.15,
      name: 'Flowers',
      positions: [
        ...spread(0, 50, 16, 12),
        ...spread(-10, 44, 12, 8),
        ...spread(10, 56, 12, 8),
        // Flat area flowers
        ...spread(0, -10, 16, 9),
        ...spread(-30, -40, 12, 6),
        // Outer region flowers
        ...spread(60, -60, 16, 8),
        ...spread(-60, 60, 16, 8),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qGrass', 'qGrass2'], 0.004),
      size: 0.1,
      name: 'Grass Tuft',
      positions: [
        ...grid(-16, 16, 38, 62, 15),
        ...grid(-60, 60, -70, -10, 18),
        // Outer regions
        ...grid(50, 90, -80, -20, 10),
        ...grid(-90, -50, 20, 80, 10),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qPlant1', 'qPlant2', 'qPlant3'], 0.006),
      size: 0.35,
      name: 'Plant',
      positions: [
        ...spread(0, 50, 20, 12),
        ...spread(-6, 40, 10, 6),
        ...grid(-60, 60, -60, 0, 9),
        // Outer regions
        ...grid(50, 90, 20, 80, 6),
        ...grid(-90, -50, -80, -20, 6),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3', 'qRock4', 'qRock5'], 0.004),
      size: 0.3,
      name: 'Small Rock',
      positions: [
        ...spread(0, 50, 20, 9),
        ...grid(-70, 70, -70, -10, 12),
        // Outer regions
        ...grid(50, 90, -90, -30, 6),
        ...grid(-90, -50, 30, 90, 6),
      ],
      randomRotY: true,
    },

    // === MEDIUM (size 0.6-0.8) ===
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3', 'qRock4', 'qRock5'], 0.01),
      size: 0.6,
      name: 'Rock',
      positions: [
        [-6, 46], [8, 54], [-12, 52], [4, 44], [-60, -40], [50, -30],
        // Outer regions
        [70, -50], [-70, 50], [80, 40], [-80, -60],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qWoodLog', 'qWoodLogMoss'], 0.01),
      size: 0.8,
      name: 'Wood Log',
      positions: [
        [-8, 48], [6, 52], [-40, -20], [30, -50], [-70, 30],
        // Outer regions
        [60, 60], [-60, -70], [75, -20],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qBush1', 'qBush2'], 0.012),
      size: 0.8,
      name: 'Small Bush',
      positions: [
        ...spread(0, 50, 16, 6),
        ...grid(-70, 70, -70, -10, 9),
        // Outer regions
        ...grid(50, 90, 30, 90, 5),
        ...grid(-90, -50, -90, -30, 5),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qTreeStump', 'qTreeStumpMoss'], 0.01),
      size: 0.8,
      name: 'Tree Stump',
      positions: [
        [10, 48], [-10, 56], [-36, -16], [44, -40], [-60, 10],
        // Outer regions
        [70, 30], [-80, -40], [50, -70],
      ],
      randomRotY: true,
    },

    // === HILLSIDE: a few medium items partway up (risk/reward) ===
    {
      create: () => randomModel(['qRockMoss1', 'qRockMoss2', 'qRockMoss3'], 0.01),
      size: 0.7,
      name: 'Mossy Rock',
      positions: [[30, 40], [50, 40], [36, 60], [44, 64]],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'], 0.015),
      size: 1.0,
      name: 'Bush',
      positions: [[24, 44], [56, 44], [30, 56]],
      randomRotY: true,
    },

    // === HILLTOP: large items as reward ===
    {
      create: () => randomModel(['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'], 0.025),
      size: 2.0,
      name: 'Large Bush',
      positions: [[36, 50], [44, 52], [40, 46]],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qRock1', 'qRock2', 'qRock3', 'qRockMoss1', 'qRockMoss2',
      ], 0.02),
      size: 2.0,
      name: 'Large Rock',
      positions: [[42, 54], [34, 48]],
      randomRotY: true,
    },

    // === FLAT AREAS: normal mix (like the park) ===
    {
      create: () => randomModel(['qBush1', 'qBush2', 'qBushBerries1', 'qBushBerries2'], 0.025),
      size: 2.0,
      name: 'Large Bush',
      positions: [
        [-24, -16], [28, -24], [-36, 30], [-56, -36], [64, -24], [20, -70],
        // Outer regions
        [70, 50], [-70, -50], [80, -80], [-80, 70],
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel([
        'qRock1', 'qRock2', 'qRock3', 'qRockMoss1', 'qRockMoss2',
      ], 0.02),
      size: 2.0,
      name: 'Large Rock',
      positions: [
        [-66, -40], [72, -50], [-76, 20],
        // Outer regions
        [85, 30], [-85, -70], [60, 80],
      ],
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
        [12, -10], [-12, -16], [-20, -30], [30, -16],
        [-44, -10], [50, -10], [60, 10], [-60, -50],
        // Outer regions
        [75, -40], [-75, 40], [80, 60], [-85, -25],
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
        [-30, -40], [40, -44], [-64, 0], [64, -16],
        [-36, -70], [-70, 50], [70, -50], [-20, 70],
        // Outer regions
        [80, 30], [-80, -30], [50, 85], [-50, -85],
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
      positions: [
        [-76, -40], [76, 40], [60, -76], [-84, 30],
        // Outer regions
        [85, -70], [-90, 60], [70, 70], [-60, -80],
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
        [-85, -85], [70, -70], [-80, 0], [0, -80],
        // Outer regions
        [80, 80], [-85, 50], [90, -30],
      ],
      randomRotY: true,
    },

    // === RAMP AREA: items near the ramp ridge to collect on the way up ===
    {
      create: () => randomModel(['qPlant1', 'qPlant2', 'qPlant3'], 0.006),
      size: 0.35,
      name: 'Plant',
      positions: [
        ...spread(-20, 20, 12, 8),
        ...spread(-20, 14, 8, 5),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qRock1', 'qRock2', 'qRock3'], 0.008),
      size: 0.5,
      name: 'Rock',
      positions: [[-24, 20], [-16, 20], [-20, 24], [-20, 16]],
      randomRotY: true,
    },

    // === SMALL HILLS: items on/around the rolling hills ===
    {
      create: () => randomModel(['qFlowers'], 0.004),
      size: 0.15,
      name: 'Flowers',
      positions: [
        ...spread(-40, -30, 16, 9),
        ...spread(30, -50, 12, 6),
        ...spread(-50, 40, 16, 8),
      ],
      randomRotY: true,
    },
    {
      create: () => randomModel(['qBushBerries1', 'qBushBerries2'], 0.012),
      size: 0.8,
      name: 'Berry Bush',
      positions: [
        [-40, -30], [-44, -26], [30, -50], [26, -46], [-50, 40], [-54, 36],
        // Outer regions
        [70, 20], [-70, -60],
      ],
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
  const groundQuery = (x: number, z: number) => terrain.getGroundInfo(x, z);
  const npcs = await spawnNPCs(scene, NPC_CONFIGS, getY, groundQuery);
  for (const npc of npcs) {
    collectibles.push(npc.collectible);
  }

  // Build ski jump tower
  const skiJump = createSkiJumpTower(scene, getY);

  return { collectibles, npcs, terrain, skiJump };
}

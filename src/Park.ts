import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Collectible, NPCConfig } from './types';
import { NPC } from './NPC';

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
  gray: new THREE.MeshLambertMaterial({ color: 0x808080 }),
};

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
};

// === MODEL LOADER ===

const fbxLoader = new FBXLoader();
const modelCache = new Map<string, THREE.Object3D>();

// Map Quaternius material names to vibrant colors
const MATERIAL_COLORS: Record<string, number> = {
  'Green': 0x2d8a4e,
  'DarkGreen': 0x1e6b35,
  'LightGreen': 0x5cb85c,
  'Wood': 0x8b6914,
  'DarkWood': 0x5c4a1e,
  'LightWood': 0xb8923a,
  'Stone': 0x8c8c8c,
  'Rock': 0x7a7a7a,
  'DarkStone': 0x5a5a5a,
  'Brown': 0x7a5230,
  'DarkBrown': 0x4a3020,
  'LightBrown': 0xa07850,
  'Yellow': 0xe6c840,
  'Orange': 0xd4882a,
  'Red': 0xc04040,
  'White': 0xe8e8e0,
  'Moss': 0x4a7a3a,
  'Bark': 0x6b4e2e,
  'Leaf': 0x3a9a4a,
  'Berry': 0xc43060,
};

function brightenMaterials(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat.color) continue;
      // Try to match material name to a nice color
      const name = mat.name || '';
      let matched = false;
      for (const [key, hex] of Object.entries(MATERIAL_COLORS)) {
        if (name.toLowerCase().includes(key.toLowerCase())) {
          mat.color.setHex(hex);
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Fallback: aggressively brighten dark colors
        const c = mat.color;
        const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
        if (lum < 0.15) {
          // Determine dominant channel and assign a nice color
          if (c.g > c.r && c.g > c.b) {
            mat.color.setHex(0x2d8a4e); // green
          } else if (c.r > c.g && c.r > c.b) {
            mat.color.setHex(0x8b6914); // brown/wood
          } else {
            mat.color.setHex(0x7a7a7a); // gray/stone
          }
        }
      }
    }
  });
}

async function loadModel(path: string): Promise<THREE.Object3D> {
  if (modelCache.has(path)) return modelCache.get(path)!;
  return new Promise((resolve, reject) => {
    fbxLoader.load(
      path,
      (object) => {
        brightenMaterials(object);
        modelCache.set(path, object);
        resolve(object);
      },
      undefined,
      reject,
    );
  });
}

function cloneModel(original: THREE.Object3D, scale: number): THREE.Object3D {
  const clone = original.clone();
  clone.scale.setScalar(scale);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const hasVertexColors = child.geometry?.attributes?.color != null;
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m: THREE.Material) => {
          const c = m.clone();
          if (hasVertexColors) c.vertexColors = true;
          return c;
        });
      } else {
        child.material = child.material.clone();
        if (hasVertexColors) child.material.vertexColors = true;
      }
    }
  });
  return clone;
}

// === PRELOAD ALL MODELS ===

const Q = 'models/quaternius/';

const MODEL_PATHS = {
  // Trees
  qCommonTree1: Q + 'CommonTree_1.fbx',
  qCommonTree2: Q + 'CommonTree_2.fbx',
  qCommonTree3: Q + 'CommonTree_3.fbx',
  qCommonTree4: Q + 'CommonTree_4.fbx',
  qCommonTree5: Q + 'CommonTree_5.fbx',
  qCommonTreeAutumn1: Q + 'CommonTree_Autumn_1.fbx',
  qCommonTreeAutumn2: Q + 'CommonTree_Autumn_2.fbx',
  qCommonTreeAutumn3: Q + 'CommonTree_Autumn_3.fbx',
  qBirchTree1: Q + 'BirchTree_1.fbx',
  qBirchTree2: Q + 'BirchTree_2.fbx',
  qBirchTree3: Q + 'BirchTree_3.fbx',
  qBirchTreeAutumn1: Q + 'BirchTree_Autumn_1.fbx',
  qBirchTreeAutumn2: Q + 'BirchTree_Autumn_2.fbx',
  qPineTree1: Q + 'PineTree_1.fbx',
  qPineTree2: Q + 'PineTree_2.fbx',
  qPineTree3: Q + 'PineTree_3.fbx',
  qPineTree4: Q + 'PineTree_4.fbx',
  qPineTreeAutumn1: Q + 'PineTree_Autumn_1.fbx',
  qPineTreeAutumn2: Q + 'PineTree_Autumn_2.fbx',
  qWillow1: Q + 'Willow_1.fbx',
  qWillow2: Q + 'Willow_2.fbx',
  qWillow3: Q + 'Willow_3.fbx',
  // Bushes
  qBush1: Q + 'Bush_1.fbx',
  qBush2: Q + 'Bush_2.fbx',
  qBushBerries1: Q + 'BushBerries_1.fbx',
  qBushBerries2: Q + 'BushBerries_2.fbx',
  // Rocks
  qRock1: Q + 'Rock_1.fbx',
  qRock2: Q + 'Rock_2.fbx',
  qRock3: Q + 'Rock_3.fbx',
  qRock4: Q + 'Rock_4.fbx',
  qRock5: Q + 'Rock_5.fbx',
  qRockMoss1: Q + 'Rock_Moss_1.fbx',
  qRockMoss2: Q + 'Rock_Moss_2.fbx',
  qRockMoss3: Q + 'Rock_Moss_3.fbx',
  // Flora
  qFlowers: Q + 'Flowers.fbx',
  qGrass: Q + 'Grass.fbx',
  qGrass2: Q + 'Grass_2.fbx',
  qPlant1: Q + 'Plant_1.fbx',
  qPlant2: Q + 'Plant_2.fbx',
  qPlant3: Q + 'Plant_3.fbx',
  // Logs & stumps
  qWoodLog: Q + 'WoodLog.fbx',
  qWoodLogMoss: Q + 'WoodLog_Moss.fbx',
  qTreeStump: Q + 'TreeStump.fbx',
  qTreeStumpMoss: Q + 'TreeStump_Moss.fbx',
};

async function preloadModels(): Promise<void> {
  const paths = Object.values(MODEL_PATHS);
  await Promise.all(paths.map((p) => loadModel(p).catch(() => null)));
}

function getModel(key: keyof typeof MODEL_PATHS, scale: number): THREE.Object3D {
  const original = modelCache.get(MODEL_PATHS[key]);
  if (!original) {
    // Fallback: gray cube placeholder
    const g = new THREE.Group();
    const m = new THREE.Mesh(G.box, M.gray);
    m.scale.setScalar(0.3 * scale * 100); // scale up since FBX scale is tiny
    m.position.y = 0.15 * scale * 100;
    g.add(m);
    return g;
  }
  return cloneModel(original, scale);
}

function randomModel(keys: (keyof typeof MODEL_PATHS)[], scale: number): THREE.Object3D {
  const key = keys[Math.floor(Math.random() * keys.length)];
  return getModel(key, scale);
}

// === NPC MODEL LOADING ===

const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const NPC_CONFIGS: NPCConfig[] = [
  {
    name: 'Capuchino Assassino',
    modelPath: 'models/brainrot/capuchino.glb',
    size: 1.5,
    speed: 2.0,
    scale: 1.0, // calibrated at runtime
    positions: [[-15, -20], [20, 15]],
  },
  {
    name: 'Tralalero Tralala',
    modelPath: 'models/brainrot/tralalero.fbx',
    texturePath: 'models/brainrot/Tralala_Base_color.png',
    size: 2.5,
    speed: 1.5,
    scale: 0.01, // FBX centimeter units
    positions: [[25, -30], [-30, 25]],
  },
  {
    name: 'La Vaca Saturno',
    modelPath: 'models/brainrot/vaca_saturno.fbx',
    texturePath: 'models/brainrot/La_Vaca_Base_color.png',
    size: 3.5,
    speed: 1.2,
    scale: 0.01, // FBX centimeter units
    positions: [[-35, -35]],
  },
];

async function loadNPCModel(config: NPCConfig): Promise<THREE.Object3D> {
  const isGLB = config.modelPath.endsWith('.glb');

  let model: THREE.Object3D;

  if (isGLB) {
    const gltf = await new Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>(
      (resolve, reject) => {
        gltfLoader.load(config.modelPath, resolve, undefined, reject);
      },
    );
    model = gltf.scene;
  } else {
    model = await new Promise<THREE.Object3D>((resolve, reject) => {
      fbxLoader.load(config.modelPath, resolve, undefined, reject);
    });
  }

  // Apply base color texture for FBX models
  if (config.texturePath) {
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      textureLoader.load(config.texturePath!, resolve, undefined, reject);
    });
    texture.flipY = !isGLB; // FBX textures need flipY=true (default), GLB=false
    texture.colorSpace = THREE.SRGBColorSpace;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.8,
          metalness: 0.0,
        });
        child.material = mat;
      }
    });
  }

  model.scale.setScalar(config.scale);

  // Auto-calibrate scale to match target size
  const box = new THREE.Box3().setFromObject(model);
  const measuredSize = new THREE.Vector3();
  box.getSize(measuredSize);
  if (measuredSize.y > 0.01) {
    const correctedScale = (config.size / measuredSize.y) * config.scale;
    model.scale.setScalar(correctedScale);
  }

  // Lift model so its bottom sits at y=0
  const finalBox = new THREE.Box3().setFromObject(model);
  model.position.y = -finalBox.min.y;

  // Enable shadows
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
    }
  });

  return model;
}

function cloneNPCModel(original: THREE.Object3D): THREE.Object3D {
  const clone = original.clone();
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Share geometry and textures but clone material instances
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m: THREE.Material) => m.clone());
      } else {
        child.material = child.material.clone();
      }
    }
  });
  return clone;
}

async function spawnNPCs(scene: THREE.Scene): Promise<NPC[]> {
  const npcs: NPC[] = [];

  for (const config of NPC_CONFIGS) {
    let baseModel: THREE.Object3D | null = null;
    try {
      baseModel = await loadNPCModel(config);
    } catch (e) {
      console.warn(`[NPC] Failed to load ${config.name}:`, e);
      continue;
    }

    for (let i = 0; i < config.positions.length; i++) {
      const [x, z] = config.positions[i];
      const model = i === 0 ? baseModel : cloneNPCModel(baseModel);
      const npc = new NPC(model, config.size, config.name, config.speed, x, z);
      scene.add(npc.getMesh());
      npcs.push(npc);
    }
  }

  return npcs;
}

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
  const addPath = (x: number, z: number, w: number, h: number, rot = 0) => {
    const p = new THREE.Mesh(pathGeo, M.path);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = rot;
    p.scale.set(w, h, 1);
    p.position.set(x, 0.01, z);
    p.receiveShadow = true;
    scene.add(p);
  };
  addPath(0, 0, 3, 96);
  addPath(0, 0, 96, 3);
  const circlePath = new THREE.Mesh(new THREE.RingGeometry(7, 9, 32), M.path);
  circlePath.rotation.x = -Math.PI / 2;
  circlePath.position.y = 0.01;
  circlePath.receiveShadow = true;
  scene.add(circlePath);
  addPath(-15, -15, 2.5, 30, Math.PI / 4);
  addPath(15, 15, 2.5, 30, Math.PI / 4);
  addPath(15, -15, 2.5, 25, -Math.PI / 4);

  // Pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 24), M.water);
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

// === PLACEMENT HELPERS ===

function spread(cx: number, cz: number, radius: number, count: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return pts;
}

function grid(xMin: number, xMax: number, zMin: number, zMax: number, count: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    pts.push([
      xMin + Math.random() * (xMax - xMin),
      zMin + Math.random() * (zMax - zMin),
    ]);
  }
  return pts;
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
        itemMesh.traverse((child) => {
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
  const npcs = await spawnNPCs(scene);
  for (const npc of npcs) {
    collectibles.push(npc.collectible);
  }

  return { collectibles, npcs };
}

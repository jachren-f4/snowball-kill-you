import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NPCConfig } from './types';
import { NPC } from './NPC';

// === MODEL LOADER ===

export const fbxLoader = new FBXLoader();
export const gltfLoader = new GLTFLoader();
export const textureLoader = new THREE.TextureLoader();
export const modelCache = new Map<string, THREE.Object3D>();

// Map Quaternius material names to vibrant colors
export const MATERIAL_COLORS: Record<string, number> = {
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

export function brightenMaterials(object: THREE.Object3D) {
  object.traverse((child: THREE.Object3D) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat.color) continue;
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
        const c = mat.color;
        const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
        if (lum < 0.15) {
          if (c.g > c.r && c.g > c.b) {
            mat.color.setHex(0x2d8a4e);
          } else if (c.r > c.g && c.r > c.b) {
            mat.color.setHex(0x8b6914);
          } else {
            mat.color.setHex(0x7a7a7a);
          }
        }
      }
    }
  });
}

export async function loadModel(path: string): Promise<THREE.Object3D> {
  if (modelCache.has(path)) return modelCache.get(path)!;
  return new Promise((resolve, reject) => {
    fbxLoader.load(
      path,
      (object: THREE.Object3D) => {
        brightenMaterials(object);
        modelCache.set(path, object);
        resolve(object);
      },
      undefined,
      reject,
    );
  });
}

export function cloneModel(original: THREE.Object3D, scale: number): THREE.Object3D {
  const clone = original.clone();
  clone.scale.setScalar(scale);
  clone.traverse((child: THREE.Object3D) => {
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

// === MODEL PATHS ===

const Q = 'models/quaternius/';

export const MODEL_PATHS = {
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

export async function preloadModels(): Promise<void> {
  const paths = Object.values(MODEL_PATHS);
  await Promise.all(paths.map((p) => loadModel(p).catch(() => null)));
}

const grayMat = new THREE.MeshLambertMaterial({ color: 0x808080 });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

export function getModel(key: keyof typeof MODEL_PATHS, scale: number): THREE.Object3D {
  const original = modelCache.get(MODEL_PATHS[key]);
  if (!original) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(boxGeo, grayMat);
    m.scale.setScalar(0.3 * scale * 100);
    m.position.y = 0.15 * scale * 100;
    g.add(m);
    return g;
  }
  return cloneModel(original, scale);
}

export function randomModel(keys: (keyof typeof MODEL_PATHS)[], scale: number): THREE.Object3D {
  const key = keys[Math.floor(Math.random() * keys.length)];
  return getModel(key, scale);
}

// === NPC LOADING ===

export async function loadNPCModel(config: NPCConfig): Promise<THREE.Object3D> {
  const isGLB = config.modelPath.endsWith('.glb');

  let model: THREE.Object3D;

  if (isGLB) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gltf = await new Promise<any>(
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

  if (config.texturePath) {
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      textureLoader.load(config.texturePath!, resolve, undefined, reject);
    });
    texture.flipY = !isGLB;
    texture.colorSpace = THREE.SRGBColorSpace;
    model.traverse((child: THREE.Object3D) => {
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

  const box = new THREE.Box3().setFromObject(model);
  const measuredSize = new THREE.Vector3();
  box.getSize(measuredSize);
  if (measuredSize.y > 0.01) {
    const correctedScale = (config.size / measuredSize.y) * config.scale;
    model.scale.setScalar(correctedScale);
  }

  const finalBox = new THREE.Box3().setFromObject(model);
  model.position.y = -finalBox.min.y;

  model.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
    }
  });

  return model;
}

export function cloneNPCModel(original: THREE.Object3D): THREE.Object3D {
  const clone = original.clone();
  clone.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m: THREE.Material) => m.clone());
      } else {
        child.material = child.material.clone();
      }
    }
  });
  return clone;
}

export async function spawnNPCs(
  scene: THREE.Scene,
  configs: NPCConfig[],
  getGroundY?: (x: number, z: number) => number,
): Promise<NPC[]> {
  const npcs: NPC[] = [];

  for (const config of configs) {
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
      if (getGroundY) {
        npc.getMesh().position.y = getGroundY(x, z);
      }
      scene.add(npc.getMesh());
      npcs.push(npc);
    }
  }

  return npcs;
}

// === PLACEMENT HELPERS ===

export function spread(cx: number, cz: number, radius: number, count: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return pts;
}

export function grid(xMin: number, xMax: number, zMin: number, zMax: number, count: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    pts.push([
      xMin + Math.random() * (xMax - xMin),
      zMin + Math.random() * (zMax - zMin),
    ]);
  }
  return pts;
}

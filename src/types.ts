import * as THREE from 'three';

export interface Collectible {
  mesh: THREE.Object3D;
  size: number;
  name: string;
  collected: boolean;
}

export interface NPCConfig {
  name: string;
  modelPath: string;
  texturePath?: string;
  size: number;
  speed: number;
  scale: number;
  positions: [number, number][];
}

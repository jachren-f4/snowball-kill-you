import * as THREE from 'three';

export interface Collectible {
  mesh: THREE.Object3D;
  size: number;
  name: string;
  collected: boolean;
}

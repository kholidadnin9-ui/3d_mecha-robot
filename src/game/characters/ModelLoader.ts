import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterId, MechaJoints } from '../core/types';
import { MechaBuilder } from './MechaBuilder';
import { ProceduralTextures } from './ProceduralTextures';

/**
 * Provides plug-and-play GLTF/GLB model loading with automatic fallback to our
 * detailed articulated procedural Three.js mecha rigs so combat systems never depend
 * on whether external .glb files are present.
 */
export class ModelLoader {
  private gltfLoader = new GLTFLoader();

  public async loadOrBuildCharacter(
    id: CharacterId,
    builder: MechaBuilder,
    texGen: ProceduralTextures,
    customGlbUrl?: string
  ): Promise<MechaJoints> {
    if (customGlbUrl) {
      try {
        const gltf = await this.gltfLoader.loadAsync(customGlbUrl);
        const rig = builder.buildCharacter(id, texGen);
        rig.root.clear();
        rig.root.add(gltf.scene);
        if (gltf.animations && gltf.animations.length > 0) {
          rig.mixer = new THREE.AnimationMixer(gltf.scene);
          const idleClip = gltf.animations[0];
          rig.mixer.clipAction(idleClip).play();
        }
        return rig;
      } catch (err) {
        console.warn(`Optional GLB model "${customGlbUrl}" unavailable, using procedural Mecha rig:`, err);
      }
    }

    return builder.buildCharacter(id, texGen);
  }
}

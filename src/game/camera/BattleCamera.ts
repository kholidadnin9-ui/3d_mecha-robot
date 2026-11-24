import * as THREE from 'three';
import { ARENA_RADIUS } from '../core/constants';

export type CameraPresentationMode =
  | 'MENU'
  | 'INTRO'
  | 'COMBAT'
  | 'SKILL'
  | 'ULTIMATE'
  | 'VICTORY'
  | 'DEFEAT';

export class BattleCamera {
  public camera: THREE.PerspectiveCamera;
  private mode: CameraPresentationMode = 'MENU';
  private modeTime = 0;

  // Spherical orbit angles controlled by player mouse/touch drag
  private yaw = 0; // radians
  private pitch = 0.56; // ~32 deg isometric action elevation
  private userZoom = 12.5;

  private currentLookAt = new THREE.Vector3(0, 1.8, 0);
  private currentPos = new THREE.Vector3(0, 9.5, 14.5);

  private shakeTrauma = 0;
  private shakeSeed = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.25, 260);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLookAt);
  }

  public setAspect(aspect: number): void {
    // Slightly widen FOV on tall portrait mobile screens so arena stays spacious
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.85 ? 58 : 48;
    this.camera.updateProjectionMatrix();
  }

  public setMode(mode: CameraPresentationMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.modeTime = 0;
    }
  }

  public rotateOrbit(deltaX: number, deltaY: number): void {
    if (this.mode !== 'COMBAT' && this.mode !== 'SKILL') return;
    this.yaw -= deltaX * 0.0055;
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * 0.004, 0.26, 0.98);
  }

  public adjustZoom(delta: number): void {
    this.userZoom = THREE.MathUtils.clamp(this.userZoom + delta, 8.0, 19.5);
  }

  public getYaw(): number {
    return this.yaw;
  }

  public addShake(amount: number): void {
    this.shakeTrauma = Math.min(1.35, this.shakeTrauma + amount);
  }

  public reset(): void {
    this.yaw = 0;
    this.pitch = 0.54;
    this.userZoom = 12.5;
    this.shakeTrauma = 0;
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    enemyPos: THREE.Vector3
  ): void {
    this.modeTime += dt;
    this.shakeSeed += dt * 42;

    const desiredLook = new THREE.Vector3();
    const desiredPos = new THREE.Vector3();
    let smoothSpeed = 8.5;

    switch (this.mode) {
      case 'MENU': {
        const ang = this.modeTime * 0.22;
        desiredLook.set(0, 1.85, 0);
        desiredPos.set(Math.sin(ang) * 14.5, 5.4, Math.cos(ang) * 14.5);
        smoothSpeed = 4;
        break;
      }

      case 'INTRO': {
        const prog = Math.min(1, this.modeTime / 2.2);
        const ang = THREE.MathUtils.lerp(0.95, 0.0, prog);
        desiredLook.lerpVectors(enemyPos, playerPos, 0.55).setY(1.85);
        desiredPos.set(
          desiredLook.x + Math.sin(ang) * 12.5,
          4.8 + prog * 3.6,
          desiredLook.z + Math.cos(ang) * 12.5
        );
        smoothSpeed = 5.5;
        break;
      }

      case 'ULTIMATE': {
        // Dramatic cinematic camera during Divine Thunderstorm!
        if (this.modeTime < 1.35) {
          // Close heroic low-angle orbit around ascending Golden Guardian
          const ang = this.yaw + this.modeTime * 1.15 - 0.5;
          desiredLook.set(playerPos.x, playerPos.y + 2.4, playerPos.z);
          desiredPos.set(
            playerPos.x + Math.sin(ang) * 6.8,
            playerPos.y + 2.1,
            playerPos.z + Math.cos(ang) * 6.8
          );
          smoothSpeed = 7.5;
        } else {
          // Pull out dynamically to capture lightning bombardment & supernova shockwave hitting enemy!
          desiredLook.lerpVectors(playerPos, enemyPos, 0.55).setY(1.9);
          const dist = Math.max(13.5, playerPos.distanceTo(enemyPos) * 0.85 + 8.5);
          desiredPos.set(
            desiredLook.x + Math.sin(this.yaw + 0.25) * dist,
            8.8,
            desiredLook.z + Math.cos(this.yaw + 0.25) * dist
          );
          smoothSpeed = 9.0;
        }
        break;
      }

      case 'VICTORY': {
        const ang = this.yaw + this.modeTime * 0.45 + 0.35;
        desiredLook.set(playerPos.x, 1.95, playerPos.z);
        desiredPos.set(
          playerPos.x + Math.sin(ang) * 6.2,
          2.65,
          playerPos.z + Math.cos(ang) * 6.2
        );
        smoothSpeed = 5;
        break;
      }

      case 'DEFEAT': {
        const ang = this.yaw + this.modeTime * 0.22;
        desiredLook.set(playerPos.x, 1.0, playerPos.z);
        desiredPos.set(
          playerPos.x + Math.sin(ang) * 7.8,
          4.4,
          playerPos.z + Math.cos(ang) * 7.8
        );
        smoothSpeed = 4.5;
        break;
      }

      case 'SKILL':
      case 'COMBAT':
      default: {
        // Frame 64% Player + 36% Enemy so player feels anchored while enemy stays visible!
        desiredLook.lerpVectors(playerPos, enemyPos, 0.36);
        desiredLook.y = 1.75;

        const separation = playerPos.distanceTo(enemyPos);
        const skillZoomBias = this.mode === 'SKILL' ? -1.4 : 0;
        const dynamicDist = THREE.MathUtils.clamp(
          this.userZoom + separation * 0.34 + skillZoomBias,
          8.2,
          21.5
        );

        const horizDist = Math.cos(this.pitch) * dynamicDist;
        const height = Math.sin(this.pitch) * dynamicDist + 1.4;

        desiredPos.set(
          desiredLook.x + Math.sin(this.yaw) * horizDist,
          height,
          desiredLook.z + Math.cos(this.yaw) * horizDist
        );

        // Arena collision / boundary avoidance so camera never clips inside outer pylons or below deck
        const radialLen = Math.hypot(desiredPos.x, desiredPos.z);
        const maxCamRadius = ARENA_RADIUS + 1.5;
        if (radialLen > maxCamRadius && desiredPos.y < 6.8) {
          const clampScale = maxCamRadius / radialLen;
          desiredPos.x *= clampScale;
          desiredPos.z *= clampScale;
          desiredPos.y = Math.max(desiredPos.y, 4.5);
        }
        desiredPos.y = Math.max(1.6, desiredPos.y);
        smoothSpeed = 9.5;
        break;
      }
    }

    // Smooth exponential damping
    const alpha = 1 - Math.exp(-smoothSpeed * dt);
    this.currentPos.lerp(desiredPos, alpha);
    this.currentLookAt.lerp(desiredLook, alpha);

    this.camera.position.copy(this.currentPos);

    // Apply trauma-squared camera shake
    if (this.shakeTrauma > 0.001) {
      const shakeMag = this.shakeTrauma * this.shakeTrauma * 0.58;
      this.camera.position.x += Math.sin(this.shakeSeed * 1.7) * shakeMag;
      this.camera.position.y += Math.cos(this.shakeSeed * 2.3) * shakeMag * 0.75;
      this.camera.position.z += Math.sin(this.shakeSeed * 1.9 + 1.2) * shakeMag;
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.35);
    }

    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Projects a 3D world position into 0..100 screen percentage coordinates for floating damage numbers.
   */
  public projectToScreenPercent(worldPos: THREE.Vector3): { x: number; y: number } | null {
    const projected = worldPos.clone().project(this.camera);
    if (projected.z > 1) return null;
    const x = (projected.x * 0.5 + 0.5) * 100;
    const y = (-projected.y * 0.5 + 0.5) * 100;
    if (x < -5 || x > 105 || y < -5 || y > 105) return null;
    return { x, y };
  }
}

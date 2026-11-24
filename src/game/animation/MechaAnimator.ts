import * as THREE from 'three';
import { AnimState, MechaJoints } from '../core/types';

interface PoseTargets {
  hipsY: number;
  hipsRotX: number;
  hipsRotY: number;
  hipsRotZ: number;
  torsoRotX: number;
  torsoRotY: number;
  torsoRotZ: number;
  headRotX: number;
  headRotY: number;
  headRotZ: number;
  lShoulderX: number;
  lShoulderY: number;
  lShoulderZ: number;
  lElbowX: number;
  lWristY: number;
  rShoulderX: number;
  rShoulderY: number;
  rShoulderZ: number;
  rElbowX: number;
  rWristY: number;
  lHipX: number;
  lHipZ: number;
  lKneeX: number;
  lAnkleX: number;
  rHipX: number;
  rHipZ: number;
  rKneeX: number;
  rAnkleX: number;
  thrusterScale: number;
  coreIntensity: number;
}

const DEFAULT_POSE: PoseTargets = {
  hipsY: 1.16,
  hipsRotX: 0,
  hipsRotY: 0,
  hipsRotZ: 0,
  torsoRotX: 0.04,
  torsoRotY: 0,
  torsoRotZ: 0,
  headRotX: 0,
  headRotY: 0,
  headRotZ: 0,
  lShoulderX: -0.32,
  lShoulderY: 0.18,
  lShoulderZ: -0.28,
  lElbowX: -0.78,
  lWristY: 0,
  rShoulderX: -0.36,
  rShoulderY: -0.18,
  rShoulderZ: 0.28,
  rElbowX: -0.85,
  rWristY: 0,
  lHipX: -0.12,
  lHipZ: -0.1,
  lKneeX: 0.24,
  lAnkleX: -0.12,
  rHipX: -0.12,
  rHipZ: 0.1,
  rKneeX: 0.24,
  rAnkleX: -0.12,
  thrusterScale: 0.35,
  coreIntensity: 0.65,
};

export class MechaAnimator {
  private state: AnimState = 'IDLE';
  private stateTime = 0;
  private cyclePhase = 0;
  private lastStepHalf = -1;
  private hitFlashTimer = 0;
  private baseArmorEmissives: THREE.Color[] = [];

  constructor(
    private joints: MechaJoints,
    private onFootstep?: (heavy: boolean) => void
  ) {
    this.baseArmorEmissives = joints.armorMaterials.map((m) => m.emissive.clone());
  }

  public getState(): AnimState {
    return this.state;
  }

  public getStateTime(): number {
    return this.stateTime;
  }

  public setState(next: AnimState, forceRestart = false): void {
    if (this.state === 'DEFEAT' && next !== 'IDLE') return;
    if (this.state !== next || forceRestart) {
      this.state = next;
      this.stateTime = 0;
      if (next === 'WALK' || next === 'RUN') {
        this.lastStepHalf = -1;
      }
    }
  }

  public triggerHitFlash(): void {
    this.hitFlashTimer = 0.13;
  }

  public setRightHandDetached(detached: boolean): void {
    this.joints.rightHand.visible = !detached;
    this.joints.rightWristSocket.visible = detached;
  }

  public reset(): void {
    this.state = 'IDLE';
    this.stateTime = 0;
    this.cyclePhase = 0;
    this.hitFlashTimer = 0;
    this.setRightHandDetached(false);
    this.applyPoseImmediate(DEFAULT_POSE);
  }

  public update(dt: number): void {
    this.stateTime += dt;
    if (this.joints.mixer) {
      this.joints.mixer.update(dt);
    }

    // Update hit flash on armor materials
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
      const flashStrength = this.hitFlashTimer / 0.13;
      this.joints.armorMaterials.forEach((mat) => {
        mat.emissive.setRGB(0.85 * flashStrength, 0.75 * flashStrength, 0.65 * flashStrength);
        mat.emissiveIntensity = flashStrength * 1.4;
      });
    } else {
      this.joints.armorMaterials.forEach((mat, i) => {
        mat.emissive.copy(this.baseArmorEmissives[i]);
        mat.emissiveIntensity = i === 3 ? 0.08 : 0;
      });
    }

    const t = this.stateTime;
    const p: PoseTargets = { ...DEFAULT_POSE };
    let dampSpeed = 14;

    switch (this.state) {
      case 'IDLE': {
        const breath = Math.sin(t * 2.6);
        const sway = Math.cos(t * 1.3);
        p.hipsY = 1.15 + breath * 0.025;
        p.torsoRotX = 0.05 + breath * 0.025;
        p.torsoRotY = sway * 0.05;
        p.headRotY = -sway * 0.04;
        p.lShoulderX = -0.44 + breath * 0.04;
        p.lElbowX = -0.95;
        p.rShoulderX = -0.52 - breath * 0.04;
        p.rElbowX = -1.05;
        p.thrusterScale = 0.3 + (breath + 1) * 0.08;
        dampSpeed = 9;
        break;
      }

      case 'WALK':
      case 'RUN': {
        const isRun = this.state === 'RUN';
        const freq = isRun ? 11.5 : 7.6;
        this.cyclePhase += dt * freq;
        const s = Math.sin(this.cyclePhase);
        const c = Math.cos(this.cyclePhase);
        const stride = isRun ? 0.72 : 0.48;

        // Footstep sound trigger twice per cycle
        const stepHalf = Math.floor((this.cyclePhase / Math.PI) % 2);
        if (stepHalf !== this.lastStepHalf) {
          this.lastStepHalf = stepHalf;
          this.onFootstep?.(isRun);
        }

        p.hipsY = 1.13 + Math.abs(c) * (isRun ? 0.075 : 0.045);
        p.torsoRotX = isRun ? 0.28 : 0.14;
        p.torsoRotY = -s * (isRun ? 0.22 : 0.14);
        p.headRotX = isRun ? -0.16 : -0.06;
        p.headRotY = s * 0.1;

        p.lHipX = s * stride;
        p.lKneeX = Math.max(0.12, -s * stride * 1.15 + 0.28);
        p.lAnkleX = -p.lKneeX * 0.45;

        p.rHipX = -s * stride;
        p.rKneeX = Math.max(0.12, s * stride * 1.15 + 0.28);
        p.rAnkleX = -p.rKneeX * 0.45;

        p.lShoulderX = -s * stride * 0.85 - 0.25;
        p.lElbowX = isRun ? -1.15 : -0.82;
        p.rShoulderX = s * stride * 0.85 - 0.25;
        p.rElbowX = isRun ? -1.15 : -0.82;
        p.thrusterScale = isRun ? 1.15 : 0.55;
        dampSpeed = 16;
        break;
      }

      case 'JUMP': {
        p.hipsY = 1.24;
        p.torsoRotX = -0.1;
        p.lHipX = -0.58;
        p.lKneeX = 0.92;
        p.rHipX = -0.35;
        p.rKneeX = 0.65;
        p.lShoulderX = -0.85;
        p.lShoulderZ = -0.45;
        p.rShoulderX = -0.85;
        p.rShoulderZ = 0.45;
        p.thrusterScale = 1.65;
        dampSpeed = 16;
        break;
      }

      case 'LAND': {
        p.hipsY = 0.92;
        p.torsoRotX = 0.32;
        p.lHipX = -0.52;
        p.lKneeX = 0.92;
        p.rHipX = -0.52;
        p.rKneeX = 0.92;
        p.lShoulderX = -0.2;
        p.lShoulderZ = -0.5;
        p.rShoulderX = -0.2;
        p.rShoulderZ = 0.5;
        dampSpeed = 20;
        break;
      }

      case 'DASH_FWD': {
        p.hipsY = 1.05;
        p.torsoRotX = 0.48;
        p.headRotX = -0.32;
        p.lShoulderX = 0.42;
        p.lElbowX = -0.45;
        p.rShoulderX = 0.42;
        p.rElbowX = -0.45;
        p.lHipX = -0.48;
        p.lKneeX = 0.75;
        p.rHipX = 0.35;
        p.rKneeX = 0.55;
        p.thrusterScale = 2.1;
        p.coreIntensity = 1.4;
        dampSpeed = 22;
        break;
      }

      case 'DODGE_BACK': {
        p.hipsY = 1.06;
        p.torsoRotX = -0.26;
        p.lShoulderX = -0.75;
        p.rShoulderX = -0.75;
        p.lHipX = 0.25;
        p.rHipX = -0.4;
        p.thrusterScale = 1.85;
        dampSpeed = 22;
        break;
      }

      case 'DODGE_SIDE': {
        p.hipsY = 1.05;
        p.hipsRotZ = 0.24;
        p.torsoRotZ = 0.18;
        p.lShoulderZ = -0.62;
        p.rShoulderZ = 0.62;
        p.thrusterScale = 1.85;
        dampSpeed = 22;
        break;
      }

      case 'PUNCH_1': {
        // Quick left jab: coil then snap left mega-gauntlet forward!
        const snap = Math.min(1, t / 0.11);
        p.hipsY = 1.1;
        p.torsoRotY = -0.52 * snap;
        p.torsoRotX = 0.18 * snap;
        p.headRotY = 0.38 * snap;
        p.lShoulderX = -1.52 * snap;
        p.lShoulderY = -0.18 * snap;
        p.lShoulderZ = -0.08;
        p.lElbowX = -0.12 * snap;
        p.lWristY = -0.6;
        p.rShoulderX = -0.35;
        p.rElbowX = -1.25;
        p.lHipX = -0.32;
        p.lKneeX = 0.48;
        p.rHipX = 0.18;
        p.thrusterScale = 1.1;
        dampSpeed = 28;
        break;
      }

      case 'PUNCH_2': {
        // Heavy right cross punch!
        const snap = Math.min(1, t / 0.13);
        p.hipsY = 1.06;
        p.torsoRotY = 0.68 * snap;
        p.torsoRotX = 0.24 * snap;
        p.headRotY = -0.46 * snap;
        p.rShoulderX = -1.58 * snap;
        p.rShoulderY = 0.22 * snap;
        p.rShoulderZ = 0.06;
        p.rElbowX = -0.08;
        p.rWristY = 0.7;
        p.lShoulderX = 0.25;
        p.lElbowX = -1.2;
        p.rHipX = -0.38;
        p.rKneeX = 0.56;
        p.lHipX = 0.24;
        p.thrusterScale = 1.35;
        p.coreIntensity = 1.25;
        dampSpeed = 26;
        break;
      }

      case 'HEAVY_KICK': {
        // Combo 3 Mechanical Power Kick!
        const snap = Math.min(1, t / 0.16);
        p.hipsY = 1.14;
        p.hipsRotY = 0.52 * snap;
        p.torsoRotX = -0.28 * snap;
        p.torsoRotZ = -0.22 * snap;
        p.rHipX = -1.48 * snap;
        p.rHipZ = 0.22 * snap;
        p.rKneeX = 0.08;
        p.rAnkleX = 0.35;
        p.lHipX = 0.12;
        p.lKneeX = 0.32;
        p.lShoulderX = -0.85;
        p.lShoulderZ = -0.58;
        p.rShoulderX = 0.35;
        p.rShoulderZ = 0.52;
        p.thrusterScale = 1.65;
        p.coreIntensity = 1.5;
        dampSpeed = 24;
        break;
      }

      case 'SKILL_1': {
        // Electric Lightning Summon: Left gauntlet raised to sky, right gauntlet thrust forward!
        p.hipsY = 1.12;
        p.torsoRotX = -0.12;
        p.torsoRotY = 0.28;
        p.lShoulderX = -2.65;
        p.lShoulderZ = -0.35;
        p.lElbowX = -0.2;
        p.rShoulderX = -1.45;
        p.rElbowX = -0.15;
        p.coreIntensity = 2.4;
        p.thrusterScale = 1.3;
        dampSpeed = 20;
        break;
      }

      case 'SKILL_2': {
        // Energy Explosion: Coil inward (<0.22s) then burst chest & arms wide!
        if (t < 0.22) {
          p.hipsY = 0.96;
          p.torsoRotX = 0.38;
          p.lShoulderX = -0.95;
          p.lShoulderY = 0.65;
          p.lElbowX = -1.35;
          p.rShoulderX = -0.95;
          p.rShoulderY = -0.65;
          p.rElbowX = -1.35;
          p.coreIntensity = 2.8;
        } else {
          p.hipsY = 1.22;
          p.torsoRotX = -0.28;
          p.headRotX = -0.25;
          p.lShoulderX = -1.2;
          p.lShoulderZ = -1.15;
          p.lElbowX = -0.25;
          p.rShoulderX = -1.2;
          p.rShoulderZ = 1.15;
          p.rElbowX = -0.25;
          p.coreIntensity = 3.5;
          p.thrusterScale = 1.9;
        }
        dampSpeed = 22;
        break;
      }

      case 'SKILL_3': {
        // Rocket Punch: Firm wide stance, right forearm aimed straight ahead!
        p.hipsY = 1.08;
        p.torsoRotY = 0.45;
        p.torsoRotX = 0.14;
        p.headRotY = -0.38;
        p.rShoulderX = -1.55;
        p.rShoulderY = 0.12;
        p.rShoulderZ = 0.05;
        p.rElbowX = -0.04;
        p.lShoulderX = -0.25;
        p.lShoulderZ = -0.5;
        p.lElbowX = -1.1;
        p.coreIntensity = 2.0;
        p.thrusterScale = 1.4;
        dampSpeed = 24;
        break;
      }

      case 'ULTIMATE': {
        // Divine Thunderstorm cinematic levitation & slam!
        if (t < 1.55) {
          const rise = Math.min(1, t / 0.85);
          p.hipsY = 1.16 + rise * 1.45 + Math.sin(t * 8) * 0.05;
          p.torsoRotX = -0.32 * rise;
          p.headRotX = -0.35 * rise;
          p.lShoulderX = -2.15 * rise;
          p.lShoulderZ = -0.85 * rise;
          p.lElbowX = -0.3;
          p.rShoulderX = -2.15 * rise;
          p.rShoulderZ = 0.85 * rise;
          p.rElbowX = -0.3;
          p.lHipX = -0.28;
          p.lKneeX = 0.62;
          p.rHipX = -0.15;
          p.rKneeX = 0.42;
          p.thrusterScale = 2.6;
          p.coreIntensity = 4.5;
          dampSpeed = 12;
        } else {
          // Heroic superhero landing slam on final divine thunderbolt!
          p.hipsY = 0.86;
          p.torsoRotX = 0.46;
          p.headRotX = -0.22;
          p.rShoulderX = -1.15;
          p.rElbowX = -0.25;
          p.lShoulderX = 0.25;
          p.lShoulderZ = -0.65;
          p.lHipX = -0.72;
          p.lKneeX = 1.15;
          p.rHipX = -0.58;
          p.rKneeX = 1.05;
          p.coreIntensity = 5.0;
          p.thrusterScale = 2.2;
          dampSpeed = 24;
        }
        break;
      }

      case 'HIT': {
        p.hipsY = 1.12;
        p.torsoRotX = -0.34;
        p.torsoRotZ = 0.16;
        p.headRotX = -0.28;
        p.lShoulderX = -0.15;
        p.lShoulderZ = -0.55;
        p.rShoulderX = -0.15;
        p.rShoulderZ = 0.55;
        dampSpeed = 26;
        break;
      }

      case 'STAGGER': {
        const wobble = Math.sin(t * 18) * 0.14;
        p.hipsY = 1.05;
        p.torsoRotX = 0.26;
        p.torsoRotZ = wobble;
        p.headRotZ = -wobble * 1.3;
        p.headRotX = 0.24;
        p.lShoulderZ = -0.52;
        p.rShoulderZ = 0.52;
        p.coreIntensity = 0.2;
        dampSpeed = 18;
        break;
      }

      case 'KNOCKBACK': {
        p.hipsY = 1.02;
        p.torsoRotX = -0.48;
        p.headRotX = -0.3;
        p.lShoulderX = -0.95;
        p.rShoulderX = -0.95;
        p.lHipX = -0.4;
        p.rHipX = -0.25;
        dampSpeed = 22;
        break;
      }

      case 'VICTORY': {
        const pulse = Math.sin(t * 3.5);
        p.hipsY = 1.18 + pulse * 0.03;
        p.torsoRotX = -0.16;
        p.headRotX = -0.12;
        p.lShoulderX = -2.55 + pulse * 0.08;
        p.lShoulderZ = -0.42;
        p.lElbowX = -0.35;
        p.rShoulderX = -2.55 - pulse * 0.08;
        p.rShoulderZ = 0.42;
        p.rElbowX = -0.35;
        p.coreIntensity = 3.2;
        p.thrusterScale = 1.35;
        dampSpeed = 8;
        break;
      }

      case 'DEFEAT': {
        // Staggers (<0.55s) then collapses dramatically onto arena floor!
        if (t < 0.55) {
          p.hipsY = 0.95;
          p.torsoRotX = 0.42;
          p.torsoRotZ = Math.sin(t * 14) * 0.25;
          p.headRotX = 0.35;
          p.lKneeX = 0.85;
          p.rKneeX = 0.85;
          p.coreIntensity = 0.15;
          p.thrusterScale = 0.05;
          dampSpeed = 10;
        } else {
          p.hipsY = 0.42;
          p.hipsRotX = -1.38;
          p.torsoRotX = -0.12;
          p.headRotX = 0.25;
          p.headRotY = 0.35;
          p.lShoulderX = -0.2;
          p.lShoulderZ = -0.95;
          p.lElbowX = -0.3;
          p.rShoulderX = -0.15;
          p.rShoulderZ = 0.85;
          p.rElbowX = -0.4;
          p.lHipX = -0.1;
          p.lKneeX = 0.25;
          p.rHipX = -0.25;
          p.rKneeX = 0.45;
          p.coreIntensity = 0.02;
          p.thrusterScale = 0.01;
          dampSpeed = 6;
        }
        break;
      }
    }

    this.applyPoseDamped(p, dampSpeed, dt);
  }

  private applyPoseDamped(p: PoseTargets, lambda: number, dt: number): void {
    const d = THREE.MathUtils.damp;
    const j = this.joints;

    j.hipsPivot.position.y = d(j.hipsPivot.position.y, p.hipsY, lambda, dt);
    j.hipsPivot.rotation.x = d(j.hipsPivot.rotation.x, p.hipsRotX, lambda, dt);
    j.hipsPivot.rotation.y = d(j.hipsPivot.rotation.y, p.hipsRotY, lambda, dt);
    j.hipsPivot.rotation.z = d(j.hipsPivot.rotation.z, p.hipsRotZ, lambda, dt);

    j.torsoPivot.rotation.x = d(j.torsoPivot.rotation.x, p.torsoRotX, lambda, dt);
    j.torsoPivot.rotation.y = d(j.torsoPivot.rotation.y, p.torsoRotY, lambda, dt);
    j.torsoPivot.rotation.z = d(j.torsoPivot.rotation.z, p.torsoRotZ, lambda, dt);

    j.headPivot.rotation.x = d(j.headPivot.rotation.x, p.headRotX, lambda, dt);
    j.headPivot.rotation.y = d(j.headPivot.rotation.y, p.headRotY, lambda, dt);
    j.headPivot.rotation.z = d(j.headPivot.rotation.z, p.headRotZ, lambda, dt);

    j.leftShoulderPivot.rotation.x = d(j.leftShoulderPivot.rotation.x, p.lShoulderX, lambda, dt);
    j.leftShoulderPivot.rotation.y = d(j.leftShoulderPivot.rotation.y, p.lShoulderY, lambda, dt);
    j.leftShoulderPivot.rotation.z = d(j.leftShoulderPivot.rotation.z, p.lShoulderZ, lambda, dt);
    j.leftElbowPivot.rotation.x = d(j.leftElbowPivot.rotation.x, p.lElbowX, lambda, dt);
    j.leftWristPivot.rotation.y = d(j.leftWristPivot.rotation.y, p.lWristY, lambda, dt);

    j.rightShoulderPivot.rotation.x = d(j.rightShoulderPivot.rotation.x, p.rShoulderX, lambda, dt);
    j.rightShoulderPivot.rotation.y = d(j.rightShoulderPivot.rotation.y, p.rShoulderY, lambda, dt);
    j.rightShoulderPivot.rotation.z = d(j.rightShoulderPivot.rotation.z, p.rShoulderZ, lambda, dt);
    j.rightElbowPivot.rotation.x = d(j.rightElbowPivot.rotation.x, p.rElbowX, lambda, dt);
    j.rightWristPivot.rotation.y = d(j.rightWristPivot.rotation.y, p.rWristY, lambda, dt);

    j.leftHipPivot.rotation.x = d(j.leftHipPivot.rotation.x, p.lHipX, lambda, dt);
    j.leftHipPivot.rotation.z = d(j.leftHipPivot.rotation.z, p.lHipZ, lambda, dt);
    j.leftKneePivot.rotation.x = d(j.leftKneePivot.rotation.x, p.lKneeX, lambda, dt);
    j.leftAnklePivot.rotation.x = d(j.leftAnklePivot.rotation.x, p.lAnkleX, lambda, dt);

    j.rightHipPivot.rotation.x = d(j.rightHipPivot.rotation.x, p.rHipX, lambda, dt);
    j.rightHipPivot.rotation.z = d(j.rightHipPivot.rotation.z, p.rHipZ, lambda, dt);
    j.rightKneePivot.rotation.x = d(j.rightKneePivot.rotation.x, p.rKneeX, lambda, dt);
    j.rightAnklePivot.rotation.x = d(j.rightAnklePivot.rotation.x, p.rAnkleX, lambda, dt);

    // Thruster flame scaling & core emissive intensity
    j.thrusterMeshes.forEach((tm) => {
      const targetScale = Math.max(0.02, p.thrusterScale);
      tm.scale.y = d(tm.scale.y, targetScale, 16, dt);
      tm.visible = tm.scale.y > 0.05;
    });

    if (j.emissiveMaterials[1]) {
      j.emissiveMaterials[1].emissiveIntensity = d(
        j.emissiveMaterials[1].emissiveIntensity,
        p.coreIntensity,
        12,
        dt
      );
    }
  }

  private applyPoseImmediate(p: PoseTargets): void {
    const j = this.joints;
    j.hipsPivot.position.y = p.hipsY;
    j.hipsPivot.rotation.set(p.hipsRotX, p.hipsRotY, p.hipsRotZ);
    j.torsoPivot.rotation.set(p.torsoRotX, p.torsoRotY, p.torsoRotZ);
    j.headPivot.rotation.set(p.headRotX, p.headRotY, p.headRotZ);
    j.leftShoulderPivot.rotation.set(p.lShoulderX, p.lShoulderY, p.lShoulderZ);
    j.leftElbowPivot.rotation.x = p.lElbowX;
    j.leftWristPivot.rotation.y = p.lWristY;
    j.rightShoulderPivot.rotation.set(p.rShoulderX, p.rShoulderY, p.rShoulderZ);
    j.rightElbowPivot.rotation.x = p.rElbowX;
    j.rightWristPivot.rotation.y = p.rWristY;
    j.leftHipPivot.rotation.set(p.lHipX, 0, p.lHipZ);
    j.leftKneePivot.rotation.x = p.lKneeX;
    j.leftAnklePivot.rotation.x = p.lAnkleX;
    j.rightHipPivot.rotation.set(p.rHipX, 0, p.rHipZ);
    j.rightKneePivot.rotation.x = p.rKneeX;
    j.rightAnklePivot.rotation.x = p.rAnkleX;
  }
}

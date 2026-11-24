import * as THREE from 'three';
import { ARENA_RADIUS } from '../core/constants';
import { AnimState, CharacterId, CharacterStats, MechaJoints } from '../core/types';
import { MechaAnimator } from '../animation/MechaAnimator';

export class MechaFighter {
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public knockbackVel = new THREE.Vector3();
  public dashVel = new THREE.Vector3();
  public facingAngle = 0; // radians around Y (0 = +Z)
  public verticalY = 0;
  public verticalVel = 0;
  public isGrounded = true;

  public stats: CharacterStats;
  public trailHp: number;
  public bodyRadius = 0.95;

  public stunTimer = 0;
  public hitReactTimer = 0;
  public knockbackTimer = 0;
  public dashTimer = 0;
  public invulnTimer = 0;
  public actionLockTimer = 0;
  public landTimer = 0;

  public animator: MechaAnimator;

  constructor(
    public readonly id: CharacterId,
    public readonly name: string,
    public readonly title: string,
    public readonly joints: MechaJoints,
    baseStats: CharacterStats,
    onFootstep?: (heavy: boolean) => void
  ) {
    this.stats = { ...baseStats };
    this.trailHp = baseStats.maxHp;
    this.animator = new MechaAnimator(joints, onFootstep);
  }

  public get isDefeated(): boolean {
    return this.stats.hp <= 0;
  }

  public get isIncapacitated(): boolean {
    return (
      this.isDefeated ||
      this.stunTimer > 0 ||
      this.knockbackTimer > 0 ||
      this.hitReactTimer > 0
    );
  }

  public get canAct(): boolean {
    return !this.isIncapacitated && this.actionLockTimer <= 0 && this.dashTimer <= 0;
  }

  public reset(spawnPos: THREE.Vector3, facing: number, newStats?: CharacterStats): void {
    if (newStats) {
      this.stats = { ...newStats, hp: newStats.maxHp, energy: newStats.maxEnergy };
    } else {
      this.stats.hp = this.stats.maxHp;
      this.stats.energy = this.stats.maxEnergy;
    }
    this.trailHp = this.stats.maxHp;

    this.position.copy(spawnPos);
    this.velocity.set(0, 0, 0);
    this.knockbackVel.set(0, 0, 0);
    this.dashVel.set(0, 0, 0);
    this.facingAngle = facing;
    this.verticalY = 0;
    this.verticalVel = 0;
    this.isGrounded = true;

    this.stunTimer = 0;
    this.hitReactTimer = 0;
    this.knockbackTimer = 0;
    this.dashTimer = 0;
    this.invulnTimer = 0;
    this.actionLockTimer = 0;
    this.landTimer = 0;

    this.animator.reset();
    this.syncTransform();
  }

  public faceTowards(targetPos: THREE.Vector3, instant = false, dt = 0.016, turnSpeed = 14): void {
    const dx = targetPos.x - this.position.x;
    const dz = targetPos.z - this.position.z;
    if (dx * dx + dz * dz < 0.0001) return;
    const desired = Math.atan2(dx, dz);
    if (instant) {
      this.facingAngle = desired;
    } else {
      this.facingAngle = this.lerpAngle(this.facingAngle, desired, 1 - Math.exp(-turnSpeed * dt));
    }
  }

  public jump(): boolean {
    if (!this.isGrounded || !this.canAct) return false;
    this.isGrounded = false;
    this.verticalVel = 9.8;
    this.animator.setState('JUMP', true);
    return true;
  }

  public startDash(dirX: number, dirZ: number, speed = 20.5, duration = 0.24, anim: AnimState = 'DASH_FWD'): void {
    const len = Math.hypot(dirX, dirZ);
    const nx = len > 0.01 ? dirX / len : Math.sin(this.facingAngle);
    const nz = len > 0.01 ? dirZ / len : Math.cos(this.facingAngle);

    this.dashVel.set(nx * speed, 0, nz * speed);
    this.dashTimer = duration;
    this.invulnTimer = Math.max(this.invulnTimer, duration * 0.85);
    this.actionLockTimer = duration;
    this.animator.setState(anim, true);
  }

  public applyKnockback(dirX: number, dirZ: number, force: number, duration = 0.34): void {
    if (this.isDefeated) return;
    const len = Math.hypot(dirX, dirZ) || 1;
    this.knockbackVel.set((dirX / len) * force, 0, (dirZ / len) * force);
    this.knockbackTimer = duration;
    this.actionLockTimer = Math.max(this.actionLockTimer, duration);
    this.animator.setState('KNOCKBACK', true);
  }

  public applyStun(duration: number): void {
    if (this.isDefeated) return;
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.actionLockTimer = Math.max(this.actionLockTimer, duration);
    this.animator.setState('STAGGER', true);
  }

  public applyHitReaction(duration = 0.2): void {
    if (this.isDefeated || this.stunTimer > 0 || this.knockbackTimer > 0) return;
    // Don't interrupt Ultimate animation!
    if (this.animator.getState() === 'ULTIMATE') return;
    this.hitReactTimer = duration;
    this.animator.setState('HIT', true);
  }

  public takeDamage(rawAmount: number): number {
    if (this.isDefeated) return 0;
    const clamped = Math.max(1, Math.round(rawAmount));
    this.stats.hp = Math.max(0, this.stats.hp - clamped);
    this.animator.triggerHitFlash();

    if (this.stats.hp <= 0) {
      this.stats.hp = 0;
      this.stunTimer = 0;
      this.knockbackTimer = 0;
      this.hitReactTimer = 0;
      this.dashTimer = 0;
      this.actionLockTimer = 999;
      this.animator.setRightHandDetached(false);
      this.animator.setState('DEFEAT', true);
    }
    return clamped;
  }

  public consumeEnergy(cost: number): boolean {
    if (this.stats.energy < cost) return false;
    this.stats.energy = Math.max(0, this.stats.energy - cost);
    return true;
  }

  public addEnergy(amount: number): void {
    this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + amount);
  }

  public updatePhysicsAndTimers(dt: number, allowEnergyRegen = true): void {
    // Smooth delayed damage bar trail
    if (this.trailHp > this.stats.hp) {
      this.trailHp = Math.max(
        this.stats.hp,
        THREE.MathUtils.damp(this.trailHp, this.stats.hp, 4.2, dt)
      );
    } else {
      this.trailHp = this.stats.hp;
    }

    if (!this.isDefeated && allowEnergyRegen) {
      this.addEnergy(this.stats.energyRegen * dt);
    }

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.actionLockTimer > 0 && !this.isDefeated) {
      this.actionLockTimer = Math.max(0, this.actionLockTimer - dt);
    }
    if (this.landTimer > 0) this.landTimer = Math.max(0, this.landTimer - dt);

    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      if (this.stunTimer === 0 && !this.isDefeated) {
        this.animator.setState('IDLE');
      }
    }

    if (this.hitReactTimer > 0) {
      this.hitReactTimer = Math.max(0, this.hitReactTimer - dt);
      if (this.hitReactTimer === 0 && !this.isDefeated && this.stunTimer === 0) {
        this.animator.setState('IDLE');
      }
    }

    // Apply Dash Displacement
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      this.position.x += this.dashVel.x * dt;
      this.position.z += this.dashVel.z * dt;
      this.dashVel.multiplyScalar(Math.pow(0.25, dt * 3));
      if (this.dashTimer === 0 && !this.isDefeated && this.actionLockTimer <= 0.02) {
        this.animator.setState('IDLE');
      }
    }

    // Apply Knockback Displacement
    if (this.knockbackTimer > 0) {
      this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
      this.position.x += this.knockbackVel.x * dt;
      this.position.z += this.knockbackVel.z * dt;
      this.knockbackVel.multiplyScalar(Math.pow(0.08, dt * 2.5));
      if (this.knockbackTimer === 0 && !this.isDefeated) {
        if (this.stunTimer > 0) {
          this.animator.setState('STAGGER');
        } else {
          this.animator.setState('IDLE');
        }
      }
    }

    // Apply Voluntary Movement Velocity
    if (this.dashTimer <= 0 && this.knockbackTimer <= 0 && !this.isDefeated) {
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
    }

    // Jump & Gravity
    if (!this.isGrounded) {
      this.verticalVel -= 26.0 * dt;
      this.verticalY += this.verticalVel * dt;
      if (this.verticalY <= 0) {
        this.verticalY = 0;
        this.verticalVel = 0;
        this.isGrounded = true;
        if (!this.isDefeated && this.actionLockTimer <= 0) {
          this.landTimer = 0.14;
          this.animator.setState('LAND', true);
        }
      }
    }

    // Clamp strictly inside circular battle arena!
    const distFromCenter = Math.hypot(this.position.x, this.position.z);
    const maxAllowed = ARENA_RADIUS - this.bodyRadius;
    if (distFromCenter > maxAllowed) {
      const clampRatio = maxAllowed / distFromCenter;
      this.position.x *= clampRatio;
      this.position.z *= clampRatio;
    }

    this.animator.update(dt);
    this.syncTransform();
  }

  public syncTransform(): void {
    this.joints.root.position.set(this.position.x, this.verticalY, this.position.z);
    this.joints.root.rotation.y = this.facingAngle;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }
}

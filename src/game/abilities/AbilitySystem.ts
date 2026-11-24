import * as THREE from 'three';
import { PLAYER_SKILLS } from '../core/constants';
import { SkillRuntime, SkillSlotId } from '../core/types';
import { MechaFighter } from '../combat/MechaFighter';
import { VFXManager } from '../effects/VFXManager';
import { SoundManager } from '../audio/SoundManager';
import { BattleCamera } from '../camera/BattleCamera';
import { ArenaBuilder } from '../arena/ArenaBuilder';
import { MechaBuilder } from '../characters/MechaBuilder';

interface ScheduledCombatEvent {
  triggerIn: number;
  execute: () => void;
}

interface ActiveRocketProjectile {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  origin: THREE.Vector3;
  returning: boolean;
  hasHit: boolean;
  trailTimer: number;
}

export interface CombatFeedbackCallbacks {
  onDamageDealt: (
    target: MechaFighter,
    amount: number,
    worldPos: THREE.Vector3,
    opts: { isCrit?: boolean; label?: string; color: string }
  ) => void;
  onComboUpdated: (comboCount: number, timerRatio: number) => void;
  onSkillBanner: (banner: string | null) => void;
  onEnemyWarning: (warning: string | null) => void;
  onRequestSlowMo: (scale: number, duration: number) => void;
  onSkillUsed: () => void;
}

export class AbilitySystem {
  public playerSkills: Record<SkillSlotId, SkillRuntime>;

  private comboStep = 0; // 0, 1, 2
  private comboResetTimer = 0;
  private readonly comboWindow = 1.25;

  private activeRocket: ActiveRocketProjectile | null = null;
  private scheduledEvents: ScheduledCombatEvent[] = [];
  private hitRegistry = new Set<string>();
  private nextEventId = 1;

  private ultimateTimer = 0;
  private ultimateActive = false;

  constructor(
    private scene: THREE.Scene,
    private mechaBuilder: MechaBuilder,
    private vfx: VFXManager,
    private sound: SoundManager,
    private battleCam: BattleCamera,
    private arena: ArenaBuilder,
    private callbacks: CombatFeedbackCallbacks
  ) {
    this.playerSkills = {
      basic: { def: PLAYER_SKILLS.basic, remainingCooldown: 0, isActive: false },
      dash: { def: PLAYER_SKILLS.dash, remainingCooldown: 0, isActive: false },
      skill1: { def: PLAYER_SKILLS.skill1, remainingCooldown: 0, isActive: false },
      skill2: { def: PLAYER_SKILLS.skill2, remainingCooldown: 0, isActive: false },
      skill3: { def: PLAYER_SKILLS.skill3, remainingCooldown: 0, isActive: false },
      ultimate: { def: PLAYER_SKILLS.ultimate, remainingCooldown: 0, isActive: false },
    };
  }

  public get isUltimateActive(): boolean {
    return this.ultimateActive;
  }

  public getComboInfo(): { count: number; ratio: number } {
    return {
      count: this.comboStep,
      ratio: this.comboStep > 0 ? Math.max(0, this.comboResetTimer / this.comboWindow) : 0,
    };
  }

  public reset(player: MechaFighter): void {
    Object.values(this.playerSkills).forEach((s) => {
      s.remainingCooldown = 0;
      s.isActive = false;
    });
    this.comboStep = 0;
    this.comboResetTimer = 0;
    this.scheduledEvents = [];
    this.hitRegistry.clear();
    this.ultimateActive = false;
    this.ultimateTimer = 0;
    this.arena.setUltimateDarkness(0);
    this.callbacks.onSkillBanner(null);
    this.callbacks.onEnemyWarning(null);

    if (this.activeRocket) {
      this.scene.remove(this.activeRocket.mesh);
      this.activeRocket = null;
    }
    player.animator.setRightHandDetached(false);
  }

  private calculateDamage(
    attacker: MechaFighter,
    defender: MechaFighter,
    multiplier: number,
    allowCrit = true
  ): { amount: number; isCrit: boolean } {
    const defenseMod = 100 / (100 + defender.stats.defense);
    const variance = 0.94 + Math.random() * 0.12;
    const isCrit = allowCrit && Math.random() < 0.18;
    const critMult = isCrit ? 1.35 : 1.0;
    const raw = attacker.stats.attack * multiplier * defenseMod * variance * critMult;
    return {
      amount: Math.max(1, Math.round(raw)),
      isCrit,
    };
  }

  private schedule(delaySeconds: number, fn: () => void): void {
    this.scheduledEvents.push({
      triggerIn: delaySeconds,
      execute: fn,
    });
  }

  // ================= PLAYER BASIC 3-HIT COMBO =================
  public triggerPlayerBasicAttack(player: MechaFighter, enemy: MechaFighter): boolean {
    if (!player.canAct || this.ultimateActive) return false;
    const slot = this.playerSkills.basic;
    if (slot.remainingCooldown > 0) return false;

    const eventId = `p_basic_${this.nextEventId++}`;
    this.comboStep = this.comboResetTimer > 0 ? (this.comboStep % 3) + 1 : 1;
    this.comboResetTimer = this.comboWindow;

    // Auto-assist face enemy if reasonably close
    if (player.position.distanceTo(enemy.position) < 7.5 && !enemy.isDefeated) {
      player.faceTowards(enemy.position, true);
    }

    const step = this.comboStep;
    const anim = step === 1 ? 'PUNCH_1' : step === 2 ? 'PUNCH_2' : 'HEAVY_KICK';
    const mult = step === 1 ? 1.0 : step === 2 ? 1.24 : 1.68;
    const lockDur = step === 3 ? 0.42 : 0.28;
    const hitDelay = step === 3 ? 0.16 : 0.11;

    slot.remainingCooldown = step === 3 ? 0.36 : 0.18;
    player.actionLockTimer = lockDur;
    player.velocity.set(0, 0, 0);
    player.animator.setState(anim, true);
    this.sound.playSwing(step);

    // Subtle forward combat step lunge
    const fwdX = Math.sin(player.facingAngle);
    const fwdZ = Math.cos(player.facingAngle);
    player.position.x += fwdX * (step === 3 ? 0.58 : 0.36);
    player.position.z += fwdZ * (step === 3 ? 0.58 : 0.36);

    this.schedule(hitDelay, () => {
      if (player.isDefeated || player.isIncapacitated || enemy.isDefeated) return;
      if (this.hitRegistry.has(eventId)) return;

      const attackOrigin = player.position
        .clone()
        .add(new THREE.Vector3(fwdX * 1.65, 1.3, fwdZ * 1.65));
      const hitDist = Math.hypot(
        enemy.position.x - attackOrigin.x,
        enemy.position.z - attackOrigin.z
      );
      const hitRadius = step === 3 ? 2.55 : 2.25;

      if (hitDist <= hitRadius && enemy.invulnTimer <= 0) {
        this.hitRegistry.add(eventId);
        const { amount, isCrit } = this.calculateDamage(player, enemy, mult);
        const dealt = enemy.takeDamage(amount);
        player.addEnergy(step === 3 ? 11 : 6);

        const impactPos = enemy.position.clone().setY(1.45);
        this.vfx.spawnHitSparks(impactPos, step === 3 ? 0xf59e0b : 0x38bdf8, step === 3);
        this.sound.playMetallicHit(step === 3);
        this.battleCam.addShake(step === 3 ? 0.48 : 0.22);

        if (step === 3) {
          this.vfx.spawnShockwave(enemy.position, 2.8, 0xfbbf24, 0.32);
          enemy.applyKnockback(fwdX, fwdZ, 13.5, 0.34);
        } else {
          enemy.applyHitReaction(0.2);
          enemy.position.x += fwdX * 0.28;
          enemy.position.z += fwdZ * 0.28;
        }

        this.callbacks.onDamageDealt(enemy, dealt, impactPos, {
          isCrit,
          label: step === 3 ? 'FINISHER!' : undefined,
          color: '#fde047',
        });
        this.callbacks.onComboUpdated(step, 1);
      }
    });

    return true;
  }

  // ================= PLAYER THRUSTER DASH / EVADE =================
  public triggerPlayerDash(
    player: MechaFighter,
    moveDirX: number,
    moveDirZ: number
  ): boolean {
    if (player.isDefeated || player.stunTimer > 0 || this.ultimateActive) return false;
    const slot = this.playerSkills.dash;
    if (slot.remainingCooldown > 0 || player.stats.energy < slot.def.energyCost) return false;

    player.consumeEnergy(slot.def.energyCost);
    slot.remainingCooldown = slot.def.cooldown;

    let dx = moveDirX;
    let dz = moveDirZ;
    let dashAnim: 'DASH_FWD' | 'DODGE_BACK' | 'DODGE_SIDE' = 'DASH_FWD';

    if (Math.hypot(dx, dz) < 0.1) {
      dx = Math.sin(player.facingAngle);
      dz = Math.cos(player.facingAngle);
      dashAnim = 'DASH_FWD';
    } else {
      const fwdX = Math.sin(player.facingAngle);
      const fwdZ = Math.cos(player.facingAngle);
      const dot = dx * fwdX + dz * fwdZ;
      if (dot < -0.45) dashAnim = 'DODGE_BACK';
      else if (Math.abs(dot) <= 0.45) dashAnim = 'DODGE_SIDE';
    }

    player.startDash(dx, dz, 22.5, 0.25, dashAnim);
    this.sound.playDash();
    this.vfx.spawnDashTrail(player.position, 0x38bdf8);
    this.callbacks.onSkillUsed();
    return true;
  }

  // ================= SKILL 1 — ELECTRIC LIGHTNING =================
  public triggerSkill1(player: MechaFighter, enemy: MechaFighter): boolean {
    if (!player.canAct || this.ultimateActive) return false;
    const slot = this.playerSkills.skill1;
    if (slot.remainingCooldown > 0 || player.stats.energy < slot.def.energyCost) return false;

    player.consumeEnergy(slot.def.energyCost);
    slot.remainingCooldown = slot.def.cooldown;
    slot.isActive = true;
    this.callbacks.onSkillUsed();

    const distToEnemy = player.position.distanceTo(enemy.position);
    let strikeTarget: THREE.Vector3;

    if (!enemy.isDefeated && distToEnemy <= slot.def.range) {
      player.faceTowards(enemy.position, true);
      strikeTarget = enemy.position.clone();
    } else {
      strikeTarget = player.position
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(player.facingAngle) * 6.5,
            0,
            Math.cos(player.facingAngle) * 6.5
          )
        );
    }

    player.actionLockTimer = 0.46;
    player.velocity.set(0, 0, 0);
    player.animator.setState('SKILL_1', true);
    this.battleCam.setMode('SKILL');
    this.callbacks.onSkillBanner('ELECTRIC LIGHTNING!');

    const eventId = `p_s1_${this.nextEventId++}`;

    this.schedule(0.18, () => {
      slot.isActive = false;
      if (player.isDefeated) return;

      this.vfx.spawnLightningStrike(strikeTarget, 0xfde047, 0x38bdf8, 1.15);
      this.sound.playLightningStrike(1.1);
      this.battleCam.addShake(0.62);

      // AoE lightning hit check (3.5m radius around strike point)
      if (
        !enemy.isDefeated &&
        !this.hitRegistry.has(eventId) &&
        enemy.invulnTimer <= 0 &&
        enemy.position.distanceTo(strikeTarget) <= 3.55
      ) {
        this.hitRegistry.add(eventId);
        const { amount, isCrit } = this.calculateDamage(player, enemy, slot.def.multiplier);
        const dealt = enemy.takeDamage(amount);
        enemy.applyStun(1.25);

        this.callbacks.onDamageDealt(enemy, dealt, enemy.position.clone().setY(1.8), {
          isCrit,
          label: 'STUNNED!',
          color: '#60a5fa',
        });
      }
    });

    this.schedule(0.5, () => {
      if (!this.ultimateActive && !player.isDefeated && !enemy.isDefeated) {
        this.battleCam.setMode('COMBAT');
      }
      this.callbacks.onSkillBanner(null);
    });

    return true;
  }

  // ================= SKILL 2 — ENERGY EXPLOSION =================
  public triggerSkill2(player: MechaFighter, enemy: MechaFighter): boolean {
    if (!player.canAct || this.ultimateActive) return false;
    const slot = this.playerSkills.skill2;
    if (slot.remainingCooldown > 0 || player.stats.energy < slot.def.energyCost) return false;

    player.consumeEnergy(slot.def.energyCost);
    slot.remainingCooldown = slot.def.cooldown;
    slot.isActive = true;
    this.callbacks.onSkillUsed();

    player.actionLockTimer = 0.58;
    player.velocity.set(0, 0, 0);
    player.animator.setState('SKILL_2', true);
    this.battleCam.setMode('SKILL');
    this.callbacks.onSkillBanner('ENERGY EXPLOSION!');

    // Brief golden charge aura
    this.vfx.spawnAuraParticles(player.position, 0xfbbf24, 14);
    const eventId = `p_s2_${this.nextEventId++}`;

    this.schedule(0.24, () => {
      slot.isActive = false;
      if (player.isDefeated) return;

      const center = player.position.clone();
      const maxRadius = slot.def.range;
      this.vfx.spawnEnergyExplosion(center, maxRadius, 0xfef08a, 0xf59e0b);
      this.sound.playExplosion(1.15);
      this.battleCam.addShake(0.78);

      const dist = enemy.position.distanceTo(center);
      if (
        !enemy.isDefeated &&
        !this.hitRegistry.has(eventId) &&
        enemy.invulnTimer <= 0 &&
        dist <= maxRadius
      ) {
        this.hitRegistry.add(eventId);
        // Distance-scaled falloff (100% close, 72% at outer edge)
        const falloff = THREE.MathUtils.lerp(1.05, 0.72, Math.min(1, dist / maxRadius));
        const { amount, isCrit } = this.calculateDamage(
          player,
          enemy,
          slot.def.multiplier * falloff
        );
        const dealt = enemy.takeDamage(amount);

        const pushX = enemy.position.x - center.x;
        const pushZ = enemy.position.z - center.z;
        enemy.applyKnockback(pushX, pushZ, 19.5, 0.42);

        this.callbacks.onDamageDealt(enemy, dealt, enemy.position.clone().setY(1.6), {
          isCrit,
          label: 'BLAST!',
          color: '#fb923c',
        });
      }
    });

    this.schedule(0.6, () => {
      if (!this.ultimateActive && !player.isDefeated && !enemy.isDefeated) {
        this.battleCam.setMode('COMBAT');
      }
      this.callbacks.onSkillBanner(null);
    });

    return true;
  }

  // ================= SKILL 3 — ROCKET PUNCH (DETACHABLE 3D FIST!) =================
  public triggerSkill3(player: MechaFighter, enemy: MechaFighter): boolean {
    if (!player.canAct || this.ultimateActive || this.activeRocket) return false;
    const slot = this.playerSkills.skill3;
    if (slot.remainingCooldown > 0 || player.stats.energy < slot.def.energyCost) return false;

    player.consumeEnergy(slot.def.energyCost);
    slot.remainingCooldown = slot.def.cooldown;
    slot.isActive = true;
    this.callbacks.onSkillUsed();

    if (!enemy.isDefeated && player.position.distanceTo(enemy.position) <= slot.def.range + 3) {
      player.faceTowards(enemy.position, true);
    }

    player.actionLockTimer = 0.42;
    player.velocity.set(0, 0, 0);
    player.animator.setState('SKILL_3', true);
    this.callbacks.onSkillBanner('ROCKET PUNCH!');
    this.sound.playRocketLaunch();

    // Detach Golden Guardian's actual right fist so wrist plasma socket is visibly exposed!
    player.animator.setRightHandDetached(true);

    const fwdX = Math.sin(player.facingAngle);
    const fwdZ = Math.cos(player.facingAngle);
    const spawnPos = new THREE.Vector3(
      player.position.x + fwdX * 1.25 + Math.cos(player.facingAngle) * 0.45,
      1.42,
      player.position.z + fwdZ * 1.25 - Math.sin(player.facingAngle) * 0.45
    );

    const rocketMesh = this.mechaBuilder.buildRocketFistProjectileMesh();
    rocketMesh.position.copy(spawnPos);
    rocketMesh.rotation.y = player.facingAngle;
    this.scene.add(rocketMesh);

    this.activeRocket = {
      mesh: rocketMesh,
      pos: spawnPos.clone(),
      vel: new THREE.Vector3(fwdX * 26.5, 0, fwdZ * 26.5),
      origin: spawnPos.clone(),
      returning: false,
      hasHit: false,
      trailTimer: 0,
    };

    this.schedule(0.65, () => {
      this.callbacks.onSkillBanner(null);
    });

    return true;
  }

  // ================= ULTIMATE — DIVINE THUNDERSTORM =================
  public triggerUltimate(player: MechaFighter, enemy: MechaFighter): boolean {
    if (player.isDefeated || player.isIncapacitated || this.ultimateActive) return false;
    const slot = this.playerSkills.ultimate;
    if (slot.remainingCooldown > 0 || player.stats.energy < slot.def.energyCost) return false;

    player.consumeEnergy(slot.def.energyCost);
    slot.remainingCooldown = slot.def.cooldown;
    slot.isActive = true;
    this.ultimateActive = true;
    this.ultimateTimer = 2.25;
    this.callbacks.onSkillUsed();

    if (!enemy.isDefeated) {
      player.faceTowards(enemy.position, true);
    }

    // Grant super-armor during cinematic ultimate activation
    player.invulnTimer = 2.3;
    player.actionLockTimer = 2.25;
    player.velocity.set(0, 0, 0);
    player.animator.setState('ULTIMATE', true);

    this.battleCam.setMode('ULTIMATE');
    this.arena.setUltimateDarkness(1.0);
    this.sound.playUltimateCharge();
    this.callbacks.onSkillBanner('ULTIMATE: DIVINE THUNDERSTORM!');

    // 4 rapid divine lightning bolts crashing around & onto Crimson Destroyer
    const strikeTimes = [0.55, 0.85, 1.15, 1.42];
    strikeTimes.forEach((delay, idx) => {
      this.schedule(delay, () => {
        if (player.isDefeated) return;
        const jitterX = idx % 2 === 0 ? (Math.random() - 0.5) * 1.8 : 0;
        const jitterZ = idx % 2 === 0 ? (Math.random() - 0.5) * 1.8 : 0;
        const boltTarget = !enemy.isDefeated
          ? new THREE.Vector3(enemy.position.x + jitterX, 0, enemy.position.z + jitterZ)
          : player.position.clone().add(new THREE.Vector3(jitterX * 3, 0, jitterZ * 3));

        this.vfx.spawnLightningStrike(boltTarget, 0xfde047, 0x38bdf8, 1.35);
        this.sound.playLightningStrike(1.2);
        this.battleCam.addShake(0.55);

        if (
          !enemy.isDefeated &&
          enemy.position.distanceTo(player.position) <= slot.def.range + 4
        ) {
          const { amount, isCrit } = this.calculateDamage(
            player,
            enemy,
            slot.def.multiplier * 0.16
          );
          const dealt = enemy.takeDamage(amount);
          enemy.applyStun(0.5);
          this.callbacks.onDamageDealt(enemy, dealt, enemy.position.clone().setY(1.9), {
            isCrit,
            color: '#fde047',
          });
        }
      });
    });

    // Final Cataclysmic Supernova Judgment Slam at 1.65s!
    this.schedule(1.65, () => {
      if (player.isDefeated) return;

      const epicenter = !enemy.isDefeated
        ? enemy.position.clone()
        : player.position.clone();

      this.vfx.spawnLightningStrike(epicenter, 0xffffff, 0xfde047, 1.85);
      this.vfx.spawnEnergyExplosion(epicenter, 9.5, 0xffffff, 0xfbbf24);
      this.sound.playExplosion(1.65);
      this.sound.playLightningStrike(1.5);
      this.battleCam.addShake(1.25);

      // Brief cinematic slow-motion on finishing impact!
      this.callbacks.onRequestSlowMo(0.28, 0.28);

      if (
        !enemy.isDefeated &&
        enemy.position.distanceTo(player.position) <= slot.def.range + 5
      ) {
        const { amount } = this.calculateDamage(
          player,
          enemy,
          slot.def.multiplier * 0.48,
          false
        );
        const dealt = enemy.takeDamage(amount);
        const pushX = enemy.position.x - player.position.x;
        const pushZ = enemy.position.z - player.position.z;
        enemy.applyKnockback(pushX, pushZ, 22, 0.55);

        this.callbacks.onDamageDealt(enemy, dealt, enemy.position.clone().setY(2.1), {
          isCrit: true,
          label: 'DIVINE JUDGMENT!',
          color: '#fef08a',
        });
      }
    });

    // Restore arena lighting & normal combat camera
    this.schedule(2.2, () => {
      slot.isActive = false;
      this.ultimateActive = false;
      this.arena.setUltimateDarkness(0);
      this.callbacks.onSkillBanner(null);
      if (!player.isDefeated && !enemy.isDefeated) {
        player.animator.setState('IDLE');
        this.battleCam.setMode('COMBAT');
      }
    });

    return true;
  }

  // ================= ENEMY BOSS COMBAT & SPECIALS =================
  public triggerEnemyBasicAttack(
    enemy: MechaFighter,
    player: MechaFighter,
    comboIdx: number
  ): void {
    if (!enemy.canAct || player.isDefeated) return;
    enemy.faceTowards(player.position, true);

    const anim = comboIdx === 0 ? 'PUNCH_1' : comboIdx === 1 ? 'PUNCH_2' : 'HEAVY_KICK';
    const isHeavy = comboIdx === 2;
    enemy.actionLockTimer = isHeavy ? 0.52 : 0.36;
    enemy.velocity.set(0, 0, 0);
    enemy.animator.setState(anim, true);
    this.sound.playSwing(comboIdx + 1);

    const fwdX = Math.sin(enemy.facingAngle);
    const fwdZ = Math.cos(enemy.facingAngle);
    enemy.position.x += fwdX * 0.35;
    enemy.position.z += fwdZ * 0.35;

    const eventId = `e_basic_${this.nextEventId++}`;

    this.schedule(isHeavy ? 0.2 : 0.14, () => {
      if (enemy.isDefeated || enemy.isIncapacitated || player.isDefeated) return;
      if (this.hitRegistry.has(eventId) || player.invulnTimer > 0) return;

      const strikePt = enemy.position
        .clone()
        .add(new THREE.Vector3(fwdX * 1.6, 1.3, fwdZ * 1.6));
      const dist = Math.hypot(
        player.position.x - strikePt.x,
        player.position.z - strikePt.z
      );

      if (dist <= (isHeavy ? 2.5 : 2.2)) {
        this.hitRegistry.add(eventId);
        const mult = isHeavy ? 1.45 : 0.95;
        const { amount, isCrit } = this.calculateDamage(enemy, player, mult);
        const dealt = player.takeDamage(amount);

        const impactPos = player.position.clone().setY(1.4);
        this.vfx.spawnHitSparks(impactPos, 0xff2233, isHeavy);
        this.sound.playMetallicHit(isHeavy);
        this.battleCam.addShake(isHeavy ? 0.45 : 0.2);

        if (isHeavy) {
          player.applyKnockback(fwdX, fwdZ, 12.5, 0.3);
        } else {
          player.applyHitReaction(0.18);
        }

        this.callbacks.onDamageDealt(player, dealt, impactPos, {
          isCrit,
          color: '#fb7185',
        });
      }
    });
  }

  public triggerEnemySpecial(
    enemy: MechaFighter,
    player: MechaFighter,
    variant: 'HELLFIRE_NOVA' | 'CRIMSON_STORM' | 'BLITZ_STRIKE'
  ): void {
    if (!enemy.canAct || player.isDefeated) return;
    enemy.faceTowards(player.position, true);
    enemy.velocity.set(0, 0, 0);

    if (variant === 'HELLFIRE_NOVA') {
      // AoE magma explosion around Crimson Destroyer with 0.68s ground danger telegraph!
      const radius = 6.2;
      enemy.actionLockTimer = 0.95;
      enemy.animator.setState('SKILL_2', true);
      this.callbacks.onEnemyWarning('DANGER: HELLFIRE NOVA!');
      this.vfx.spawnDangerTelegraph(enemy.position, radius, 0.68);
      this.vfx.spawnAuraParticles(enemy.position, 0xff2222, 16);

      const eventId = `e_nova_${this.nextEventId++}`;
      this.schedule(0.68, () => {
        this.callbacks.onEnemyWarning(null);
        if (enemy.isDefeated || enemy.stunTimer > 0) return;

        this.vfx.spawnEnergyExplosion(enemy.position, radius, 0xffb703, 0xe11d48);
        this.sound.playExplosion(1.1);
        this.battleCam.addShake(0.68);

        if (
          !player.isDefeated &&
          !this.hitRegistry.has(eventId) &&
          player.invulnTimer <= 0 &&
          player.position.distanceTo(enemy.position) <= radius
        ) {
          this.hitRegistry.add(eventId);
          const { amount } = this.calculateDamage(enemy, player, 2.25, false);
          const dealt = player.takeDamage(amount);
          player.applyKnockback(
            player.position.x - enemy.position.x,
            player.position.z - enemy.position.z,
            16.5,
            0.36
          );
          this.callbacks.onDamageDealt(player, dealt, player.position.clone().setY(1.6), {
            label: 'HELLFIRE!',
            color: '#f43f5e',
          });
        }
      });
    } else if (variant === 'CRIMSON_STORM') {
      // Locks target location on player with 0.75s crimson lightning ring!
      const targetSpot = player.position.clone();
      const radius = 3.9;
      enemy.actionLockTimer = 0.9;
      enemy.animator.setState('SKILL_1', true);
      this.callbacks.onEnemyWarning('INCOMING: CRIMSON THUNDER!');
      this.vfx.spawnDangerTelegraph(targetSpot, radius, 0.75);

      const eventId = `e_storm_${this.nextEventId++}`;
      this.schedule(0.75, () => {
        this.callbacks.onEnemyWarning(null);
        if (enemy.isDefeated || enemy.stunTimer > 0) return;

        this.vfx.spawnLightningStrike(targetSpot, 0xff2a3c, 0xff7b00, 1.25);
        this.sound.playLightningStrike(1.05);
        this.battleCam.addShake(0.55);

        if (
          !player.isDefeated &&
          !this.hitRegistry.has(eventId) &&
          player.invulnTimer <= 0 &&
          player.position.distanceTo(targetSpot) <= radius
        ) {
          this.hitRegistry.add(eventId);
          const { amount } = this.calculateDamage(enemy, player, 2.05, false);
          const dealt = player.takeDamage(amount);
          player.applyStun(0.75);
          this.callbacks.onDamageDealt(player, dealt, player.position.clone().setY(1.7), {
            label: 'SHOCKED!',
            color: '#f43f5e',
          });
        }
      });
    } else {
      // BLITZ_STRIKE: Crimson jet-charge lunge toward player!
      this.callbacks.onEnemyWarning('CRIMSON BLITZ!');
      const dx = player.position.x - enemy.position.x;
      const dz = player.position.z - enemy.position.z;
      enemy.startDash(dx, dz, 21.0, 0.34, 'DASH_FWD');
      this.sound.playDash();
      this.vfx.spawnDashTrail(enemy.position, 0xff1e38);

      const eventId = `e_blitz_${this.nextEventId++}`;
      this.schedule(0.26, () => {
        this.callbacks.onEnemyWarning(null);
        if (enemy.isDefeated || enemy.stunTimer > 0 || player.isDefeated) return;
        if (this.hitRegistry.has(eventId) || player.invulnTimer > 0) return;

        if (enemy.position.distanceTo(player.position) <= 3.3) {
          this.hitRegistry.add(eventId);
          const { amount } = this.calculateDamage(enemy, player, 1.85, false);
          const dealt = player.takeDamage(amount);
          this.vfx.spawnHitSparks(player.position.clone().setY(1.4), 0xff1e38, true);
          this.sound.playMetallicHit(true);
          this.battleCam.addShake(0.5);
          player.applyKnockback(dx, dz, 14, 0.3);
          this.callbacks.onDamageDealt(player, dealt, player.position.clone().setY(1.5), {
            label: 'BLITZ!',
            color: '#fb7185',
          });
        }
      });
    }
  }

  // ================= UPDATE COOLDOWNS, ROCKET PROJECTILE & SCHEDULED EVENTS =================
  public update(dt: number, player: MechaFighter, enemy: MechaFighter): void {
    // Cooldown ticks
    for (const key of Object.keys(this.playerSkills) as SkillSlotId[]) {
      const s = this.playerSkills[key];
      if (s.remainingCooldown > 0) {
        s.remainingCooldown = Math.max(0, s.remainingCooldown - dt);
      }
    }

    // Combo window decay
    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
      if (this.comboResetTimer === 0) {
        this.comboStep = 0;
      }
      this.callbacks.onComboUpdated(
        this.comboStep,
        this.comboResetTimer / this.comboWindow
      );
    }

    // Radiant golden aura particles while Ultimate is active
    if (this.ultimateActive && this.ultimateTimer > 0) {
      this.ultimateTimer = Math.max(0, this.ultimateTimer - dt);
      this.vfx.spawnAuraParticles(player.position, 0xfde047, 3);
    }

    // Scheduled attack hit frames & sequence steps
    for (let i = this.scheduledEvents.length - 1; i >= 0; i--) {
      const ev = this.scheduledEvents[i];
      ev.triggerIn -= dt;
      if (ev.triggerIn <= 0) {
        this.scheduledEvents.splice(i, 1);
        ev.execute();
      }
    }

    // Update Active 3D Rocket Fist Projectile!
    if (this.activeRocket) {
      const r = this.activeRocket;
      r.trailTimer += dt;
      if (r.trailTimer >= 0.025) {
        r.trailTimer = 0;
        this.vfx.spawnDashTrail(
          new THREE.Vector3(r.pos.x, r.pos.y - 0.5, r.pos.z),
          r.returning ? 0x38bdf8 : 0xf59e0b
        );
      }

      if (!r.returning) {
        // Gentle homing steer toward Crimson Destroyer if alive
        if (!enemy.isDefeated) {
          const toEnemy = new THREE.Vector3(
            enemy.position.x - r.pos.x,
            1.4 - r.pos.y,
            enemy.position.z - r.pos.z
          ).normalize();
          const curSpeed = r.vel.length();
          r.vel.lerp(toEnemy.multiplyScalar(curSpeed), 1 - Math.exp(-5.5 * dt));
          r.mesh.rotation.y = Math.atan2(r.vel.x, r.vel.z);
        }

        r.pos.addScaledVector(r.vel, dt);
        r.mesh.position.copy(r.pos);
        r.mesh.rotation.z += dt * 16; // rifled rocket spin!

        // Check collision with enemy hitbox
        const distToEnemy = Math.hypot(
          enemy.position.x - r.pos.x,
          enemy.position.z - r.pos.z
        );
        if (!enemy.isDefeated && !r.hasHit && distToEnemy <= enemy.bodyRadius + 0.85) {
          r.hasHit = true;
          r.returning = true;

          if (enemy.invulnTimer <= 0) {
            const { amount, isCrit } = this.calculateDamage(
              player,
              enemy,
              this.playerSkills.skill3.def.multiplier
            );
            const dealt = enemy.takeDamage(amount);
            enemy.applyKnockback(r.vel.x, r.vel.z, 18.5, 0.4);

            this.callbacks.onDamageDealt(enemy, dealt, r.pos.clone(), {
              isCrit,
              label: 'ROCKET IMPACT!',
              color: '#fb923c',
            });
          }

          this.vfx.spawnEnergyExplosion(r.pos, 4.4, 0xfef08a, 0xf97316);
          this.sound.playExplosion(1.0);
          this.sound.playMetallicHit(true);
          this.battleCam.addShake(0.72);
        } else if (r.pos.distanceTo(r.origin) >= this.playerSkills.skill3.def.range) {
          // Reached max range: small detonation and recall fist back to wrist!
          r.returning = true;
          this.vfx.spawnHitSparks(r.pos, 0xf59e0b, false);
        }
      } else {
        // Returning phase: fly back to Golden Guardian's right wrist socket!
        const wristWorld = new THREE.Vector3(
          player.position.x + Math.sin(player.facingAngle) * 0.5,
          1.4,
          player.position.z + Math.cos(player.facingAngle) * 0.5
        );
        const toWrist = wristWorld.clone().sub(r.pos);
        const distBack = toWrist.length();
        if (distBack <= 1.35 || player.isDefeated) {
          this.scene.remove(r.mesh);
          this.activeRocket = null;
          this.playerSkills.skill3.isActive = false;
          player.animator.setRightHandDetached(false);
          this.sound.playFootstep(false); // crisp mechanical latch lock!
        } else {
          toWrist.normalize().multiplyScalar(34.0);
          r.pos.addScaledVector(toWrist, dt);
          r.mesh.position.copy(r.pos);
          r.mesh.rotation.y = Math.atan2(-toWrist.x, -toWrist.z);
        }
      }
    }
  }
}

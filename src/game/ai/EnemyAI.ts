import { ENEMY_DIFFICULTY_STATS } from '../core/constants';
import { AIState, DifficultyLevel } from '../core/types';
import { MechaFighter } from '../combat/MechaFighter';
import { AbilitySystem } from '../abilities/AbilitySystem';
import { SoundManager } from '../audio/SoundManager';
import { VFXManager } from '../effects/VFXManager';

export class EnemyAI {
  private state: AIState = 'IDLE';
  private decisionTimer = 0;
  private attackCooldown = 0.8;
  private specialCooldown = 4.2;
  private dodgeCooldown = 3.5;
  private strafeDir: -1 | 1 = 1;
  private strafeSwitchTimer = 2.0;
  private comboCounter = 0;
  private retreatTimer = 0;

  private difficulty: DifficultyLevel = 'NORMAL';

  constructor(
    private abilities: AbilitySystem,
    private sound: SoundManager,
    private vfx: VFXManager
  ) {}

  public getState(): AIState {
    return this.state;
  }

  public setDifficulty(diff: DifficultyLevel): void {
    this.difficulty = diff;
  }

  public reset(): void {
    this.state = 'IDLE';
    this.decisionTimer = 0.35;
    this.attackCooldown = 0.9;
    this.specialCooldown = 3.5;
    this.dodgeCooldown = 2.5;
    this.comboCounter = 0;
    this.retreatTimer = 0;
  }

  public notifyIncomingPlayerAttack(enemy: MechaFighter, player: MechaFighter): void {
    if (!enemy.canAct || this.dodgeCooldown > 0) return;
    const cfg = ENEMY_DIFFICULTY_STATS[this.difficulty];
    const dist = enemy.position.distanceTo(player.position);

    if (dist < 5.5 && Math.random() < cfg.dodgeChance) {
      this.executeDodge(enemy, player);
    }
  }

  private executeDodge(enemy: MechaFighter, player: MechaFighter): void {
    this.state = 'DODGE';
    this.dodgeCooldown = 4.0 * ENEMY_DIFFICULTY_STATS[this.difficulty].specialCooldownScale;
    enemy.faceTowards(player.position, true);

    // Side-step or back-dash away from player
    const toPlayerX = player.position.x - enemy.position.x;
    const toPlayerZ = player.position.z - enemy.position.z;
    const len = Math.hypot(toPlayerX, toPlayerZ) || 1;
    const nx = toPlayerX / len;
    const nz = toPlayerZ / len;

    if (Math.random() < 0.55) {
      // Lateral thruster evade
      const side = Math.random() < 0.5 ? 1 : -1;
      enemy.startDash(-nz * side, nx * side, 19.5, 0.24, 'DODGE_SIDE');
    } else {
      // Back-step evade
      enemy.startDash(-nx, -nz, 18.5, 0.24, 'DODGE_BACK');
    }

    this.sound.playDash();
    this.vfx.spawnDashTrail(enemy.position, 0xff2233);
  }

  public update(
    dt: number,
    enemy: MechaFighter,
    player: MechaFighter,
    combatActive: boolean
  ): void {
    // 1. Immediate Forced States
    if (enemy.isDefeated) {
      this.state = 'DEFEATED';
      enemy.velocity.set(0, 0, 0);
      return;
    }

    if (!combatActive || player.isDefeated) {
      this.state = 'IDLE';
      enemy.velocity.set(0, 0, 0);
      if (player.isDefeated && enemy.animator.getState() !== 'VICTORY') {
        enemy.animator.setState('VICTORY');
      }
      return;
    }

    if (enemy.knockbackTimer > 0) {
      this.state = 'KNOCKBACK';
      enemy.velocity.set(0, 0, 0);
      return;
    }

    if (enemy.stunTimer > 0) {
      this.state = 'STAGGER';
      enemy.velocity.set(0, 0, 0);
      return;
    }

    const cfg = ENEMY_DIFFICULTY_STATS[this.difficulty];

    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.specialCooldown > 0) this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    if (this.dodgeCooldown > 0) this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    if (this.retreatTimer > 0) this.retreatTimer = Math.max(0, this.retreatTimer - dt);

    this.strafeSwitchTimer -= dt;
    if (this.strafeSwitchTimer <= 0) {
      this.strafeSwitchTimer = 1.6 + Math.random() * 1.8;
      this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    }

    // Wait while locked in an active swing/dash/special animation
    if (!enemy.canAct) {
      enemy.velocity.set(0, 0, 0);
      return;
    }

    const dx = player.position.x - enemy.position.x;
    const dz = player.position.z - enemy.position.z;
    const dist = Math.hypot(dx, dz);
    const nx = dist > 0.001 ? dx / dist : 0;
    const nz = dist > 0.001 ? dz / dist : 1;

    enemy.faceTowards(player.position, false, dt, 11);

    // Periodic Tactical Decision Evaluation
    this.decisionTimer -= dt;
    if (this.decisionTimer <= 0) {
      this.decisionTimer = cfg.decisionInterval * (0.85 + Math.random() * 0.35);

      // Low HP occasional tactical retreat
      const hpRatio = enemy.stats.hp / enemy.stats.maxHp;
      if (hpRatio < 0.32 && dist < 4.5 && this.retreatTimer <= 0 && Math.random() < 0.22) {
        this.retreatTimer = 1.1;
        this.state = 'RETREAT';
      } else if (this.retreatTimer > 0) {
        this.state = 'RETREAT';
      } else if (
        this.specialCooldown <= 0 &&
        enemy.stats.energy >= 28 &&
        dist <= 15.5
      ) {
        // Choose Special Boss Skill based on combat range!
        this.state = 'SPECIAL_ATTACK';
        enemy.consumeEnergy(28);
        this.specialCooldown = 6.2 * cfg.specialCooldownScale;

        if (dist <= 5.2) {
          this.abilities.triggerEnemySpecial(enemy, player, 'HELLFIRE_NOVA');
        } else if (dist <= 10.5 && Math.random() < 0.58) {
          this.abilities.triggerEnemySpecial(enemy, player, 'BLITZ_STRIKE');
        } else {
          this.abilities.triggerEnemySpecial(enemy, player, 'CRIMSON_STORM');
        }
        return;
      } else if (dist <= enemy.stats.attackRange && this.attackCooldown <= 0) {
        this.state = 'BASIC_ATTACK';
        this.abilities.triggerEnemyBasicAttack(enemy, player, this.comboCounter);
        this.comboCounter = (this.comboCounter + 1) % 3;
        // Brief pause after 3rd hit of combo, quicker chaining between hits 1-2-3
        this.attackCooldown =
          this.comboCounter === 0 ? cfg.attackInterval * 1.35 : cfg.attackInterval * 0.55;
        return;
      } else if (dist > 11.0) {
        this.state = 'PURSUE';
      } else if (dist > enemy.stats.attackRange + 0.6) {
        this.state = 'APPROACH';
      } else {
        this.state = 'COMBAT';
      }
    }

    // Continuous Movement Execution per State
    switch (this.state) {
      case 'PURSUE': {
        const spd = enemy.stats.moveSpeed * enemy.stats.runMultiplier;
        enemy.velocity.set(nx * spd, 0, nz * spd);
        enemy.animator.setState('RUN');
        break;
      }

      case 'APPROACH': {
        const spd = enemy.stats.moveSpeed;
        // Slight diagonal weave while approaching
        const weaveX = nx * 0.92 - nz * 0.22 * this.strafeDir;
        const weaveZ = nz * 0.92 + nx * 0.22 * this.strafeDir;
        enemy.velocity.set(weaveX * spd, 0, weaveZ * spd);
        enemy.animator.setState('WALK');
        break;
      }

      case 'COMBAT': {
        // Circle-strafe menacingly at optimal striking edge while waiting for attack cooldown
        const spd = enemy.stats.moveSpeed * 0.68;
        const pushPull = dist < 2.6 ? -0.45 : dist > 3.6 ? 0.35 : 0;
        const vx = (-nz * this.strafeDir + nx * pushPull) * spd;
        const vz = (nx * this.strafeDir + nz * pushPull) * spd;
        enemy.velocity.set(vx, 0, vz);
        enemy.animator.setState('WALK');
        break;
      }

      case 'RETREAT': {
        const spd = enemy.stats.moveSpeed * 0.95;
        enemy.velocity.set(-nx * spd, 0, -nz * spd);
        enemy.animator.setState('WALK');
        break;
      }

      default: {
        enemy.velocity.set(0, 0, 0);
        enemy.animator.setState('IDLE');
        break;
      }
    }
  }
}

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import {
  ENEMY_DIFFICULTY_STATS,
  MATCH_DURATION_SECONDS,
  PLAYER_BASE_STATS,
} from '../core/constants';
import {
  AudioSettings,
  DamagePopupItem,
  DifficultyLevel,
  GameStateMode,
  GraphicsQuality,
  HUDStateSnapshot,
  MatchStats,
  SkillSlotId,
} from '../core/types';
import { SoundManager } from '../audio/SoundManager';
import { ProceduralTextures } from '../characters/ProceduralTextures';
import { MechaBuilder } from '../characters/MechaBuilder';
import { ArenaBuilder } from '../arena/ArenaBuilder';
import { VFXManager } from '../effects/VFXManager';
import { BattleCamera } from '../camera/BattleCamera';
import { MechaFighter } from '../combat/MechaFighter';
import { AbilitySystem } from '../abilities/AbilitySystem';
import { EnemyAI } from '../ai/EnemyAI';
import { InputManager } from '../controls/InputManager';

export class MechaGameEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene = new THREE.Scene();

  private sound = new SoundManager();
  private texGen = new ProceduralTextures();
  private mechaBuilder = new MechaBuilder();
  private arena = new ArenaBuilder();
  private battleCam!: BattleCamera;
  private vfx!: VFXManager;
  private abilities!: AbilitySystem;
  private enemyAI!: EnemyAI;
  private input: InputManager | null = null;

  private player!: MechaFighter;
  private enemy!: MechaFighter;

  private mode: GameStateMode = 'MAIN_MENU';
  private quality: GraphicsQuality = 'HIGH';
  private difficulty: DifficultyLevel = 'NORMAL';

  private introTimer = 0;
  private introBannerText = '';
  private matchTimeRemaining = MATCH_DURATION_SECONDS;
  private activeSkillBanner: string | null = null;
  private enemyWarningText: string | null = null;

  private damagePopups: DamagePopupItem[] = [];
  private nextPopupId = 1;

  private matchStats: MatchStats = {
    damageDealt: 0,
    damageTaken: 0,
    maxCombo: 0,
    skillsUsed: 0,
    score: 0,
    elapsedSeconds: 0,
  };

  private playerPortraitUrl = '';
  private enemyPortraitUrl = '';
  private webglError: string | null = null;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private totalElapsed = 0;
  private timeScale = 1.0;
  private slowMoTimer = 0;

  private hudSyncTimer = 0;
  private fpsFrames = 0;
  private fpsAccum = 0;
  private currentFps = 60;

  private isDisposed = false;

  constructor(
    private container: HTMLElement,
    private onHudUpdate: (snapshot: HUDStateSnapshot) => void
  ) {
    // Auto-select sensible default graphics quality on mobile screens
    const isMobileScreen = window.innerWidth < 820 || 'ontouchstart' in window;
    this.quality = isMobileScreen ? 'MEDIUM' : 'HIGH';

    this.initEngine();
  }

  private initEngine(): void {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.battleCam = new BattleCamera(width / height);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: this.quality !== 'LOW',
        powerPreference: 'high-performance',
        alpha: false,
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;
      this.renderer.shadowMap.enabled = this.quality !== 'LOW';
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.applyRendererSize(width, height);

      this.renderer.domElement.className = 'w-full h-full block game-touch-none';
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);
    } catch (err) {
      console.error('WebGL initialization failed:', err);
      this.webglError =
        'WebGL 3D rendering could not be initialized on this browser/device. Please enable hardware acceleration.';
      this.emitHudSnapshot();
      return;
    }

    // Build Futuristic 3D Arena
    this.arena.build(this.scene, this.texGen, this.quality);

    // Build Articulated 3D Characters
    const guardianJoints = this.mechaBuilder.buildCharacter('golden_guardian', this.texGen);
    const destroyerJoints = this.mechaBuilder.buildCharacter('crimson_destroyer', this.texGen);
    this.scene.add(guardianJoints.root);
    this.scene.add(destroyerJoints.root);

    this.player = new MechaFighter(
      'golden_guardian',
      'GOLDEN GUARDIAN',
      'DIVINE AEGIS VANGUARD',
      guardianJoints,
      PLAYER_BASE_STATS,
      (heavy) => this.sound.playFootstep(heavy)
    );

    this.enemy = new MechaFighter(
      'crimson_destroyer',
      'CRIMSON DESTROYER',
      'HELLFIRE SIEGE OVERLORD',
      destroyerJoints,
      ENEMY_DIFFICULTY_STATS[this.difficulty],
      (heavy) => this.sound.playFootstep(heavy)
    );

    // Build VFX, Abilities & Boss AI
    this.vfx = new VFXManager(this.scene, this.texGen, this.quality);

    this.abilities = new AbilitySystem(
      this.scene,
      this.mechaBuilder,
      this.vfx,
      this.sound,
      this.battleCam,
      this.arena,
      {
        onDamageDealt: (target, amount, worldPos, opts) => {
          this.spawnDamagePopup(target, amount, worldPos, opts);
          if (target.id === 'crimson_destroyer') {
            this.matchStats.damageDealt += amount;
            this.matchStats.score += amount * (opts.isCrit ? 3 : 2);
          } else {
            this.matchStats.damageTaken += amount;
          }
        },
        onComboUpdated: (count) => {
          if (count > this.matchStats.maxCombo) {
            this.matchStats.maxCombo = count;
          }
        },
        onSkillBanner: (banner) => {
          this.activeSkillBanner = banner;
          this.emitHudSnapshot();
        },
        onEnemyWarning: (warning) => {
          this.enemyWarningText = warning;
          this.emitHudSnapshot();
        },
        onRequestSlowMo: (scale, dur) => {
          this.timeScale = scale;
          this.slowMoTimer = dur;
        },
        onSkillUsed: () => {
          this.matchStats.skillsUsed += 1;
          this.matchStats.score += 75;
        },
      }
    );

    this.enemyAI = new EnemyAI(this.abilities, this.sound, this.vfx);

    // Setup Postprocessing Composer (Bloom on HIGH quality)
    this.setupPostProcessing(width, height);

    // Capture Studio 3D Portraits of both actual 3D robots for the MOBA HUD!
    this.captureCharacterPortraits();

    // Place fighters in dramatic Main Menu face-off showcase
    this.placeMenuShowcasePositions();

    // Bind Desktop & Touch Input
    this.input = new InputManager(this.renderer.domElement, {
      onSkillTrigger: (slot) => this.triggerPlayerAction(slot),
      onJump: () => this.triggerJump(),
      onPauseToggle: () => {
        if (this.mode === 'ACTIVE_COMBAT') this.pauseBattle();
        else if (this.mode === 'PAUSED') this.resumeBattle();
      },
      onCameraRotate: (dx, dy) => this.battleCam.rotateOrbit(dx, dy),
      onCameraZoom: (delta) => this.battleCam.adjustZoom(delta),
      onAnyInteraction: () => this.sound.init(),
    });

    window.addEventListener('resize', this.handleResize);

    this.emitHudSnapshot();
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  private setupPostProcessing(width: number, height: number): void {
    if (!this.renderer) return;
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloomPass = null;
    }

    if (this.quality === 'HIGH') {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.battleCam.camera);
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.42, // subtle cinematic glow without washing out armor!
        0.55,
        0.82
      );
      const outputPass = new OutputPass();
      this.composer.addPass(renderPass);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(outputPass);
    }
  }

  private applyRendererSize(width: number, height: number): void {
    if (!this.renderer) return;
    const maxDpr = this.quality === 'LOW' ? 1.0 : this.quality === 'MEDIUM' ? 1.5 : 2.0;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  private captureCharacterPortraits(): void {
    if (!this.renderer) return;
    try {
      const portraitCam = new THREE.PerspectiveCamera(34, 1, 0.2, 30);

      const renderPortrait = (fighter: MechaFighter, bgHex: number): string => {
        const prevBg = this.scene.background;
        this.scene.background = new THREE.Color(bgHex);

        fighter.reset(new THREE.Vector3(0, 0, 0), 0);
        fighter.animator.update(0.016);

        // Hide the other character briefly for clean solo bust shot
        const other = fighter === this.player ? this.enemy : this.player;
        other.joints.root.visible = false;

        portraitCam.position.set(0.42, 2.18, 2.35);
        portraitCam.lookAt(0, 2.02, 0);

        const rtSize = 256;
        this.renderer!.setSize(rtSize, rtSize, false);
        this.renderer!.render(this.scene, portraitCam);
        const url = this.renderer!.domElement.toDataURL('image/png');

        other.joints.root.visible = true;
        this.scene.background = prevBg;
        return url;
      };

      this.playerPortraitUrl = renderPortrait(this.player, 0x0c1933);
      this.enemyPortraitUrl = renderPortrait(this.enemy, 0x260812);

      // Restore viewport size
      const w = Math.max(1, this.container.clientWidth || window.innerWidth);
      const h = Math.max(1, this.container.clientHeight || window.innerHeight);
      this.applyRendererSize(w, h);
    } catch (err) {
      console.warn('Portrait snapshot skipped:', err);
    }
  }

  private placeMenuShowcasePositions(): void {
    this.player.reset(new THREE.Vector3(-2.6, 0, 1.8), 1.05);
    this.enemy.reset(
      new THREE.Vector3(2.6, 0, -1.8),
      -2.08,
      ENEMY_DIFFICULTY_STATS[this.difficulty]
    );
    this.battleCam.setMode('MENU');
  }

  // ================= PUBLIC GAME FLOW API =================
  public startBattle(): void {
    this.sound.init();
    this.sound.playUiClick();
    this.sound.startBattleMusic();

    this.vfx.clearAllTemporaryEffects();
    this.abilities.reset(this.player);
    this.enemyAI.setDifficulty(this.difficulty);
    this.enemyAI.reset();

    this.player.reset(new THREE.Vector3(0, 0, 7.2), Math.PI, PLAYER_BASE_STATS);
    this.enemy.reset(
      new THREE.Vector3(0, 0, -7.2),
      0,
      ENEMY_DIFFICULTY_STATS[this.difficulty]
    );

    this.battleCam.reset();
    this.battleCam.setMode('INTRO');

    this.matchTimeRemaining = MATCH_DURATION_SECONDS;
    this.damagePopups = [];
    this.activeSkillBanner = null;
    this.enemyWarningText = null;
    this.timeScale = 1.0;
    this.slowMoTimer = 0;

    this.matchStats = {
      damageDealt: 0,
      damageTaken: 0,
      maxCombo: 0,
      skillsUsed: 0,
      score: 0,
      elapsedSeconds: 0,
    };

    this.mode = 'INTRO';
    this.introTimer = 2.0;
    this.introBannerText = 'GOLDEN GUARDIAN  VS  CRIMSON DESTROYER';
    this.emitHudSnapshot();
  }

  public restartBattle(): void {
    this.startBattle();
  }

  public pauseBattle(): void {
    if (this.mode !== 'ACTIVE_COMBAT') return;
    this.sound.playUiClick();
    this.mode = 'PAUSED';
    this.emitHudSnapshot();
  }

  public resumeBattle(): void {
    if (this.mode !== 'PAUSED') return;
    this.sound.playUiClick();
    this.mode = 'ACTIVE_COMBAT';
    this.lastTimestamp = performance.now();
    this.emitHudSnapshot();
  }

  public returnToMainMenu(): void {
    this.sound.playUiClick();
    this.sound.stopBattleMusic();
    this.vfx.clearAllTemporaryEffects();
    this.abilities.reset(this.player);
    this.mode = 'MAIN_MENU';
    this.placeMenuShowcasePositions();
    this.emitHudSnapshot();
  }

  public setJoystickInput(x: number, y: number): void {
    this.input?.setJoystickInput(x, y);
  }

  public triggerJump(): void {
    if (this.mode !== 'ACTIVE_COMBAT') return;
    if (this.player.jump()) {
      this.sound.playDash();
    }
  }

  public triggerPlayerAction(slot: SkillSlotId): void {
    if (this.mode !== 'ACTIVE_COMBAT') return;
    this.sound.init();

    let activated = false;
    switch (slot) {
      case 'basic':
        activated = this.abilities.triggerPlayerBasicAttack(this.player, this.enemy);
        if (activated) {
          this.enemyAI.notifyIncomingPlayerAttack(this.enemy, this.player);
        }
        break;
      case 'dash': {
        const move = this.getWorldMoveVector();
        activated = this.abilities.triggerPlayerDash(this.player, move.wx, move.wz);
        break;
      }
      case 'skill1':
        activated = this.abilities.triggerSkill1(this.player, this.enemy);
        if (activated) this.enemyAI.notifyIncomingPlayerAttack(this.enemy, this.player);
        break;
      case 'skill2':
        activated = this.abilities.triggerSkill2(this.player, this.enemy);
        break;
      case 'skill3':
        activated = this.abilities.triggerSkill3(this.player, this.enemy);
        break;
      case 'ultimate':
        activated = this.abilities.triggerUltimate(this.player, this.enemy);
        break;
    }

    if (activated) {
      this.emitHudSnapshot();
    }
  }

  public setGraphicsQuality(q: GraphicsQuality): void {
    this.quality = q;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = q !== 'LOW';
      this.arena.setQuality(q);
      this.vfx.setQuality(q);
      const w = Math.max(1, this.container.clientWidth || window.innerWidth);
      const h = Math.max(1, this.container.clientHeight || window.innerHeight);
      this.applyRendererSize(w, h);
      this.setupPostProcessing(w, h);
    }
    this.emitHudSnapshot();
  }

  public setDifficulty(diff: DifficultyLevel): void {
    this.difficulty = diff;
    this.enemyAI?.setDifficulty(diff);
    this.emitHudSnapshot();
  }

  public getAudioSettings(): AudioSettings {
    return this.sound.getSettings();
  }

  public updateAudioSettings(partial: Partial<AudioSettings>): void {
    this.sound.updateSettings(partial);
  }

  // ================= INTERNAL SIMULATION LOOP =================
  private getWorldMoveVector(): {
    wx: number;
    wz: number;
    magnitude: number;
    isRunning: boolean;
  } {
    if (!this.input) return { wx: 0, wz: 0, magnitude: 0, isRunning: false };
    const m = this.input.getMovementState();
    if (m.magnitude < 0.05) {
      return { wx: 0, wz: 0, magnitude: 0, isRunning: false };
    }

    // Rotate input vector by current camera horizontal yaw so Up/W always moves toward camera forward!
    const camYaw = this.battleCam.getYaw();
    const cos = Math.cos(camYaw);
    const sin = Math.sin(camYaw);

    const wx = m.dirX * cos + m.dirZ * sin;
    const wz = -m.dirX * sin + m.dirZ * cos;
    return { wx, wz, magnitude: m.magnitude, isRunning: m.isRunning };
  }

  private updatePlayerMovement(dt: number): void {
    if (!this.player.canAct || this.abilities.isUltimateActive) {
      this.player.velocity.set(0, 0, 0);
      return;
    }

    const { wx, wz, magnitude, isRunning } = this.getWorldMoveVector();
    if (magnitude > 0.05) {
      const speed =
        this.player.stats.moveSpeed *
        magnitude *
        (isRunning ? this.player.stats.runMultiplier : 1.0);
      this.player.velocity.set(wx * speed, 0, wz * speed);

      const targetYaw = Math.atan2(wx, wz);
      const diff = ((targetYaw - this.player.facingAngle + Math.PI) % (Math.PI * 2)) - Math.PI;
      const shortest = diff < -Math.PI ? diff + Math.PI * 2 : diff;
      this.player.facingAngle += shortest * (1 - Math.exp(-15 * dt));

      if (this.player.isGrounded && this.player.landTimer <= 0) {
        this.player.animator.setState(isRunning ? 'RUN' : 'WALK');
      }
    } else {
      this.player.velocity.set(0, 0, 0);
      if (this.player.isGrounded && this.player.landTimer <= 0) {
        this.player.animator.setState('IDLE');
      }
    }
  }

  private resolveFighterBodyCollision(): void {
    const dx = this.enemy.position.x - this.player.position.x;
    const dz = this.enemy.position.z - this.player.position.z;
    const dist = Math.hypot(dx, dz);
    const minSep = this.player.bodyRadius + this.enemy.bodyRadius;

    if (dist < minSep && dist > 0.0001) {
      const overlap = (minSep - dist) * 0.5;
      const nx = dx / dist;
      const nz = dz / dist;
      this.player.position.x -= nx * overlap;
      this.player.position.z -= nz * overlap;
      this.enemy.position.x += nx * overlap;
      this.enemy.position.z += nz * overlap;
      this.player.syncTransform();
      this.enemy.syncTransform();
    }
  }

  private checkMatchEndConditions(): void {
    if (this.mode !== 'ACTIVE_COMBAT') return;

    if (this.enemy.isDefeated) {
      this.mode = 'VICTORY';
      this.activeSkillBanner = null;
      this.enemyWarningText = null;
      this.timeScale = 1.0;
      this.arena.setUltimateDarkness(0);
      this.player.velocity.set(0, 0, 0);
      this.player.animator.setRightHandDetached(false);
      this.player.animator.setState('VICTORY', true);
      this.battleCam.setMode('VICTORY');

      // Time bonus score!
      this.matchStats.score += Math.round(this.matchTimeRemaining * 15) + 1000;
      this.sound.stopBattleMusic();
      this.sound.playVictory();
      this.emitHudSnapshot();
      return;
    }

    if (this.player.isDefeated || this.matchTimeRemaining <= 0) {
      if (this.matchTimeRemaining <= 0 && !this.player.isDefeated) {
        // Timeout decision based on remaining HP percentage
        const pRatio = this.player.stats.hp / this.player.stats.maxHp;
        const eRatio = this.enemy.stats.hp / this.enemy.stats.maxHp;
        if (pRatio >= eRatio) {
          this.enemy.takeDamage(99999);
          this.checkMatchEndConditions();
          return;
        } else {
          this.player.takeDamage(99999);
        }
      }

      this.mode = 'DEFEAT';
      this.activeSkillBanner = null;
      this.enemyWarningText = null;
      this.timeScale = 1.0;
      this.arena.setUltimateDarkness(0);
      this.player.velocity.set(0, 0, 0);
      this.enemy.velocity.set(0, 0, 0);
      this.enemy.animator.setState('VICTORY', true);
      this.battleCam.setMode('DEFEAT');
      this.sound.stopBattleMusic();
      this.sound.playDefeat();
      this.emitHudSnapshot();
    }
  }

  private spawnDamagePopup(
    target: MechaFighter,
    amount: number,
    worldPos: THREE.Vector3,
    opts: { isCrit?: boolean; label?: string; color: string }
  ): void {
    const screen = this.battleCam.projectToScreenPercent(worldPos);
    if (!screen) return;

    const jitterX = (Math.random() - 0.5) * 4.5;
    const jitterY = (Math.random() - 0.5) * 3.0;

    this.damagePopups.push({
      id: this.nextPopupId++,
      x: THREE.MathUtils.clamp(screen.x + jitterX, 10, 90),
      y: THREE.MathUtils.clamp(screen.y + jitterY, 12, 82),
      amount,
      label: opts.label,
      isCrit: opts.isCrit,
      isPlayerTarget: target.id === 'golden_guardian',
      color: opts.color,
      createdAt: performance.now(),
    });

    if (this.damagePopups.length > 14) {
      this.damagePopups.shift();
    }
    this.emitHudSnapshot();
  }

  private loop = (timestamp: number): void => {
    if (this.isDisposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;

    // FPS counter calculation
    this.fpsFrames++;
    this.fpsAccum += rawDt;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    if (this.mode !== 'PAUSED') {
      if (this.slowMoTimer > 0) {
        this.slowMoTimer = Math.max(0, this.slowMoTimer - rawDt);
        if (this.slowMoTimer === 0) {
          this.timeScale = 1.0;
        }
      }

      const dt = rawDt * this.timeScale;
      this.totalElapsed += dt;

      if (this.mode === 'INTRO' || this.mode === 'BATTLE_START') {
        this.introTimer -= rawDt;
        if (this.mode === 'INTRO' && this.introTimer <= 0.65) {
          this.mode = 'BATTLE_START';
          this.introBannerText = 'ENGAGE!';
          this.battleCam.setMode('COMBAT');
          this.emitHudSnapshot();
        } else if (this.mode === 'BATTLE_START' && this.introTimer <= 0) {
          this.mode = 'ACTIVE_COMBAT';
          this.introBannerText = '';
          this.emitHudSnapshot();
        }
      }

      if (this.mode === 'ACTIVE_COMBAT') {
        this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - rawDt);
        this.matchStats.elapsedSeconds += rawDt;

        this.updatePlayerMovement(dt);
        this.enemyAI.update(dt, this.enemy, this.player, true);
        this.abilities.update(dt, this.player, this.enemy);
      } else if (this.mode === 'VICTORY') {
        this.vfx.spawnAuraParticles(this.player.position, 0xfde047, 2);
      }

      this.player.updatePhysicsAndTimers(dt, this.mode === 'ACTIVE_COMBAT');
      this.enemy.updatePhysicsAndTimers(dt, this.mode === 'ACTIVE_COMBAT');
      this.resolveFighterBodyCollision();

      if (this.mode === 'ACTIVE_COMBAT') {
        this.checkMatchEndConditions();
      }

      this.vfx.update(dt);
      this.arena.update(dt, this.totalElapsed, this.scene);
      this.battleCam.update(rawDt, this.player.position, this.enemy.position);
    }

    // Expire finished floating damage popups
    const now = performance.now();
    if (this.damagePopups.length > 0 && now - this.damagePopups[0].createdAt > 950) {
      this.damagePopups = this.damagePopups.filter((p) => now - p.createdAt <= 950);
    }

    // Throttled HUD state sync (~20 Hz)
    this.hudSyncTimer += rawDt;
    if (this.hudSyncTimer >= 0.05) {
      this.hudSyncTimer = 0;
      this.emitHudSnapshot();
    }

    // Render 3D Scene
    if (this.renderer) {
      if (this.composer && this.quality === 'HIGH') {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.battleCam.camera);
      }
    }
  };

  private emitHudSnapshot(): void {
    if (!this.player || !this.enemy || !this.abilities) {
      return;
    }

    const combo = this.abilities.getComboInfo();
    const skillStates = {} as HUDStateSnapshot['skills'];
    for (const slotId of Object.keys(this.abilities.playerSkills) as SkillSlotId[]) {
      const rt = this.abilities.playerSkills[slotId];
      skillStates[slotId] = {
        cooldown: rt.remainingCooldown,
        maxCooldown: rt.def.cooldown,
        energyCost: rt.def.energyCost,
        canCast:
          this.mode === 'ACTIVE_COMBAT' &&
          !this.player.isDefeated &&
          rt.remainingCooldown <= 0 &&
          this.player.stats.energy >= rt.def.energyCost &&
          !this.abilities.isUltimateActive,
        isActive: rt.isActive,
      };
    }

    this.onHudUpdate({
      mode: this.mode,
      introBannerText: this.introBannerText,
      matchTimeRemaining: this.matchTimeRemaining,
      score: this.matchStats.score,
      comboCount: combo.count,
      comboTimerRatio: combo.ratio,
      player: {
        name: this.player.name,
        title: this.player.title,
        hp: this.player.stats.hp,
        maxHp: this.player.stats.maxHp,
        trailHp: this.player.trailHp,
        energy: this.player.stats.energy,
        maxEnergy: this.player.stats.maxEnergy,
        isStunned: this.player.stunTimer > 0,
        animState: this.player.animator.getState(),
        portraitUrl: this.playerPortraitUrl,
      },
      enemy: {
        name: this.enemy.name,
        title: this.enemy.title,
        hp: this.enemy.stats.hp,
        maxHp: this.enemy.stats.maxHp,
        trailHp: this.enemy.trailHp,
        energy: this.enemy.stats.energy,
        maxEnergy: this.enemy.stats.maxEnergy,
        aiState: this.enemyAI.getState(),
        isStunned: this.enemy.stunTimer > 0,
        warningText: this.enemyWarningText,
        portraitUrl: this.enemyPortraitUrl,
      },
      skills: skillStates,
      activeSkillBanner: this.activeSkillBanner,
      damagePopups: [...this.damagePopups],
      fps: this.currentFps,
      quality: this.quality,
      difficulty: this.difficulty,
      matchStats: { ...this.matchStats },
      webglError: this.webglError,
    });
  }

  private handleResize = (): void => {
    if (!this.renderer || this.isDisposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.battleCam.setAspect(width / height);
    this.applyRendererSize(width, height);
  };

  public dispose(): void {
    this.isDisposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('resize', this.handleResize);
    this.input?.dispose();
    this.sound.dispose();
    this.vfx?.dispose();
    this.arena.dispose();
    this.mechaBuilder.dispose();
    this.texGen.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
  }
}

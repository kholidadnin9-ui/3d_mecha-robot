import * as THREE from 'three';

export type GameStateMode =
  | 'MAIN_MENU'
  | 'INTRO'
  | 'BATTLE_START'
  | 'ACTIVE_COMBAT'
  | 'PAUSED'
  | 'VICTORY'
  | 'DEFEAT';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export type DifficultyLevel = 'NORMAL' | 'HARD' | 'BOSS';

export type CharacterId = 'golden_guardian' | 'crimson_destroyer';

export type AnimState =
  | 'IDLE'
  | 'WALK'
  | 'RUN'
  | 'JUMP'
  | 'LAND'
  | 'DASH_FWD'
  | 'DODGE_BACK'
  | 'DODGE_SIDE'
  | 'PUNCH_1'
  | 'PUNCH_2'
  | 'HEAVY_KICK'
  | 'SKILL_1'
  | 'SKILL_2'
  | 'SKILL_3'
  | 'ULTIMATE'
  | 'HIT'
  | 'KNOCKBACK'
  | 'STAGGER'
  | 'VICTORY'
  | 'DEFEAT';

export type AIState =
  | 'IDLE'
  | 'APPROACH'
  | 'PURSUE'
  | 'COMBAT'
  | 'BASIC_ATTACK'
  | 'SPECIAL_ATTACK'
  | 'DODGE'
  | 'STAGGER'
  | 'KNOCKBACK'
  | 'RETREAT'
  | 'DEFEATED';

export type SkillSlotId = 'basic' | 'dash' | 'skill1' | 'skill2' | 'skill3' | 'ultimate';

export interface SkillDefinition {
  id: SkillSlotId;
  name: string;
  subtitle: string;
  hotkey: string;
  cooldown: number;
  energyCost: number;
  range: number;
  multiplier: number;
  color: string;
}

export interface SkillRuntime {
  def: SkillDefinition;
  remainingCooldown: number;
  isActive: boolean;
}

export interface CharacterStats {
  maxHp: number;
  hp: number;
  maxEnergy: number;
  energy: number;
  energyRegen: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  runMultiplier: number;
  attackRange: number;
}

export interface MechaJoints {
  root: THREE.Group;
  hipsPivot: THREE.Group;
  pelvis: THREE.Group;
  torsoPivot: THREE.Group;
  torso: THREE.Group;
  chestArmor: THREE.Group;
  neckPivot: THREE.Group;
  headPivot: THREE.Group;
  head: THREE.Group;
  leftShoulderPivot: THREE.Group;
  leftShoulderArmor: THREE.Group;
  leftUpperArm: THREE.Group;
  leftElbowPivot: THREE.Group;
  leftForearm: THREE.Group;
  leftWristPivot: THREE.Group;
  leftHand: THREE.Group;
  rightShoulderPivot: THREE.Group;
  rightShoulderArmor: THREE.Group;
  rightUpperArm: THREE.Group;
  rightElbowPivot: THREE.Group;
  rightForearm: THREE.Group;
  rightWristPivot: THREE.Group;
  rightHand: THREE.Group;
  rightWristSocket: THREE.Mesh;
  leftHipPivot: THREE.Group;
  leftThigh: THREE.Group;
  leftKneePivot: THREE.Group;
  leftLowerLeg: THREE.Group;
  leftAnklePivot: THREE.Group;
  leftFoot: THREE.Group;
  rightHipPivot: THREE.Group;
  rightThigh: THREE.Group;
  rightKneePivot: THREE.Group;
  rightLowerLeg: THREE.Group;
  rightAnklePivot: THREE.Group;
  rightFoot: THREE.Group;
  coreMesh: THREE.Mesh;
  eyeMeshes: THREE.Mesh[];
  thrusterMeshes: THREE.Mesh[];
  emissiveMaterials: THREE.MeshStandardMaterial[];
  armorMaterials: THREE.MeshStandardMaterial[];
  mixer?: THREE.AnimationMixer;
}

export interface DamagePopupItem {
  id: number;
  x: number; // screen % 0-100
  y: number; // screen % 0-100
  amount: number;
  label?: string;
  isCrit?: boolean;
  isPlayerTarget?: boolean;
  color: string;
  createdAt: number;
}

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface MatchStats {
  damageDealt: number;
  damageTaken: number;
  maxCombo: number;
  skillsUsed: number;
  score: number;
  elapsedSeconds: number;
}

export interface HUDStateSnapshot {
  mode: GameStateMode;
  introBannerText: string;
  matchTimeRemaining: number;
  score: number;
  comboCount: number;
  comboTimerRatio: number;
  player: {
    name: string;
    title: string;
    hp: number;
    maxHp: number;
    trailHp: number;
    energy: number;
    maxEnergy: number;
    isStunned: boolean;
    animState: AnimState;
    portraitUrl: string;
  };
  enemy: {
    name: string;
    title: string;
    hp: number;
    maxHp: number;
    trailHp: number;
    energy: number;
    maxEnergy: number;
    aiState: AIState;
    isStunned: boolean;
    warningText: string | null;
    portraitUrl: string;
  };
  skills: Record<
    SkillSlotId,
    {
      cooldown: number;
      maxCooldown: number;
      energyCost: number;
      canCast: boolean;
      isActive: boolean;
    }
  >;
  activeSkillBanner: string | null;
  damagePopups: DamagePopupItem[];
  fps: number;
  quality: GraphicsQuality;
  difficulty: DifficultyLevel;
  matchStats: MatchStats;
  webglError: string | null;
}

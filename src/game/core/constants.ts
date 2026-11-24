import { CharacterStats, DifficultyLevel, SkillDefinition, SkillSlotId } from './types';

export const ARENA_RADIUS = 21.5;
export const MATCH_DURATION_SECONDS = 180;

export const PLAYER_BASE_STATS: CharacterStats = {
  maxHp: 2400,
  hp: 2400,
  maxEnergy: 100,
  energy: 100,
  energyRegen: 9.5, // per second + bonus on landing basic attacks
  attack: 125,
  defense: 48,
  moveSpeed: 7.4,
  runMultiplier: 1.42,
  attackRange: 3.6,
};

export const ENEMY_DIFFICULTY_STATS: Record<
  DifficultyLevel,
  CharacterStats & {
    decisionInterval: number;
    attackInterval: number;
    dodgeChance: number;
    specialCooldownScale: number;
  }
> = {
  NORMAL: {
    maxHp: 2600,
    hp: 2600,
    maxEnergy: 100,
    energy: 100,
    energyRegen: 8,
    attack: 98,
    defense: 42,
    moveSpeed: 6.4,
    runMultiplier: 1.32,
    attackRange: 3.7,
    decisionInterval: 0.36,
    attackInterval: 1.35,
    dodgeChance: 0.22,
    specialCooldownScale: 1.15,
  },
  HARD: {
    maxHp: 3100,
    hp: 3100,
    maxEnergy: 100,
    energy: 100,
    energyRegen: 10.5,
    attack: 118,
    defense: 52,
    moveSpeed: 7.1,
    runMultiplier: 1.38,
    attackRange: 3.8,
    decisionInterval: 0.24,
    attackInterval: 1.0,
    dodgeChance: 0.35,
    specialCooldownScale: 0.95,
  },
  BOSS: {
    maxHp: 3750,
    hp: 3750,
    maxEnergy: 120,
    energy: 120,
    energyRegen: 13,
    attack: 136,
    defense: 60,
    moveSpeed: 7.6,
    runMultiplier: 1.45,
    attackRange: 3.95,
    decisionInterval: 0.18,
    attackInterval: 0.82,
    dodgeChance: 0.46,
    specialCooldownScale: 0.8,
  },
};

export const PLAYER_SKILLS: Record<SkillSlotId, SkillDefinition> = {
  basic: {
    id: 'basic',
    name: 'Aegis Strike',
    subtitle: '3-Hit Mecha Combo',
    hotkey: 'LMB / J',
    cooldown: 0.18,
    energyCost: 0,
    range: 3.7,
    multiplier: 1.0,
    color: '#fbbf24',
  },
  dash: {
    id: 'dash',
    name: 'Thruster Evade',
    subtitle: 'Jet Dash & Dodge',
    hotkey: 'SPACE',
    cooldown: 2.6,
    energyCost: 12,
    range: 6.5,
    multiplier: 0,
    color: '#38bdf8',
  },
  skill1: {
    id: 'skill1',
    name: 'Electric Lightning',
    subtitle: 'Golden Arc + Stun',
    hotkey: 'Q',
    cooldown: 5.5,
    energyCost: 22,
    range: 11.5,
    multiplier: 2.35,
    color: '#60a5fa',
  },
  skill2: {
    id: 'skill2',
    name: 'Energy Explosion',
    subtitle: 'Radial Nova + Knockback',
    hotkey: 'E',
    cooldown: 8.0,
    energyCost: 30,
    range: 7.0,
    multiplier: 2.85,
    color: '#f59e0b',
  },
  skill3: {
    id: 'skill3',
    name: 'Rocket Punch',
    subtitle: 'Detaching Guided Fist',
    hotkey: 'R',
    cooldown: 9.5,
    energyCost: 32,
    range: 17.5,
    multiplier: 3.15,
    color: '#fb923c',
  },
  ultimate: {
    id: 'ultimate',
    name: 'Divine Thunderstorm',
    subtitle: 'Cataclysmic Judgment',
    hotkey: 'F',
    cooldown: 22.0,
    energyCost: 55,
    range: 19.0,
    multiplier: 5.6,
    color: '#fde047',
  },
};

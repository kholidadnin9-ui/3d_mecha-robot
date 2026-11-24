import React, { useState } from 'react';
import {
  ArrowUp,
  Crosshair,
  Flame,
  Rocket,
  ShieldAlert,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';
import { PLAYER_SKILLS } from '../../game/core/constants';
import { HUDStateSnapshot, SkillSlotId } from '../../game/core/types';

interface AbilityClusterProps {
  skills: HUDStateSnapshot['skills'];
  currentEnergy: number;
  onTriggerSkill: (slot: SkillSlotId) => void;
  onJump: () => void;
}

interface ArcButtonProps {
  slot: SkillSlotId;
  state: HUDStateSnapshot['skills'][SkillSlotId];
  currentEnergy: number;
  sizeClass: string;
  posClass: string;
  accentClass: string;
  icon: React.ReactNode;
  isUltimate?: boolean;
  onPress: () => void;
}

const ArcSkillButton: React.FC<ArcButtonProps> = ({
  slot,
  state,
  currentEnergy,
  sizeClass,
  posClass,
  accentClass,
  icon,
  isUltimate = false,
  onPress,
}) => {
  const [pressed, setPressed] = useState(false);
  const def = PLAYER_SKILLS[slot];
  const onCd = state.cooldown > 0.05;
  const lowEnergy = currentEnergy < state.energyCost;
  const disabled = !state.canCast;

  const cdRatio =
    state.maxCooldown > 0 ? Math.min(1, state.cooldown / state.maxCooldown) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - cdRatio);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPressed(true);
    onPress();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setPressed(false);
  };

  return (
    <div className={`absolute ${posClass} flex flex-col items-center pointer-events-auto`}>
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={def.name}
        className={`relative ${sizeClass} rounded-full game-touch-none flex items-center justify-center transition-transform duration-100 ${
          pressed ? 'scale-90' : state.isActive ? 'scale-105' : 'hover:scale-105'
        } ${
          disabled
            ? 'bg-slate-900/85 border-2 border-slate-600/60 text-slate-400'
            : `${accentClass} text-white`
        } backdrop-blur-md shadow-xl overflow-hidden`}
      >
        {/* Outer Ult pulse ring */}
        {isUltimate && !disabled && (
          <span className="absolute inset-0 rounded-full border-2 border-yellow-300/80 animate-ping opacity-35 pointer-events-none" />
        )}

        {/* Icon */}
        <div className={`relative z-10 ${onCd || lowEnergy ? 'opacity-35' : 'opacity-100'}`}>
          {icon}
        </div>

        {/* Radial Cooldown Overlay */}
        {onCd && (
          <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center z-20">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r={radius}
                fill="none"
                stroke="rgba(56,189,248,0.85)"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="font-display font-bold text-xs sm:text-sm text-white drop-shadow">
              {state.cooldown >= 10
                ? Math.ceil(state.cooldown)
                : state.cooldown.toFixed(1)}
            </span>
          </div>
        )}

        {/* Insufficient Energy Tint */}
        {!onCd && lowEnergy && (
          <div className="absolute inset-0 bg-blue-950/65 flex items-end justify-center pb-1 z-20">
            <span className="text-[9px] font-bold text-sky-300 uppercase tracking-tighter">
              NO EN
            </span>
          </div>
        )}
      </button>

      {/* Energy Cost & Hotkey Badges */}
      <div className="mt-0.5 flex items-center gap-1 pointer-events-none">
        <span className="px-1.5 py-0.2 rounded bg-slate-950/90 border border-slate-700/80 text-[9px] font-display font-bold text-amber-300 shadow">
          {def.hotkey}
        </span>
        {state.energyCost > 0 && (
          <span
            className={`px-1 rounded text-[9px] font-tech font-bold ${
              lowEnergy
                ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
                : 'bg-sky-950/90 text-sky-300 border border-sky-500/40'
            }`}
          >
            {state.energyCost}⚡
          </span>
        )}
      </div>
    </div>
  );
};

export const AbilityCluster: React.FC<AbilityClusterProps> = ({
  skills,
  currentEnergy,
  onTriggerSkill,
  onJump,
}) => {
  const [basicPressed, setBasicPressed] = useState(false);

  return (
    <div className="relative w-64 h-64 sm:w-76 sm:h-72 pointer-events-none select-none">
      {/* PRIMARY LARGE BASIC ATTACK BUTTON (Bottom-Right Anchor) */}
      <div className="absolute bottom-2 right-2 flex flex-col items-center pointer-events-auto">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setBasicPressed(true);
            onTriggerSkill('basic');
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setBasicPressed(false);
          }}
          onPointerLeave={() => setBasicPressed(false)}
          aria-label="Basic Attack"
          className={`relative w-22 h-22 sm:w-26 sm:h-26 rounded-full game-touch-none flex flex-col items-center justify-center transition-transform duration-75 ${
            basicPressed ? 'scale-90' : 'hover:scale-105'
          } bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 border-4 border-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.6)] text-slate-950`}
        >
          <div className="absolute inset-1.5 rounded-full border border-white/50 pointer-events-none" />
          <Crosshair className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.5]" />
          <span className="text-[10px] font-display font-black tracking-wider uppercase mt-0.5">
            STRIKE
          </span>
        </button>
        <span className="mt-1 px-2 py-0.5 rounded bg-slate-950/85 border border-amber-400/50 text-[9px] font-display text-amber-300">
          LMB / J
        </span>
      </div>

      {/* DASH / DODGE BUTTON (Inner Bottom Left of Basic Attack) */}
      <ArcSkillButton
        slot="dash"
        state={skills.dash}
        currentEnergy={currentEnergy}
        sizeClass="w-13 h-13 sm:w-14 sm:h-14"
        posClass="bottom-2 right-29 sm:right-33"
        accentClass="bg-gradient-to-br from-sky-500 to-blue-700 border-2 border-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.5)]"
        icon={<Wind className="w-6 h-6" />}
        onPress={() => onTriggerSkill('dash')}
      />

      {/* COMPACT JUMP THRUSTER BUTTON */}
      <div className="absolute bottom-20 right-29 sm:bottom-22 sm:right-33 pointer-events-auto">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onJump();
          }}
          title="Jump (K)"
          className="w-10 h-10 rounded-full game-touch-none bg-slate-900/85 hover:bg-slate-800 active:scale-90 border border-sky-400/50 text-sky-300 flex items-center justify-center shadow-md"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* SKILL 1: ELECTRIC LIGHTNING (Lower Arc Left) */}
      <ArcSkillButton
        slot="skill1"
        state={skills.skill1}
        currentEnergy={currentEnergy}
        sizeClass="w-15 h-15 sm:w-16 sm:h-16"
        posClass="bottom-14 right-46 sm:bottom-16 sm:right-52"
        accentClass="bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-800 border-2 border-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.55)]"
        icon={<Zap className="w-7 h-7 text-yellow-200 fill-yellow-200/30" />}
        onPress={() => onTriggerSkill('skill1')}
      />

      {/* SKILL 2: ENERGY EXPLOSION (Mid Arc) */}
      <ArcSkillButton
        slot="skill2"
        state={skills.skill2}
        currentEnergy={currentEnergy}
        sizeClass="w-15 h-15 sm:w-16 sm:h-16"
        posClass="bottom-33 right-37 sm:bottom-37 sm:right-43"
        accentClass="bg-gradient-to-br from-amber-400 via-orange-600 to-red-700 border-2 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.55)]"
        icon={<Flame className="w-7 h-7 text-yellow-100" />}
        onPress={() => onTriggerSkill('skill2')}
      />

      {/* SKILL 3: ROCKET PUNCH (Upper Mid Arc) */}
      <ArcSkillButton
        slot="skill3"
        state={skills.skill3}
        currentEnergy={currentEnergy}
        sizeClass="w-15 h-15 sm:w-16 sm:h-16"
        posClass="bottom-45 right-20 sm:bottom-50 sm:right-23"
        accentClass="bg-gradient-to-br from-orange-400 via-rose-600 to-amber-700 border-2 border-amber-200 shadow-[0_0_20px_rgba(251,146,60,0.55)]"
        icon={<Rocket className="w-7 h-7 text-white" />}
        onPress={() => onTriggerSkill('skill3')}
      />

      {/* ULTIMATE: DIVINE THUNDERSTORM (Apex Crown Button!) */}
      <ArcSkillButton
        slot="ultimate"
        state={skills.ultimate}
        currentEnergy={currentEnergy}
        sizeClass="w-17 h-17 sm:w-19 sm:h-19"
        posClass="bottom-47 right-1 sm:bottom-52 sm:right-2"
        accentClass="bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-700 border-2 border-white shadow-[0_0_28px_rgba(253,224,71,0.85)]"
        icon={
          <div className="flex flex-col items-center">
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950 fill-white" />
            <span className="text-[8px] font-display font-black text-slate-950 leading-none">
              ULT
            </span>
          </div>
        }
        isUltimate
        onPress={() => onTriggerSkill('ultimate')}
      />
    </div>
  );
};

export { ShieldAlert };

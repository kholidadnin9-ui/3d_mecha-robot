import React from 'react';
import { AlertTriangle, Pause, Shield, Volume2, VolumeX, Zap } from 'lucide-react';
import { HUDStateSnapshot, SkillSlotId } from '../../game/core/types';
import { VirtualJoystick } from './VirtualJoystick';
import { AbilityCluster } from './AbilityCluster';

interface BattleHUDProps {
  hud: HUDStateSnapshot;
  isMuted: boolean;
  onJoystickChange: (x: number, y: number) => void;
  onTriggerSkill: (slot: SkillSlotId) => void;
  onJump: () => void;
  onPause: () => void;
  onToggleMute: () => void;
}

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const BattleHUD: React.FC<BattleHUDProps> = ({
  hud,
  isMuted,
  onJoystickChange,
  onTriggerSkill,
  onJump,
  onPause,
  onToggleMute,
}) => {
  const pHpPct = Math.max(0, Math.min(100, (hud.player.hp / hud.player.maxHp) * 100));
  const pTrailPct = Math.max(
    pHpPct,
    Math.min(100, (hud.player.trailHp / hud.player.maxHp) * 100)
  );
  const pEnergyPct = Math.max(
    0,
    Math.min(100, (hud.player.energy / hud.player.maxEnergy) * 100)
  );

  const eHpPct = Math.max(0, Math.min(100, (hud.enemy.hp / hud.enemy.maxHp) * 100));
  const eTrailPct = Math.max(
    eHpPct,
    Math.min(100, (hud.enemy.trailHp / hud.enemy.maxHp) * 100)
  );
  const eEnergyPct = Math.max(
    0,
    Math.min(100, (hud.enemy.energy / hud.enemy.maxEnergy) * 100)
  );

  const isLowHp = pHpPct > 0 && pHpPct <= 28;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-4">
      {/* Low HP Danger Screen Vignette */}
      {isLowHp && (
        <div
          className="fixed inset-0 pointer-events-none z-10 animate-low-hp"
          style={{
            boxShadow: 'inset 0 0 90px 28px rgba(225, 29, 72, 0.78)',
          }}
        />
      )}

      {/* FLOATING 3D DAMAGE NUMBERS */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
        {hud.damagePopups.map((p) => (
          <div
            key={p.id}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              color: p.color,
            }}
            className="absolute animate-damage-float flex flex-col items-center"
          >
            {p.label && (
              <span className="font-display font-black text-[10px] sm:text-xs tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-950/85 border border-current mb-0.5 shadow-lg">
                {p.label}
              </span>
            )}
            <span
              className={`font-display font-black drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)] ${
                p.isCrit ? 'text-2xl sm:text-4xl scale-110' : 'text-lg sm:text-2xl'
              }`}
            >
              {p.isCrit ? `✦ ${p.amount}!` : `-${p.amount}`}
            </span>
          </div>
        ))}
      </div>

      {/* ================= TOP MOBA FIGHTER BAR ================= */}
      <div className="relative z-30 w-full max-w-6xl mx-auto flex items-start justify-between gap-1.5 sm:gap-4">
        {/* PLAYER: GOLDEN GUARDIAN PANEL */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Portrait Frame */}
          <div className="relative shrink-0 w-13 h-13 sm:w-17 sm:h-17 rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-sky-500 p-0.5 shadow-[0_0_20px_rgba(251,191,36,0.45)]">
            <div className="w-full h-full rounded-[10px] bg-slate-950 overflow-hidden flex items-center justify-center">
              {hud.player.portraitUrl ? (
                <img
                  src={hud.player.portraitUrl}
                  alt="Golden Guardian"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Shield className="w-7 h-7 text-amber-400" />
              )}
            </div>
            {hud.player.isStunned && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 rounded bg-amber-500 text-slate-950 font-display font-black text-[9px]">
                STUN
              </span>
            )}
          </div>

          {/* Name, HP & Energy Bars */}
          <div className="flex-1 min-w-0 max-w-xs">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-display font-extrabold text-[11px] sm:text-sm text-amber-300 truncate tracking-wide drop-shadow">
                {hud.player.name}
              </span>
              <span className="font-tech font-bold text-[11px] sm:text-xs text-white/90 ml-1 shrink-0">
                {Math.ceil(hud.player.hp)}/{hud.player.maxHp}
              </span>
            </div>

            {/* Slanted HP Bar with Delayed Damage Trail */}
            <div className="relative h-4 sm:h-5 bg-slate-950/90 border border-amber-400/50 rounded-sm overflow-hidden clip-hud-bar-left shadow-inner">
              <div
                style={{ width: `${pTrailPct}%` }}
                className="absolute inset-y-0 left-0 bg-white/80 transition-all duration-200"
              />
              <div
                style={{ width: `${pHpPct}%` }}
                className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                  isLowHp
                    ? 'bg-gradient-to-r from-rose-600 via-red-500 to-orange-400'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            </div>

            {/* Electric Energy Bar */}
            <div className="mt-1 relative h-2 sm:h-2.5 w-[88%] bg-slate-950/90 border border-sky-400/40 rounded-sm overflow-hidden clip-hud-bar-left">
              <div
                style={{ width: `${pEnergyPct}%` }}
                className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-amber-300 transition-all duration-75"
              />
            </div>
            <div className="hidden sm:flex items-center gap-1 mt-0.5 text-[10px] font-tech text-sky-300">
              <Zap className="w-3 h-3 fill-sky-400" />
              <span>ENERGY {Math.floor(hud.player.energy)}</span>
            </div>
          </div>
        </div>

        {/* CENTER MATCH CLOCK, SCORE & CONTROLS */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="px-3 sm:px-5 py-1 sm:py-1.5 bg-slate-950/88 border-b-2 border-x border-amber-400/50 rounded-b-xl backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.65)] flex flex-col items-center">
            <span className="text-[9px] font-display tracking-[0.2em] text-sky-400 uppercase">
              ARENA TIMER
            </span>
            <span
              className={`font-display font-black text-base sm:text-2xl leading-tight ${
                hud.matchTimeRemaining <= 30 ? 'text-rose-400 animate-pulse' : 'text-white'
              }`}
            >
              {formatTime(hud.matchTimeRemaining)}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-tech text-amber-300/90">
              <span>SCORE {hud.score.toLocaleString()}</span>
              <span className="hidden md:inline text-slate-400">• {hud.fps} FPS</span>
            </div>
          </div>

          {/* Quick Mute & Pause Buttons */}
          <div className="mt-1.5 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={onToggleMute}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-slate-200 shadow"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-300" />}
            </button>
            <button
              type="button"
              onClick={onPause}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/85 hover:bg-slate-800 border border-amber-400/50 text-amber-300 flex items-center gap-1 text-xs font-display font-bold shadow"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PAUSE</span>
            </button>
          </div>
        </div>

        {/* ENEMY BOSS: CRIMSON DESTROYER PANEL */}
        <div className="flex-1 flex flex-row-reverse items-center gap-2 sm:gap-3 min-w-0">
          {/* Portrait Frame */}
          <div className="relative shrink-0 w-13 h-13 sm:w-17 sm:h-17 rounded-xl bg-gradient-to-bl from-rose-500 via-red-700 to-amber-500 p-0.5 shadow-[0_0_20px_rgba(244,63,94,0.45)]">
            <div className="w-full h-full rounded-[10px] bg-slate-950 overflow-hidden flex items-center justify-center">
              {hud.enemy.portraitUrl ? (
                <img
                  src={hud.enemy.portraitUrl}
                  alt="Crimson Destroyer"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <AlertTriangle className="w-7 h-7 text-rose-500" />
              )}
            </div>
            {hud.enemy.isStunned && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 rounded bg-sky-400 text-slate-950 font-display font-black text-[9px]">
                STUNNED
              </span>
            )}
          </div>

          {/* Boss Name, HP & AI Tactical State */}
          <div className="flex-1 min-w-0 max-w-xs flex flex-col items-end">
            <div className="w-full flex items-baseline justify-between mb-1">
              <span className="font-tech font-bold text-[11px] sm:text-xs text-white/90 mr-1 shrink-0">
                {Math.ceil(hud.enemy.hp)}/{hud.enemy.maxHp}
              </span>
              <span className="font-display font-extrabold text-[11px] sm:text-sm text-rose-400 truncate tracking-wide drop-shadow">
                {hud.enemy.name}
              </span>
            </div>

            {/* Slanted Boss HP Bar */}
            <div className="w-full relative h-4 sm:h-5 bg-slate-950/90 border border-rose-500/60 rounded-sm overflow-hidden clip-hud-bar-right shadow-inner">
              <div
                style={{ width: `${eTrailPct}%` }}
                className="absolute inset-y-0 right-0 bg-amber-100/80 transition-all duration-200"
              />
              <div
                style={{ width: `${eHpPct}%` }}
                className="absolute inset-y-0 right-0 bg-gradient-to-l from-rose-600 via-red-500 to-amber-500 transition-all duration-100"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            </div>

            {/* Boss Energy & AI State */}
            <div className="mt-1 relative h-2 sm:h-2.5 w-[88%] bg-slate-950/90 border border-rose-500/40 rounded-sm overflow-hidden clip-hud-bar-right">
              <div
                style={{ width: `${eEnergyPct}%` }}
                className="ml-auto h-full bg-gradient-to-l from-orange-500 via-rose-500 to-amber-300 transition-all duration-75"
              />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 mt-0.5 text-[10px] font-tech text-rose-300/90">
              <span className="px-1.5 rounded bg-rose-950/80 border border-rose-500/40 uppercase">
                AI: {hud.enemy.aiState}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DYNAMIC COMBAT CALLOUTS & WARNINGS ================= */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-start pt-3 pointer-events-none">
        {/* Enemy Boss Telegraph Danger Warning */}
        {hud.enemy.warningText && (
          <div className="animate-danger-banner px-4 py-1.5 rounded-lg bg-rose-950/90 border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.85)] flex items-center gap-2 text-rose-200">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
            <span className="font-display font-black text-xs sm:text-base tracking-wider uppercase">
              {hud.enemy.warningText} — EVADE!
            </span>
          </div>
        )}

        {/* Active Player Skill Callout */}
        {hud.activeSkillBanner && (
          <div className="mt-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/40 to-sky-500/20 border border-amber-300/80 backdrop-blur-sm shadow-[0_0_30px_rgba(251,191,36,0.5)]">
            <span className="font-display font-black text-xs sm:text-lg tracking-[0.15em] text-amber-200 drop-shadow">
              ⚡ {hud.activeSkillBanner} ⚡
            </span>
          </div>
        )}

        {/* Low HP Warning Callout */}
        {isLowHp && !hud.enemy.warningText && (
          <div className="mt-2 px-3 py-0.5 rounded bg-rose-950/85 border border-rose-500/70 text-[11px] font-display font-bold text-rose-300 tracking-widest uppercase animate-pulse">
            CRITICAL ARMOR INTEGRITY — LOW HP!
          </div>
        )}

        {/* Combo Counter Badge (Left-Center) */}
        {hud.comboCount > 0 && (
          <div className="self-start ml-2 sm:ml-6 mt-auto mb-6 bg-slate-950/80 border-l-4 border-amber-400 px-3 py-1.5 rounded-r-lg backdrop-blur-sm shadow-lg">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black text-2xl sm:text-4xl italic text-amber-300">
                {hud.comboCount}x
              </span>
              <span className="font-display font-bold text-xs uppercase tracking-wider text-sky-300">
                COMBO
              </span>
            </div>
            <div className="w-24 h-1 bg-slate-800 rounded overflow-hidden mt-1">
              <div
                style={{ width: `${Math.round(hud.comboTimerRatio * 100)}%` }}
                className="h-full bg-amber-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* ================= BOTTOM CONTROLS: JOYSTICK + RADIAL ABILITY CLUSTER ================= */}
      <div className="relative z-30 w-full flex items-end justify-between pb-1 sm:pb-2 px-1 sm:px-3">
        <VirtualJoystick
          onChange={onJoystickChange}
          disabled={hud.mode !== 'ACTIVE_COMBAT'}
        />

        <AbilityCluster
          skills={hud.skills}
          currentEnergy={hud.player.energy}
          onTriggerSkill={onTriggerSkill}
          onJump={onJump}
        />
      </div>
    </div>
  );
};

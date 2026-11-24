
import React, { useState } from 'react';
import {
  Cpu,
  Flame,
  Gamepad2,
  Monitor,
  Play,
  Rocket,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  DifficultyLevel,
  GraphicsQuality,
  HUDStateSnapshot,
} from '../../game/core/types';

interface MainMenuProps {
  hud: HUDStateSnapshot;
  isMuted: boolean;
  onStartBattle: () => void;
  onChangeDifficulty: (d: DifficultyLevel) => void;
  onChangeQuality: (q: GraphicsQuality) => void;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  hud,
  isMuted,
  onStartBattle,
  onChangeDifficulty,
  onChangeQuality,
  onToggleMute,
}) => {
  const [tab, setTab] = useState<'ROSTER' | 'CONTROLS'>('ROSTER');

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-7 bg-gradient-to-b from-slate-950/75 via-transparent to-slate-950/92 overflow-y-auto">

      {/* TOP HEADER BAR */}
      <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_22px_rgba(245,158,11,0.55)]">
            <Shield className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-display tracking-[0.28em] text-sky-400 uppercase">
              CINEMATIC 3D MECHA COMBAT
            </div>
            <h1 className="font-display font-black text-xl sm:text-3xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">
              MECHA ROBOT ARENA 3D
            </h1>
          </div>
        </div>

        {/* Graphics & Audio Quick Bar */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-slate-900/85 border border-slate-700/80 rounded-xl p-1 gap-1 backdrop-blur-md">
            <Monitor className="w-3.5 h-3.5 text-sky-400 ml-2 mr-1" />
            {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onChangeQuality(q)}
                className={`px-2.5 py-1 rounded-lg font-display font-bold text-[10px] transition-colors cursor-pointer ${
                  hud.quality === q
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            className="p-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-slate-200 backdrop-blur-md cursor-pointer"
            title="Toggle Audio"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-300" />
            )}
          </button>
        </div>
      </div>

      {/* MIDDLE SHOWCASE CALLOUT */}
      <div className="my-auto py-4 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">

        {/* Left Info Card */}
        <div className="lg:col-span-7 pointer-events-auto bg-slate-950/78 border border-slate-700/70 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2.5">
            <button
              type="button"
              onClick={() => setTab('ROSTER')}
              className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                tab === 'ROSTER'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>MECHA ARSENAL</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('CONTROLS')}
              className={`px-3 py-1.5 rounded-lg font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                tab === 'CONTROLS'
                  ? 'bg-sky-400/20 text-sky-300 border border-sky-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>CONTROLS GUIDE</span>
            </button>
          </div>

          {tab === 'ROSTER' ? (
            <div className="space-y-3">
              {/* Character Comparison Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-sky-500/10 border border-amber-400/40">
                  {hud.player.portraitUrl && (
                    <img
                      src={hud.player.portraitUrl}
                      alt="Golden Guardian"
                      className="w-12 h-12 rounded-lg object-cover border border-amber-300/70 shrink-0"
                    />
                  )}
                  <div>
                    <span className="text-[9px] font-display text-sky-300 uppercase tracking-wider">
                      PLAYABLE HERO
                    </span>
                    <h3 className="font-display font-extrabold text-sm text-amber-300">
                      GOLDEN GUARDIAN
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      Divine Golden Lightning, Detachable Rocket Fist & Supernova Ultimate.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-rose-600/15 to-amber-600/10 border border-rose-500/40">
                  {hud.enemy.portraitUrl && (
                    <img
                      src={hud.enemy.portraitUrl}
                      alt="Crimson Destroyer"
                      className="w-12 h-12 rounded-lg object-cover border border-rose-400/70 shrink-0 scale-x-[-1]"
                    />
                  )}
                  <div>
                    <span className="text-[9px] font-display text-rose-300 uppercase tracking-wider">
                      AI BOSS RIVAL
                    </span>
                    <h3 className="font-display font-extrabold text-sm text-rose-400">
                      CRIMSON DESTROYER
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      Hellfire Nova, Crimson Thunder & Blitz Charge Boss AI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature Skills Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-1 text-sky-300 text-xs font-display font-bold">
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>[Q] Lightning</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">AoE Bolt + 1.25s Stun</p>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-1 text-amber-300 text-xs font-display font-bold">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>[E] Explosion</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Radial Blast + Knockback</p>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-1 text-orange-300 text-xs font-display font-bold">
                    <Rocket className="w-3.5 h-3.5 text-rose-400" />
                    <span>[R] Rocket Fist</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Guided Detachable Fist</p>
                </div>

                <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-400/40">
                  <div className="flex items-center gap-1 text-yellow-300 text-xs font-display font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>[F] Ultimate</span>
                  </div>
                  <p className="text-[10px] text-amber-200/80 mt-0.5">Divine Thunderstorm</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-200">
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="font-display font-bold text-amber-300 uppercase">
                  Desktop Controls
                </div>
                <div>• <strong>W / A / S / D:</strong> Move (+ <strong>Shift</strong> Run)</div>
                <div>• <strong>Left Click / J:</strong> 3-Hit Mecha Combo</div>
                <div>• <strong>Q / E / R:</strong> Special Abilities 1–3</div>
                <div>• <strong>F:</strong> Ultimate — Divine Thunderstorm</div>
                <div>• <strong>SPACE:</strong> Thruster Evade / Dash</div>
                <div>• <strong>Drag Mouse / Wheel:</strong> Orbit & Zoom Camera</div>
              </div>
              <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="font-display font-bold text-sky-300 uppercase">
                  Mobile Touch Controls
                </div>
                <div>• <strong>Bottom-Left Stick:</strong> Smooth Move & Sprint</div>
                <div>• <strong>Upper Screen Drag:</strong> Rotate Battle Camera</div>
                <div>• <strong>Bottom-Right Cluster:</strong> Strike, Dash & Skills</div>
                <div>• <strong>Red Ground Ring:</strong> Dash out of Boss AoE!</div>
              </div>
            </div>
          )}
        </div>

        {/* Right Launch Panel */}
        <div className="lg:col-span-5 pointer-events-auto bg-slate-950/85 border border-amber-400/50 rounded-2xl p-5 backdrop-blur-md shadow-[0_0_45px_rgba(245,158,11,0.25)] flex flex-col gap-4">
          <div>
            <div className="text-[10px] font-display tracking-[0.22em] text-slate-400 uppercase mb-2">
              SELECT AI BOSS DIFFICULTY
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['NORMAL', 'HARD', 'BOSS'] as DifficultyLevel[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChangeDifficulty(d)}
                  className={`py-2 rounded-xl font-display font-bold text-xs border transition-all cursor-pointer ${
                    hud.difficulty === d
                      ? d === 'BOSS'
                        ? 'bg-rose-600 text-white border-rose-300 shadow-[0_0_15px_rgba(225,29,72,0.6)]'
                        : 'bg-sky-500 text-slate-950 border-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Graphics Selector */}
          <div className="sm:hidden">
            <div className="text-[10px] font-display tracking-[0.22em] text-slate-400 uppercase mb-1.5">
              GRAPHICS MODE
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onChangeQuality(q)}
                  className={`py-1.5 rounded-lg font-display font-bold text-[10px] border ${
                    hud.quality === q
                      ? 'bg-amber-400 text-slate-950 border-amber-200'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onStartBattle}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-300 via-amber-500 to-orange-500 hover:from-amber-200 hover:to-amber-400 active:scale-[0.98] transition-all text-slate-950 font-display font-black text-base sm:text-lg tracking-[0.14em] flex items-center justify-center gap-2.5 shadow-[0_0_35px_rgba(251,191,36,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>START ARENA BATTLE</span>
          </button>
        </div>
      </div>

      {/* FOOTER TELEMETRY + CREATOR CREDIT */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col items-center gap-2 pb-1">

        {/* Creator Credit - High Contrast */}
        <div className="px-5 py-2 rounded-full bg-slate-950/95 border-2 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)]">
          <span className="font-display font-black text-[11px] sm:text-xs tracking-[0.18em] text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]">
            CREATED BY: WIDODO GURU SD
          </span>
        </div>

        {/* Technical Information */}
        <div className="w-full flex flex-wrap items-center justify-center sm:justify-between gap-1 text-[9px] sm:text-[10px] font-tech text-slate-300">
          <span>
            REAL-TIME THREE.JS 3D ENGINE • PROCEDURAL ARTICULATED MECHA RIGS
          </span>
          <span>
            {hud.fps} FPS • {hud.quality} QUALITY
          </span>
        </div>
      </footer>

    </div>
  );
};

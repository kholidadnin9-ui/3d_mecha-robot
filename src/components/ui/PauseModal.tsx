import React from 'react';
import {
  Home,
  Monitor,
  Play,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AudioSettings, GraphicsQuality } from '../../game/core/types';

interface PauseModalProps {
  quality: GraphicsQuality;
  audio: AudioSettings;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  onChangeQuality: (q: GraphicsQuality) => void;
  onChangeAudio: (partial: Partial<AudioSettings>) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  quality,
  audio,
  onResume,
  onRestart,
  onMainMenu,
  onChangeQuality,
  onChangeAudio,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/98 border border-amber-400/50 shadow-[0_0_50px_rgba(0,0,0,0.9)] p-5 sm:p-6 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <span className="text-[10px] font-display tracking-[0.25em] text-sky-400 uppercase">
              COMBAT SYSTEM PAUSED
            </span>
            <h2 className="font-display font-black text-2xl text-amber-300">
              TACTICAL COMMAND
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onChangeAudio({ muted: !audio.muted })}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center gap-1.5 text-xs font-display"
          >
            {audio.muted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>MUTED</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-sky-300" />
                <span>AUDIO ON</span>
              </>
            )}
          </button>
        </div>

        {/* Graphics Quality Settings */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-xs font-display text-slate-300 mb-2">
            <Monitor className="w-4 h-4 text-sky-400" />
            <span>GRAPHICS QUALITY</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onChangeQuality(q)}
                className={`py-2 rounded-lg font-display font-bold text-xs border transition-all ${
                  quality === q
                    ? 'bg-amber-500 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Mixers */}
        <div className="mb-5 space-y-2.5 bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-display text-slate-300 mb-1">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>SOUND MIXER</span>
          </div>

          <label className="flex items-center justify-between gap-3 text-xs">
            <span className="w-24 text-slate-300 font-tech">MASTER ({Math.round(audio.masterVolume * 100)}%)</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audio.masterVolume}
              onChange={(e) => onChangeAudio({ masterVolume: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-400"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-xs">
            <span className="w-24 text-slate-300 font-tech">MUSIC ({Math.round(audio.musicVolume * 100)}%)</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audio.musicVolume}
              onChange={(e) => onChangeAudio({ musicVolume: parseFloat(e.target.value) })}
              className="flex-1 accent-sky-400"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-xs">
            <span className="w-24 text-slate-300 font-tech">SFX ({Math.round(audio.sfxVolume * 100)}%)</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={audio.sfxVolume}
              onChange={(e) => onChangeAudio({ sfxVolume: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-400"
            />
          </label>
        </div>

        {/* Controls Quick Summary */}
        <div className="mb-5 text-[11px] text-slate-300/90 bg-slate-900/60 border border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-1.5">
          <div><strong className="text-amber-300">WASD:</strong> Move (+Shift Run)</div>
          <div><strong className="text-amber-300">LMB / J:</strong> 3-Hit Combo</div>
          <div><strong className="text-sky-300">Q / E / R:</strong> Skills 1–3</div>
          <div><strong className="text-yellow-300">F:</strong> Divine Ultimate</div>
          <div><strong className="text-sky-300">SPACE:</strong> Thruster Dash</div>
          <div><strong className="text-slate-200">Drag / Wheel:</strong> Camera</div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-display font-black text-xs flex items-center justify-center gap-1.5 shadow-lg"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-display font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};

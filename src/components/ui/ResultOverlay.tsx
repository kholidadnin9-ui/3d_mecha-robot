import React from 'react';
import { Award, Home, RotateCcw, ShieldOff, Trophy } from 'lucide-react';
import { GameStateMode, MatchStats } from '../../game/core/types';

interface ResultOverlayProps {
  mode: GameStateMode;
  stats: MatchStats;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  mode,
  stats,
  onRestart,
  onMainMenu,
}) => {
  if (mode !== 'VICTORY' && mode !== 'DEFEAT') return null;

  const isVictory = mode === 'VICTORY';
  const grade = !isVictory
    ? 'C'
    : stats.score >= 8500
      ? 'S+'
      : stats.score >= 6500
        ? 'S'
        : stats.score >= 4500
          ? 'A'
          : 'B';

  return (
    <div className="fixed inset-0 z-40 bg-gradient-to-t from-slate-950/92 via-slate-950/45 to-slate-950/75 flex items-end sm:items-center justify-center p-4">
      <div
        className={`w-full max-w-xl rounded-2xl p-6 sm:p-8 backdrop-blur-md border-2 shadow-2xl text-center ${
          isVictory
            ? 'bg-slate-950/88 border-amber-400/80 shadow-[0_0_70px_rgba(251,191,36,0.45)]'
            : 'bg-slate-950/90 border-rose-500/80 shadow-[0_0_70px_rgba(244,63,94,0.45)]'
        }`}
      >
        <div className="flex justify-center mb-2">
          {isVictory ? (
            <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.65)]">
              <Trophy className="w-9 h-9 text-amber-300" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.65)]">
              <ShieldOff className="w-9 h-9 text-rose-400" />
            </div>
          )}
        </div>

        <span
          className={`text-xs font-display tracking-[0.3em] uppercase ${
            isVictory ? 'text-sky-300' : 'text-rose-300'
          }`}
        >
          {isVictory ? 'CRIMSON DESTROYER NEUTRALIZED' : 'AEGIS CORE CRITICAL FAILURE'}
        </span>

        <h1
          className={`font-display font-black text-4xl sm:text-6xl italic tracking-wider mt-1 mb-5 ${
            isVictory
              ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500'
              : 'text-transparent bg-clip-text bg-gradient-to-b from-rose-200 via-rose-500 to-red-800'
          }`}
        >
          {isVictory ? 'VICTORY' : 'DEFEAT'}
        </h1>

        {/* Match Combat Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 text-left">
          <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-800">
            <div className="text-[10px] font-display text-slate-400 uppercase">SCORE</div>
            <div className="font-display font-black text-lg text-amber-300">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-800">
            <div className="text-[10px] font-display text-slate-400 uppercase">DAMAGE</div>
            <div className="font-display font-black text-lg text-sky-300">
              {stats.damageDealt.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-800">
            <div className="text-[10px] font-display text-slate-400 uppercase">TIME</div>
            <div className="font-display font-black text-lg text-white">
              {Math.round(stats.elapsedSeconds)}s
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/85 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-display text-slate-400 uppercase">RANK</div>
              <div className="font-display font-black text-xl text-yellow-300">{grade}</div>
            </div>
            <Award className="w-6 h-6 text-amber-400/70" />
          </div>
        </div>

        {/* Replay / Menu Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-display font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(245,158,11,0.55)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>BATTLE AGAIN</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};

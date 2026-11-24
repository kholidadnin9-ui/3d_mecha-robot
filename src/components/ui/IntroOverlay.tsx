import React from 'react';
import { Swords } from 'lucide-react';
import { GameStateMode } from '../../game/core/types';

interface IntroOverlayProps {
  mode: GameStateMode;
  bannerText: string;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ mode, bannerText }) => {
  if (mode !== 'INTRO' && mode !== 'BATTLE_START') return null;

  const isEngage = mode === 'BATTLE_START';

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col items-center text-center">
        {isEngage ? (
          <div className="px-10 py-4 rounded-2xl bg-gradient-to-r from-transparent via-amber-500/35 to-transparent border-y-2 border-amber-300 backdrop-blur-md shadow-[0_0_60px_rgba(251,191,36,0.75)] animate-bounce">
            <h2 className="font-display font-black text-5xl sm:text-7xl italic tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500 drop-shadow-[0_4px_24px_rgba(251,191,36,0.9)]">
              {bannerText}
            </h2>
          </div>
        ) : (
          <div className="w-full px-6 py-5 rounded-2xl bg-slate-950/80 border border-amber-400/50 backdrop-blur-md shadow-[0_0_50px_rgba(14,165,233,0.4)] flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-display tracking-[0.3em] uppercase">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>MECHA COLOSSEUM — CHAMPIONSHIP DUEL</span>
              <Swords className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-1">
              <span className="font-display font-black text-xl sm:text-3xl text-amber-300">
                GOLDEN GUARDIAN
              </span>
              <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-display font-black text-sm">
                VS
              </span>
              <span className="font-display font-black text-xl sm:text-3xl text-rose-400">
                CRIMSON DESTROYER
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

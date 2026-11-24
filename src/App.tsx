import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertOctagon } from 'lucide-react';
import { MechaGameEngine } from './game/engine/MechaGameEngine';
import {
  AudioSettings,
  DifficultyLevel,
  GraphicsQuality,
  HUDStateSnapshot,
  SkillSlotId,
} from './game/core/types';
import { MainMenu } from './components/ui/MainMenu';
import { IntroOverlay } from './components/ui/IntroOverlay';
import { BattleHUD } from './components/ui/BattleHUD';
import { PauseModal } from './components/ui/PauseModal';
import { ResultOverlay } from './components/ui/ResultOverlay';

const INITIAL_HUD: HUDStateSnapshot = {
  mode: 'MAIN_MENU',
  introBannerText: '',
  matchTimeRemaining: 180,
  score: 0,
  comboCount: 0,
  comboTimerRatio: 0,
  player: {
    name: 'GOLDEN GUARDIAN',
    title: 'DIVINE AEGIS VANGUARD',
    hp: 2400,
    maxHp: 2400,
    trailHp: 2400,
    energy: 100,
    maxEnergy: 100,
    isStunned: false,
    animState: 'IDLE',
    portraitUrl: '',
  },
  enemy: {
    name: 'CRIMSON DESTROYER',
    title: 'HELLFIRE SIEGE OVERLORD',
    hp: 2600,
    maxHp: 2600,
    trailHp: 2600,
    energy: 100,
    maxEnergy: 100,
    aiState: 'IDLE',
    isStunned: false,
    warningText: null,
    portraitUrl: '',
  },
  skills: {
    basic: { cooldown: 0, maxCooldown: 0.18, energyCost: 0, canCast: false, isActive: false },
    dash: { cooldown: 0, maxCooldown: 2.6, energyCost: 12, canCast: false, isActive: false },
    skill1: { cooldown: 0, maxCooldown: 5.5, energyCost: 22, canCast: false, isActive: false },
    skill2: { cooldown: 0, maxCooldown: 8.0, energyCost: 30, canCast: false, isActive: false },
    skill3: { cooldown: 0, maxCooldown: 9.5, energyCost: 32, canCast: false, isActive: false },
    ultimate: { cooldown: 0, maxCooldown: 22.0, energyCost: 55, canCast: false, isActive: false },
  },
  activeSkillBanner: null,
  damagePopups: [],
  fps: 60,
  quality: 'HIGH',
  difficulty: 'NORMAL',
  matchStats: {
    damageDealt: 0,
    damageTaken: 0,
    maxCombo: 0,
    skillsUsed: 0,
    score: 0,
    elapsedSeconds: 0,
  },
  webglError: null,
};

export function App() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MechaGameEngine | null>(null);

  const [hud, setHud] = useState<HUDStateSnapshot>(INITIAL_HUD);
  const [audio, setAudio] = useState<AudioSettings>({
    masterVolume: 0.8,
    musicVolume: 0.38,
    sfxVolume: 0.85,
    muted: false,
  });

  useEffect(() => {
    if (!viewportRef.current) return;

    const engine = new MechaGameEngine(viewportRef.current, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    setAudio(engine.getAudioSettings());

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartBattle = useCallback(() => {
    engineRef.current?.startBattle();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartBattle();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseBattle();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeBattle();
  }, []);

  const handleMainMenu = useCallback(() => {
    engineRef.current?.returnToMainMenu();
  }, []);

  const handleJoystickChange = useCallback((x: number, y: number) => {
    engineRef.current?.setJoystickInput(x, y);
  }, []);

  const handleTriggerSkill = useCallback((slot: SkillSlotId) => {
    engineRef.current?.triggerPlayerAction(slot);
  }, []);

  const handleJump = useCallback(() => {
    engineRef.current?.triggerJump();
  }, []);

  const handleChangeQuality = useCallback((q: GraphicsQuality) => {
    engineRef.current?.setGraphicsQuality(q);
  }, []);

  const handleChangeDifficulty = useCallback((d: DifficultyLevel) => {
    engineRef.current?.setDifficulty(d);
  }, []);

  const handleChangeAudio = useCallback((partial: Partial<AudioSettings>) => {
    if (!engineRef.current) return;
    engineRef.current.updateAudioSettings(partial);
    setAudio(engineRef.current.getAudioSettings());
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!engineRef.current) return;
    const cur = engineRef.current.getAudioSettings();
    engineRef.current.updateAudioSettings({ muted: !cur.muted });
    setAudio(engineRef.current.getAudioSettings());
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050811] select-none">
      {/* Real-time 3D Three.js Arena Viewport */}
      <div
        ref={viewportRef}
        className="absolute inset-0 w-full h-full game-touch-none"
      />

      {/* Graceful WebGL Fallback Diagnostic */}
      {hud.webglError && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md rounded-2xl bg-slate-900 border border-rose-500/60 p-6 text-center space-y-3">
            <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="font-display font-bold text-xl text-white">
              WebGL Initialization Error
            </h2>
            <p className="text-sm text-slate-300">{hud.webglError}</p>
          </div>
        </div>
      )}

      {/* MAIN MENU STATE */}
      {!hud.webglError && hud.mode === 'MAIN_MENU' && (
        <MainMenu
          hud={hud}
          isMuted={audio.muted}
          onStartBattle={handleStartBattle}
          onChangeDifficulty={handleChangeDifficulty}
          onChangeQuality={handleChangeQuality}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* CHARACTER INTRO & ENGAGE BANNER */}
      {!hud.webglError && (hud.mode === 'INTRO' || hud.mode === 'BATTLE_START') && (
        <IntroOverlay mode={hud.mode} bannerText={hud.introBannerText} />
      )}

      {/* ACTIVE COMBAT / INTRO MOBA HUD */}
      {!hud.webglError &&
        (hud.mode === 'ACTIVE_COMBAT' ||
          hud.mode === 'INTRO' ||
          hud.mode === 'BATTLE_START' ||
          hud.mode === 'PAUSED') && (
          <BattleHUD
            hud={hud}
            isMuted={audio.muted}
            onJoystickChange={handleJoystickChange}
            onTriggerSkill={handleTriggerSkill}
            onJump={handleJump}
            onPause={handlePause}
            onToggleMute={handleToggleMute}
          />
        )}

      {/* PAUSE & SETTINGS MODAL */}
      {!hud.webglError && hud.mode === 'PAUSED' && (
        <PauseModal
          quality={hud.quality}
          audio={audio}
          onResume={handleResume}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
          onChangeQuality={handleChangeQuality}
          onChangeAudio={handleChangeAudio}
        />
      )}

      {/* VICTORY & DEFEAT CINEMATIC PRESENTATION */}
      {!hud.webglError && (hud.mode === 'VICTORY' || hud.mode === 'DEFEAT') && (
        <ResultOverlay
          mode={hud.mode}
          stats={hud.matchStats}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
        />
      )}
    </main>
  );
}

export default App;

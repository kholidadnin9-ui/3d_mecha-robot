import React, { useRef, useState } from 'react';

interface VirtualJoystickProps {
  onChange: (x: number, y: number) => void;
  disabled?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onChange,
  disabled = false,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const [isSprint, setIsSprint] = useState(false);

  const maxRadius = 46;
  const deadZone = 0.08;

  const updateFromClientXY = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;

    const rawDx = clientX - centerX;
    const rawDy = clientY - centerY;
    const dist = Math.hypot(rawDx, rawDy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(rawDy, rawDx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    setKnobPos({ x: kx, y: ky });

    const normMag = clampedDist / maxRadius;
    setIsSprint(normMag > 0.72);

    if (normMag < deadZone) {
      onChange(0, 0);
    } else {
      onChange(kx / maxRadius, ky / maxRadius);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || activePointerId.current !== null) return;
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsActive(true);
    updateFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    updateFromClientXY(e.clientX, e.clientY);
  };

  const resetStick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    activePointerId.current = null;
    setIsActive(false);
    setIsSprint(false);
    setKnobPos({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5">
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={resetStick}
        onPointerCancel={resetStick}
        className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-full game-touch-none flex items-center justify-center transition-all duration-150 ${
          isActive
            ? 'bg-slate-950/75 border-2 border-amber-400/80 shadow-[0_0_26px_rgba(251,191,36,0.35)]'
            : 'bg-slate-950/55 border-2 border-sky-400/40 shadow-[0_0_16px_rgba(14,165,233,0.2)]'
        } backdrop-blur-md`}
      >
        {/* Outer tactical compass ticks */}
        <div className="absolute inset-2 rounded-full border border-dashed border-sky-300/25 pointer-events-none" />
        <div className="absolute top-2 text-[9px] font-display text-sky-300/50 pointer-events-none">
          ▲
        </div>
        <div className="absolute bottom-2 text-[9px] font-display text-sky-300/50 pointer-events-none">
          ▼
        </div>
        <div className="absolute left-2.5 text-[9px] font-display text-sky-300/50 pointer-events-none">
          ◀
        </div>
        <div className="absolute right-2.5 text-[9px] font-display text-sky-300/50 pointer-events-none">
          ▶
        </div>

        {/* Center anchor ring */}
        <div className="w-6 h-6 rounded-full border border-amber-400/30 bg-amber-400/10 pointer-events-none" />

        {/* Movable Mecha Thumb Puck */}
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className={`absolute w-13 h-13 sm:w-14 sm:h-14 rounded-full pointer-events-none flex items-center justify-center transition-colors ${
            isSprint
              ? 'bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 border-2 border-yellow-100 shadow-[0_0_20px_rgba(251,191,36,0.85)]'
              : isActive
                ? 'bg-gradient-to-br from-sky-300 via-sky-500 to-blue-700 border-2 border-white shadow-[0_0_16px_rgba(56,189,248,0.8)]'
                : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 border-2 border-amber-400/75 shadow-lg'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white/30 border border-white/60" />
        </div>
      </div>

      <span className="hidden sm:block text-[10px] font-tech tracking-widest uppercase text-slate-300/70">
        WASD / Drag Stick
      </span>
    </div>
  );
};

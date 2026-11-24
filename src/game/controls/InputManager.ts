import { SkillSlotId } from '../core/types';

export interface InputCallbacks {
  onSkillTrigger: (slot: SkillSlotId) => void;
  onJump: () => void;
  onPauseToggle: () => void;
  onCameraRotate: (dx: number, dy: number) => void;
  onCameraZoom: (delta: number) => void;
  onAnyInteraction: () => void;
}

export class InputManager {
  private keys = new Set<string>();
  private joystickVec = { x: 0, y: 0 }; // x: [-1, 1], y: [-1, 1] (up is -1 in screen space)

  private isPointerDragging = false;
  private activeCameraPointerId: number | null = null;
  private pointerDownPos = { x: 0, y: 0 };
  private lastPointerPos = { x: 0, y: 0 };
  private pointerButton = 0;

  constructor(
    private canvasElement: HTMLElement,
    private callbacks: InputCallbacks
  ) {
    this.bindEvents();
  }

  public setJoystickInput(x: number, y: number): void {
    this.joystickVec.x = x;
    this.joystickVec.y = y;
  }

  public getJoystickInput(): { x: number; y: number } {
    return this.joystickVec;
  }

  /**
   * Returns combined movement vector in camera-local XZ plane:
   * x = right (+1) / left (-1), z = away/forward (-1) / toward camera (+1)
   */
  public getMovementState(): {
    dirX: number;
    dirZ: number;
    magnitude: number;
    isRunning: boolean;
  } {
    let kx = 0;
    let kz = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kx += 1;

    if (kx !== 0 || kz !== 0) {
      const len = Math.hypot(kx, kz);
      return {
        dirX: kx / len,
        dirZ: kz / len,
        magnitude: 1,
        isRunning: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      };
    }

    // Virtual Joystick input
    const jMag = Math.hypot(this.joystickVec.x, this.joystickVec.y);
    if (jMag > 0.08) {
      const clampedMag = Math.min(1, jMag);
      return {
        dirX: this.joystickVec.x / jMag,
        dirZ: this.joystickVec.y / jMag,
        magnitude: clampedMag,
        isRunning: clampedMag > 0.72,
      };
    }

    return { dirX: 0, dirZ: 0, magnitude: 0, isRunning: false };
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore if typing inside an input element
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    this.callbacks.onAnyInteraction();

    if (e.repeat) return;
    this.keys.add(e.code);

    switch (e.code) {
      case 'Escape':
        e.preventDefault();
        this.callbacks.onPauseToggle();
        break;
      case 'KeyJ':
        this.callbacks.onSkillTrigger('basic');
        break;
      case 'KeyQ':
        this.callbacks.onSkillTrigger('skill1');
        break;
      case 'KeyE':
        this.callbacks.onSkillTrigger('skill2');
        break;
      case 'KeyR':
        this.callbacks.onSkillTrigger('skill3');
        break;
      case 'KeyF':
        this.callbacks.onSkillTrigger('ultimate');
        break;
      case 'Space':
        e.preventDefault();
        this.callbacks.onSkillTrigger('dash');
        break;
      case 'KeyK':
      case 'KeyC':
        this.callbacks.onJump();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.keys.clear();
    this.joystickVec.x = 0;
    this.joystickVec.y = 0;
    this.activeCameraPointerId = null;
    this.isPointerDragging = false;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.callbacks.onAnyInteraction();
    if (this.activeCameraPointerId !== null) return;

    this.activeCameraPointerId = e.pointerId;
    this.pointerButton = e.button;
    this.isPointerDragging = false;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.lastPointerPos = { x: e.clientX, y: e.clientY };
    try {
      this.canvasElement.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors on synthetic events
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.activeCameraPointerId) return;

    const dx = e.clientX - this.lastPointerPos.x;
    const dy = e.clientY - this.lastPointerPos.y;
    const totalMove = Math.hypot(
      e.clientX - this.pointerDownPos.x,
      e.clientY - this.pointerDownPos.y
    );

    if (totalMove > 7) {
      this.isPointerDragging = true;
    }

    if (this.isPointerDragging) {
      this.callbacks.onCameraRotate(dx, dy);
    }

    this.lastPointerPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.activeCameraPointerId) return;

    // On desktop mouse: a quick left-click on the 3D arena (not a camera drag) triggers Basic Attack!
    if (
      e.pointerType === 'mouse' &&
      this.pointerButton === 0 &&
      !this.isPointerDragging
    ) {
      this.callbacks.onSkillTrigger('basic');
    }

    this.activeCameraPointerId = null;
    this.isPointerDragging = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.callbacks.onCameraZoom(e.deltaY * 0.008);
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    this.canvasElement.addEventListener('pointerdown', this.handlePointerDown);
    this.canvasElement.addEventListener('pointermove', this.handlePointerMove);
    this.canvasElement.addEventListener('pointerup', this.handlePointerUp);
    this.canvasElement.addEventListener('pointercancel', this.handlePointerUp);
    this.canvasElement.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvasElement.addEventListener('contextmenu', this.handleContextMenu);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);

    this.canvasElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvasElement.removeEventListener('pointermove', this.handlePointerMove);
    this.canvasElement.removeEventListener('pointerup', this.handlePointerUp);
    this.canvasElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvasElement.removeEventListener('wheel', this.handleWheel);
    this.canvasElement.removeEventListener('contextmenu', this.handleContextMenu);
  }
}

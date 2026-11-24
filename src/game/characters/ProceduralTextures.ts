import * as THREE from 'three';

export class ProceduralTextures {
  private textures: THREE.Texture[] = [];

  private register<T extends THREE.Texture>(tex: T): T {
    this.textures.push(tex);
    return tex;
  }

  /**
   * Generates ornate golden scrollwork filigree on pearl-white (Guardian) or crimson-black (Destroyer) armor
   * matching the reference character's shoulders, gauntlets, and flared shin greaves.
   */
  public createFiligreeArmorTexture(
    baseColor: string,
    filigreeColor: string,
    accentTrim: string
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Subtle metallic gradient base
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(0.5, baseColor);
    grad.addColorStop(1, accentTrim);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle armor panel seam lines
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 476, 476);

    // Draw symmetrical Baroque gold scrollwork motifs
    const drawScrollHalf = (mirror: number) => {
      ctx.save();
      ctx.translate(256, 265);
      ctx.scale(mirror, 1);

      ctx.strokeStyle = filigreeColor;
      ctx.fillStyle = filigreeColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Primary S-scroll flourish
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(0, 115);
      ctx.bezierCurveTo(26, 75, 115, 95, 130, 20);
      ctx.bezierCurveTo(142, -45, 75, -95, 42, -55);
      ctx.bezierCurveTo(22, -30, 52, -5, 72, -25);
      ctx.stroke();

      // Secondary upper acanthus curl
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(52, -62);
      ctx.bezierCurveTo(68, -125, 18, -165, 0, -145);
      ctx.stroke();

      // Outer wing leaf flourish
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(95, 58);
      ctx.bezierCurveTo(155, 65, 182, 12, 152, -25);
      ctx.stroke();

      // Lower curl
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(35, 88);
      ctx.bezierCurveTo(75, 135, 135, 132, 145, 92);
      ctx.stroke();

      // Central teardrop & diamond accents
      ctx.beginPath();
      ctx.moveTo(0, -175);
      ctx.lineTo(18, -145);
      ctx.lineTo(0, -115);
      ctx.closePath();
      ctx.fill();

      // Decorative leaf buds
      const buds = [
        [82, 18, 9],
        [120, -48, 7],
        [56, 116, 7],
      ];
      for (const [bx, by, br] of buds) {
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    // Soft shadow under filigree for embossed metallic depth
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.translate(0, 4);
    drawScrollHalf(1);
    drawScrollHalf(-1);
    ctx.restore();

    drawScrollHalf(1);
    drawScrollHalf(-1);

    // Top & bottom gold trim bands
    ctx.fillStyle = filigreeColor;
    ctx.fillRect(0, 0, 512, 26);
    ctx.fillRect(0, 486, 512, 26);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return this.register(tex);
  }

  /**
   * Generates the heraldic left-chest crest shield texture seen on the reference robot.
   */
  public createChestCrestTexture(primaryBg: string, goldColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = primaryBg;
    ctx.fillRect(0, 0, 256, 256);

    // Diagonal metallic highlight half
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(140, 0);
    ctx.lineTo(75, 256);
    ctx.lineTo(0, 256);
    ctx.closePath();
    ctx.fill();

    // Right side ornate gold filigree pattern inside shield
    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(170, 65 + i * 38, 24 - i * 3, 0.3, Math.PI * 1.5);
      ctx.stroke();
    }

    // Gold border & center banner bar
    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 236, 236);

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(16, 114, 224, 34);
    ctx.strokeStyle = goldColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 114, 224, 34);

    // Stylized emblem stars/runes in banner
    ctx.fillStyle = goldColor;
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AEGIS CORE', 128, 137);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return this.register(tex);
  }

  /**
   * Generates futuristic circular arena metallic hex-grid + glowing energy circuit lines.
   */
  public createArenaFloorTexture(): {
    map: THREE.CanvasTexture;
    emissiveMap: THREE.CanvasTexture;
  } {
    const size = 1024;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const cCtx = colorCanvas.getContext('2d')!;

    const emCanvas = document.createElement('canvas');
    emCanvas.width = size;
    emCanvas.height = size;
    const eCtx = emCanvas.getContext('2d')!;

    // Dark brushed titanium base
    const radGrad = cCtx.createRadialGradient(512, 512, 40, 512, 512, 512);
    radGrad.addColorStop(0, '#182438');
    radGrad.addColorStop(0.55, '#101826');
    radGrad.addColorStop(0.92, '#0b101b');
    radGrad.addColorStop(1, '#1e293b');
    cCtx.fillStyle = radGrad;
    cCtx.fillRect(0, 0, size, size);

    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, size, size);

    // Subtle metallic hex grid
    cCtx.strokeStyle = 'rgba(148, 163, 184, 0.11)';
    cCtx.lineWidth = 1.5;
    const r = 28;
    const dx = r * 1.5;
    const dy = r * Math.sqrt(3);
    for (let gx = 0; gx < size + dx; gx += dx) {
      for (let gy = 0; gy < size + dy; gy += dy) {
        const offsetY = Math.round(gx / dx) % 2 === 0 ? 0 : dy / 2;
        cCtx.beginPath();
        for (let side = 0; side < 6; side++) {
          const ang = (Math.PI / 3) * side;
          const px = gx + Math.cos(ang) * r;
          const py = gy + offsetY + Math.sin(ang) * r;
          if (side === 0) cCtx.moveTo(px, py);
          else cCtx.lineTo(px, py);
        }
        cCtx.closePath();
        cCtx.stroke();
      }
    }

    // Concentric tactical combat rings
    const rings = [125, 240, 365, 468, 492];
    rings.forEach((radius, idx) => {
      cCtx.beginPath();
      cCtx.arc(512, 512, radius, 0, Math.PI * 2);
      cCtx.strokeStyle = idx === 4 ? '#f59e0b' : '#38bdf8';
      cCtx.lineWidth = idx === 4 ? 6 : 3;
      cCtx.stroke();

      eCtx.beginPath();
      eCtx.arc(512, 512, radius, 0, Math.PI * 2);
      eCtx.strokeStyle = idx === 4 ? '#f59e0b' : idx % 2 === 0 ? '#0ea5e9' : '#38bdf8';
      eCtx.lineWidth = idx === 4 ? 6 : 3.5;
      eCtx.stroke();
    });

    // Radial energy conduits from central reactor
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const x1 = 512 + Math.cos(ang) * 125;
      const y1 = 512 + Math.sin(ang) * 125;
      const x2 = 512 + Math.cos(ang) * 468;
      const y2 = 512 + Math.sin(ang) * 468;

      cCtx.beginPath();
      cCtx.moveTo(x1, y1);
      cCtx.lineTo(x2, y2);
      cCtx.strokeStyle = i % 3 === 0 ? '#fbbf24' : '#38bdf8';
      cCtx.lineWidth = i % 3 === 0 ? 4 : 2;
      cCtx.stroke();

      eCtx.beginPath();
      eCtx.moveTo(x1, y1);
      eCtx.lineTo(x2, y2);
      eCtx.strokeStyle = i % 3 === 0 ? '#fbbf24' : '#0284c7';
      eCtx.lineWidth = i % 3 === 0 ? 4 : 2.5;
      eCtx.stroke();
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;

    const emissiveMap = new THREE.CanvasTexture(emCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.anisotropy = 4;

    return {
      map: this.register(map),
      emissiveMap: this.register(emissiveMap),
    };
  }

  /**
   * Soft radial glow particle sprite for Three.js Points & shockwaves.
   */
  public createGlowParticleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.28, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return this.register(tex);
  }

  /**
   * Skyscraper emissive window grid texture for distant futuristic skyline.
   */
  public createBuildingWindowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, 128, 256);

    for (let y = 8; y < 248; y += 10) {
      for (let x = 8; x < 120; x += 14) {
        const r = Math.random();
        if (r > 0.36) {
          ctx.fillStyle =
            r > 0.9 ? '#fbbf24' : r > 0.72 ? '#38bdf8' : 'rgba(125, 211, 252, 0.45)';
          ctx.fillRect(x, y, 8, 5);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return this.register(tex);
  }

  public dispose(): void {
    for (const tex of this.textures) {
      tex.dispose();
    }
    this.textures = [];
  }
}

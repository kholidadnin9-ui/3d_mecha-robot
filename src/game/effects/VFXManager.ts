import * as THREE from 'three';
import { GraphicsQuality } from '../core/types';
import { ProceduralTextures } from '../characters/ProceduralTextures';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  r: number;
  g: number;
  b: number;
  size: number;
  age: number;
  maxAge: number;
}

interface TransientEffectMesh {
  obj: THREE.Object3D;
  age: number;
  maxAge: number;
  onUpdate: (progress: number, dt: number) => void;
  disposeResources: () => void;
}

export class VFXManager {
  private maxParticles = 800;
  private particles: ParticleSlot[] = [];
  private pointsGeo!: THREE.BufferGeometry;
  private pointsMat!: THREE.PointsMaterial;
  private pointsMesh!: THREE.Points;
  private posAttr!: THREE.BufferAttribute;
  private colAttr!: THREE.BufferAttribute;

  private activeMeshes: TransientEffectMesh[] = [];
  private flashLight!: THREE.PointLight;
  private flashTimer = 0;

  // Shared reusable unit geometries
  private unitSphereGeo = new THREE.SphereGeometry(1, 20, 16);
  private unitRingGeo = new THREE.RingGeometry(0.72, 1.0, 36);
  private unitCircleGeo = new THREE.CircleGeometry(1, 36);
  private qualityScale = 1.0;

  constructor(
    private scene: THREE.Scene,
    texGen: ProceduralTextures,
    quality: GraphicsQuality
  ) {
    this.setQuality(quality);

    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        r: 1,
        g: 1,
        b: 1,
        size: 0.3,
        age: 0,
        maxAge: 1,
      });
      positions[i * 3 + 1] = -999;
    }

    this.pointsGeo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.colAttr = new THREE.BufferAttribute(colors, 3);
    this.pointsGeo.setAttribute('position', this.posAttr);
    this.pointsGeo.setAttribute('color', this.colAttr);

    const spriteTex = texGen.createGlowParticleTexture();
    this.pointsMat = new THREE.PointsMaterial({
      size: 0.52,
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.pointsMesh = new THREE.Points(this.pointsGeo, this.pointsMat);
    this.pointsMesh.frustumCulled = false;
    this.scene.add(this.pointsMesh);

    this.flashLight = new THREE.PointLight(0xffd700, 0, 22, 1.5);
    this.scene.add(this.flashLight);
  }

  public setQuality(quality: GraphicsQuality): void {
    this.qualityScale = quality === 'HIGH' ? 1.0 : quality === 'MEDIUM' ? 0.65 : 0.38;
  }

  private emitParticle(opts: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    color: THREE.Color;
    maxAge: number;
    gravity?: number;
  }): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = opts.x;
        p.y = opts.y;
        p.z = opts.z;
        p.vx = opts.vx;
        p.vy = opts.vy;
        p.vz = opts.vz;
        p.gravity = opts.gravity ?? -9.8;
        p.r = opts.color.r;
        p.g = opts.color.g;
        p.b = opts.color.b;
        p.age = 0;
        p.maxAge = opts.maxAge;
        return;
      }
    }
  }

  public spawnHitSparks(pos: THREE.Vector3, primaryHex = 0xfbbf24, heavy = false): void {
    const count = Math.max(6, Math.round((heavy ? 32 : 18) * this.qualityScale));
    const c1 = new THREE.Color(primaryHex);
    const c2 = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      const speed = (heavy ? 9.5 : 6.2) * (0.4 + Math.random() * 0.8);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      this.emitParticle({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.abs(Math.cos(phi)) * speed + 2.2,
        vz: Math.sin(phi) * Math.sin(theta) * speed,
        color: i % 3 === 0 ? c2 : c1,
        maxAge: 0.25 + Math.random() * 0.28,
        gravity: -15,
      });
    }

    // Brief metallic impact flash sphere
    const mat = new THREE.MeshBasicMaterial({
      color: primaryHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flashMesh = new THREE.Mesh(this.unitSphereGeo, mat);
    flashMesh.position.copy(pos);
    const targetScale = heavy ? 1.45 : 0.85;
    this.scene.add(flashMesh);

    this.activeMeshes.push({
      obj: flashMesh,
      age: 0,
      maxAge: 0.16,
      onUpdate: (prog) => {
        const s = 0.2 + prog * targetScale;
        flashMesh.scale.setScalar(s);
        mat.opacity = 0.85 * (1 - prog);
      },
      disposeResources: () => mat.dispose(),
    });
  }

  public spawnDashTrail(pos: THREE.Vector3, hexColor = 0x38bdf8): void {
    const count = Math.max(4, Math.round(14 * this.qualityScale));
    const col = new THREE.Color(hexColor);
    for (let i = 0; i < count; i++) {
      this.emitParticle({
        x: pos.x + (Math.random() - 0.5) * 0.8,
        y: pos.y + 0.5 + Math.random() * 1.2,
        z: pos.z + (Math.random() - 0.5) * 0.8,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 0.8 + Math.random() * 1.8,
        vz: (Math.random() - 0.5) * 2.5,
        color: col,
        maxAge: 0.25 + Math.random() * 0.2,
        gravity: 0.5,
      });
    }
  }

  public spawnShockwave(
    center: THREE.Vector3,
    maxRadius: number,
    hexColor: number,
    duration = 0.48
  ): void {
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(this.unitRingGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x, 0.08, center.z);
    this.scene.add(ring);

    this.activeMeshes.push({
      obj: ring,
      age: 0,
      maxAge: duration,
      onUpdate: (prog) => {
        const ease = 1 - Math.pow(1 - prog, 3);
        ring.scale.setScalar(0.35 + ease * maxRadius);
        mat.opacity = 0.92 * (1 - prog);
      },
      disposeResources: () => mat.dispose(),
    });
  }

  public spawnGroundDecal(center: THREE.Vector3, radius: number, hexColor: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const decal = new THREE.Mesh(this.unitRingGeo, mat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(center.x, 0.035, center.z);
    decal.scale.setScalar(radius);
    this.scene.add(decal);

    this.activeMeshes.push({
      obj: decal,
      age: 0,
      maxAge: 2.8,
      onUpdate: (prog) => {
        mat.opacity = 0.52 * (1 - prog);
      },
      disposeResources: () => mat.dispose(),
    });
  }

  /**
   * Builds a jagged 3D lightning bolt + branching forks from sky/origin to target!
   */
  public spawnLightningStrike(
    targetPos: THREE.Vector3,
    primaryHex = 0xfde047,
    secondaryHex = 0x38bdf8,
    scale = 1.0
  ): void {
    const group = new THREE.Group();
    const disposables: Array<{ dispose: () => void }> = [];

    const createBoltLine = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      segments: number,
      jitter: number,
      hex: number
    ) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const p = new THREE.Vector3().lerpVectors(start, end, t);
        if (i > 0 && i < segments) {
          p.x += (Math.random() - 0.5) * jitter;
          p.y += (Math.random() - 0.5) * jitter * 0.4;
          p.z += (Math.random() - 0.5) * jitter;
        }
        pts.push(p);
      }

      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, segments * 2, 0.075 * scale, 6, false);
      const mat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposables.push(tubeGeo, mat);
      const mesh = new THREE.Mesh(tubeGeo, mat);
      group.add(mesh);
      return { pts, mat };
    };

    const skyStart = new THREE.Vector3(
      targetPos.x + (Math.random() - 0.5) * 2.4,
      16 * scale,
      targetPos.z + (Math.random() - 0.5) * 2.4
    );
    const groundEnd = new THREE.Vector3(targetPos.x, 0.15, targetPos.z);

    // Core golden bolt + outer electric blue arc + 3 side branches
    const mainBolt = createBoltLine(skyStart, groundEnd, 12, 1.35 * scale, primaryHex);
    const arcBolt = createBoltLine(skyStart, groundEnd, 10, 1.75 * scale, secondaryHex);

    const branchMats: THREE.MeshBasicMaterial[] = [mainBolt.mat, arcBolt.mat];
    for (let b = 0; b < 3; b++) {
      const idx = 3 + b * 3;
      if (mainBolt.pts[idx]) {
        const branchEnd = mainBolt.pts[idx]
          .clone()
          .add(
            new THREE.Vector3(
              (Math.random() - 0.5) * 4.2 * scale,
              -2.5 * scale,
              (Math.random() - 0.5) * 4.2 * scale
            )
          );
        branchEnd.y = Math.max(0.2, branchEnd.y);
        const br = createBoltLine(mainBolt.pts[idx], branchEnd, 5, 0.65, secondaryHex);
        branchMats.push(br.mat);
      }
    }

    this.scene.add(group);

    // Bright illumination flash
    this.flashLight.color.setHex(primaryHex);
    this.flashLight.position.set(targetPos.x, 3.0, targetPos.z);
    this.flashLight.intensity = 10 * scale;
    this.flashTimer = 0.24;

    this.spawnShockwave(targetPos, 3.8 * scale, secondaryHex, 0.42);
    this.spawnGroundDecal(targetPos, 2.2 * scale, primaryHex);
    this.spawnHitSparks(
      new THREE.Vector3(targetPos.x, 1.0, targetPos.z),
      primaryHex,
      true
    );

    this.activeMeshes.push({
      obj: group,
      age: 0,
      maxAge: 0.34,
      onUpdate: (prog) => {
        const flicker = prog < 0.5 ? (Math.random() > 0.2 ? 1 : 0.35) : 1 - prog;
        branchMats.forEach((m) => {
          m.opacity = flicker;
        });
      },
      disposeResources: () => {
        disposables.forEach((d) => d.dispose());
      },
    });
  }

  /**
   * Expanding Golden/Crimson Plasma Energy Explosion Sphere + Fire/Smoke + Shockwave!
   */
  public spawnEnergyExplosion(
    center: THREE.Vector3,
    maxRadius: number,
    coreHex = 0xfef08a,
    outerHex = 0xf59e0b
  ): void {
    const group = new THREE.Group();
    group.position.set(center.x, center.y + 0.9, center.z);

    const innerMat = new THREE.MeshBasicMaterial({
      color: coreHex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerMat = new THREE.MeshBasicMaterial({
      color: outerHex,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const innerSphere = new THREE.Mesh(this.unitSphereGeo, innerMat);
    const outerSphere = new THREE.Mesh(this.unitSphereGeo, outerMat);
    group.add(innerSphere, outerSphere);
    this.scene.add(group);

    this.flashLight.color.setHex(outerHex);
    this.flashLight.position.set(center.x, 2.5, center.z);
    this.flashLight.intensity = 12;
    this.flashTimer = 0.32;

    this.spawnShockwave(center, maxRadius * 1.15, outerHex, 0.56);
    this.spawnGroundDecal(center, maxRadius * 0.65, outerHex);

    // Emit fire, golden plasma, and smoke particles
    const count = Math.max(16, Math.round(56 * this.qualityScale));
    const cCore = new THREE.Color(coreHex);
    const cOuter = new THREE.Color(outerHex);
    const cSmoke = new THREE.Color(0x64748b);

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.15) * Math.PI * 0.6;
      const spd = 4 + Math.random() * 11;
      const isSmoke = i % 5 === 0;
      this.emitParticle({
        x: center.x,
        y: center.y + 0.8,
        z: center.z,
        vx: Math.cos(ang) * Math.cos(elev) * spd,
        vy: Math.abs(Math.sin(elev)) * spd + 1.5,
        vz: Math.sin(ang) * Math.cos(elev) * spd,
        color: isSmoke ? cSmoke : i % 2 === 0 ? cCore : cOuter,
        maxAge: isSmoke ? 0.75 : 0.48 + Math.random() * 0.25,
        gravity: isSmoke ? 1.8 : -8.5,
      });
    }

    this.activeMeshes.push({
      obj: group,
      age: 0,
      maxAge: 0.48,
      onUpdate: (prog) => {
        const ease = 1 - Math.pow(1 - prog, 3);
        outerSphere.scale.setScalar(0.4 + ease * maxRadius * 0.85);
        innerSphere.scale.setScalar(0.25 + ease * maxRadius * 0.52);
        innerMat.opacity = 0.95 * (1 - prog);
        outerMat.opacity = 0.68 * (1 - prog);
      },
      disposeResources: () => {
        innerMat.dispose();
        outerMat.dispose();
      },
    });
  }

  /**
   * Spawns a crimson telegraph ring on the arena floor before Enemy Boss special attacks.
   */
  public spawnDangerTelegraph(center: THREE.Vector3, radius: number, duration: number): void {
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xff1e38,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xe11d48,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const group = new THREE.Group();
    group.position.set(center.x, 0.06, center.z);

    const outerBorder = new THREE.Mesh(this.unitRingGeo, borderMat);
    outerBorder.rotation.x = -Math.PI / 2;
    outerBorder.scale.setScalar(radius);

    const innerFill = new THREE.Mesh(this.unitCircleGeo, fillMat);
    innerFill.rotation.x = -Math.PI / 2;
    innerFill.scale.setScalar(0.05);

    group.add(outerBorder, innerFill);
    this.scene.add(group);

    this.activeMeshes.push({
      obj: group,
      age: 0,
      maxAge: duration,
      onUpdate: (prog) => {
        innerFill.scale.setScalar(Math.max(0.05, prog * radius));
        fillMat.opacity = 0.18 + prog * 0.35;
        borderMat.opacity = 0.9 * (1 - prog * 0.15);
      },
      disposeResources: () => {
        borderMat.dispose();
        fillMat.dispose();
      },
    });
  }

  public spawnAuraParticles(pos: THREE.Vector3, hexColor: number, count = 4): void {
    const col = new THREE.Color(hexColor);
    const actualCount = Math.max(1, Math.round(count * this.qualityScale));
    for (let i = 0; i < actualCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 0.45 + Math.random() * 0.95;
      this.emitParticle({
        x: pos.x + Math.cos(ang) * r,
        y: pos.y + 0.2 + Math.random() * 1.6,
        z: pos.z + Math.sin(ang) * r,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 2.5 + Math.random() * 2.8,
        vz: (Math.random() - 0.5) * 0.8,
        color: col,
        maxAge: 0.45 + Math.random() * 0.3,
        gravity: 1.2,
      });
    }
  }

  public clearAllTemporaryEffects(): void {
    for (const item of this.activeMeshes) {
      this.scene.remove(item.obj);
      item.disposeResources();
    }
    this.activeMeshes = [];

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i].active = false;
      this.posAttr.setXYZ(i, 0, -999, 0);
    }
    this.posAttr.needsUpdate = true;
    this.flashLight.intensity = 0;
  }

  public update(dt: number): void {
    // Update transient flash light
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      this.flashLight.intensity *= Math.pow(0.04, dt * 4);
    } else {
      this.flashLight.intensity = 0;
    }

    // Update pooled particles
    let dirty = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        this.posAttr.setXYZ(i, 0, -999, 0);
        continue;
      }

      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.05) {
        p.y = 0.05;
        p.vy *= -0.35;
      }

      const fade = 1 - p.age / p.maxAge;
      this.posAttr.setXYZ(i, p.x, p.y, p.z);
      this.colAttr.setXYZ(i, p.r * fade, p.g * fade, p.b * fade);
    }

    if (dirty) {
      this.posAttr.needsUpdate = true;
      this.colAttr.needsUpdate = true;
    }

    // Update transient meshes backwards so completed effects clean up safely
    for (let i = this.activeMeshes.length - 1; i >= 0; i--) {
      const m = this.activeMeshes[i];
      m.age += dt;
      const prog = Math.min(1, m.age / m.maxAge);
      m.onUpdate(prog, dt);
      if (m.age >= m.maxAge) {
        this.scene.remove(m.obj);
        m.disposeResources();
        this.activeMeshes.splice(i, 1);
      }
    }
  }

  public dispose(): void {
    this.clearAllTemporaryEffects();
    this.pointsGeo.dispose();
    this.pointsMat.dispose();
    this.unitSphereGeo.dispose();
    this.unitRingGeo.dispose();
    this.unitCircleGeo.dispose();
  }
}

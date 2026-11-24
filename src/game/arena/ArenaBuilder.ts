import * as THREE from 'three';
import { ARENA_RADIUS } from '../core/constants';
import { GraphicsQuality } from '../core/types';
import { ProceduralTextures } from '../characters/ProceduralTextures';

export class ArenaBuilder {
  public group = new THREE.Group();
  public ambientLight!: THREE.HemisphereLight;
  public keyLight!: THREE.DirectionalLight;
  public rimLightBlue!: THREE.DirectionalLight;
  public rimLightCrimson!: THREE.DirectionalLight;
  public reactorLight!: THREE.PointLight;

  private reactorRingOuter!: THREE.Mesh;
  private reactorRingInner!: THREE.Mesh;
  private skyHoloRings: THREE.Mesh[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];
  private darknessFactor = 0;

  private trackGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  public build(scene: THREE.Scene, texGen: ProceduralTextures, quality: GraphicsQuality): void {
    scene.fog = new THREE.FogExp2(0x060b18, 0.0068);
    scene.background = new THREE.Color(0x050914);

    // ================= LIGHTING =================
    this.ambientLight = new THREE.HemisphereLight(0x9ec5ff, 0x161f33, 1.05);
    scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xfff4dc, 2.35);
    this.keyLight.position.set(18, 32, 20);
    this.keyLight.castShadow = quality !== 'LOW';
    const shadowRes = quality === 'HIGH' ? 2048 : 1024;
    this.keyLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 90;
    const d = 26;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    scene.add(this.keyLight);

    this.rimLightBlue = new THREE.DirectionalLight(0x38bdf8, 1.15);
    this.rimLightBlue.position.set(-24, 16, -18);
    scene.add(this.rimLightBlue);

    this.rimLightCrimson = new THREE.DirectionalLight(0xf43f5e, 0.75);
    this.rimLightCrimson.position.set(22, 10, -20);
    scene.add(this.rimLightCrimson);

    this.reactorLight = new THREE.PointLight(0x38bdf8, 2.4, 24, 1.5);
    this.reactorLight.position.set(0, 0.8, 0);
    scene.add(this.reactorLight);

    // ================= MAIN CIRCULAR METALLIC DECK =================
    const floorTex = texGen.createArenaFloorTexture();
    const deckMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: floorTex.map,
        emissiveMap: floorTex.emissiveMap,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.95,
        metalness: 0.72,
        roughness: 0.28,
      })
    );

    const deckMesh = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(ARENA_RADIUS + 1.2, ARENA_RADIUS + 2.8, 1.8, 64)),
      deckMat
    );
    deckMesh.position.y = -0.9;
    deckMesh.receiveShadow = true;
    this.group.add(deckMesh);

    // Outer Heavy Beveled Armor Curb Ring
    const curbMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#1b2436',
        metalness: 0.84,
        roughness: 0.26,
      })
    );
    const goldTrimMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        metalness: 0.88,
        roughness: 0.2,
        emissive: new THREE.Color('#d97706'),
        emissiveIntensity: 0.35,
      })
    );

    const outerCurb = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(ARENA_RADIUS + 1.1, 0.55, 12, 64)),
      curbMat
    );
    outerCurb.rotation.x = Math.PI / 2;
    outerCurb.position.y = 0.08;
    outerCurb.receiveShadow = true;
    this.group.add(outerCurb);

    const boundaryNeonRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(ARENA_RADIUS + 0.35, 0.09, 8, 64)),
      goldTrimMat
    );
    boundaryNeonRing.rotation.x = Math.PI / 2;
    boundaryNeonRing.position.y = 0.06;
    this.group.add(boundaryNeonRing);

    // ================= CENTRAL ENERGY REACTOR =================
    const reactorWell = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(3.4, 3.0, 0.5, 32)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          color: '#071224',
          emissive: new THREE.Color('#0ea5e9'),
          emissiveIntensity: 1.4,
          metalness: 0.85,
          roughness: 0.15,
        })
      )
    );
    reactorWell.position.y = -0.23;
    this.group.add(reactorWell);

    const reactorGlass = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(3.45, 3.45, 0.06, 32)),
      this.trackMat(
        new THREE.MeshStandardMaterial({
          color: '#7dd3fc',
          transparent: true,
          opacity: 0.28,
          metalness: 0.9,
          roughness: 0.08,
        })
      )
    );
    reactorGlass.position.y = 0.01;
    reactorGlass.receiveShadow = true;
    this.group.add(reactorGlass);

    const ringGlowMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
      })
    );
    this.reactorRingOuter = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(2.6, 0.08, 8, 24)),
      ringGlowMat
    );
    this.reactorRingOuter.rotation.x = Math.PI / 2;
    this.reactorRingOuter.position.y = -0.04;
    this.group.add(this.reactorRingOuter);

    this.reactorRingInner = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(1.55, 0.09, 8, 18)),
      this.trackMat(new THREE.MeshBasicMaterial({ color: 0xfbbf24 }))
    );
    this.reactorRingInner.rotation.x = Math.PI / 2;
    this.reactorRingInner.position.y = -0.03;
    this.group.add(this.reactorRingInner);

    // ================= PERIMETER MECHANICAL PYLONS & BARRIER NODES =================
    const pylonCount = 12;
    const pylonBodyGeo = this.trackGeo(new THREE.BoxGeometry(1.5, 6.2, 2.2));
    const pylonGlowGeo = this.trackGeo(new THREE.BoxGeometry(0.24, 4.8, 0.28));
    const pylonCyanMat = this.trackMat(
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    const pylonRedMat = this.trackMat(
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );

    for (let i = 0; i < pylonCount; i++) {
      const angle = (i / pylonCount) * Math.PI * 2;
      const dist = ARENA_RADIUS + 2.6;
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(Math.cos(angle) * dist, 2.2, Math.sin(angle) * dist);
      pylonGroup.rotation.y = -angle + Math.PI / 2;

      const body = new THREE.Mesh(pylonBodyGeo, curbMat);
      body.rotation.x = -0.22; // angled dramatically outward
      body.castShadow = quality === 'HIGH';
      pylonGroup.add(body);

      const strip = new THREE.Mesh(
        pylonGlowGeo,
        i % 2 === 0 ? pylonCyanMat : pylonRedMat
      );
      strip.position.set(0, 0.3, 0.98);
      strip.rotation.x = -0.22;
      pylonGroup.add(strip);

      this.group.add(pylonGroup);
    }

    // ================= DISTANT FUTURISTIC MEGACITY SKYLINE =================
    const windowTex = texGen.createBuildingWindowTexture();
    const buildingMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#0b1324',
        emissiveMap: windowTex,
        emissive: new THREE.Color('#bae6fd'),
        emissiveIntensity: 0.85,
        metalness: 0.75,
        roughness: 0.35,
      })
    );

    const neonCyanTrim = this.trackMat(new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
    const neonGoldTrim = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    const neonCrimsonTrim = this.trackMat(new THREE.MeshBasicMaterial({ color: 0xe11d48 }));

    const buildingCount = quality === 'LOW' ? 28 : 48;
    const towerUnitGeo = this.trackGeo(new THREE.BoxGeometry(1, 1, 1));

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2 + (i % 3) * 0.04;
      const radius = 52 + (i % 5) * 14;
      const width = 5 + (i % 4) * 2.8;
      const depth = 5 + ((i + 2) % 4) * 2.5;
      const height = 26 + ((i * 17) % 58);

      const tower = new THREE.Mesh(towerUnitGeo, buildingMat);
      tower.scale.set(width, height, depth);
      tower.position.set(
        Math.cos(angle) * radius,
        height * 0.5 - 22,
        Math.sin(angle) * radius
      );
      tower.rotation.y = -angle;
      this.group.add(tower);

      // Rooftop neon crown bar
      const crownMat =
        i % 3 === 0 ? neonGoldTrim : i % 3 === 1 ? neonCyanTrim : neonCrimsonTrim;
      const crown = new THREE.Mesh(towerUnitGeo, crownMat);
      crown.scale.set(width * 1.03, 0.55, depth * 1.03);
      crown.position.set(
        tower.position.x,
        tower.position.y + height * 0.5 + 0.3,
        tower.position.z
      );
      crown.rotation.y = -angle;
      this.group.add(crown);
    }

    // Giant Floating Orbital Energy Halo Rings above the Colosseum
    for (let h = 0; h < 2; h++) {
      const holo = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(36 + h * 10, 0.16, 8, 64)),
        this.trackMat(
          new THREE.MeshBasicMaterial({
            color: h === 0 ? 0x38bdf8 : 0xfbbf24,
            transparent: true,
            opacity: 0.32,
          })
        )
      );
      holo.position.y = 26 + h * 8;
      holo.rotation.x = Math.PI / 2 + (h === 0 ? 0.14 : -0.18);
      this.group.add(holo);
      this.skyHoloRings.push(holo);
    }

    // Starfield / Atmospheric Cyber Dust Dome
    const starCount = quality === 'LOW' ? 220 : 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.46;
      const r = 115 + Math.random() * 35;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = this.trackGeo(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeo,
      this.trackMat(
        new THREE.PointsMaterial({
          color: 0xe0f2fe,
          size: 0.9,
          transparent: true,
          opacity: 0.75,
        })
      )
    );
    this.group.add(stars);

    scene.add(this.group);
  }

  public setQuality(quality: GraphicsQuality): void {
    this.keyLight.castShadow = quality !== 'LOW';
  }

  /**
   * Smoothly darkens the arena during Golden Guardian's Ultimate ("Divine Thunderstorm")
   * so lightning bolts & golden core radiance look truly cinematic!
   */
  public setUltimateDarkness(targetFactor: number): void {
    this.darknessFactor = THREE.MathUtils.clamp(targetFactor, 0, 1);
  }

  public update(dt: number, elapsed: number, scene: THREE.Scene): void {
    this.reactorRingOuter.rotation.z += dt * 0.65;
    this.reactorRingInner.rotation.z -= dt * 1.25;

    this.skyHoloRings.forEach((ring, idx) => {
      ring.rotation.z += dt * (idx === 0 ? 0.08 : -0.06);
    });

    // Smoothly apply Ultimate sky/lighting dimness
    const dim = 1 - this.darknessFactor * 0.78;
    this.ambientLight.intensity = 1.05 * dim;
    this.keyLight.intensity = 2.35 * dim;
    this.reactorLight.intensity =
      this.darknessFactor > 0.2
        ? 4.2 + Math.sin(elapsed * 22) * 1.4
        : 2.2 + Math.sin(elapsed * 3.5) * 0.35;
    this.reactorLight.color.setHex(this.darknessFactor > 0.2 ? 0xfbbf24 : 0x38bdf8);

    if (scene.background instanceof THREE.Color) {
      scene.background.setRGB(0.02 * dim, 0.035 * dim, 0.078 * dim);
    }
  }

  public dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries = [];
    this.materials = [];
  }
}

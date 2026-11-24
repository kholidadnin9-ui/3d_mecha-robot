import * as THREE from 'three';
import { CharacterId, MechaJoints } from '../core/types';
import { ProceduralTextures } from './ProceduralTextures';

export class MechaBuilder {
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.geometries.push(geo);
    return geo;
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.materials.push(mat);
    return mat;
  }

  public buildCharacter(id: CharacterId, texGen: ProceduralTextures): MechaJoints {
    const isGuardian = id === 'golden_guardian';

    // Reference-faithful PBR materials
    const primaryColor = isGuardian ? '#f6f8fc' : '#991220';
    const secondaryColor = isGuardian ? '#e2e8f0' : '#241418';
    const goldColor = isGuardian ? '#f5b82e' : '#df9f1f';
    const glowHex = isGuardian ? 0xffc83d : 0xff2222;
    const secondaryGlowHex = isGuardian ? 0x38bdf8 : 0xff6b00;

    const filigreeTex = texGen.createFiligreeArmorTexture(
      isGuardian ? '#f8fafc' : '#7f0f1c',
      isGuardian ? '#eab308' : '#d99b1e',
      isGuardian ? '#dbe4f0' : '#3a0810'
    );

    const crestTex = texGen.createChestCrestTexture(
      isGuardian ? '#111622' : '#2b070c',
      isGuardian ? '#f5b82e' : '#e5a520'
    );

    const armorMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: primaryColor,
        metalness: isGuardian ? 0.36 : 0.62,
        roughness: isGuardian ? 0.24 : 0.28,
      })
    );

    const filigreeMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: filigreeTex,
        metalness: 0.44,
        roughness: 0.26,
      })
    );

    const secondaryArmorMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: secondaryColor,
        metalness: 0.55,
        roughness: 0.32,
      })
    );

    const goldMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: goldColor,
        metalness: 0.88,
        roughness: 0.18,
        emissive: new THREE.Color(goldColor),
        emissiveIntensity: 0.08,
      })
    );

    const jointMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#171b24',
        metalness: 0.78,
        roughness: 0.35,
      })
    );

    const visorMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#05070c',
        metalness: 0.92,
        roughness: 0.08,
      })
    );

    const crestMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        map: crestTex,
        metalness: 0.6,
        roughness: 0.25,
      })
    );

    const glowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: glowHex,
        emissive: new THREE.Color(glowHex),
        emissiveIntensity: 2.6,
        roughness: 0.15,
        metalness: 0.1,
      })
    );

    const coreGlowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: isGuardian ? '#182232' : '#2a080c',
        emissive: new THREE.Color(glowHex),
        emissiveIntensity: isGuardian ? 0.55 : 1.15,
        metalness: 0.85,
        roughness: 0.14,
      })
    );

    const thrusterGlowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: secondaryGlowHex,
        emissive: new THREE.Color(secondaryGlowHex),
        emissiveIntensity: 2.2,
        roughness: 0.2,
      })
    );

    const armorMaterials = [armorMat, filigreeMat, secondaryArmorMat, goldMat];
    const emissiveMaterials = [glowMat, coreGlowMat, thrusterGlowMat];
    const eyeMeshes: THREE.Mesh[] = [];
    const thrusterMeshes: THREE.Mesh[] = [];

    const root = new THREE.Group();
    root.name = id;

    // Proportional scale: stout heroic super-robot silhouette (~2.7m tall)
    const hipsPivot = new THREE.Group();
    hipsPivot.position.set(0, 1.16, 0);
    root.add(hipsPivot);

    // ================= PELVIS & WAIST ARMOR =================
    const pelvis = new THREE.Group();
    hipsPivot.add(pelvis);

    const pelvisCore = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.36, 0.28, 0.28, 12)),
      jointMat
    );
    pelvis.add(pelvisCore);

    // Gold belt ring
    const beltRing = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.41, 0.39, 0.09, 16)),
      goldMat
    );
    beltRing.position.y = 0.11;
    pelvis.add(beltRing);

    // Front V-codpiece plate (matching reference waist armor)
    const codpieceGeo = this.trackGeo(new THREE.BoxGeometry(0.32, 0.3, 0.24));
    const codpiece = new THREE.Mesh(codpieceGeo, armorMat);
    codpiece.position.set(0, -0.02, 0.2);
    codpiece.rotation.x = 0.12;
    pelvis.add(codpiece);

    const codGoldTrim = new THREE.Mesh(
      this.trackGeo(new THREE.OctahedronGeometry(0.15, 0)),
      goldMat
    );
    codGoldTrim.scale.set(1.1, 1.25, 0.45);
    codGoldTrim.position.set(0, 0.04, 0.32);
    pelvis.add(codGoldTrim);

    // Side hip skirt tassets
    [-1, 1].forEach((side) => {
      const tasset = new THREE.Group();
      tasset.position.set(side * 0.38, 0.02, 0);
      tasset.rotation.z = side * 0.24;
      const plate = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.12, 0.28, 0.36)),
        armorMat
      );
      const border = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.135, 0.07, 0.38)),
        goldMat
      );
      border.position.y = 0.11;
      tasset.add(plate, border);
      pelvis.add(tasset);
    });

    // ================= TORSO & CHEST ARMOR =================
    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 0.16, 0);
    hipsPivot.add(torsoPivot);

    const torso = new THREE.Group();
    torsoPivot.add(torso);

    // Mechanical inner abdomen
    const abdomen = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.38, 0.32, 0.34, 12)),
      jointMat
    );
    abdomen.position.y = 0.15;
    torso.add(abdomen);

    // Layered V-rib plates (white/crimson chevron layers from reference)
    for (let i = 0; i < 2; i++) {
      const chevron = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.45 + i * 0.05, 0.36 + i * 0.04, 0.14, 8)),
        armorMat
      );
      chevron.scale.set(1.08, 1, 0.78);
      chevron.position.y = 0.14 + i * 0.13;
      torso.add(chevron);
    }

    // Broad Heroic Upper Chest
    const chestArmor = new THREE.Group();
    chestArmor.position.y = 0.44;
    torso.add(chestArmor);

    const upperChestMesh = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.56, 0.44, 0.42, 12)),
      armorMat
    );
    upperChestMesh.scale.set(1.18, 1, 0.82);
    chestArmor.add(upperChestMesh);

    // Gold collar rim
    const collarRim = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(0.32, 0.048, 10, 20)),
      goldMat
    );
    collarRim.rotation.x = Math.PI / 2;
    collarRim.position.set(0, 0.21, 0.03);
    chestArmor.add(collarRim);

    // Center Pentagonal Shield Core (framed in thick gold, dark obsidian center like reference!)
    const coreFrame = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.24, 0.16, 0.12, 5)),
      goldMat
    );
    coreFrame.rotation.x = Math.PI / 2;
    coreFrame.rotation.z = Math.PI;
    coreFrame.position.set(0, 0.02, 0.39);
    chestArmor.add(coreFrame);

    const coreMesh = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.185, 0.12, 0.14, 5)),
      coreGlowMat
    );
    coreMesh.rotation.x = Math.PI / 2;
    coreMesh.rotation.z = Math.PI;
    coreMesh.position.set(0, 0.02, 0.405);
    chestArmor.add(coreMesh);

    // Left-chest Ornate Heraldic Crest Shield (exact signature detail from reference!)
    const heraldicGroup = new THREE.Group();
    heraldicGroup.position.set(-0.29, 0.04, 0.38);
    heraldicGroup.rotation.y = -0.32;
    heraldicGroup.rotation.x = -0.08;

    const shieldBack = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.24, 0.26, 0.045)),
      goldMat
    );
    const shieldFace = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.21, 0.23, 0.055)),
      crestMat
    );
    heraldicGroup.add(shieldBack, shieldFace);
    chestArmor.add(heraldicGroup);

    // Right-chest gold accent trim
    const rightPecTrim = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.22, 0.055, 0.05)),
      goldMat
    );
    rightPecTrim.position.set(0.29, 0.1, 0.37);
    rightPecTrim.rotation.y = 0.32;
    rightPecTrim.rotation.z = 0.18;
    chestArmor.add(rightPecTrim);

    // Back Jetpack Vernier Thrusters
    const backpack = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.56, 0.36, 0.22)),
      secondaryArmorMat
    );
    backpack.position.set(0, 0.02, -0.38);
    chestArmor.add(backpack);

    const backpackGold = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.6, 0.08, 0.24)),
      goldMat
    );
    backpackGold.position.set(0, 0.16, -0.38);
    chestArmor.add(backpackGold);

    [-1, 1].forEach((side) => {
      const nozzle = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.08, 0.115, 0.18, 12)),
        jointMat
      );
      nozzle.position.set(side * 0.19, -0.14, -0.45);
      nozzle.rotation.x = -0.38;
      chestArmor.add(nozzle);

      const thrusterCore = new THREE.Mesh(
        this.trackGeo(new THREE.ConeGeometry(0.085, 0.26, 10)),
        thrusterGlowMat
      );
      thrusterCore.position.set(0, -0.14, 0);
      thrusterCore.rotation.x = Math.PI;
      nozzle.add(thrusterCore);
      thrusterMeshes.push(thrusterCore);
    });

    // ================= NECK & ICONIC HELMET HEAD =================
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.68, 0.02);
    torso.add(neckPivot);

    const neckMesh = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.15, 0.18, 0.18, 12)),
      jointMat
    );
    neckMesh.position.y = 0.06;
    neckPivot.add(neckMesh);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.16, 0);
    neckPivot.add(headPivot);

    const head = new THREE.Group();
    headPivot.add(head);

    // Main rounded sleek helmet dome (oversized expressive super-robot proportions like reference)
    const helmetDome = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.44, 24, 20)),
      armorMat
    );
    helmetDome.scale.set(1.08, 0.98, 1.05);
    helmetDome.position.y = 0.24;
    head.add(helmetDome);

    // Recessed glossy black visor faceplate
    const visorShell = new THREE.Mesh(
      this.trackGeo(
        new THREE.SphereGeometry(0.425, 22, 14, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.34, Math.PI * 0.32)
      ),
      visorMat
    );
    visorShell.scale.set(1.1, 0.98, 1.08);
    visorShell.rotation.y = Math.PI * 0.5;
    visorShell.position.set(0, 0.23, 0.035);
    head.add(visorShell);

    // Lower chin & cheek guard in white/crimson + gold chin trim
    const chinGuard = new THREE.Mesh(
      this.trackGeo(new THREE.CylinderGeometry(0.36, 0.22, 0.18, 8)),
      armorMat
    );
    chinGuard.scale.set(1.12, 1, 1.06);
    chinGuard.position.set(0, 0.06, 0.06);
    head.add(chinGuard);

    const chinGold = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(0.29, 0.036, 8, 12, Math.PI * 0.75)),
      goldMat
    );
    chinGold.rotation.x = Math.PI * 0.56;
    chinGold.rotation.z = Math.PI * 0.125;
    chinGold.position.set(0, 0.08, 0.15);
    head.add(chinGold);

    // Glowing Eyes inside Visor!
    // Golden Guardian: Happy/Heroic curved golden crescent arcs (^ ^) matching the reference!
    // Crimson Destroyer: Fierce angled crimson plasma eyes (\ /)
    [-1, 1].forEach((side) => {
      if (isGuardian) {
        const eyeArc = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.088, 0.028, 10, 16, Math.PI * 0.88)),
          glowMat
        );
        eyeArc.position.set(side * 0.155, 0.205, 0.445);
        eyeArc.rotation.z = Math.PI * 0.06;
        eyeArc.rotation.y = side * 0.26;
        eyeArc.rotation.x = -0.1;
        head.add(eyeArc);
        eyeMeshes.push(eyeArc);
      } else {
        const fierceEye = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.165, 0.048, 0.03)),
          glowMat
        );
        fierceEye.position.set(side * 0.155, 0.235, 0.45);
        fierceEye.rotation.z = -side * 0.28;
        fierceEye.rotation.y = side * 0.28;
        head.add(fierceEye);
        eyeMeshes.push(fierceEye);
      }
    });

    // Sweeping Gold V-Brow Trim + Prominent Diamond Forehead Crest + Top Mohawk Fin
    [-1, 1].forEach((side) => {
      const browBar = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.28, 0.055, 0.08)),
        goldMat
      );
      browBar.position.set(side * 0.16, 0.34, 0.41);
      browBar.rotation.z = side * 0.26;
      browBar.rotation.y = side * 0.28;
      head.add(browBar);
    });

    // Faceted Diamond Forehead Crest (signature feature in reference!)
    const diamondCrest = new THREE.Mesh(
      this.trackGeo(new THREE.OctahedronGeometry(0.155, 0)),
      goldMat
    );
    diamondCrest.scale.set(0.88, 1.28, 0.52);
    diamondCrest.position.set(0, 0.42, 0.42);
    diamondCrest.rotation.x = -0.22;
    head.add(diamondCrest);

    // Central Swept Mohawk Crest Ridge
    const mohawkFin = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.11, 0.22, 0.56)),
      goldMat
    );
    mohawkFin.position.set(0, 0.58, 0.04);
    mohawkFin.rotation.x = -0.18;
    head.add(mohawkFin);

    // Side Ear Pods with Glowing Ring + Swept Wing Antennae (exact match to reference!)
    [-1, 1].forEach((side) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.47, 0.23, 0.01);

      const earDrum = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.135, 0.135, 0.11, 16)),
        goldMat
      );
      earDrum.rotation.z = Math.PI / 2;
      earGroup.add(earDrum);

      const earGlowRing = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.082, 0.02, 8, 18)),
        glowMat
      );
      earGlowRing.rotation.y = Math.PI / 2;
      earGlowRing.position.x = side * 0.058;
      earGroup.add(earGlowRing);

      // Swept gold ear winglet fin (Crimson Destroyer gets taller aggressive twin horns!)
      const finHeight = isGuardian ? 0.28 : 0.44;
      const earFin = new THREE.Mesh(
        this.trackGeo(new THREE.ConeGeometry(0.075, finHeight, 4)),
        goldMat
      );
      earFin.position.set(side * 0.03, isGuardian ? 0.19 : 0.27, -0.06);
      earFin.rotation.z = -side * (isGuardian ? 0.34 : 0.46);
      earFin.rotation.x = -0.32;
      earGroup.add(earFin);

      head.add(earGroup);
    });

    // ================= ARMS, PAULDRONS, MEGA-GAUNTLETS & FISTS =================
    const buildArm = (side: -1 | 1) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.68, 0.56, 0);
      torso.add(shoulderPivot);

      // Shoulder ball joint
      const shoulderBall = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.16, 12, 12)),
        jointMat
      );
      shoulderPivot.add(shoulderBall);

      // Curved Ornate Filigree Shoulder Pauldron
      const shoulderArmor = new THREE.Group();
      shoulderArmor.position.set(side * 0.06, 0.06, 0);
      shoulderPivot.add(shoulderArmor);

      const pauldronDome = new THREE.Mesh(
        this.trackGeo(
          new THREE.SphereGeometry(0.32, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56)
        ),
        filigreeMat
      );
      pauldronDome.scale.set(1.12, 0.92, 1.08);
      pauldronDome.rotation.z = -side * 0.48;
      shoulderArmor.add(pauldronDome);

      const pauldronRim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.31, 0.036, 8, 20)),
        goldMat
      );
      pauldronRim.scale.set(1.1, 1.06, 1);
      pauldronRim.rotation.x = Math.PI / 2;
      pauldronRim.rotation.y = -side * 0.48;
      pauldronRim.position.set(side * 0.02, -0.02, 0);
      shoulderArmor.add(pauldronRim);

      // Crimson Destroyer gets aggressive outer shoulder blade spikes
      if (!isGuardian) {
        const spike = new THREE.Mesh(
          this.trackGeo(new THREE.ConeGeometry(0.075, 0.28, 4)),
          goldMat
        );
        spike.position.set(side * 0.28, 0.16, 0);
        spike.rotation.z = -side * 0.72;
        shoulderArmor.add(spike);
      }

      // Upper Arm Bicep
      const upperArm = new THREE.Group();
      shoulderPivot.add(upperArm);

      const bicepMesh = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.15, 0.14, 0.34, 12)),
        armorMat
      );
      bicepMesh.position.y = -0.2;
      upperArm.add(bicepMesh);

      const bicepBand = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 12)),
        goldMat
      );
      bicepBand.position.y = -0.22;
      upperArm.add(bicepBand);

      // Elbow Pivot
      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.4, 0);
      upperArm.add(elbowPivot);

      const elbowJoint = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 12)),
        jointMat
      );
      elbowJoint.rotation.z = Math.PI / 2;
      elbowPivot.add(elbowJoint);

      // Heavy Oversized Mega-Gauntlet Forearm (signature silhouette from reference!)
      const forearm = new THREE.Group();
      elbowPivot.add(forearm);

      const gauntletMain = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.22, 0.285, 0.42, 16)),
        filigreeMat
      );
      gauntletMain.scale.set(1.04, 1, 1.08);
      gauntletMain.position.y = -0.24;
      forearm.add(gauntletMain);

      const gauntletTopRim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.22, 0.032, 8, 18)),
        goldMat
      );
      gauntletTopRim.rotation.x = Math.PI / 2;
      gauntletTopRim.position.y = -0.05;
      forearm.add(gauntletTopRim);

      const gauntletWristRim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.285, 0.04, 10, 18)),
        goldMat
      );
      gauntletWristRim.rotation.x = Math.PI / 2;
      gauntletWristRim.position.y = -0.43;
      forearm.add(gauntletWristRim);

      // Outer gauntlet shield guard
      const cuffShield = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.1, 0.36, 0.34)),
        goldMat
      );
      cuffShield.position.set(side * 0.25, -0.25, 0);
      forearm.add(cuffShield);

      // Glowing Wrist Socket (visibly revealed when Right Fist detaches during Skill 3 Rocket Punch!)
      const wristSocket = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.07, 14)),
        thrusterGlowMat
      );
      wristSocket.position.y = -0.45;
      wristSocket.visible = false;
      forearm.add(wristSocket);

      // Wrist Pivot & Articulated Chunky Mechanical Fist (black fingers + white/crimson knuckle guard!)
      const wristPivot = new THREE.Group();
      wristPivot.position.set(0, -0.48, 0);
      forearm.add(wristPivot);

      const hand = new THREE.Group();
      wristPivot.add(hand);

      const palmBlock = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.28, 0.24, 0.28)),
        jointMat
      );
      palmBlock.position.y = -0.1;
      hand.add(palmBlock);

      // White/Crimson armored knuckle plate across back of hand
      const knucklePlate = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.12, 0.2, 0.29)),
        armorMat
      );
      knucklePlate.position.set(side * 0.11, -0.09, 0);
      hand.add(knucklePlate);

      // 4 Segmented curled mechanical fingers + thumb
      for (let f = 0; f < 4; f++) {
        const zOff = -0.1 + f * 0.066;
        const fingerSeg1 = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.16, 0.11, 0.056)),
          jointMat
        );
        fingerSeg1.position.set(side * 0.04, -0.22, zOff);

        const fingerCap = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(0.07, 0.065, 0.052)),
          armorMat
        );
        fingerCap.position.set(side * 0.11, -0.18, zOff);

        hand.add(fingerSeg1, fingerCap);
      }

      const thumb = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.14, 0.14, 0.09)),
        jointMat
      );
      thumb.position.set(-side * 0.07, -0.12, 0.15);
      thumb.rotation.x = 0.35;
      hand.add(thumb);

      return {
        shoulderPivot,
        shoulderArmor,
        upperArm,
        elbowPivot,
        forearm,
        wristPivot,
        hand,
        wristSocket,
      };
    };

    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);

    // ================= LEGS, GLOWING KNEE RINGS, FLARED GREAVES & SABATONS =================
    const buildLeg = (side: -1 | 1) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.28, -0.06, 0);
      hipsPivot.add(hipPivot);

      const hipBall = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.15, 12, 12)),
        jointMat
      );
      hipPivot.add(hipBall);

      const thigh = new THREE.Group();
      hipPivot.add(thigh);

      const thighArmor = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.19, 0.17, 0.36, 14)),
        armorMat
      );
      thighArmor.position.y = -0.2;
      thigh.add(thighArmor);

      const thighGoldStripe = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.07, 0.34, 0.36)),
        goldMat
      );
      thighGoldStripe.position.y = -0.2;
      thigh.add(thighGoldStripe);

      // Knee Pivot + Signature Glowing Circular Energy Rings on sides of knees!
      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.42, 0);
      thigh.add(kneePivot);

      const kneeDrum = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.155, 0.155, 0.32, 14)),
        jointMat
      );
      kneeDrum.rotation.z = Math.PI / 2;
      kneePivot.add(kneeDrum);

      // Front knee gold & dark cabochon guard
      const kneeCapGold = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.12, 0.13, 0.08, 12)),
        goldMat
      );
      kneeCapGold.rotation.x = Math.PI / 2;
      kneeCapGold.position.set(0, 0.02, 0.15);
      kneePivot.add(kneeCapGold);

      const kneeGem = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(0.085, 12, 12)),
        visorMat
      );
      kneeGem.scale.set(1, 1, 0.55);
      kneeGem.position.set(0, 0.02, 0.18);
      kneePivot.add(kneeGem);

      // Side Glowing Knee Power Rings (super distinct in reference image!)
      [-1, 1].forEach((kSide) => {
        const podGold = new THREE.Mesh(
          this.trackGeo(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 14)),
          goldMat
        );
        podGold.rotation.z = Math.PI / 2;
        podGold.position.set(kSide * 0.17, 0, 0);
        kneePivot.add(podGold);

        const kneeRing = new THREE.Mesh(
          this.trackGeo(new THREE.TorusGeometry(0.068, 0.018, 8, 16)),
          glowMat
        );
        kneeRing.rotation.y = Math.PI / 2;
        kneeRing.position.set(kSide * 0.198, 0, 0);
        kneePivot.add(kneeRing);
      });

      // Flared Heroic Shin Bell-Greave with Gold Filigree!
      const lowerLeg = new THREE.Group();
      kneePivot.add(lowerLeg);

      const greaveMesh = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.19, 0.33, 0.48, 16)),
        filigreeMat
      );
      greaveMesh.scale.set(1.02, 1, 1.12);
      greaveMesh.position.y = -0.27;
      lowerLeg.add(greaveMesh);

      const greaveTopRim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.195, 0.03, 8, 16)),
        goldMat
      );
      greaveTopRim.rotation.x = Math.PI / 2;
      greaveTopRim.position.y = -0.05;
      lowerLeg.add(greaveTopRim);

      const greaveBottomRim = new THREE.Mesh(
        this.trackGeo(new THREE.TorusGeometry(0.33, 0.036, 8, 18)),
        goldMat
      );
      greaveBottomRim.scale.set(1.02, 1.12, 1);
      greaveBottomRim.rotation.x = Math.PI / 2;
      greaveBottomRim.position.y = -0.49;
      lowerLeg.add(greaveBottomRim);

      // Ankle Pivot & Planted Armored Sabaton Boot
      const anklePivot = new THREE.Group();
      anklePivot.position.set(0, -0.54, 0);
      lowerLeg.add(anklePivot);

      const foot = new THREE.Group();
      anklePivot.add(foot);

      const bootBase = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.38, 0.16, 0.56)),
        armorMat
      );
      bootBase.position.set(0, -0.08, 0.08);
      foot.add(bootBase);

      // Angled Gold Toe Bumper & Heel Guard (matching reference boots!)
      const goldToe = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.4, 0.14, 0.24)),
        goldMat
      );
      goldToe.position.set(0, -0.09, 0.28);
      goldToe.rotation.x = 0.14;
      foot.add(goldToe);

      const darkInstep = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.24, 0.12, 0.24)),
        jointMat
      );
      darkInstep.position.set(0, -0.02, 0.12);
      foot.add(darkInstep);

      const goldHeel = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.39, 0.13, 0.15)),
        goldMat
      );
      goldHeel.position.set(0, -0.09, -0.15);
      foot.add(goldHeel);

      return {
        hipPivot,
        thigh,
        kneePivot,
        lowerLeg,
        anklePivot,
        foot,
      };
    };

    const leftLeg = buildLeg(-1);
    const rightLeg = buildLeg(1);

    // Enable shadow casting & receiving across all meshes
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    return {
      root,
      hipsPivot,
      pelvis,
      torsoPivot,
      torso,
      chestArmor,
      neckPivot,
      headPivot,
      head,
      leftShoulderPivot: leftArm.shoulderPivot,
      leftShoulderArmor: leftArm.shoulderArmor,
      leftUpperArm: leftArm.upperArm,
      leftElbowPivot: leftArm.elbowPivot,
      leftForearm: leftArm.forearm,
      leftWristPivot: leftArm.wristPivot,
      leftHand: leftArm.hand,
      rightShoulderPivot: rightArm.shoulderPivot,
      rightShoulderArmor: rightArm.shoulderArmor,
      rightUpperArm: rightArm.upperArm,
      rightElbowPivot: rightArm.elbowPivot,
      rightForearm: rightArm.forearm,
      rightWristPivot: rightArm.wristPivot,
      rightHand: rightArm.hand,
      rightWristSocket: rightArm.wristSocket,
      leftHipPivot: leftLeg.hipPivot,
      leftThigh: leftLeg.thigh,
      leftKneePivot: leftLeg.kneePivot,
      leftLowerLeg: leftLeg.lowerLeg,
      leftAnklePivot: leftLeg.anklePivot,
      leftFoot: leftLeg.foot,
      rightHipPivot: rightLeg.hipPivot,
      rightThigh: rightLeg.thigh,
      rightKneePivot: rightLeg.kneePivot,
      rightLowerLeg: rightLeg.lowerLeg,
      rightAnklePivot: rightLeg.anklePivot,
      rightFoot: rightLeg.foot,
      coreMesh,
      eyeMeshes,
      thrusterMeshes,
      emissiveMaterials,
      armorMaterials,
    };
  }

  /**
   * Builds a standalone 3D Rocket Fist mesh matching Golden Guardian's right gauntlet fist
   * for Skill 3 (Rocket Punch) projectile!
   */
  public buildRocketFistProjectileMesh(): THREE.Group {
    const group = new THREE.Group();

    const cuffMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#f5b82e',
        metalness: 0.9,
        roughness: 0.16,
        emissive: new THREE.Color('#f59e0b'),
        emissiveIntensity: 0.4,
      })
    );
    const whiteMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        metalness: 0.4,
        roughness: 0.22,
      })
    );
    const darkMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: '#151922',
        metalness: 0.8,
        roughness: 0.3,
      })
    );
    const flameMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );

    // Fist oriented along +Z forward direction
    const palm = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.44, 0.4, 0.48)),
      darkMat
    );
    group.add(palm);

    const knuckle = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(0.48, 0.34, 0.24)),
      whiteMat
    );
    knuckle.position.z = 0.18;
    group.add(knuckle);

    const wristRing = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(0.28, 0.055, 8, 16)),
      cuffMat
    );
    wristRing.position.z = -0.22;
    group.add(wristRing);

    const flameCone = new THREE.Mesh(
      this.trackGeo(new THREE.ConeGeometry(0.24, 0.85, 12)),
      flameMat
    );
    flameCone.rotation.x = -Math.PI / 2;
    flameCone.position.z = -0.62;
    group.add(flameCone);

    return group;
  }

  public dispose(): void {
    for (const geo of this.geometries) geo.dispose();
    for (const mat of this.materials) mat.dispose();
    this.geometries = [];
    this.materials = [];
  }
}

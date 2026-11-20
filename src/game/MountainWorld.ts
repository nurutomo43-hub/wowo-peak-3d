import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  DIFFICULTY_LEVELS,
  EMOTE_ITEMS,
  type AvatarConfig,
  type EmoteType,
  type RadarBlip,
  type Role,
  type TimeOfDay,
  type WeatherType,
} from '../types/game';
import { animateR15AvatarPose, buildR15AvatarMesh } from './AvatarBuilder';
import type { SoundEngine } from './SoundEngine';

import type { AvatarPoseState } from './AvatarBuilder';

export interface CpPoint {
  index: number;
  x: number;
  y: number;
  z: number;
}

export interface TrailInfo {
  dist: number;
  x: number;
  y: number;
  z: number;
  segIndex: number;
  t: number;
  tx: number;
  tz: number;
}

export interface RemotePlayerEntry {
  mesh: THREE.Group;
  targetPos: THREE.Vector3;
  targetYaw: number;
  name: string;
  role: Role;
  avatar: AvatarConfig;
  cp: number;
  score: number;
  walkPhase: number;
  activeEmote: EmoteType | null;
  emoteTimer: number;
  poseState?: AvatarPoseState;
}

export type HazardHitType =
  | 'kuntilanak'
  | 'pocong'
  | 'landslide'
  | 'log'
  | 'tiger'
  | 'bear'
  | 'boar'
  | 'snake'
  | 'bridge_plank'
  | 'crumble_stone'
  | 'geyser'
  | 'lightning'
  | 'wildfire'
  | 'meteor';

// 26 waypoints (Base Camp CP 0 Sabana Sembalun zig-zagging up Mount Rinjani / Mount WOWO to Peak CP 25)
// Every consecutive climbing segment is strictly 187-214 meters apart horizontally.
const RAW_CP_XZ: ReadonlyArray<[number, number]> = [
  [0, 1080],     // CP 0: Base Camp Sabana Sembalun
  [165, 965],    // CP 1 (201 m)
  [330, 845],    // CP 2 (204 m - Sebelum Jembatan Sungai Timur)
  [485, 705],    // CP 3 (209 m - Sesudah Jembatan Sungai Timur)
  [315, 610],    // CP 4 (195 m)
  [130, 520],    // CP 5 (206 m)
  [-60, 440],    // CP 6 (206 m)
  [-255, 360],   // CP 7 (211 m)
  [-70, 265],    // CP 8 (208 m)
  [120, 185],    // CP 9 (206 m)
  [310, 105],    // CP 10 (206 m)
  [475, 10],     // CP 11 (190 m)
  [285, -70],    // CP 12 (206 m - Sebelum Jembatan Jurang Vulkanik)
  [85, -145],    // CP 13 (214 m - Sesudah Jembatan Jurang Vulkanik)
  [-110, -225],  // CP 14 (211 m)
  [-300, -310],  // CP 15 (208 m - Menghadap Danau Segara Anak)
  [-110, -385],  // CP 16 (204 m)
  [85, -455],    // CP 17 (207 m)
  [280, -525],   // CP 18 (207 m)
  [460, -600],   // CP 19 (195 m)
  [265, -675],   // CP 20 (209 m)
  [65, -750],    // CP 21 (214 m)
  [-130, -825],  // CP 22 (209 m)
  [-320, -900],  // CP 23 (204 m)
  [-155, -990],  // CP 24 (188 m)
  [0, -1105],    // CP 25: Puncak Rinjani / Mount WOWO (193 m)
];

export const CP_POINTS: CpPoint[] = RAW_CP_XZ.map(([x, z], i) => ({
  index: i,
  x,
  y: 4.0 + i * 25.04, // Base Camp y = 4.0, Peak CP 25 y = 630.0
  z,
}));

export const SUMMIT_EXAM_POINT: CpPoint = {
  index: 26,
  x: 0,
  y: 675.0,
  z: -1300, // 195 m final ascent from CP 25 to Gapura Puncak
};

export const CP_SAFE_RADIUS = 10.5;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Eastern river gorge passing cleanly under the CP 2 -> CP 3 wooden bridge at (407.5, 775)
function getRiverCenterX(z: number): number {
  const meander = Math.sin(z * 0.012) * 14;
  if (z <= 450) return 580 + meander;
  if (z <= 785) {
    const t = smoothstep(450, 785, z);
    return 580 - t * 172.5 + meander;
  }
  return 407.5 + (z - 785) * 0.08 + meander;
}

function pseudoNoise(x: number, z: number): number {
  return (
    Math.sin(x * 0.009) * Math.cos(z * 0.009) * 26.0 +
    Math.sin(x * 0.024 + z * 0.019) * 11.5 +
    Math.cos(x * 0.055 - z * 0.048) * 4.2
  );
}

export function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

interface TrailSample {
  x: number;
  y: number;
  z: number;
  segIndex: number;
  distFromStart: number;
}

interface TrailMarker {
  mesh: THREE.Mesh;
  cx: number;
  cz: number;
  nx: number;
  nz: number;
}

interface KuntilanakEntity {
  mesh: THREE.Group;
  age: number;
  maxAge: number;
  phase: number;
}

interface PocongEntity {
  mesh: THREE.Group;
  originX: number;
  originZ: number;
  dirX: number;
  dirZ: number;
  patrolDir: number;
  vy: number;
  age: number;
  maxAge: number;
}

interface BoulderEntity {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotSpeed: number;
  radius: number;
  age: number;
}

interface RollingLogEntity {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rollAxisX: number;
  rollAxisZ: number;
  radius: number;
  age: number;
}

interface WildlifeEntity {
  id: string;
  species: 'tiger' | 'bear' | 'boar' | 'snake';
  mesh: THREE.Group;
  originX: number;
  originZ: number;
  dirX: number;
  dirZ: number;
  patrolSign: number;
  patrolRadius: number;
  phase: number;
  soundCooldown: number;
  legs: THREE.Object3D[];
  tail: THREE.Object3D | null;
  head: THREE.Object3D | null;
}

interface SwayPlank {
  mesh: THREE.Mesh;
  baseY: number;
  phase: number;
  worldX: number;
  worldZ: number;
}

interface BirdFlockMember {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  baseY: number;
  radius: number;
  angle: number;
  speed: number;
  flapPhase: number;
}

interface ClimbingLadder {
  x: number;
  z: number;
  baseY: number;
  topY: number;
  exitX: number;
  exitZ: number;
}

interface MountainSlide {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  dirX: number;
  dirZ: number;
  length: number;
}

interface CrumbleStone {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  baseY: number;
  state: 'solid' | 'shaking' | 'fallen';
  timer: number;
}

interface GeyserVent {
  x: number;
  z: number;
  baseY: number;
  plume: THREE.Mesh;
  ring: THREE.Mesh;
  phase: number;
  soundPlayed: boolean;
}

interface WindZone {
  x: number;
  z: number;
  radius: number;
  dirX: number;
  dirZ: number;
  ribbons: THREE.Mesh[];
}

interface LightningStrike {
  x: number;
  z: number;
  y: number;
  ring: THREE.Mesh;
  bolt: THREE.Mesh;
  timer: number;
  struck: boolean;
}

interface WildfireCluster {
  x: number;
  z: number;
  y: number;
  group: THREE.Group;
  flames: THREE.Mesh[];
  smokes: THREE.Mesh[];
  age: number;
  maxAge: number;
}

interface SlideParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  age: number;
}

interface MeteorStrike {
  x: number;
  z: number;
  groundY: number;
  boulder: THREE.Mesh;
  ring: THREE.Mesh;
  shockwave: THREE.Mesh;
  timer: number;
  impacted: boolean;
}

export class MountainWorld {
  public readonly isSoftwareGl: boolean;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  public lowGraphics = false;
  public difficultyLevel = 3;
  public timeOfDay: TimeOfDay = 'pagi';
  public weather: WeatherType = 'cerah';

  public readonly remotePlayers = new Map<string, RemotePlayerEntry>();

  private readonly gridSize = 320;
  private readonly worldHalf = 1500;
  private readonly heightGrid: Float32Array;
  private readonly trailSamples: TrailSample[] = [];
  private readonly trailEdgeMarkers: TrailMarker[] = [];
  private readonly cpBeacons: Array<{ index: number; ring: THREE.Mesh; flag: THREE.Mesh }> = [];
  private readonly cpGates: Array<{ index: number; group: THREE.Group; wallMat: THREE.MeshBasicMaterial }> = [];
  private readonly clouds: Array<{ group: THREE.Group; speed: number }> = [];
  private readonly waterfallDrops: Array<{
    mesh: THREE.Mesh;
    topY: number;
    botY: number;
    speed: number;
  }> = [];
  private readonly birds: BirdFlockMember[] = [];
  private readonly swayPlanks: SwayPlank[] = [];

  private readonly ladders: ClimbingLadder[] = [];
  private readonly slides: MountainSlide[] = [];
  private readonly crumbleStones: CrumbleStone[] = [];
  private readonly geysers: GeyserVent[] = [];
  private readonly windZones: WindZone[] = [];
  private readonly lightningStrikes: LightningStrike[] = [];
  private readonly wildfires: WildfireCluster[] = [];
  private readonly slideParticles: SlideParticle[] = [];
  private readonly meteors: MeteorStrike[] = [];
  private earthquakeTimer = 0;
  private landslideShakeTimer = 0;
  private meteorShakeTimer = 0;

  private readonly kuntilanaks: KuntilanakEntity[] = [];
  private readonly pocongs: PocongEntity[] = [];
  private readonly boulders: BoulderEntity[] = [];
  private readonly rollingLogs: RollingLogEntity[] = [];
  private readonly wildlife: WildlifeEntity[] = [];

  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rainSystem: THREE.Points | null = null;
  private snowSystem: THREE.Points | null = null;
  private emberSystem: THREE.Points | null = null;
  private envMapTexture: THREE.Texture | null = null;

  private readonly envTarget = {
    sky: new THREE.Color('#87ceeb'),
    fog: new THREE.Color('#b8dff5'),
    fogDensity: 0.00038,
    sunColor: new THREE.Color('#fff4d6'),
    sunIntensity: 1.5,
    ambientIntensity: 0.52,
    hemiIntensity: 0.56,
    sunOffset: new THREE.Vector3(360, 480, 420),
  };

  private readonly envCurrent = {
    sky: new THREE.Color('#87ceeb'),
    fog: new THREE.Color('#b8dff5'),
    fogDensity: 0.00038,
    sunColor: new THREE.Color('#fff4d6'),
    sunIntensity: 1.5,
    ambientIntensity: 0.52,
    hemiIntensity: 0.56,
    sunOffset: new THREE.Vector3(360, 480, 420),
  };

  private readonly rockGeo = new THREE.DodecahedronGeometry(1.25, 0);
  private readonly rockMat = new THREE.MeshStandardMaterial({
    color: '#57534e',
    roughness: 0.94,
    metalness: 0.05,
  });
  private readonly meteorGeo = new THREE.DodecahedronGeometry(2.6, 1);
  private readonly meteorMat = new THREE.MeshStandardMaterial({
    color: '#292524',
    emissive: '#ea580c',
    emissiveIntensity: 1.15,
    roughness: 0.72,
  });
  private readonly logGeo = new THREE.CylinderGeometry(0.62, 0.72, 4.4, 10);
  private readonly logMat = new THREE.MeshStandardMaterial({
    color: '#5c3a21',
    roughness: 0.92,
  });

  private readonly onResizeBound: () => void;
  private readonly onContextLostBound: (e: Event) => void;
  private readonly onContextRestoredBound: () => void;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareGl();
    this.logGeo.rotateZ(Math.PI / 2);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.3,
      3600,
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envMapTexture = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    this.scene.environment = this.envMapTexture;
    this.scene.environmentIntensity = 0.36;
    pmrem.dispose();

    this.heightGrid = new Float32Array((this.gridSize + 1) * (this.gridSize + 1));

    this.initTrailSamples();
    this.initLightsAndSky();
    this.buildSolidMountainTerrain();
    this.buildDanauSegaraAnak();
    this.buildRiverAndWaterfall();
    this.buildWoodenBridges();
    this.buildSteppedTrailAndMarkers();
    this.buildCheckpointsAndLandmarks();
    this.buildLaddersSlidesAndObstacles();
    this.buildInstancedFoliageRocksCloudsAndBirds();
    this.buildWeatherSystems();
    this.rebuildWildlifeForDifficulty();

    this.applyEnvironment('pagi', 'cerah', true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.onResizeBound = () => this.onResize();
    this.onContextLostBound = (e: Event) => {
      e.preventDefault();
    };
    this.onContextRestoredBound = () => {
      this.onResize();
    };

    window.addEventListener('resize', this.onResizeBound);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestoredBound);
  }

  public onResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public setLowGraphics(enabled: boolean) {
    this.lowGraphics = enabled;
    this.renderer.shadowMap.enabled = !enabled && !this.isSoftwareGl;
    this.renderer.setPixelRatio(enabled || this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    if (this.rainSystem) {
      this.rainSystem.visible = !enabled && (this.weather === 'hujan' || this.weather === 'badai');
    }
    if (this.snowSystem) {
      this.snowSystem.visible = !enabled && this.weather === 'salju';
    }
    if (this.emberSystem) {
      this.emberSystem.visible = !enabled && this.weather === 'kiamat';
    }
  }

  public setDifficultyLevel(lvl: number) {
    const next = clamp(Number(lvl) || 3, 1, 10);
    const changed = next !== this.difficultyLevel;
    this.difficultyLevel = next;
    const mult = DIFFICULTY_LEVELS[this.difficultyLevel].pathWidthMult;
    for (const m of this.trailEdgeMarkers) {
      m.mesh.position.x = m.cx + m.nx * (7.2 * mult);
      m.mesh.position.z = m.cz + m.nz * (7.2 * mult);
      m.mesh.position.y = this.getTerrainHeight(m.mesh.position.x, m.mesh.position.z) + 0.18;
    }
    if (changed) {
      this.rebuildWildlifeForDifficulty();
    }
  }

  public getEffectiveTrailHalfWidth(): number {
    return 7.4 * DIFFICULTY_LEVELS[this.difficultyLevel].pathWidthMult;
  }

  private getFullWaypoints(): CpPoint[] {
    return [...CP_POINTS, SUMMIT_EXAM_POINT];
  }

  private initTrailSamples() {
    const waypoints = this.getFullWaypoints();
    const stepsPerSeg = 36;
    let totalDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      for (let s = 0; s < stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const z = a.z + (b.z - a.z) * t;
        if (this.trailSamples.length > 0) {
          const prev = this.trailSamples[this.trailSamples.length - 1];
          totalDist += Math.hypot(x - prev.x, z - prev.z);
        }
        this.trailSamples.push({ x, y, z, segIndex: i, distFromStart: totalDist });
      }
    }
    const last = waypoints[waypoints.length - 1];
    const prev = this.trailSamples[this.trailSamples.length - 1];
    totalDist += Math.hypot(last.x - prev.x, last.z - prev.z);
    this.trailSamples.push({
      x: last.x,
      y: last.y,
      z: last.z,
      segIndex: waypoints.length - 2,
      distFromStart: totalDist,
    });
  }

  public getNearestTrailInfo(x: number, z: number): TrailInfo {
    const waypoints = this.getFullWaypoints();
    let bestDistSq = Infinity;
    let bestProj: TrailInfo = {
      dist: 0,
      x: 0,
      y: 4.0,
      z: 1080,
      segIndex: 0,
      t: 0,
      tx: 0,
      tz: -1,
    };

    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / lenSq, 0, 1);
      const px = a.x + dx * t;
      const py = a.y + (b.y - a.y) * t;
      const pz = a.z + dz * t;
      const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        const len = Math.sqrt(lenSq) || 1;
        bestProj = {
          dist: Math.sqrt(dSq),
          x: px,
          y: py,
          z: pz,
          segIndex: i,
          t,
          tx: dx / len,
          tz: dz / len,
        };
      }
    }
    return bestProj;
  }

  public getTrailPointAhead(playerX: number, playerZ: number, metersAhead: number): {
    x: number;
    y: number;
    z: number;
    tx: number;
    tz: number;
  } {
    let targetIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.trailSamples.length; i++) {
      const s = this.trailSamples[i];
      const d = Math.hypot(s.x - playerX, s.z - playerZ);
      if (d < bestD) {
        bestD = d;
        targetIdx = i;
      }
    }
    const baseDist = this.trailSamples[targetIdx].distFromStart;
    const goalDist = baseDist + metersAhead;
    let foundIdx = this.trailSamples.length - 1;
    for (let i = targetIdx; i < this.trailSamples.length; i++) {
      if (this.trailSamples[i].distFromStart >= goalDist) {
        foundIdx = i;
        break;
      }
    }
    const s = this.trailSamples[foundIdx];
    const next = this.trailSamples[Math.min(this.trailSamples.length - 1, foundIdx + 1)];
    const prev = this.trailSamples[Math.max(0, foundIdx - 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const len = Math.hypot(dx, dz) || 1;
    return {
      x: s.x,
      y: this.getGroundHeight(s.x, s.z),
      z: s.z,
      tx: dx / len,
      tz: dz / len,
    };
  }

  private computeRawMountainHeight(x: number, z: number): number {
    // Monolithic solid Mount Rinjani rising from Sabana Sembalun (z=1080, y=4.0) to Peak CP 25 (z=-1105, y=630) & Gapura Puncak (z=-1300, y=675)
    const slopeT = clamp((1130 - z) / 2480, 0, 1.12);
    const backDrop = z < -1340 ? clamp((z + 1340) / -160, 0, 1) * 320 : 0;
    const mountainWidth = 920 - clamp(slopeT, 0, 1) * 440;
    const ridgeFactor = Math.exp(-(x * x) / (2 * mountainWidth * mountainWidth));

    let naturalH =
      (Math.pow(clamp(slopeT, 0, 1.05), 1.04) * 695 - backDrop) * (0.28 + 0.72 * ridgeFactor);
    naturalH += pseudoNoise(x, z) * (0.45 + slopeT * 0.72);
    if (naturalH < 2.0) naturalH = 2.0;

    // Carve right-flank river gorge
    const riverX = getRiverCenterX(z);
    const distRiver = Math.abs(x - riverX);
    if (z > -140 && distRiver < 34) {
      const carve = (1 - smoothstep(10, 34, distRiver)) * 32;
      naturalH = Math.max(1.0, naturalH - carve);
    }

    // Carve deep volcanic ravine chasm under Bridge 2 (between CP 12 [285, -70] and CP 13 [85, -145])
    const ravineMidX = 185;
    const ravineMidZ = -107.5;
    const dRavine = Math.hypot(x - ravineMidX, z - ravineMidZ);
    const onRavineBridge = dRavine < 48;
    if (dRavine < 54) {
      const ravCarve = (1 - smoothstep(14, 54, dRavine)) * 48;
      naturalH = Math.max(8, naturalH - ravCarve);
    }

    // Carve sunken caldera basin: Danau Segara Anak (-700, -240) + Gunung Barujari islet cone (-715, -255)
    const dCaldera = Math.hypot(x + 700, z + 240);
    if (dCaldera < 275) {
      const bowl = 1 - smoothstep(185, 275, dCaldera);
      naturalH = naturalH * (1 - bowl) + 148 * bowl;
      const dBarujari = Math.hypot(x + 715, z + 255);
      if (dBarujari < 74) {
        const cone = (1 - smoothstep(8, 74, dBarujari)) * 118;
        naturalH += cone;
      }
    }

    const trail = this.getNearestTrailInfo(x, z);
    const onRiverCrossing = z > 700 && z < 850 && Math.abs(x - getRiverCenterX(z)) < 38;

    const waypoints = this.getFullWaypoints();
    let cpBlend = 0;
    let cpY = trail.y;
    for (let i = 0; i < waypoints.length; i++) {
      const cp = waypoints[i];
      const rad = i === 26 ? 22 : 16;
      const dCp = Math.hypot(x - cp.x, z - cp.z);
      if (dCp < rad) {
        const w = 1 - smoothstep(rad * 0.58, rad, dCp);
        if (w > cpBlend) {
          cpBlend = w;
          cpY = cp.y;
        }
      }
    }

    let h = naturalH;
    if (!onRiverCrossing && !onRavineBridge && trail.dist < 16.5) {
      const roadW = 1 - smoothstep(7.4, 16.5, trail.dist);
      h = h * (1 - roadW) + trail.y * roadW;
    }
    if (cpBlend > 0) {
      h = h * (1 - cpBlend) + cpY * cpBlend;
    }

    // Flat Sabana Sembalun Base Camp valley plaza around CP 0
    if (z > 1035 && Math.abs(x) < 110) {
      const bcBlend = (1 - smoothstep(45, 110, Math.abs(x))) * smoothstep(1035, 1075, z);
      h = h * (1 - bcBlend) + 4.0 * bcBlend;
    }

    return h;
  }

  private initLightsAndSky() {
    this.scene.background = new THREE.Color('#87ceeb');
    this.scene.fog = new THREE.FogExp2('#b8dff5', 0.00038);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.52);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight('#bae6fd', '#4d3b2b', 0.56);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff4d6', 1.5);
    this.sunLight.position.set(360, 480, 420);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 620;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    const d = 145;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
  }

  private buildSolidMountainTerrain() {
    const segs = this.gridSize;
    const size = this.worldHalf * 2;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let iz = 0; iz <= segs; iz++) {
      for (let ix = 0; ix <= segs; ix++) {
        const idx = iz * (segs + 1) + ix;
        const x = pos.getX(idx);
        const z = pos.getZ(idx);
        const h = this.computeRawMountainHeight(x, z);
        this.heightGrid[idx] = h;
        pos.setY(idx, h);
      }
    }
    geo.computeVertexNormals();

    const normals = geo.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const cSavanna = new THREE.Color('#7c8c38'); // Sabana Sembalun golden-green savanna
    const cDirt = new THREE.Color('#805d3e');
    const cGravel = new THREE.Color('#6f5845');
    const cGrass = new THREE.Color('#2f6f31');
    const cHighGrass = new THREE.Color('#4a7740');
    const cCliff = new THREE.Color('#64748b');
    const cCalderaWall = new THREE.Color('#334155');
    const cVolcanicAsh = new THREE.Color('#475569');
    const cPeakRock = new THREE.Color('#cbd5e1');
    const cRiverBed = new THREE.Color('#3b5250');
    const temp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = normals.getY(i);

      const trail = this.getNearestTrailInfo(x, z);
      const distRiver = Math.abs(x - getRiverCenterX(z));
      const dCaldera = Math.hypot(x + 700, z + 240);
      const grit = Math.sin(x * 0.14 + z * 0.16) * 0.035;

      if (z > -140 && distRiver < 19) {
        temp.copy(cRiverBed);
      } else if (trail.dist < 7.2) {
        temp.copy(y > 390 ? cGravel : cDirt).offsetHSL(0, 0, grit);
      } else if (dCaldera < 275) {
        temp.copy(y > 186 ? cCalderaWall : cVolcanicAsh).offsetHSL(0, 0, grit);
      } else if (y > 545) {
        temp.copy(ny > 0.85 ? cPeakRock : cVolcanicAsh).offsetHSL(0, 0, grit);
      } else if (ny < 0.78 || y > 410) {
        temp.copy(cCliff).offsetHSL(0, 0, (ny - 0.7) * 0.14);
      } else if (z > 520) {
        temp.copy(cSavanna).offsetHSL(0, 0, Math.sin(x * 0.03) * Math.cos(z * 0.03) * 0.05);
      } else if (y > 210) {
        temp.copy(cHighGrass).offsetHSL(0, 0, Math.sin(x * 0.03) * Math.cos(z * 0.03) * 0.045);
      } else {
        temp.copy(cGrass).offsetHSL(0, 0, Math.sin(x * 0.04) * Math.cos(z * 0.04) * 0.045);
      }

      colors[i * 3] = temp.r;
      colors[i * 3 + 1] = temp.g;
      colors[i * 3 + 2] = temp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    this.scene.add(terrainMesh);

    // Horizon valley skirt extending into distant atmospheric fog
    const skirtGeo = new THREE.RingGeometry(this.worldHalf * 0.96, 3800, 64);
    skirtGeo.rotateX(-Math.PI / 2);
    const skirtMat = new THREE.MeshStandardMaterial({ color: '#3b4e2b', roughness: 0.98 });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = 1.5;
    this.scene.add(skirt);
  }

  private buildDanauSegaraAnak() {
    // Turquoise volcanic caldera lake Danau Segara Anak surrounding Gunung Barujari cone
    const waterGeo = new THREE.CircleGeometry(205, 48);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0d9488',
      emissive: '#0f766e',
      emissiveIntensity: 0.25,
      roughness: 0.14,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
    });
    const lakeMesh = new THREE.Mesh(waterGeo, waterMat);
    lakeMesh.position.set(-700, 178, -240);
    this.scene.add(lakeMesh);

    // Volcanic vent ring atop Gunung Barujari islet inside the crater lake
    const ventRing = new THREE.Mesh(
      new THREE.TorusGeometry(11, 2.8, 10, 24),
      new THREE.MeshStandardMaterial({
        color: '#334155',
        emissive: '#ea580c',
        emissiveIntensity: 0.45,
        roughness: 0.9,
      }),
    );
    ventRing.rotation.x = Math.PI / 2;
    ventRing.position.set(-715, 266, -255);
    this.scene.add(ventRing);
  }

  public getTerrainHeight(x: number, z: number): number {
    const size = this.worldHalf * 2;
    const fx = clamp(((x + this.worldHalf) / size) * this.gridSize, 0, this.gridSize - 0.001);
    const fz = clamp(((z + this.worldHalf) / size) * this.gridSize, 0, this.gridSize - 0.001);
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;
    const stride = this.gridSize + 1;

    const h00 = this.heightGrid[iz * stride + ix];
    const h10 = this.heightGrid[iz * stride + ix + 1];
    const h01 = this.heightGrid[(iz + 1) * stride + ix];
    const h11 = this.heightGrid[(iz + 1) * stride + ix + 1];

    const h0 = h00 + (h10 - h00) * tx;
    const h1 = h01 + (h11 - h01) * tx;
    return h0 + (h1 - h0) * tz;
  }

  private getSingleBridgeHeight(
    x: number,
    z: number,
    a: CpPoint,
    b: CpPoint,
    tMin: number,
    tMax: number,
    halfWidth: number,
  ): number | null {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    const t = ((x - a.x) * dx + (z - a.z) * dz) / lenSq;
    if (t < tMin || t > tMax) return null;
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    const perpDist = Math.hypot(x - px, z - pz);
    if (perpDist > halfWidth) return null;
    return a.y + (b.y - a.y) * t + 0.45;
  }

  public getBridgeHeightAt(x: number, z: number): number | null {
    // Bridge 1: Main River Crossing (CP 2 -> CP 3)
    const b1 = this.getSingleBridgeHeight(x, z, CP_POINTS[2], CP_POINTS[3], 0.22, 0.78, 5.4);
    if (b1 !== null) return b1;
    // Bridge 2: High Mountain Volcanic Ravine Crossing (CP 12 -> CP 13)
    const b2 = this.getSingleBridgeHeight(x, z, CP_POINTS[12], CP_POINTS[13], 0.24, 0.76, 5.2);
    if (b2 !== null) return b2;
    return null;
  }

  public getGroundHeight(x: number, z: number): number {
    const th = this.getTerrainHeight(x, z);
    const bh = this.getBridgeHeightAt(x, z);
    return bh !== null ? Math.max(th, bh) : th;
  }

  private buildRiverAndWaterfall() {
    const riverPts: Array<{ x: number; y: number; z: number }> = [];
    for (let z = -100; z <= 1380; z += 12) {
      const cx = getRiverCenterX(z);
      const y = this.getTerrainHeight(cx, z) + 2.2;
      riverPts.push({ x: cx, y, z });
    }

    const positions: number[] = [];
    const indices: number[] = [];
    const halfW = 14.5;
    for (let i = 0; i < riverPts.length; i++) {
      const p = riverPts[i];
      positions.push(p.x - halfW, p.y, p.z);
      positions.push(p.x + halfW, p.y, p.z);
      if (i < riverPts.length - 1) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0ea5e9',
      emissive: '#0284c7',
      emissiveIntensity: 0.3,
      roughness: 0.12,
      metalness: 0.34,
      transparent: true,
      opacity: 0.88,
    });
    const riverMesh = new THREE.Mesh(geo, waterMat);
    this.scene.add(riverMesh);

    // Tall cascading waterfall on the eastern cliff (x = 580, z = -100)
    const wfTopY = this.getTerrainHeight(580, -135) + 32;
    const wfBotY = this.getTerrainHeight(580, -65) + 1.5;
    const wfHeight = Math.max(75, wfTopY - wfBotY);
    const wfGeo = new THREE.BoxGeometry(24, wfHeight, 6);
    const wfMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.48,
      transparent: true,
      opacity: 0.86,
      roughness: 0.1,
    });
    const waterfall = new THREE.Mesh(wfGeo, wfMat);
    waterfall.position.set(580, wfBotY + wfHeight / 2, -98);
    waterfall.rotation.x = 0.2;
    this.scene.add(waterfall);

    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 1.0, 20),
      new THREE.MeshStandardMaterial({
        color: '#7dd3fc',
        emissive: '#38bdf8',
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.78,
        roughness: 0.15,
      }),
    );
    pool.position.set(580, wfBotY + 0.8, -76);
    this.scene.add(pool);

    const dropGeo = new THREE.SphereGeometry(1.3, 6, 6);
    const dropMat = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.82,
    });
    for (let i = 0; i < 45; i++) {
      const m = new THREE.Mesh(dropGeo, dropMat);
      m.position.set(
        580 + (Math.random() - 0.5) * 20,
        wfBotY + Math.random() * wfHeight,
        -98 + Math.random() * 14,
      );
      this.scene.add(m);
      this.waterfallDrops.push({
        mesh: m,
        topY: wfBotY + wfHeight,
        botY: wfBotY,
        speed: 22 + Math.random() * 16,
      });
    }
  }

  private buildWoodenBridges() {
    this.createSpanBridge(CP_POINTS[2], CP_POINTS[3], 0.22, 0.78, false);
    this.createSpanBridge(CP_POINTS[12], CP_POINTS[13], 0.24, 0.76, true);
  }

  private createSpanBridge(
    a: CpPoint,
    b: CpPoint,
    tMin: number,
    tMax: number,
    withSwayPlanks: boolean,
  ) {
    const startX = a.x + (b.x - a.x) * tMin;
    const startY = a.y + (b.y - a.y) * tMin + 0.45;
    const startZ = a.z + (b.z - a.z) * tMin;
    const endX = a.x + (b.x - a.x) * tMax;
    const endY = a.y + (b.y - a.y) * tMax + 0.45;
    const endZ = a.z + (b.z - a.z) * tMax;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const midZ = (startZ + endZ) / 2;
    const dx = endX - startX;
    const dz = endZ - startZ;
    const dy = endY - startY;
    const horizLen = Math.hypot(dx, dz);
    const angleY = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, horizLen);

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(midX, midY, midZ);
    bridgeGroup.rotation.order = 'YXZ';
    bridgeGroup.rotation.y = angleY;
    bridgeGroup.rotation.x = pitch;

    const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.88 });
    const warnWoodMat = new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.85 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.92 });
    const railMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.82 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#d6b37c', roughness: 0.95 });

    const deckLen = horizLen;
    const plankCount = 48;
    for (let i = 0; i < plankCount; i++) {
      const zOff = -deckLen / 2 + (i / (plankCount - 1)) * deckLen;
      const isRickety = withSwayPlanks && i > 6 && i < plankCount - 7 && i % 5 === 0;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.45, 2.0),
        isRickety ? warnWoodMat : woodMat,
      );
      plank.position.set(0, -0.18, zOff);
      plank.castShadow = true;
      plank.receiveShadow = true;
      bridgeGroup.add(plank);

      if (isRickety) {
        const tLocal = i / (plankCount - 1);
        this.swayPlanks.push({
          mesh: plank,
          baseY: -0.18,
          phase: i * 1.1,
          worldX: startX + dx * tLocal,
          worldZ: startZ + dz * tLocal,
        });
      }
    }

    [-4.1, 4.1].forEach((sideX) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, deckLen), darkWoodMat);
      beam.position.set(sideX * 0.74, -0.58, 0);
      bridgeGroup.add(beam);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, deckLen), railMat);
      rail.position.set(sideX, 1.45, 0);
      bridgeGroup.add(rail);

      const rope = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, deckLen), ropeMat);
      rope.position.set(sideX, 0.78, 0);
      bridgeGroup.add(rope);

      for (let p = -6; p <= 6; p++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 18.0, 0.42), darkWoodMat);
        post.position.set(sideX, -7.2, (p / 6) * (deckLen * 0.48));
        bridgeGroup.add(post);
      }
    });

    this.scene.add(bridgeGroup);
  }

  private buildSteppedTrailAndMarkers() {
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.9 });
    const stepWoodMat = new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.92 });

    const waypoints = this.getFullWaypoints();
    // Natural stone & timber stair treads spaced cleanly along every 190-214m climbing leg
    for (let i = 0; i < waypoints.length - 1; i++) {
      if (i === 2 || i === 12) continue; // bridge segments
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const steps = i === 25 ? 24 : 36;
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      for (let s = 3; s < steps - 2; s++) {
        const t = s / steps;
        const sx = a.x + (b.x - a.x) * t;
        const sz = a.z + (b.z - a.z) * t;
        const sy = this.getTerrainHeight(sx, sz);

        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(7.2, 0.55, 1.85),
          i >= 14 || s % 2 === 0 ? stoneMat : stepWoodMat,
        );
        stepMesh.position.set(sx, sy - 0.12, sz);
        stepMesh.rotation.y = yaw;
        stepMesh.receiveShadow = true;
        this.scene.add(stepMesh);
      }
    }

    const curbGeo = new THREE.DodecahedronGeometry(0.62, 0);
    const curbMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.9 });
    const mult = DIFFICULTY_LEVELS[this.difficultyLevel].pathWidthMult;

    for (let i = 0; i < this.trailSamples.length; i += 3) {
      const s = this.trailSamples[i];
      if (this.getBridgeHeightAt(s.x, s.z) !== null) continue;
      const next = this.trailSamples[Math.min(i + 1, this.trailSamples.length - 1)];
      const dx = next.x - s.x;
      const dz = next.z - s.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;

      [-1, 1].forEach((side) => {
        const m = new THREE.Mesh(curbGeo, curbMat);
        const px = s.x + nx * side * (7.2 * mult);
        const pz = s.z + nz * side * (7.2 * mult);
        m.position.set(px, this.getTerrainHeight(px, pz) + 0.18, pz);
        this.scene.add(m);
        this.trailEdgeMarkers.push({ mesh: m, cx: s.x, cz: s.z, nx: nx * side, nz: nz * side });
      });
    }
  }

  private createTextSign(
    text: string,
    bg = '#5c2d0c',
    fg = '#fef08a',
    width = 10,
    height = 2.2,
    borderColor = '#fbbf24',
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 14;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.fillStyle = fg;
      ctx.font = 'bold 50px "Barlow Condensed", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 });
    return new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.36), mat);
  }

  private buildCheckpointsAndLandmarks() {
    // Wooden Gate: BASE CAMP CLIMBING MOUNT WOWO
    const bc = CP_POINTS[0];
    const gateGroup = new THREE.Group();
    gateGroup.position.set(bc.x, this.getTerrainHeight(bc.x, bc.z), bc.z - 8.0);
    gateGroup.rotation.y = Math.atan2(CP_POINTS[1].x - bc.x, CP_POINTS[1].z - bc.z) + Math.PI;
    const logMat = new THREE.MeshStandardMaterial({ color: '#6b3a15', roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.85 });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.4,
    });

    [-6.0, 6.0].forEach((sideX) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.6, 8.8, 10), logMat);
      post.position.set(sideX, 4.3, 0);
      post.castShadow = true;
      gateGroup.add(post);

      const baseStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.0, 1.1, 8),
        new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.92 }),
      );
      baseStone.position.set(sideX, 0.55, 0);
      gateGroup.add(baseStone);

      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.58, 0.45), lanternMat);
      lantern.position.set(sideX * 0.86, 5.5, 0.55);
      gateGroup.add(lantern);
    });

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.58, 0.78), logMat);
    crossBeam.position.set(0, 8.4, 0);
    gateGroup.add(crossBeam);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.42, 2.3), roofMat);
    roof.position.set(0, 8.95, 0);
    gateGroup.add(roof);

    const signBoard = this.createTextSign(
      'BASE CAMP CLIMBING MOUNT WOWO',
      '#5c2d0c',
      '#fde047',
      12.6,
      2.3,
    );
    signBoard.position.set(0, 7.1, 0.16);
    signBoard.castShadow = true;
    gateGroup.add(signBoard);
    this.scene.add(gateGroup);

    const padMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.84 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.75 });
    const poleMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.5, roughness: 0.35 });

    CP_POINTS.forEach((cp, idx) => {
      const gy = this.getTerrainHeight(cp.x, cp.z);
      const padGroup = new THREE.Group();
      padGroup.position.set(cp.x, gy, cp.z);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.4, 0.75, 14), padMat);
      pad.position.y = -0.15;
      pad.receiveShadow = true;
      padGroup.add(pad);

      const innerSlab = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.0, 0.2, 14), trimMat);
      innerSlab.position.y = 0.24;
      innerSlab.receiveShadow = true;
      padGroup.add(innerSlab);

      if (idx > 0) {
        const ringMat = new THREE.MeshBasicMaterial({
          color: idx === 25 ? '#f59e0b' : '#38bdf8',
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.1, 24), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.36;
        padGroup.add(ring);

        const poleH = idx === 25 ? 7.2 : 4.4;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, poleH, 8), poleMat);
        pole.position.set(3.9, poleH / 2, -2.6);
        padGroup.add(pole);

        const flagMat = new THREE.MeshStandardMaterial({
          color: idx === 25 ? '#dc2626' : '#f59e0b',
          emissive: idx === 25 ? '#991b1b' : '#b45309',
          emissiveIntensity: 0.35,
          roughness: 0.6,
        });
        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(idx === 25 ? 3.6 : 1.9, idx === 25 ? 2.0 : 1.1, 0.1),
          flagMat,
        );
        flag.position.set(3.9 + (idx === 25 ? 1.8 : 0.95), poleH - (idx === 25 ? 1.0 : 0.6), -2.6);
        padGroup.add(flag);

        if (idx === 25) {
          const whiteStripe = new THREE.Mesh(
            new THREE.BoxGeometry(3.6, 1.0, 0.11),
            new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 }),
          );
          whiteStripe.position.set(3.9 + 1.8, poleH - 1.5, -2.6);
          padGroup.add(whiteStripe);
        }

        const plaque = this.createTextSign(
          idx === 25 ? 'PUNCAK CP 25' : `CP ${idx}`,
          '#1e293b',
          '#f8fafc',
          2.6,
          0.85,
          idx === 25 ? '#f59e0b' : '#38bdf8',
        );
        plaque.position.set(-3.9, 1.55, -2.5);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.6, 6), poleMat);
        post.position.set(-3.9, 0.8, -2.5);
        padGroup.add(plaque, post);

        this.cpBeacons.push({ index: idx, ring, flag });

        // Translucent Energy Barrier Gate at exit of CP 1..25 (locks CP 25 -> Gapura Puncak until CP 25 answered)
        if (idx >= 1 && idx <= 25) {
          const nextCp = idx < 25 ? CP_POINTS[idx + 1] : SUMMIT_EXAM_POINT;
          const edx = nextCp.x - cp.x;
          const edz = nextCp.z - cp.z;
          const eLen = Math.hypot(edx, edz) || 1;
          const gx = cp.x + (edx / eLen) * 5.2;
          const gz = cp.z + (edz / eLen) * 5.2;
          const gateGroup = new THREE.Group();
          gateGroup.position.set(gx, this.getTerrainHeight(gx, gz), gz);
          gateGroup.rotation.y = Math.atan2(edx, edz);

          const pillarMat = new THREE.MeshStandardMaterial({
            color: idx === 25 ? '#d97706' : '#0284c7',
            emissive: idx === 25 ? '#f59e0b' : '#0ea5e9',
            emissiveIntensity: 0.75,
            metalness: 0.65,
            roughness: 0.28,
          });
          [-5.6, 5.6].forEach((px) => {
            const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 5.4, 10), pillarMat);
            pylon.position.set(px, 2.7, 0);
            gateGroup.add(pylon);
          });

          const topBar = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.36, 0.36), pillarMat);
          topBar.position.set(0, 5.35, 0);
          gateGroup.add(topBar);

          const wallMat = new THREE.MeshBasicMaterial({
            color: idx === 25 ? '#fbbf24' : '#38bdf8',
            transparent: true,
            opacity: 0.34,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const forceField = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 5.0), wallMat);
          forceField.position.set(0, 2.65, 0);
          gateGroup.add(forceField);

          const lockSign = this.createTextSign(
            idx === 25 ? 'GERBANG POS UJIAN AKHIR' : `GERBANG CP ${idx}`,
            idx === 25 ? '#78350f' : '#0c4a6e',
            idx === 25 ? '#fde047' : '#7dd3fc',
            5.4,
            0.95,
            idx === 25 ? '#fbbf24' : '#38bdf8',
          );
          lockSign.position.set(0, 5.95, 0);
          gateGroup.add(lockSign);

          this.scene.add(gateGroup);
          this.cpGates.push({ index: idx, group: gateGroup, wallMat });
        }
      }

      this.scene.add(padGroup);
    });

    // GAPURA PUNCAK MOUNT WOWO — POS UJIAN AKHIR (5 Soal Isian Singkat)
    const se = SUMMIT_EXAM_POINT;
    const seY = this.getTerrainHeight(se.x, se.z);
    const summitGroup = new THREE.Group();
    summitGroup.position.set(se.x, seY, se.z);

    const plazaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(8.8, 10.2, 0.9, 18),
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.78 }),
    );
    plazaBase.position.y = -0.1;
    plazaBase.receiveShadow = true;
    summitGroup.add(plazaBase);

    const goldRing = new THREE.Mesh(
      new THREE.RingGeometry(6.0, 7.0, 28),
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    goldRing.rotation.x = -Math.PI / 2;
    goldRing.position.y = 0.42;
    summitGroup.add(goldRing);

    const redGapuraMat = new THREE.MeshStandardMaterial({
      color: '#b91c1c',
      roughness: 0.45,
      metalness: 0.25,
    });
    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#d97706',
      emissiveIntensity: 0.45,
      metalness: 0.75,
      roughness: 0.28,
    });

    [-5.8, 5.8].forEach((px) => {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 2.1), padMat);
      plinth.position.set(px, 0.75, -1.6);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 9.2, 12), redGapuraMat);
      col.position.set(px, 5.2, -1.6);
      col.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 1.5), goldAccentMat);
      cap.position.set(px, 9.9, -1.6);
      summitGroup.add(plinth, col, cap);
    });

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.9, 1.4), redGapuraMat);
    archBeam.position.set(0, 9.4, -1.6);
    const archRoof = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.55, 2.4), goldAccentMat);
    archRoof.position.set(0, 10.15, -1.6);
    summitGroup.add(archBeam, archRoof);

    const summitSign = this.createTextSign(
      'GAPURA PUNCAK WOWO · POS UJIAN AKHIR',
      '#7f1d1d',
      '#fde047',
      13.8,
      2.3,
      '#fbbf24',
    );
    summitSign.position.set(0, 7.6, -1.0);
    summitGroup.add(summitSign);

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 8.8, 8), poleMat);
    flagPole.position.set(0, 14.2, -1.6);
    const redFlag = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.35, 0.12),
      new THREE.MeshStandardMaterial({ color: '#dc2626', emissive: '#991b1b', emissiveIntensity: 0.35 }),
    );
    redFlag.position.set(2.1, 17.8, -1.6);
    const whiteFlag = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.35, 0.12),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.55 }),
    );
    whiteFlag.position.set(2.1, 16.45, -1.6);
    summitGroup.add(flagPole, redFlag, whiteFlag);

    this.cpBeacons.push({ index: 26, ring: goldRing, flag: redFlag });
    this.scene.add(summitGroup);
  }

  private buildLaddersSlidesAndObstacles() {
    const waypoints = this.getFullWaypoints();
    const woodMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });
    const rungMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.4, roughness: 0.45 });
    const chuteMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      emissive: '#0369a1',
      emissiveIntensity: 0.22,
      roughness: 0.18,
      metalness: 0.15,
    });
    const railMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4 });

    // 1) 3 Climbing Ladders (Tangga Panjat Tebing) at steeper trail segments
    const ladderSegments = [4, 11, 19];
    ladderSegments.forEach((segIdx) => {
      const a = waypoints[segIdx];
      const b = waypoints[segIdx + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;

      const tBase = 0.44;
      const lx = a.x + dx * tBase;
      const lz = a.z + dz * tBase;
      const baseY = this.getGroundHeight(lx, lz);
      const exitX = lx + ux * 6.5;
      const exitZ = lz + uz * 6.5;
      const topY = Math.max(baseY + 8.5, this.getGroundHeight(exitX, exitZ) + 0.45);
      const ladderHeight = topY - baseY;

      const group = new THREE.Group();
      group.position.set(lx, baseY, lz);
      group.rotation.y = Math.atan2(ux, uz);

      // Rock cliff face & top platform behind ladder
      const cliffMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.92 });
      const cliffBlock = new THREE.Mesh(new THREE.BoxGeometry(5.2, ladderHeight, 5.2), cliffMat);
      cliffBlock.position.set(0, ladderHeight / 2, 3.1);
      cliffBlock.castShadow = true;
      cliffBlock.receiveShadow = true;
      group.add(cliffBlock);

      [-0.95, 0.95].forEach((sx) => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, ladderHeight + 1.0, 8), woodMat);
        rail.position.set(sx, (ladderHeight + 1.0) / 2, 0.25);
        group.add(rail);
      });

      const rungCount = Math.max(12, Math.floor(ladderHeight * 1.8));
      for (let r = 0; r < rungCount; r++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.9, 8), rungMat);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(0, 0.6 + (r / rungCount) * (ladderHeight - 0.35), 0.25);
        group.add(rung);
      }

      const sign = this.createTextSign('TANGGA PANJAT (TEKAN W)', '#78350f', '#fde047', 4.2, 0.95, '#fbbf24');
      sign.position.set(0, ladderHeight + 1.15, 0.5);
      group.add(sign);

      this.scene.add(group);
      this.ladders.push({ x: lx, z: lz, baseY, topY, exitX, exitZ });
    });

    // 2) 3 Mountain Slides (Jalur Perosotan Cepat)
    const slideSegments = [7, 15, 23];
    slideSegments.forEach((segIdx) => {
      const a = waypoints[segIdx];
      const b = waypoints[segIdx + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;

      const startX = a.x + dx * 0.32;
      const startZ = a.z + dz * 0.32;
      const slideLen = 44.0;
      const endX = startX + ux * slideLen;
      const endZ = startZ + uz * slideLen;
      const startY = this.getGroundHeight(startX, startZ);
      const endY = this.getGroundHeight(endX, endZ);

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2 + 0.22;
      const midZ = (startZ + endZ) / 2;
      const pitch = -Math.atan2(endY - startY, slideLen);

      const chuteGroup = new THREE.Group();
      chuteGroup.position.set(midX, midY, midZ);
      chuteGroup.rotation.order = 'YXZ';
      chuteGroup.rotation.y = Math.atan2(ux, uz);
      chuteGroup.rotation.x = pitch;

      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, slideLen), chuteMat);
      chuteGroup.add(deck);

      [-2.15, 2.15].forEach((rx) => {
        const border = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.78, slideLen), railMat);
        border.position.set(rx, 0.38, 0);
        chuteGroup.add(border);
      });

      const banner = this.createTextSign('JALUR PEROSOTAN', '#0c4a6e', '#e0f2fe', 4.4, 0.95, '#38bdf8');
      banner.position.set(0, 2.6, -slideLen / 2 + 1.8);
      chuteGroup.add(banner);

      this.scene.add(chuteGroup);
      this.slides.push({
        startX,
        startZ,
        endX,
        endZ,
        dirX: ux,
        dirZ: uz,
        length: slideLen,
      });
    });

    // 3) 6 Collapsing Stepping Stones (Batu Pijakan Runtuh)
    const crumbleSegs = [6, 9, 14, 17, 21, 24];
    const stoneGeo = new THREE.CylinderGeometry(2.6, 2.3, 0.65, 10);
    crumbleSegs.forEach((segIdx, idx) => {
      const a = waypoints[segIdx];
      const b = waypoints[segIdx + 1];
      const t = 0.64 + (idx % 2) * 0.08;
      const sx = a.x + (b.x - a.x) * t;
      const sz = a.z + (b.z - a.z) * t;
      const baseY = this.getGroundHeight(sx, sz) + 0.16;
      const mat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.78 });
      const mesh = new THREE.Mesh(stoneGeo, mat);
      mesh.position.set(sx, baseY, sz);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.crumbleStones.push({
        mesh,
        x: sx,
        z: sz,
        baseY,
        state: 'solid',
        timer: 0,
      });
    });

    // 4) 5 Volcanic Geyser Steam Vents
    const geyserSegs = [8, 12, 16, 20, 23];
    const ventRingGeo = new THREE.TorusGeometry(1.75, 0.42, 8, 16);
    const plumeGeo = new THREE.CylinderGeometry(0.65, 1.75, 8.2, 12);
    plumeGeo.translate(0, 4.1, 0);
    geyserSegs.forEach((segIdx, idx) => {
      const a = waypoints[segIdx];
      const b = waypoints[segIdx + 1];
      const t = segIdx === 12 ? 0.14 : 0.56;
      const gx = a.x + (b.x - a.x) * t;
      const gz = a.z + (b.z - a.z) * t;
      const baseY = this.getGroundHeight(gx, gz);

      const ring = new THREE.Mesh(
        ventRingGeo,
        new THREE.MeshStandardMaterial({ color: '#475569', emissive: '#ea580c', emissiveIntensity: 0.35, roughness: 0.85 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(gx, baseY + 0.18, gz);

      const plume = new THREE.Mesh(
        plumeGeo,
        new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.65 }),
      );
      plume.position.set(gx, baseY, gz);
      plume.scale.set(1, 0.05, 1);
      plume.visible = false;

      this.scene.add(ring, plume);
      this.geysers.push({
        x: gx,
        z: gz,
        baseY,
        plume,
        ring,
        phase: idx * 1.15,
        soundPlayed: false,
      });
    });

    // 5) 3 High-Ridge Gusting Wind Zones (Angin Kencang Punggungan)
    const windSegs = [18, 22, 24];
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
    });
    windSegs.forEach((segIdx, idx) => {
      const a = waypoints[segIdx];
      const b = waypoints[segIdx + 1];
      const wx = (a.x + b.x) / 2;
      const wz = (a.z + b.z) / 2;
      const wy = this.getGroundHeight(wx, wz);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      const perpX = (-dz / len) * (idx % 2 === 0 ? 1 : -1);
      const perpZ = (dx / len) * (idx % 2 === 0 ? 1 : -1);

      const ribbons: THREE.Mesh[] = [];
      for (let r = 0; r < 6; r++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.14, 0.42), ribbonMat);
        rib.position.set(
          wx + (Math.random() - 0.5) * 18,
          wy + 1.4 + r * 0.85,
          wz + (Math.random() - 0.5) * 18,
        );
        rib.rotation.y = Math.atan2(perpX, perpZ) + Math.PI / 2;
        this.scene.add(rib);
        ribbons.push(rib);
      }
      this.windZones.push({
        x: wx,
        z: wz,
        radius: 22.0,
        dirX: perpX,
        dirZ: perpZ,
        ribbons,
      });
    });
  }

  private buildInstancedFoliageRocksCloudsAndBirds() {
    // 1) Instanced Multi-Tiered Pine Trees across 3000m Mount Rinjani & Sabana Sembalun
    const treePositions: Array<{ x: number; y: number; z: number; scale: number; rotY: number }> = [];
    for (let attempt = 0; attempt < 5500 && treePositions.length < 950; attempt++) {
      const rx = ((Math.sin(attempt * 12.9898) * 43758.5453) % 1 + 1) % 1;
      const rz = ((Math.cos(attempt * 78.233) * 19283.412) % 1 + 1) % 1;
      const x = rx * 2360 - 1180;
      const z = rz * 2360 - 1140;
      const trail = this.getNearestTrailInfo(x, z);
      const distRiver = Math.abs(x - getRiverCenterX(z));
      const dCaldera = Math.hypot(x + 700, z + 240);
      if (trail.dist < 14 || distRiver < 22 || dCaldera < 245) continue;

      const y = this.getTerrainHeight(x, z);
      if (y < 2.5 || y > 430) continue;

      const scale = 1.15 + ((attempt % 9) / 9) * 0.95;
      treePositions.push({ x, y: y - 0.4, z, scale, rotY: (attempt * 1.7) % (Math.PI * 2) });
    }

    const trunkGeo = new THREE.CylinderGeometry(0.36, 0.56, 3.0, 7);
    trunkGeo.translate(0, 1.5, 0);
    const cone1Geo = new THREE.ConeGeometry(2.6, 4.6, 7);
    cone1Geo.translate(0, 4.2, 0);
    const cone2Geo = new THREE.ConeGeometry(1.95, 4.0, 7);
    cone2Geo.translate(0, 6.2, 0);
    const cone3Geo = new THREE.ConeGeometry(1.25, 3.0, 7);
    cone3Geo.translate(0, 8.0, 0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.95 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.85 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.82 });
    const leafMat3 = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 });

    const count = treePositions.length;
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const cone1Inst = new THREE.InstancedMesh(cone1Geo, leafMat1, count);
    const cone2Inst = new THREE.InstancedMesh(cone2Geo, leafMat2, count);
    const cone3Inst = new THREE.InstancedMesh(cone3Geo, leafMat3, count);

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    treePositions.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rotY, 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);
      cone1Inst.setMatrixAt(i, dummy.matrix);
      cone2Inst.setMatrixAt(i, dummy.matrix);
      cone3Inst.setMatrixAt(i, dummy.matrix);

      tint.setHSL(0.34 + (i % 6) * 0.014, 0.54, 0.25 + (i % 4) * 0.035);
      cone1Inst.setColorAt(i, tint);
      cone2Inst.setColorAt(i, tint);
      cone3Inst.setColorAt(i, tint);
    });

    [trunkInst, cone1Inst, cone2Inst, cone3Inst].forEach((inst) => {
      inst.castShadow = !this.isSoftwareGl;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      this.scene.add(inst);
    });

    // 2) Instanced Forest Bushes / Savanna Shrubs
    const bushCoords: Array<{ x: number; y: number; z: number; s: number }> = [];
    for (let i = 0; i < 1200 && bushCoords.length < 400; i++) {
      const rx = ((Math.sin(i * 91.7) * 21734.12) % 1 + 1) % 1;
      const rz = ((Math.cos(i * 37.1) * 41293.77) % 1 + 1) % 1;
      const x = rx * 2100 - 1050;
      const z = rz * 2100 - 950;
      const trail = this.getNearestTrailInfo(x, z);
      const dCaldera = Math.hypot(x + 700, z + 240);
      if (trail.dist < 10 || dCaldera < 245) continue;
      const y = this.getTerrainHeight(x, z);
      if (y > 350) continue;
      bushCoords.push({ x, y: y - 0.18, z, s: 1.0 + (i % 4) * 0.45 });
    }
    const bushGeo = new THREE.DodecahedronGeometry(1.1, 1);
    bushGeo.translate(0, 0.7, 0);
    const bushMat = new THREE.MeshStandardMaterial({ color: '#3b7d34', roughness: 0.9 });
    const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushCoords.length);
    bushCoords.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, i * 0.8, 0);
      dummy.scale.set(b.s * 1.2, b.s * 0.8, b.s);
      dummy.updateMatrix();
      bushInst.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.30 + (i % 5) * 0.02, 0.48, 0.28 + (i % 3) * 0.04);
      bushInst.setColorAt(i, tint);
    });
    bushInst.receiveShadow = true;
    bushInst.computeBoundingSphere();
    this.scene.add(bushInst);

    // 3) Instanced Granite & Basalt Cliff Boulders across slopes & caldera rims
    const cliffRockGeo = new THREE.DodecahedronGeometry(3.4, 0);
    const cliffRockMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.95 });
    const rockCoords: Array<{ x: number; y: number; z: number; s: number; i: number }> = [];
    for (let i = 0; i < 650 && rockCoords.length < 450; i++) {
      const x = Math.sin(i * 41.3) * 1100;
      const z = -1250 + ((i * 173) % 2400);
      const trail = this.getNearestTrailInfo(x, z);
      const dCaldera = Math.hypot(x + 700, z + 240);
      if (trail.dist < 14 || dCaldera < 225) continue;
      const y = this.getTerrainHeight(x, z);
      rockCoords.push({ x, y: y - 0.6, z, s: 0.85 + (i % 5) * 0.75, i });
    }
    const cliffInst = new THREE.InstancedMesh(cliffRockGeo, cliffRockMat, rockCoords.length);
    rockCoords.forEach((r, idx) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(r.i, r.i * 0.7, r.i * 0.3);
      dummy.scale.set(r.s * 1.35, r.s * 0.85, r.s);
      dummy.updateMatrix();
      cliffInst.setMatrixAt(idx, dummy.matrix);
      tint.setHSL(0.6, 0.08, 0.32 + (idx % 5) * 0.035);
      cliffInst.setColorAt(idx, tint);
    });
    cliffInst.receiveShadow = true;
    cliffInst.computeBoundingSphere();
    this.scene.add(cliffInst);

    // 4) High-Altitude Clouds drifting over Mount Rinjani & Segara Anak
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.82,
      roughness: 1,
    });
    for (let i = 0; i < 36; i++) {
      const cg = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(22 + p * 6, 10, 8), cloudMat);
        puff.position.set((p - 1) * 20, (p % 2) * 5.5, 0);
        puff.scale.y = 0.45;
        cg.add(puff);
      }
      cg.position.set(-1050 + i * 62, 480 + (i % 6) * 34, -1050 + (i % 5) * 380);
      this.scene.add(cg);
      this.clouds.push({ group: cg, speed: 3.5 + (i % 4) * 1.4 });
    }

    // 5) Mountain Eagle & Bird Flocks circling valleys & Segara Anak
    const wingGeo = new THREE.BoxGeometry(2.2, 0.08, 0.65);
    wingGeo.translate(1.1, 0, 0);
    const birdBodyGeo = new THREE.ConeGeometry(0.26, 1.4, 5);
    birdBodyGeo.rotateX(Math.PI / 2);
    const birdMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.75 });

    for (let i = 0; i < 28; i++) {
      const bg = new THREE.Group();
      const body = new THREE.Mesh(birdBodyGeo, birdMat);
      const lw = new THREE.Mesh(wingGeo, birdMat);
      const rw = new THREE.Mesh(wingGeo, birdMat);
      rw.scale.x = -1;
      bg.add(body, lw, rw);
      const cx = ((i % 7) - 3) * 260;
      const cz = -800 + Math.floor(i / 7) * 520;
      const baseY = 140 + (i % 6) * 85;
      bg.position.set(cx, baseY, cz);
      this.scene.add(bg);
      this.birds.push({
        group: bg,
        leftWing: lw,
        rightWing: rw,
        centerX: cx,
        centerZ: cz,
        baseY,
        radius: 65 + (i % 3) * 32,
        angle: i * 0.9,
        speed: 0.18 + (i % 3) * 0.07,
        flapPhase: i * 1.4,
      });
    }
  }

  private buildWeatherSystems() {
    // 1) Rain System
    const rainCount = 1500;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 220;
      rainPos[i * 3 + 1] = Math.random() * 110;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    this.rainSystem = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: '#cbd5e1', size: 0.55, transparent: true, opacity: 0.65 }),
    );
    this.rainSystem.visible = false;
    this.scene.add(this.rainSystem);

    // 2) Snow System (Salju)
    const snowCount = 1600;
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 240;
      snowPos[i * 3 + 1] = Math.random() * 120;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 240;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    this.snowSystem = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({ color: '#ffffff', size: 1.05, transparent: true, opacity: 0.85 }),
    );
    this.snowSystem.visible = false;
    this.scene.add(this.snowSystem);

    // 3) Apocalyptic Ember System (Kiamat)
    const emberCount = 1200;
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = (Math.random() - 0.5) * 220;
      emberPos[i * 3 + 1] = Math.random() * 105;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    this.emberSystem = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({ color: '#fb923c', size: 1.15, transparent: true, opacity: 0.9 }),
    );
    this.emberSystem.visible = false;
    this.scene.add(this.emberSystem);
  }

  public applyEnvironment(timeOfDay: TimeOfDay, weather: WeatherType, immediate = false) {
    this.timeOfDay = timeOfDay;
    this.weather = weather;

    const timeConfigs: Record<
      TimeOfDay,
      {
        sky: string;
        fog: string;
        sunColor: string;
        sunInt: number;
        amb: number;
        hemi: number;
        sunOffset: [number, number, number];
      }
    > = {
      pagi: {
        sky: '#93c5fd',
        fog: '#fde68a',
        sunColor: '#fffbeb',
        sunInt: 1.48,
        amb: 0.54,
        hemi: 0.58,
        sunOffset: [360, 320, 380],
      },
      siang: {
        sky: '#38bdf8',
        fog: '#bae6fd',
        sunColor: '#ffffff',
        sunInt: 1.75,
        amb: 0.62,
        hemi: 0.68,
        sunOffset: [120, 520, 180],
      },
      sore: {
        sky: '#f97316',
        fog: '#fdba74',
        sunColor: '#ffedd5',
        sunInt: 1.28,
        amb: 0.45,
        hemi: 0.46,
        sunOffset: [-390, 180, 310],
      },
      malam: {
        sky: '#0f172a',
        fog: '#1e293b',
        sunColor: '#93c5fd',
        sunInt: 0.58,
        amb: 0.34,
        hemi: 0.36,
        sunOffset: [-210, 440, -240],
      },
    };

    const tc = timeConfigs[timeOfDay] || timeConfigs.pagi;
    this.envTarget.sky.set(tc.sky);
    this.envTarget.fog.set(tc.fog);
    this.envTarget.sunColor.set(tc.sunColor);
    this.envTarget.sunIntensity = tc.sunInt;
    this.envTarget.ambientIntensity = tc.amb;
    this.envTarget.hemiIntensity = tc.hemi;
    this.envTarget.sunOffset.set(...tc.sunOffset);
    this.envTarget.fogDensity = 0.00038;

    if (weather === 'berkabut') {
      this.envTarget.fogDensity = 0.0028;
      this.envTarget.fog.lerp(new THREE.Color('#cbd5e1'), 0.68);
      this.envTarget.sunIntensity *= 0.65;
    } else if (weather === 'hujan') {
      this.envTarget.fogDensity = 0.0013;
      this.envTarget.sky.lerp(new THREE.Color('#475569'), 0.55);
      this.envTarget.fog.lerp(new THREE.Color('#64748b'), 0.6);
      this.envTarget.sunIntensity *= 0.55;
    } else if (weather === 'badai') {
      this.envTarget.fogDensity = 0.0019;
      this.envTarget.sky.lerp(new THREE.Color('#1e293b'), 0.75);
      this.envTarget.fog.lerp(new THREE.Color('#334155'), 0.75);
      this.envTarget.sunIntensity *= 0.42;
    } else if (weather === 'salju') {
      this.envTarget.fogDensity = 0.0014;
      this.envTarget.sky.lerp(new THREE.Color('#cbd5e1'), 0.74);
      this.envTarget.fog.lerp(new THREE.Color('#e2e8f0'), 0.8);
      this.envTarget.sunColor.set('#f1f5f9');
      this.envTarget.sunIntensity *= 0.75;
    } else if (weather === 'kiamat') {
      this.envTarget.fogDensity = 0.0018;
      this.envTarget.sky.set('#450a0a');
      this.envTarget.fog.set('#7f1d1d');
      this.envTarget.sunColor.set('#fca5a5');
      this.envTarget.sunIntensity = 0.85;
      this.envTarget.ambientIntensity = 0.36;
      this.envTarget.hemiIntensity = 0.38;
    }

    if (this.rainSystem) {
      this.rainSystem.visible = !this.lowGraphics && (weather === 'hujan' || weather === 'badai');
    }
    if (this.snowSystem) {
      this.snowSystem.visible = !this.lowGraphics && weather === 'salju';
    }
    if (this.emberSystem) {
      this.emberSystem.visible = !this.lowGraphics && weather === 'kiamat';
    }

    if (immediate) {
      this.envCurrent.sky.copy(this.envTarget.sky);
      this.envCurrent.fog.copy(this.envTarget.fog);
      this.envCurrent.fogDensity = this.envTarget.fogDensity;
      this.envCurrent.sunColor.copy(this.envTarget.sunColor);
      this.envCurrent.sunIntensity = this.envTarget.sunIntensity;
      this.envCurrent.ambientIntensity = this.envTarget.ambientIntensity;
      this.envCurrent.hemiIntensity = this.envTarget.hemiIntensity;
      this.envCurrent.sunOffset.copy(this.envTarget.sunOffset);
      this.syncEnvToScene();
    }
  }

  private syncEnvToScene(focus?: THREE.Vector3) {
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.envCurrent.sky);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.envCurrent.fog);
      this.scene.fog.density = this.envCurrent.fogDensity;
    }
    this.sunLight.color.copy(this.envCurrent.sunColor);
    this.sunLight.intensity = this.envCurrent.sunIntensity;
    if (focus) {
      this.sunLight.target.position.copy(focus);
      this.sunLight.position.copy(focus).add(this.envCurrent.sunOffset);
    } else {
      this.sunLight.position.copy(this.envCurrent.sunOffset);
    }
    this.ambientLight.intensity = this.envCurrent.ambientIntensity;
    this.hemiLight.intensity = this.envCurrent.hemiIntensity;
  }

  // --- R15 / RTHRO ARTICULATED 15-PART AVATAR ---
  public createAvatarMesh(
    avatarCfg: AvatarConfig,
    name: string,
    role: Role,
    cp = 0,
    score = 0,
    isLocalPlayer = false,
  ): THREE.Group {
    const { group, rig } = buildR15AvatarMesh(avatarCfg, role, {
      withSpotLight: isLocalPlayer,
      castShadow: !this.isSoftwareGl && !this.lowGraphics,
    });

    const tagSprite = this.createNameSprite(name, role, cp, score);
    tagSprite.position.set(0, 3.08, 0);
    group.add(tagSprite);

    const emoteSprite = this.createEmoteSprite();
    emoteSprite.position.set(0, 3.85, 0);
    emoteSprite.visible = false;
    group.add(emoteSprite);

    group.userData = {
      ...group.userData,
      r15: rig,
      tagSprite,
      emoteSprite,
      name,
      role,
    };
    return group;
  }

  private createEmoteSprite(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.4, 0.96, 1);
    sprite.userData.canvas = canvas;
    return sprite;
  }

  public showAvatarEmote(mesh: THREE.Group | null, emote: EmoteType) {
    if (!mesh) return;
    const sprite = mesh.userData.emoteSprite as THREE.Sprite | undefined;
    if (!sprite || !sprite.userData.canvas) return;
    const item = EMOTE_ITEMS.find((e) => e.id === emote);
    if (!item) return;

    const canvas = sprite.userData.canvas as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.beginPath();
      ctx.roundRect(12, 12, 296, 92, 22);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, 66, 58);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, 102, 58);
    }
    if (sprite.material.map) {
      sprite.material.map.needsUpdate = true;
    }
    sprite.visible = true;
  }

  public hideAvatarEmote(mesh: THREE.Group | null) {
    if (!mesh) return;
    const sprite = mesh.userData.emoteSprite as THREE.Sprite | undefined;
    if (sprite) sprite.visible = false;
  }

  public animateAvatarPose(
    mesh: THREE.Group,
    isMoving: boolean,
    onGround: boolean,
    walkPhase: number,
    activeEmote: EmoteType | null,
    elapsed: number,
    isHurtOrState: boolean | AvatarPoseState = false,
  ) {
    animateR15AvatarPose(mesh, isMoving, onGround, walkPhase, activeEmote, elapsed, isHurtOrState);
  }

  private createNameSprite(name: string, role: Role, cp: number, score: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 144;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.6, 1.0, 1);
    sprite.userData.canvas = canvas;
    this.updateNameSprite(sprite, name, role, cp, score);
    return sprite;
  }

  public updateNameSprite(
    sprite: THREE.Sprite | undefined,
    name: string,
    role: Role,
    cp: number,
    score: number,
  ) {
    if (!sprite || !sprite.userData.canvas) return;
    const canvas = sprite.userData.canvas as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = role === 'teacher' ? 'rgba(146, 64, 14, 0.9)' : 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(22, 14, 468, 116, 20);
    ctx.fill();
    ctx.strokeStyle = role === 'teacher' ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(role === 'teacher' ? `[GURU] ${name}` : name, 256, 62);

    ctx.fillStyle = role === 'teacher' ? '#fde047' : '#7dd3fc';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText(role === 'teacher' ? 'PEMANTAU KEBAL' : `CP ${cp}/25 · ${score} pts`, 256, 104);

    if (sprite.material.map) {
      sprite.material.map.needsUpdate = true;
    }
  }

  // --- INTERACTIVE 3D MOUNTAIN WILDLIFE ---
  private createTigerMesh(): {
    group: THREE.Group;
    legs: THREE.Object3D[];
    tail: THREE.Object3D;
    head: THREE.Object3D;
  } {
    const group = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.72 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: '#ffedd5', roughness: 0.78 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.35, 6, 10), furMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.95, 0);
    body.castShadow = true;
    group.add(body);

    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.15, 6, 8), bellyMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, 0.75, 0);
    group.add(belly);

    // Tiger Black Stripes
    [-0.48, -0.16, 0.16, 0.48].forEach((sz) => {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.055, 6, 12), stripeMat);
      stripe.position.set(0, 0.96, sz);
      group.add(stripe);
    });

    const head = new THREE.Group();
    head.position.set(0, 1.15, -1.05);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), furMat);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.28), bellyMat);
    snout.position.set(0, -0.08, -0.32);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), stripeMat);
    nose.position.set(0, -0.02, -0.46);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    [-0.14, 0.14].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 6), furMat);
      ear.position.set(ex * 1.4, 0.34, 0.05);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
      eye.position.set(ex, 0.08, -0.34);
      head.add(ear, eye);
    });
    head.add(skull, snout, nose);
    group.add(head);

    const legs: THREE.Object3D[] = [];
    [
      [-0.28, -0.62],
      [0.28, -0.62],
      [-0.28, 0.62],
      [0.28, 0.62],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.56, 6, 8), furMat);
      leg.position.set(lx, 0.44, lz);
      leg.castShadow = true;
      group.add(leg);
      legs.push(leg);
    });

    const tail = new THREE.Group();
    tail.position.set(0, 1.05, 0.92);
    const tailSeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.95, 5, 8), furMat);
    tailSeg.rotation.x = 1.05;
    tailSeg.position.set(0, 0.15, 0.44);
    tail.add(tailSeg);
    group.add(tail);

    return { group, legs, tail, head };
  }

  private createSunBearMesh(): {
    group: THREE.Group;
    legs: THREE.Object3D[];
    head: THREE.Object3D;
  } {
    const group = new THREE.Group();
    const blackFur = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.9 });
    const crescentMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.72 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.15, 8, 12), blackFur);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.95, 0);
    body.castShadow = true;
    group.add(body);

    // Sun Bear signature golden-yellow crescent chest mark
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.085, 6, 12, Math.PI),
      crescentMat,
    );
    crescent.rotation.z = Math.PI;
    crescent.position.set(0, 0.88, -0.82);
    group.add(crescent);

    const head = new THREE.Group();
    head.position.set(0, 1.24, -0.88);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), blackFur);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.3, 10), snoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.06, -0.34);
    [-0.28, 0.28].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), blackFur);
      ear.position.set(ex, 0.32, 0.02);
      head.add(ear);
    });
    head.add(skull, snout);
    group.add(head);

    const legs: THREE.Object3D[] = [];
    [
      [-0.34, -0.45],
      [0.34, -0.45],
      [-0.34, 0.48],
      [0.34, 0.48],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.48, 6, 8), blackFur);
      leg.position.set(lx, 0.42, lz);
      leg.castShadow = true;
      group.add(leg);
      legs.push(leg);
    });

    return { group, legs, head };
  }

  private createBoarMesh(): { group: THREE.Group; legs: THREE.Object3D[] } {
    const group = new THREE.Group();
    const hideMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.92 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.85, 6, 10), hideMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.68, 0);
    body.castShadow = true;
    group.add(body);

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.9), hideMat);
    ridge.position.set(0, 1.05, 0);
    group.add(ridge);

    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.42, 8), hideMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.65, -0.78);
    group.add(snout);

    [-0.14, 0.14].forEach((tx) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 6), tuskMat);
      tusk.rotation.z = tx < 0 ? 0.5 : -0.5;
      tusk.rotation.x = -0.35;
      tusk.position.set(tx, 0.68, -0.92);
      group.add(tusk);
    });

    const legs: THREE.Object3D[] = [];
    [
      [-0.22, -0.36],
      [0.22, -0.36],
      [-0.22, 0.36],
      [0.22, 0.36],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 5, 6), hideMat);
      leg.position.set(lx, 0.28, lz);
      group.add(leg);
      legs.push(leg);
    });

    return { group, legs };
  }

  private createPythonMesh(): { group: THREE.Group; head: THREE.Object3D } {
    const group = new THREE.Group();
    const scaleMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.55 });
    const patternMat = new THREE.MeshStandardMaterial({ color: '#365314', roughness: 0.62 });

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2.5;
      const r = 0.85 - i * 0.032;
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(0.2 - i * 0.006, 8, 8),
        i % 2 === 0 ? scaleMat : patternMat,
      );
      seg.position.set(Math.cos(a) * r, 0.2 + (i > 10 ? (i - 10) * 0.24 : 0), Math.sin(a) * r);
      group.add(seg);
    }

    const head = new THREE.Group();
    head.position.set(0.1, 1.15, -0.35);
    const skull = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 6), scaleMat);
    skull.rotation.x = -Math.PI / 2;
    const tongue = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.02, 0.26),
      new THREE.MeshBasicMaterial({ color: '#ef4444' }),
    );
    tongue.position.set(0, -0.04, -0.32);
    head.add(skull, tongue);
    group.add(head);

    return { group, head };
  }

  private rebuildWildlifeForDifficulty() {
    for (const w of this.wildlife) {
      this.scene.remove(w.mesh);
    }
    this.wildlife.length = 0;

    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    // Total spawns across the ~5200m Mount Rinjani trail scaled cleanly with level (6 up to 48)
    const totalCount = Math.min(48, 4 + lvl.wildlifeCountPerTier * 5);
    const speciesList: Array<'tiger' | 'bear' | 'boar' | 'snake'> = [
      'boar',
      'bear',
      'tiger',
      'snake',
    ];

    for (let i = 0; i < totalCount; i++) {
      // Spread evenly between CP 1 and CP 24, avoiding CP safe pads
      const frac = 0.04 + (i / Math.max(1, totalCount)) * 0.9;
      const sampleIdx = Math.min(
        this.trailSamples.length - 2,
        Math.floor(frac * (this.trailSamples.length - 2)),
      );
      const s = this.trailSamples[sampleIdx];
      if (this.isInsideAnyCheckpointSafeZone(s.x, s.z) || this.getBridgeHeightAt(s.x, s.z) !== null) {
        continue;
      }

      const next = this.trailSamples[sampleIdx + 1];
      const dx = next.x - s.x;
      const dz = next.z - s.z;
      const len = Math.hypot(dx, dz) || 1;
      const tx = dx / len;
      const tz = dz / len;
      const nx = -tz;
      const nz = tx;

      const species = speciesList[i % speciesList.length];
      let mesh: THREE.Group;
      let legs: THREE.Object3D[] = [];
      let tail: THREE.Object3D | null = null;
      let head: THREE.Object3D | null = null;

      if (species === 'tiger') {
        const res = this.createTigerMesh();
        mesh = res.group;
        legs = res.legs;
        tail = res.tail;
        head = res.head;
      } else if (species === 'bear') {
        const res = this.createSunBearMesh();
        mesh = res.group;
        legs = res.legs;
        head = res.head;
      } else if (species === 'boar') {
        const res = this.createBoarMesh();
        mesh = res.group;
        legs = res.legs;
      } else {
        const res = this.createPythonMesh();
        mesh = res.group;
        head = res.head;
      }

      const sideOff = species === 'snake' ? (i % 2 === 0 ? 2.4 : -2.4) : 0;
      const ox = s.x + nx * sideOff;
      const oz = s.z + nz * sideOff;
      mesh.position.set(ox, this.getGroundHeight(ox, oz), oz);
      this.scene.add(mesh);

      this.wildlife.push({
        id: `wild_${i}`,
        species,
        mesh,
        originX: ox,
        originZ: oz,
        dirX: species === 'boar' ? nx : tx,
        dirZ: species === 'boar' ? nz : tz,
        patrolSign: i % 2 === 0 ? 1 : -1,
        patrolRadius: species === 'snake' ? 0.5 : species === 'boar' ? 5.5 : 10.5,
        phase: i * 1.3,
        soundCooldown: 0,
        legs,
        tail,
        head,
      });
    }
  }

  public spawnWildlifeAhead(
    playerX: number,
    playerZ: number,
    speciesOverride?: 'tiger' | 'bear' | 'boar' | 'snake',
  ): 'tiger' | 'bear' | 'boar' | 'snake' {
    const speciesList: Array<'tiger' | 'bear' | 'boar' | 'snake'> = [
      'tiger',
      'bear',
      'boar',
      'snake',
    ];
    const species =
      speciesOverride || speciesList[Math.floor(Math.random() * speciesList.length)];

    // Keep total wildlife bounded cleanly while allowing Teacher triggers
    if (this.wildlife.length >= 58) {
      const oldManualIdx = this.wildlife.findIndex((w) => w.id.startsWith('manual_'));
      const dropIdx = oldManualIdx >= 0 ? oldManualIdx : 0;
      const [removed] = this.wildlife.splice(dropIdx, 1);
      if (removed) this.scene.remove(removed.mesh);
    }

    const ahead = this.getTrailPointAhead(playerX, playerZ, species === 'snake' ? 13 : 17);
    const nx = -ahead.tz;
    const nz = ahead.tx;
    const ox = ahead.x + (species === 'snake' ? (Math.random() < 0.5 ? 1.8 : -1.8) : nx * 1.4);
    const oz = ahead.z + (species === 'snake' ? (Math.random() < 0.5 ? 1.8 : -1.8) : nz * 1.4);

    let mesh: THREE.Group;
    let legs: THREE.Object3D[] = [];
    let tail: THREE.Object3D | null = null;
    let head: THREE.Object3D | null = null;

    if (species === 'tiger') {
      const res = this.createTigerMesh();
      mesh = res.group;
      legs = res.legs;
      tail = res.tail;
      head = res.head;
    } else if (species === 'bear') {
      const res = this.createSunBearMesh();
      mesh = res.group;
      legs = res.legs;
      head = res.head;
    } else if (species === 'boar') {
      const res = this.createBoarMesh();
      mesh = res.group;
      legs = res.legs;
    } else {
      const res = this.createPythonMesh();
      mesh = res.group;
      head = res.head;
    }

    mesh.position.set(ox, this.getGroundHeight(ox, oz), oz);
    this.scene.add(mesh);

    this.wildlife.push({
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      species,
      mesh,
      originX: ox,
      originZ: oz,
      dirX: species === 'boar' ? nx : ahead.tx,
      dirZ: species === 'boar' ? nz : ahead.tz,
      patrolSign: 1,
      patrolRadius: species === 'snake' ? 0.5 : 8.0,
      phase: Math.random() * Math.PI * 2,
      soundCooldown: 1.5,
      legs,
      tail,
      head,
    });

    return species;
  }

  // --- LOCAL GHOST 1: KUNTILANAK (HIGH VISIBILITY ON TRAIL) ---
  public spawnKuntilanak(x: number, z: number) {
    if (this.kuntilanaks.length >= 6) return;
    const group = new THREE.Group();

    const dressMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#e2e8f0',
      emissiveIntensity: 0.45,
      roughness: 0.72,
    });
    const dress = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.5, 12), dressMat);
    dress.position.y = 1.25;

    const veil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.85, 1.25, 12, 1, true),
      new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        emissive: '#94a3b8',
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    veil.position.y = 0.62;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 10),
      new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        emissive: '#cbd5e1',
        emissiveIntensity: 0.3,
        roughness: 0.65,
      }),
    );
    head.position.y = 2.62;

    const hairMat = new THREE.MeshStandardMaterial({ color: '#050507', roughness: 0.94 });
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.85, 0.28), hairMat);
    hairBack.position.set(0, 1.85, 0.22);
    const hairLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.38, 0.24), hairMat);
    hairLeft.position.set(-0.27, 2.04, -0.02);
    const hairRight = hairLeft.clone();
    hairRight.position.x = 0.27;

    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
    eyeL.position.set(-0.095, 2.64, -0.27);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.095;

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.95, 6), dressMat);
    armL.rotation.x = Math.PI / 2;
    armL.position.set(-0.44, 2.1, -0.48);
    const armR = armL.clone();
    armR.position.x = 0.44;

    const mistRing = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.65, 20),
      new THREE.MeshBasicMaterial({
        color: '#e0f2fe',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mistRing.rotation.x = -Math.PI / 2;
    mistRing.position.y = 0.1;

    group.add(dress, veil, head, hairBack, hairLeft, hairRight, eyeL, eyeR, armL, armR, mistRing);
    const gy = this.getGroundHeight(x, z);
    group.position.set(x, gy + 1.15, z);
    this.scene.add(group);

    this.kuntilanaks.push({
      mesh: group,
      age: 0,
      maxAge: 18,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // --- LOCAL GHOST 2: POCONG (3 DISTINCT CORD TIES & CRISP HOPPING PHYSICS) ---
  public spawnPocong(x: number, z: number, tx = 1, tz = 0) {
    if (this.pocongs.length >= 6) return;
    const group = new THREE.Group();

    const shroudMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#cbd5e1',
      emissiveIntensity: 0.2,
      roughness: 0.9,
    });
    const tieMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.25, 2.08, 12), shroudMat);
    body.position.y = 1.06;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 12, 10), shroudMat);
    head.position.y = 2.24;

    const topKnot = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.48, 8), shroudMat);
    topKnot.position.y = 2.66;

    // 3 Signature Cord Ties: Head topknot, Neck, Ankles
    const tieHead = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 14), tieMat);
    tieHead.rotation.x = Math.PI / 2;
    tieHead.position.y = 2.46;

    const tieNeck = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 8, 14), tieMat);
    tieNeck.rotation.x = Math.PI / 2;
    tieNeck.position.y = 1.96;

    const tieAnkles = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 8, 14), tieMat);
    tieAnkles.rotation.x = Math.PI / 2;
    tieAnkles.position.y = 0.24;

    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.28, 0.12),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9 }),
    );
    face.position.set(0, 2.22, -0.26);

    const eyeMat = new THREE.MeshBasicMaterial({ color: '#e2e8f0' });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
    eyeL.position.set(-0.07, 2.24, -0.32);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.07;

    const mistRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 1.35, 18),
      new THREE.MeshBasicMaterial({
        color: '#cbd5e1',
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mistRing.rotation.x = -Math.PI / 2;
    mistRing.position.y = 0.08;

    group.add(body, head, topKnot, tieHead, tieNeck, tieAnkles, face, eyeL, eyeR, mistRing);
    const gy = this.getGroundHeight(x, z);
    group.position.set(x, gy, z);
    this.scene.add(group);

    this.pocongs.push({
      mesh: group,
      originX: x,
      originZ: z,
      dirX: tx,
      dirZ: tz,
      patrolDir: 1,
      vy: 6.5,
      age: 0,
      maxAge: 20,
    });
  }

  // --- LANDSLIDE BOULDERS (SCALED BY LEVEL 1-10) & ROLLING LOGS ---
  public spawnLandslideAhead(playerX: number, playerZ: number, forcedCount?: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const minC = lvl.landslideCountMin;
    const maxC = lvl.landslideCountMax;
    const count =
      forcedCount !== undefined
        ? forcedCount
        : minC + Math.floor(Math.random() * (maxC - minC + 1));

    const maxCap = 64;
    for (let i = 0; i < count && this.boulders.length < maxCap; i++) {
      const ahead = this.getTrailPointAhead(playerX, playerZ, 22 + Math.random() * 28);
      const offsetX = (Math.random() - 0.5) * 11.5;
      const offsetZ = (Math.random() - 0.5) * 9.0;
      const sx = ahead.x + offsetX;
      const sz = ahead.z + offsetZ;
      const trailY = this.getGroundHeight(sx, sz);
      const sy = trailY + 8 + Math.random() * 14 + (i % 5) * 2.2;

      const mesh = new THREE.Mesh(this.rockGeo, this.rockMat);
      const scale = 0.78 + Math.random() * 0.72;
      mesh.scale.setScalar(scale);
      mesh.position.set(sx, sy, sz);
      mesh.castShadow = !this.lowGraphics && !this.isSoftwareGl;
      this.scene.add(mesh);

      const dx = playerX - sx;
      const dz = playerZ - sz;
      const len = Math.hypot(dx, dz) || 1;
      const speed = (11.5 + Math.random() * 5.2) * lvl.speedMult;

      this.boulders.push({
        mesh,
        vx: (dx / len) * speed,
        vy: -1.5 - Math.random() * 3.0,
        vz: (dz / len) * speed,
        rotSpeed: 4.5 * lvl.speedMult,
        radius: 1.2 * scale,
        age: 0,
      });
    }

    this.landslideShakeTimer = Math.max(this.landslideShakeTimer, 1.45);

    const logAhead = this.getTrailPointAhead(playerX, playerZ, 28 + Math.random() * 12);
    const logCount = this.difficultyLevel >= 7 ? 3 : this.difficultyLevel >= 3 ? 1 : 0;
    for (let l = 0; l < logCount; l++) {
      const logMesh = new THREE.Mesh(this.logGeo, this.logMat);
      const ox = (l - 1) * 3.2;
      const sy = this.getGroundHeight(logAhead.x + ox, logAhead.z) + 2.5 + l * 1.4;
      logMesh.position.set(logAhead.x + ox, sy, logAhead.z);
      logMesh.rotation.y = Math.atan2(-logAhead.tx, -logAhead.tz);
      this.scene.add(logMesh);
      const speed = 11.5 * lvl.speedMult;
      this.rollingLogs.push({
        mesh: logMesh,
        vx: -logAhead.tx * speed,
        vy: 0,
        vz: -logAhead.tz * speed,
        rollAxisX: logAhead.tx,
        rollAxisZ: logAhead.tz,
        radius: 0.72,
        age: 0,
      });
    }
  }

  // --- STORM LIGHTNING STRIKES AHEAD ---
  public spawnLightningStrikeAhead(playerX: number, playerZ: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const count = Math.min(5, Math.max(1, lvl.lightningCount));
    for (let i = 0; i < count; i++) {
      const ahead = this.getTrailPointAhead(playerX, playerZ, 14 + i * 6.5 + Math.random() * 5);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
      const gy = this.getGroundHeight(ahead.x, ahead.z);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 2.5, 24),
        new THREE.MeshBasicMaterial({
          color: '#fde047',
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(ahead.x, gy + 0.16, ahead.z);

      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.52, 46, 8),
        new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.95 }),
      );
      bolt.position.set(ahead.x, gy + 23, ahead.z);
      bolt.visible = false;

      this.scene.add(ring, bolt);
      this.lightningStrikes.push({
        x: ahead.x,
        z: ahead.z,
        y: gy,
        ring,
        bolt,
        timer: 1.15 + i * 0.18,
        struck: false,
      });
    }
  }

  // --- EARTHQUAKE DISASTER ---
  public triggerEarthquake(playerX?: number, playerZ?: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    this.earthquakeTimer = Math.max(this.earthquakeTimer, lvl.quakeDuration);
    if (playerX !== undefined && playerZ !== undefined) {
      this.spawnLandslideAhead(playerX, playerZ, Math.max(3, Math.floor(lvl.landslideCountMin * 0.6)));
    }
  }

  // --- WILDFIRE DISASTER ---
  public triggerWildfire(playerX: number, playerZ: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const clusters = Math.min(5, Math.max(1, lvl.wildfireClusters));
    const flameMat = new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.9 });
    const coreMat = new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.92 });
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#334155', transparent: true, opacity: 0.45 });

    for (let i = 0; i < clusters && this.wildfires.length < 10; i++) {
      const ahead = this.getTrailPointAhead(playerX, playerZ, 18 + i * 8 + Math.random() * 5);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
      const fx = ahead.x + (Math.random() - 0.5) * 4.4;
      const fz = ahead.z + (Math.random() - 0.5) * 4.4;
      const fy = this.getGroundHeight(fx, fz);

      const group = new THREE.Group();
      group.position.set(fx, fy, fz);
      const flames: THREE.Mesh[] = [];
      const smokes: THREE.Mesh[] = [];

      for (let f = 0; f < 5; f++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.62 - f * 0.06, 2.2 + (f % 2) * 0.7, 7),
          f % 2 === 0 ? flameMat : coreMat,
        );
        cone.position.set((Math.random() - 0.5) * 1.6, 1.05, (Math.random() - 0.5) * 1.6);
        group.add(cone);
        flames.push(cone);
      }

      for (let s = 0; s < 3; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.75 + s * 0.15, 7, 7), smokeMat);
        puff.position.set((Math.random() - 0.5) * 1.2, 2.8 + s * 1.1, (Math.random() - 0.5) * 1.2);
        group.add(puff);
        smokes.push(puff);
      }

      this.scene.add(group);
      this.wildfires.push({
        x: fx,
        z: fz,
        y: fy,
        group,
        flames,
        smokes,
        age: 0,
        maxAge: 14,
      });
    }
  }

  // --- KIAMAT METEOR SHOWER AHEAD ---
  public spawnMeteorAhead(playerX: number, playerZ: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const count = Math.min(4, Math.max(2, Math.round(lvl.lightningCount * 0.6)));
    for (let i = 0; i < count && this.meteors.length < 12; i++) {
      const ahead = this.getTrailPointAhead(playerX, playerZ, 20 + i * 11 + Math.random() * 10);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
      const mx = ahead.x + (Math.random() - 0.5) * 6.5;
      const mz = ahead.z + (Math.random() - 0.5) * 6.5;
      const gy = this.getGroundHeight(mx, mz);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 4.4, 28),
        new THREE.MeshBasicMaterial({
          color: '#ef4444',
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(mx, gy + 0.2, mz);

      const shockwave = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 4.5, 28),
        new THREE.MeshBasicMaterial({
          color: '#fb923c',
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        }),
      );
      shockwave.rotation.x = -Math.PI / 2;
      shockwave.position.set(mx, gy + 0.35, mz);
      shockwave.visible = false;

      const boulder = new THREE.Mesh(this.meteorGeo, this.meteorMat);
      boulder.position.set(mx + 14, gy + 95, mz + 10);
      boulder.scale.setScalar(1.25);

      this.scene.add(ring, shockwave, boulder);
      this.meteors.push({
        x: mx,
        z: mz,
        groundY: gy,
        boulder,
        ring,
        shockwave,
        timer: 1.35 + i * 0.24,
        impacted: false,
      });
    }
  }

  // --- CLIMBING LADDER MOVEMENT ---
  public handleLadderMovement(
    pos: THREE.Vector3,
    forwardInput: number,
    dt: number,
  ): { climbing: boolean; exitedTop: boolean } {
    for (const lad of this.ladders) {
      const dBase = Math.hypot(pos.x - lad.x, pos.z - lad.z);
      if (dBase < 3.6 && pos.y >= lad.baseY - 1.5 && pos.y <= lad.topY + 0.8 && forwardInput > 0.12) {
        pos.x = THREE.MathUtils.damp(pos.x, lad.x, 12, dt);
        pos.z = THREE.MathUtils.damp(pos.z, lad.z, 12, dt);
        pos.y += 12.5 * dt;
        if (pos.y >= lad.topY) {
          pos.set(lad.exitX, this.getGroundHeight(lad.exitX, lad.exitZ) + 0.35, lad.exitZ);
          return { climbing: false, exitedTop: true };
        }
        return { climbing: true, exitedTop: false };
      }
    }
    return { climbing: false, exitedTop: false };
  }

  // --- MOUNTAIN SLIDE MOVEMENT & SNOW/DUST SPRAY ---
  private spawnSlideSprayParticle(x: number, y: number, z: number) {
    if (this.slideParticles.length >= 40) return;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 5, 5),
      new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.78 }),
    );
    mesh.position.set(x + (Math.random() - 0.5) * 1.1, y + 0.25, z + (Math.random() - 0.5) * 1.1);
    this.scene.add(mesh);
    this.slideParticles.push({
      mesh,
      vx: (Math.random() - 0.5) * 4.5,
      vy: 2.5 + Math.random() * 2.8,
      vz: (Math.random() - 0.5) * 4.5,
      age: 0,
    });
  }

  public handleSlideMovement(
    pos: THREE.Vector3,
    dt: number,
    soundEngine?: SoundEngine,
  ): { sliding: boolean; yaw: number } {
    for (const s of this.slides) {
      const dx = pos.x - s.startX;
      const dz = pos.z - s.startZ;
      const proj = dx * s.dirX + dz * s.dirZ;
      if (proj >= -0.8 && proj <= s.length - 0.4) {
        const perp = Math.abs(-dx * s.dirZ + dz * s.dirX);
        const groundY = this.getGroundHeight(pos.x, pos.z);
        if (perp < 2.8 && Math.abs(pos.y - groundY) < 2.0) {
          const slideSpeed = 34.0;
          pos.x += s.dirX * slideSpeed * dt;
          pos.z += s.dirZ * slideSpeed * dt;
          pos.y = this.getGroundHeight(pos.x, pos.z) + 0.14;
          if (Math.random() < 0.65) {
            this.spawnSlideSprayParticle(pos.x, pos.y, pos.z);
          }
          if (soundEngine && Math.random() < 0.08) {
            soundEngine.playSlideWhoosh();
          }
          return { sliding: true, yaw: Math.atan2(s.dirX, s.dirZ) };
        }
      }
    }
    return { sliding: false, yaw: 0 };
  }

  // --- WIND ZONE PUSH (STUDENTS ONLY) ---
  public applyWindPush(pos: THREE.Vector3, dt: number, isPaused: boolean): boolean {
    if (isPaused) return false;
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const windStrength = 3.8 + lvl.speedMult * 1.65;
    for (const wz of this.windZones) {
      if (Math.hypot(pos.x - wz.x, pos.z - wz.z) < wz.radius) {
        pos.x += wz.dirX * windStrength * dt;
        pos.z += wz.dirZ * windStrength * dt;
        return true;
      }
    }
    return false;
  }

  public isInsideAnyCheckpointSafeZone(x: number, z: number): boolean {
    for (let i = 0; i < CP_POINTS.length; i++) {
      const cp = CP_POINTS[i];
      if (Math.hypot(x - cp.x, z - cp.z) <= CP_SAFE_RADIUS) return true;
    }
    if (Math.hypot(x - SUMMIT_EXAM_POINT.x, z - SUMMIT_EXAM_POINT.z) <= CP_SAFE_RADIUS + 2.5) {
      return true;
    }
    return false;
  }

  public updateCpGatesForRole(role: Role, currentCP: number, completedCPs: number[]) {
    for (const g of this.cpGates) {
      if (role === 'teacher') {
        g.group.visible = false;
      } else {
        const unlocked = completedCPs.includes(g.index) || (g.index < 25 && currentCP >= g.index);
        g.group.visible = !unlocked;
      }
    }
  }

  public enforceStudentTrailAndGates(
    pos: THREE.Vector3,
    currentCP: number,
    completedCPs: number[],
  ): { blockedByGateCp: number | null; skippedAheadCp: number | null } {
    const waypoints = this.getFullWaypoints();

    // 1. Sequential CP validation: if student ever reached a CP beyond currentCP + 1, reset them cleanly
    for (let c = currentCP + 2; c <= 25; c++) {
      const cp = CP_POINTS[c];
      if (Math.hypot(pos.x - cp.x, pos.z - cp.z) < 9.5 && Math.abs(pos.y - cp.y) < 14) {
        return { blockedByGateCp: null, skippedAheadCp: c };
      }
    }
    if (!completedCPs.includes(25)) {
      if (
        Math.hypot(pos.x - SUMMIT_EXAM_POINT.x, pos.z - SUMMIT_EXAM_POINT.z) < 11.5 &&
        Math.abs(pos.y - SUMMIT_EXAM_POINT.y) < 16
      ) {
        return { blockedByGateCp: null, skippedAheadCp: 26 };
      }
    }

    // 2. Determine unlocked trail segments (0 .. maxSeg, including 25 only once CP 25 is completed)
    const maxSeg = completedCPs.includes(25) ? 25 : Math.min(24, currentCP);
    let bestDistSq = Infinity;
    let bestX = pos.x;
    let bestZ = pos.z;
    let bestSeg = 0;

    for (let i = 0; i <= maxSeg; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz;
      const t = clamp(((pos.x - a.x) * dx + (pos.z - a.z) * dz) / lenSq, 0, 1);
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const dSq = (pos.x - px) * (pos.x - px) + (pos.z - pz) * (pos.z - pz);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestX = px;
        bestZ = pz;
        bestSeg = i;
      }
    }

    // 3. Check CP Energy Barrier Gate ahead of currentCP + 1 (or CP 25 -> Gapura Puncak)
    let blockedByGateCp: number | null = null;
    const targetCpIdx = currentCP < 25 ? currentCP + 1 : 25;
    if (targetCpIdx <= 25 && !completedCPs.includes(targetCpIdx)) {
      const gateCp = waypoints[targetCpIdx];
      const nextCp = waypoints[targetCpIdx + 1];
      const gdx = nextCp.x - gateCp.x;
      const gdz = nextCp.z - gateCp.z;
      const gLen = Math.hypot(gdx, gdz) || 1;
      const ux = gdx / gLen;
      const uz = gdz / gLen;
      const projPast = (pos.x - gateCp.x) * ux + (pos.z - gateCp.z) * uz;
      const distFromTargetCp = Math.hypot(pos.x - gateCp.x, pos.z - gateCp.z);
      if (distFromTargetCp < 24 && projPast > 3.2) {
        const pushBack = projPast - 3.2;
        pos.x -= ux * pushBack;
        pos.z -= uz * pushBack;
        blockedByGateCp = targetCpIdx;
      }
    }

    // 4. Invisible Side Collision Walls along switchbacks & bridges
    const distFromBest = Math.hypot(pos.x - bestX, pos.z - bestZ);
    const nearBaseCamp = Math.hypot(pos.x - CP_POINTS[0].x, pos.z - CP_POINTS[0].z) < 22;
    const nearSummitPost =
      Math.hypot(pos.x - SUMMIT_EXAM_POINT.x, pos.z - SUMMIT_EXAM_POINT.z) < 14;
    const onBridge = this.getBridgeHeightAt(bestX, bestZ) !== null;
    let nearUnlockedCp = false;
    for (let c = 0; c <= Math.min(25, currentCP + 1); c++) {
      if (Math.hypot(pos.x - CP_POINTS[c].x, pos.z - CP_POINTS[c].z) < 9.5) {
        nearUnlockedCp = true;
        break;
      }
    }

    let allowedHalf = this.getEffectiveTrailHalfWidth() + 0.8;
    if (onBridge) allowedHalf = 4.2;
    else if (nearBaseCamp) allowedHalf = 22;
    else if (nearSummitPost && completedCPs.includes(25)) allowedHalf = 13.5;
    else if (nearUnlockedCp) allowedHalf = 9.5;

    if (distFromBest > allowedHalf && bestSeg <= maxSeg) {
      const scale = allowedHalf / distFromBest;
      pos.x = bestX + (pos.x - bestX) * scale;
      pos.z = bestZ + (pos.z - bestZ) * scale;
    }

    return { blockedByGateCp, skippedAheadCp: null };
  }

  public getSurfaceTypeAt(x: number, z: number): 'dirt' | 'stone' | 'wood' {
    if (this.getBridgeHeightAt(x, z) !== null) return 'wood';
    for (let i = 0; i < CP_POINTS.length; i++) {
      if (Math.hypot(x - CP_POINTS[i].x, z - CP_POINTS[i].z) <= 8.5) {
        return 'stone';
      }
    }
    if (Math.hypot(x - SUMMIT_EXAM_POINT.x, z - SUMMIT_EXAM_POINT.z) <= 12) return 'stone';
    const gy = this.getTerrainHeight(x, z);
    if (gy > 350) return 'stone';
    return 'dirt';
  }

  public getRiverProximity(x: number, z: number): number {
    let minDist = Infinity;
    if (z > -140) {
      minDist = Math.min(minDist, Math.abs(x - getRiverCenterX(z)));
    }
    const wfDist = Math.hypot(x - 580, z + 100);
    minDist = Math.min(minDist, wfDist);
    return clamp(1 - (minDist - 16) / 140, 0, 1);
  }

  public collectRadarData(
    playerPos: THREE.Vector3,
    camYaw: number,
    nextCpIndex: number,
  ): { targetBlip: { relX: number; relY: number }; nearbyBlips: RadarBlip[] } {
    const target =
      nextCpIndex >= 26
        ? SUMMIT_EXAM_POINT
        : CP_POINTS[Math.min(25, Math.max(0, nextCpIndex))];
    const lookAngle = camYaw + Math.PI;
    const sinA = Math.sin(lookAngle);
    const cosA = Math.cos(lookAngle);
    const range = 240;

    const toRadar = (wx: number, wz: number) => {
      const dx = wx - playerPos.x;
      const dz = wz - playerPos.z;
      const fwd = dx * sinA + dz * cosA;
      const right = -dx * cosA + dz * sinA;
      let nx = right / range;
      let ny = -fwd / range;
      const len = Math.hypot(nx, ny);
      if (len > 0.88) {
        nx = (nx / len) * 0.88;
        ny = (ny / len) * 0.88;
      }
      return { relX: nx, relY: ny };
    };

    const targetBlip = toRadar(target.x, target.z);
    const nearbyBlips: RadarBlip[] = [];
    for (const [id, rp] of this.remotePlayers.entries()) {
      const pos = rp.mesh.position;
      if (Math.hypot(pos.x - playerPos.x, pos.z - playerPos.z) > 340) continue;
      const mapped = toRadar(pos.x, pos.z);
      nearbyBlips.push({
        id,
        name: rp.name,
        role: rp.role,
        relX: mapped.relX,
        relY: mapped.relY,
      });
    }
    return { targetBlip, nearbyBlips };
  }

  public updateVisuals(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    soundEngine: SoundEngine,
    isPaused: boolean,
  ): { hitBy: HazardHitType | null; shakeIntensity: number } {
    const envAlpha = 1 - Math.exp(-4.2 * dt);
    this.envCurrent.sky.lerp(this.envTarget.sky, envAlpha);
    this.envCurrent.fog.lerp(this.envTarget.fog, envAlpha);
    this.envCurrent.fogDensity = THREE.MathUtils.damp(
      this.envCurrent.fogDensity,
      this.envTarget.fogDensity,
      4.2,
      dt,
    );
    this.envCurrent.sunColor.lerp(this.envTarget.sunColor, envAlpha);
    this.envCurrent.sunIntensity = THREE.MathUtils.damp(
      this.envCurrent.sunIntensity,
      this.envTarget.sunIntensity,
      4.2,
      dt,
    );
    this.envCurrent.ambientIntensity = THREE.MathUtils.damp(
      this.envCurrent.ambientIntensity,
      this.envTarget.ambientIntensity,
      4.2,
      dt,
    );
    this.envCurrent.hemiIntensity = THREE.MathUtils.damp(
      this.envCurrent.hemiIntensity,
      this.envTarget.hemiIntensity,
      4.2,
      dt,
    );
    this.envCurrent.sunOffset.lerp(this.envTarget.sunOffset, envAlpha);
    this.syncEnvToScene(playerPos);

    for (const c of this.clouds) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > 1250) c.group.position.x = -1250;
    }
    for (const drop of this.waterfallDrops) {
      drop.mesh.position.y -= drop.speed * dt;
      if (drop.mesh.position.y < drop.botY) drop.mesh.position.y = drop.topY;
    }

    for (const b of this.birds) {
      b.angle += b.speed * dt;
      b.flapPhase += dt * 7.5;
      const nx = b.centerX + Math.cos(b.angle) * b.radius;
      const nz = b.centerZ + Math.sin(b.angle) * b.radius;
      b.group.position.set(nx, b.baseY + Math.sin(b.angle * 2) * 5.5, nz);
      b.group.rotation.y = -b.angle;
      const flap = Math.sin(b.flapPhase) * 0.45;
      b.leftWing.rotation.z = flap;
      b.rightWing.rotation.z = -flap;
    }

    if (this.rainSystem && this.rainSystem.visible) {
      this.rainSystem.position.set(playerPos.x, playerPos.y - 20, playerPos.z);
      const arr = this.rainSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] -= 52 * dt;
        if (arr[i] < 0) arr[i] = 110;
      }
      this.rainSystem.geometry.attributes.position.needsUpdate = true;
    }

    if (this.snowSystem && this.snowSystem.visible) {
      this.snowSystem.position.set(playerPos.x, playerPos.y - 20, playerPos.z);
      const arr = this.snowSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.sin(elapsed * 1.4 + i) * 2.4 * dt;
        arr[i + 1] -= 12 * dt;
        if (arr[i + 1] < 0) arr[i + 1] = 120;
      }
      this.snowSystem.geometry.attributes.position.needsUpdate = true;
    }

    if (this.emberSystem && this.emberSystem.visible) {
      this.emberSystem.position.set(playerPos.x, playerPos.y - 12, playerPos.z);
      const arr = this.emberSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.cos(elapsed * 2.2 + i) * 3.8 * dt;
        arr[i + 1] += 15 * dt;
        if (arr[i + 1] > 105) arr[i + 1] = 0;
      }
      this.emberSystem.geometry.attributes.position.needsUpdate = true;
    }

    for (const b of this.cpBeacons) {
      b.ring.scale.setScalar(1 + Math.sin(elapsed * 2.8 + b.index) * 0.06);
      b.flag.rotation.y = Math.sin(elapsed * 3.5 + b.index) * 0.14;
    }

    // Wind zone animated ribbons
    for (const wz of this.windZones) {
      wz.ribbons.forEach((rib, idx) => {
        rib.position.x += wz.dirX * 14 * dt;
        rib.position.z += wz.dirZ * 14 * dt;
        if (Math.hypot(rib.position.x - wz.x, rib.position.z - wz.z) > wz.radius) {
          rib.position.x = wz.x - wz.dirX * (wz.radius * 0.85) + (idx - 2) * 1.1;
          rib.position.z = wz.z - wz.dirZ * (wz.radius * 0.85) + (idx - 2) * 1.1;
        }
      });
    }

    // Slide spray particles
    for (let i = this.slideParticles.length - 1; i >= 0; i--) {
      const sp = this.slideParticles[i];
      sp.age += dt;
      sp.vy -= 9.5 * dt;
      sp.mesh.position.x += sp.vx * dt;
      sp.mesh.position.y += sp.vy * dt;
      sp.mesh.position.z += sp.vz * dt;
      sp.mesh.scale.setScalar(Math.max(0.1, 1 - sp.age * 1.4));
      if (sp.age >= 0.7) {
        this.scene.remove(sp.mesh);
        this.slideParticles.splice(i, 1);
      }
    }

    // Swaying bridge planks on high mountain bridge
    const swayMult = this.difficultyLevel >= 4 ? 0.22 + (this.difficultyLevel - 4) * 0.04 : 0.04;
    for (const sp of this.swayPlanks) {
      const tilt = Math.sin(elapsed * 3.2 + sp.phase) * swayMult;
      sp.mesh.rotation.z = tilt;
      sp.mesh.position.y = sp.baseY + Math.sin(elapsed * 4.5 + sp.phase) * (swayMult * 0.45);
    }

    if (isPaused) return { hitBy: null, shakeIntensity: 0 };

    // Shake decay
    this.earthquakeTimer = Math.max(0, this.earthquakeTimer - dt);
    this.landslideShakeTimer = Math.max(0, this.landslideShakeTimer - dt);
    this.meteorShakeTimer = Math.max(0, this.meteorShakeTimer - dt);
    const quakeShake = this.earthquakeTimer > 0 ? Math.min(0.95, 0.35 + this.difficultyLevel * 0.055) : 0;
    const landShake = this.landslideShakeTimer > 0 ? 0.22 : 0;
    const metShake = this.meteorShakeTimer > 0 ? 0.48 : 0;
    const shakeIntensity = Math.max(quakeShake, landShake, metShake);

    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    let hitBy: HazardHitType | null = null;
    const playerInSafeCP = this.isInsideAnyCheckpointSafeZone(playerPos.x, playerPos.z);

    // Meteor Impacts (Kiamat / Hujan Meteor)
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.timer -= dt;
      if (!m.impacted) {
        const frac = clamp(m.timer / 1.35, 0, 1);
        m.boulder.position.set(m.x + frac * 14, m.groundY + frac * 95 + 1.5, m.z + frac * 10);
        m.boulder.rotation.x += 5 * dt;
        m.boulder.rotation.z += 4 * dt;
        m.ring.scale.setScalar(0.85 + Math.sin(elapsed * 20) * 0.22);
        if (m.timer <= 0) {
          m.impacted = true;
          m.boulder.visible = false;
          m.ring.visible = false;
          m.shockwave.visible = true;
          m.timer = 0.55;
          this.meteorShakeTimer = Math.max(this.meteorShakeTimer, 0.45);
          soundEngine.playMeteorImpact();
          if (!playerInSafeCP && Math.hypot(playerPos.x - m.x, playerPos.z - m.z) < 4.5 && Math.abs(playerPos.y - m.groundY) < 6.0) {
            hitBy = 'meteor';
          }
        }
      } else {
        const expand = 1 + (0.55 - m.timer) * 4.5;
        m.shockwave.scale.setScalar(expand);
        (m.shockwave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, m.timer / 0.55);
        if (m.timer <= 0) {
          this.scene.remove(m.boulder, m.ring, m.shockwave);
          this.meteors.splice(i, 1);
        }
      }
    }

    // Collapsing Stepping Stones
    for (const cs of this.crumbleStones) {
      const dist = Math.hypot(playerPos.x - cs.x, playerPos.z - cs.z);
      const onTop = dist < 2.8 && Math.abs(playerPos.y - cs.baseY) < 1.8;
      const mat = cs.mesh.material as THREE.MeshStandardMaterial;

      if (cs.state === 'solid') {
        cs.mesh.position.set(cs.x, cs.baseY, cs.z);
        mat.color.set('#94a3b8');
        if (onTop) {
          cs.state = 'shaking';
          cs.timer = 0.88;
        }
      } else if (cs.state === 'shaking') {
        cs.timer -= dt;
        cs.mesh.position.set(
          cs.x + Math.sin(elapsed * 55) * 0.14,
          cs.baseY + Math.cos(elapsed * 48) * 0.08,
          cs.z,
        );
        mat.color.set('#f97316');
        if (cs.timer <= 0) {
          cs.state = 'fallen';
          cs.timer = 2.6;
          if (onTop && !playerInSafeCP) {
            hitBy = 'crumble_stone';
          }
        }
      } else {
        cs.timer -= dt;
        cs.mesh.position.y = THREE.MathUtils.damp(cs.mesh.position.y, cs.baseY - 4.8, 7, dt);
        mat.color.set('#475569');
        if (cs.timer <= 0) {
          cs.state = 'solid';
          cs.mesh.position.set(cs.x, cs.baseY, cs.z);
        }
      }
    }

    // Volcanic Geyser Steam Vents
    for (const g of this.geysers) {
      const cycle = (elapsed + g.phase) % 4.6;
      const distToP = Math.hypot(playerPos.x - g.x, playerPos.z - g.z);
      if (cycle > 3.25) {
        g.plume.visible = true;
        const burstScale = Math.sin(((cycle - 3.25) / 1.35) * Math.PI);
        g.plume.scale.set(1 + burstScale * 0.4, Math.max(0.2, burstScale * 1.25), 1 + burstScale * 0.4);
        if (!g.soundPlayed && distToP < 36) {
          soundEngine.playGeyserBlast();
          g.soundPlayed = true;
        }
        if (!playerInSafeCP && distToP < 2.05 && playerPos.y < g.baseY + 2.8) {
          hitBy = 'geyser';
        }
      } else {
        g.plume.visible = false;
        g.soundPlayed = false;
        const ringMat = g.ring.material as THREE.MeshStandardMaterial;
        ringMat.emissiveIntensity = cycle > 2.4 ? 1.2 : 0.35;
      }
    }

    // Storm Lightning Strikes
    for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
      const ls = this.lightningStrikes[i];
      ls.timer -= dt;
      if (!ls.struck) {
        const pulse = 0.8 + Math.sin(elapsed * 22) * 0.25;
        ls.ring.scale.setScalar(pulse);
        if (ls.timer <= 0) {
          ls.struck = true;
          ls.bolt.visible = true;
          ls.timer = 0.32;
          soundEngine.playLightningStrike();
          if (!playerInSafeCP && Math.hypot(playerPos.x - ls.x, playerPos.z - ls.z) < 2.65 && Math.abs(playerPos.y - ls.y) < 4.5) {
            hitBy = 'lightning';
          }
        }
      } else if (ls.timer <= 0) {
        this.scene.remove(ls.ring, ls.bolt);
        this.lightningStrikes.splice(i, 1);
      }
    }

    // Wildfire Flame Clusters
    for (let i = this.wildfires.length - 1; i >= 0; i--) {
      const wf = this.wildfires[i];
      wf.age += dt;
      if (wf.age >= wf.maxAge) {
        this.scene.remove(wf.group);
        this.wildfires.splice(i, 1);
        continue;
      }
      wf.flames.forEach((f, idx) => {
        f.scale.y = 0.8 + Math.sin(elapsed * 14 + idx * 1.7) * 0.35;
        f.rotation.y += 2.2 * dt;
      });
      wf.smokes.forEach((s, idx) => {
        s.position.y = 2.6 + ((elapsed * 1.4 + idx * 0.8) % 2.4);
      });
      const distF = Math.hypot(playerPos.x - wf.x, playerPos.z - wf.z);
      if (distF < 20 && Math.random() < 0.04) {
        soundEngine.playWildfireCrackle();
      }
      if (!playerInSafeCP && distF < 2.2 && playerPos.y < wf.y + 1.85) {
        hitBy = 'wildfire';
      }
    }

    // Check rickety bridge planks at high difficulty (>=7)
    if (!playerInSafeCP && this.difficultyLevel >= 7) {
      for (const sp of this.swayPlanks) {
        if (Math.hypot(playerPos.x - sp.worldX, playerPos.z - sp.worldZ) < 1.15) {
          if (Math.abs(sp.mesh.rotation.z) > 0.34 && Math.abs(playerPos.y - this.getGroundHeight(sp.worldX, sp.worldZ)) < 1.0) {
            hitBy = 'bridge_plank';
          }
        }
      }
    }

    // Update Interactive Mountain Wildlife
    for (const w of this.wildlife) {
      w.soundCooldown = Math.max(0, w.soundCooldown - dt);
      const dxToP = playerPos.x - w.mesh.position.x;
      const dzToP = playerPos.z - w.mesh.position.z;
      const distToP = Math.hypot(dxToP, dzToP) || 1;
      const aggroRange = (w.species === 'tiger' ? 24 : w.species === 'bear' ? 20 : 14) + this.difficultyLevel * 1.1;

      if (w.species === 'snake') {
        w.mesh.rotation.y = Math.atan2(dxToP, dzToP) + Math.PI;
        if (w.head) {
          w.head.position.z = -0.35 + Math.sin(elapsed * 5 + w.phase) * 0.14;
        }
        if (distToP < 12 && w.soundCooldown <= 0) {
          soundEngine.playSnakeHiss();
          w.soundCooldown = 5.5;
        }
        if (!playerInSafeCP && distToP < 1.65 && Math.abs(playerPos.y - w.mesh.position.y) < 1.8) {
          hitBy = 'snake';
        }
        continue;
      }

      let moveX = w.dirX * w.patrolSign;
      let moveZ = w.dirZ * w.patrolSign;
      let speed = (w.species === 'tiger' ? 6.2 : w.species === 'boar' ? 5.8 : 4.2) * lvl.speedMult;

      if (!playerInSafeCP && distToP < aggroRange) {
        moveX = dxToP / distToP;
        moveZ = dzToP / distToP;
        speed *= 1.38;
        if (w.soundCooldown <= 0) {
          if (w.species === 'tiger') soundEngine.playTigerRoar();
          else if (w.species === 'bear') soundEngine.playBearGrowl();
          else soundEngine.playBoarSnort();
          w.soundCooldown = 6.5;
        }
      } else {
        const offDist = Math.hypot(w.mesh.position.x - w.originX, w.mesh.position.z - w.originZ);
        if (offDist > w.patrolRadius) {
          w.patrolSign *= -1;
          moveX = (w.originX - w.mesh.position.x) / (offDist || 1);
          moveZ = (w.originZ - w.mesh.position.z) / (offDist || 1);
        }
      }

      const nx = w.mesh.position.x + moveX * speed * dt;
      const nz = w.mesh.position.z + moveZ * speed * dt;
      if (!this.isInsideAnyCheckpointSafeZone(nx, nz)) {
        w.mesh.position.x = nx;
        w.mesh.position.z = nz;
      } else {
        w.patrolSign *= -1;
      }

      w.mesh.position.y = this.getGroundHeight(w.mesh.position.x, w.mesh.position.z);
      w.mesh.rotation.y = Math.atan2(moveX, moveZ) + Math.PI;

      const stride = Math.sin(elapsed * 9 * lvl.speedMult + w.phase) * 0.48;
      w.legs.forEach((leg, li) => {
        leg.rotation.x = li % 2 === 0 ? stride : -stride;
      });
      if (w.tail) {
        w.tail.rotation.y = Math.sin(elapsed * 6 + w.phase) * 0.45;
      }

      const hitRad = w.species === 'bear' ? 1.85 : 1.65;
      if (!playerInSafeCP && distToP < hitRad && Math.abs(playerPos.y - w.mesh.position.y) < 2.1) {
        hitBy = w.species;
      }
    }

    // Update Kuntilanak (zig-zag pursuit)
    for (let i = this.kuntilanaks.length - 1; i >= 0; i--) {
      const k = this.kuntilanaks[i];
      k.age += dt;
      if (k.age >= k.maxAge) {
        this.scene.remove(k.mesh);
        this.kuntilanaks.splice(i, 1);
        continue;
      }

      const dx = playerPos.x - k.mesh.position.x;
      const dz = playerPos.z - k.mesh.position.z;
      const dist = Math.hypot(dx, dz) || 1;

      if (!playerInSafeCP && dist < 68) {
        const speed = 6.2 * lvl.speedMult;
        const perpX = -dz / dist;
        const perpZ = dx / dist;
        const zig = Math.sin(elapsed * 4.2 + k.phase) * 4.0;
        const nx = k.mesh.position.x + ((dx / dist) * speed + perpX * zig) * dt;
        const nz = k.mesh.position.z + ((dz / dist) * speed + perpZ * zig) * dt;
        if (!this.isInsideAnyCheckpointSafeZone(nx, nz)) {
          k.mesh.position.x = nx;
          k.mesh.position.z = nz;
        }
        k.mesh.lookAt(playerPos.x, k.mesh.position.y, playerPos.z);
        k.mesh.rotateY(Math.PI);
      }

      const gy = this.getGroundHeight(k.mesh.position.x, k.mesh.position.z);
      k.mesh.position.y = gy + 1.15 + Math.sin(elapsed * 3.5 + k.phase) * 0.35;

      if (
        !playerInSafeCP &&
        Math.hypot(playerPos.x - k.mesh.position.x, playerPos.z - k.mesh.position.z) < 1.7 &&
        Math.abs(playerPos.y - k.mesh.position.y) < 2.4
      ) {
        hitBy = 'kuntilanak';
        this.scene.remove(k.mesh);
        this.kuntilanaks.splice(i, 1);
      }
    }

    // Update Pocong (hopping physics grounded on trail)
    for (let i = this.pocongs.length - 1; i >= 0; i--) {
      const p = this.pocongs[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        this.pocongs.splice(i, 1);
        continue;
      }

      const hopSpeed = 5.2 * lvl.speedMult;
      const nx = p.mesh.position.x + p.dirX * p.patrolDir * hopSpeed * dt;
      const nz = p.mesh.position.z + p.dirZ * p.patrolDir * hopSpeed * dt;
      if (
        Math.hypot(nx - p.originX, nz - p.originZ) > 9.5 ||
        this.isInsideAnyCheckpointSafeZone(nx, nz)
      ) {
        p.patrolDir *= -1;
      } else {
        p.mesh.position.x = nx;
        p.mesh.position.z = nz;
      }

      p.vy -= 26 * dt;
      p.mesh.position.y += p.vy * dt;
      const gy = this.getGroundHeight(p.mesh.position.x, p.mesh.position.z);
      if (p.mesh.position.y <= gy) {
        p.mesh.position.y = gy;
        p.vy = 8.4 + Math.min(3.8, lvl.speedMult * 1.9);
        if (Math.hypot(playerPos.x - p.mesh.position.x, playerPos.z - p.mesh.position.z) < 34) {
          soundEngine.playPocongHop();
        }
      }
      p.mesh.rotation.y = Math.atan2(p.dirX * p.patrolDir, p.dirZ * p.patrolDir) + Math.PI;
      p.mesh.rotation.x = p.vy > 0 ? -0.14 : 0.1;

      if (
        !playerInSafeCP &&
        Math.hypot(playerPos.x - p.mesh.position.x, playerPos.z - p.mesh.position.z) < 1.65 &&
        Math.abs(playerPos.y - p.mesh.position.y) < 2.2
      ) {
        hitBy = 'pocong';
      }
    }

    // Update Landslide Boulders
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i];
      b.age += dt;
      if (b.age >= 8.5) {
        this.scene.remove(b.mesh);
        this.boulders.splice(i, 1);
        continue;
      }

      b.vy -= 24 * dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.mesh.rotation.x += b.rotSpeed * dt;
      b.mesh.rotation.z += b.rotSpeed * 0.6 * dt;

      const gy = this.getGroundHeight(b.mesh.position.x, b.mesh.position.z);
      if (b.mesh.position.y < gy + b.radius) {
        b.mesh.position.y = gy + b.radius;
        b.vy = Math.max(2.8, Math.abs(b.vy) * 0.45);
      }

      if (!playerInSafeCP) {
        const dPlayer = Math.hypot(
          playerPos.x - b.mesh.position.x,
          playerPos.y + 1.0 - b.mesh.position.y,
          playerPos.z - b.mesh.position.z,
        );
        if (dPlayer < b.radius + 0.78) {
          hitBy = 'landslide';
        }
      }
    }

    // Update Rolling Fallen Tree Logs
    for (let i = this.rollingLogs.length - 1; i >= 0; i--) {
      const rl = this.rollingLogs[i];
      rl.age += dt;
      if (rl.age >= 8.0) {
        this.scene.remove(rl.mesh);
        this.rollingLogs.splice(i, 1);
        continue;
      }

      rl.vy -= 22 * dt;
      rl.mesh.position.x += rl.vx * dt;
      rl.mesh.position.y += rl.vy * dt;
      rl.mesh.position.z += rl.vz * dt;
      rl.mesh.rotation.x += 5.5 * dt;

      const gy = this.getGroundHeight(rl.mesh.position.x, rl.mesh.position.z);
      if (rl.mesh.position.y < gy + rl.radius) {
        rl.mesh.position.y = gy + rl.radius;
        rl.vy = 0;
      }

      if (!playerInSafeCP) {
        const dLog = Math.hypot(
          playerPos.x - rl.mesh.position.x,
          playerPos.z - rl.mesh.position.z,
        );
        if (dLog < 2.25 && Math.abs(playerPos.y + 0.8 - rl.mesh.position.y) < 1.35) {
          hitBy = 'log';
        }
      }
    }

    return { hitBy, shakeIntensity };
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredBound);
    this.envMapTexture?.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
    this.meteorGeo.dispose();
    this.meteorMat.dispose();
    this.logGeo.dispose();
    this.logMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

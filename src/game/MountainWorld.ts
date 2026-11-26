import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  DIFFICULTY_LEVELS,
  EMOTE_ITEMS,
  type AvatarConfig,
  type DisasterEventType,
  type EmoteType,
  type MapThemeId,
  type RadarBlip,
  type Role,
  type TimeOfDay,
  type WeatherType,
} from '../types/game';
import {
  animateR15AvatarPose,
  buildR15AvatarMesh,
  disposeAvatarGroup,
  type AvatarPoseState,
} from './AvatarBuilder';
import type { SoundEngine } from './SoundEngine';

export interface CpPoint {
  index: number;
  x: number;
  y: number;
  z: number;
}

export type PlatformShape = 'circle' | 'hex' | 'pyramid' | 'box' | 'obby_island';

export interface CliffIslandStage extends CpPoint {
  rTop: number;
  cliffHeight: number;
  shape?: PlatformShape;
}

export interface SteppingStoneSpan {
  bridgeIdx: number;
  x: number;
  y: number;
  z: number;
  r: number;
  shape: 'hex' | 'circle';
}

export interface MapLayoutSpec {
  mapId: MapThemeId;
  stages: CliffIslandStage[];
  bridgeHalfWidth: number;
  steppingBridgeIndices: number[];
  movingBridgeStartIndex: number;
  groundedBase: boolean;
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
  | 'meteor'
  | 'fire_rain'
  | 'brainrot'
  | 'bridge_push'
  | 'bridge_boulder'
  | 'lava_rain'
  | 'yeti'
  | 'flood';

export function getMapLayout(mapId: MapThemeId): MapLayoutSpec {
  const stages: CliffIslandStage[] = [];

  if (mapId === 'lava') {
    // Map 2: Sharp Zig-Zag Volcano Crater Trajectory (~1.25x longer bridge spans rising from caldera floor Y=0)
    for (let i = 0; i <= 26; i++) {
      let x = 0;
      let z = 0;
      if (i <= 13) {
        x = -96 + (i % 2 === 0 ? -45 : 45);
        z = 345 - i * 55;
      } else {
        const legIdx = i - 14;
        x = 96 + (legIdx % 2 === 0 ? -45 : 45);
        z = -370 + legIdx * 55;
      }
      const y = 4.0 + i * 16.5;
      const rTop = i === 0 ? 22.5 : i === 26 ? 19.5 : i === 25 ? 17.5 : 15.8 + (i % 3 === 0 ? 0.9 : 0);
      stages.push({ index: i, x, y, z, rTop, cliffHeight: y + 4, shape: 'hex' });
    }
    return {
      mapId,
      stages,
      bridgeHalfWidth: 2.55,
      steppingBridgeIndices: [2, 6, 10, 14, 18, 22],
      movingBridgeStartIndex: 17,
      groundedBase: true,
    };
  }

  if (mapId === 'salju') {
    // Map 3: Distinct Steep Switchback Alpine Everest Ridge (~1.3x longer switchback spans from Y=0)
    for (let i = 0; i <= 26; i++) {
      let x = 0;
      let z = 0;
      if (i <= 6) {
        x = -276 + i * 92;
        z = 300 - i * 8;
      } else if (i <= 13) {
        const legIdx = i - 7;
        x = 276 - legIdx * 92;
        z = 152 - legIdx * 8;
      } else if (i <= 20) {
        const legIdx = i - 14;
        x = -276 + legIdx * 92;
        z = 4 - legIdx * 8;
      } else {
        const legIdx = i - 21;
        x = 276 - legIdx * 96;
        z = -144 - legIdx * 18;
      }
      const y = 4.0 + i * 19.5;
      const rTop = i === 0 ? 23.0 : i === 26 ? 19.5 : i === 25 ? 17.5 : 16.0 + (i % 3 === 0 ? 0.9 : 0);
      stages.push({ index: i, x, y, z, rTop, cliffHeight: y + 4, shape: 'pyramid' });
    }
    return {
      mapId,
      stages,
      bridgeHalfWidth: 2.8,
      steppingBridgeIndices: [],
      movingBridgeStartIndex: 17,
      groundedBase: true,
    };
  }

  if (mapId === 'sky_kingdom') {
    // Map 4: Grand Ascending Floating Spiral Islands (~1.3x longer bridge spans above Sea of Clouds)
    let theta = 0.35;
    for (let i = 0; i <= 26; i++) {
      const spiralR = 328 - i * 5.2;
      if (i > 0) {
        const prevR = 328 - (i - 1) * 5.2;
        const avgR = (prevR + spiralR) * 0.5;
        theta += 120.0 / avgR;
      }
      const x = Math.round(Math.sin(theta) * spiralR * 100) / 100;
      const z = Math.round(Math.cos(theta) * spiralR * 100) / 100;
      const y = 8.0 + i * 16.8;
      const rTop = i === 0 ? 18.8 : i === 26 ? 17.8 : i === 25 ? 15.8 : 14.0 + (i % 3 === 0 ? 1.0 : 0);
      stages.push({ index: i, x, y, z, rTop, cliffHeight: 28 + (i % 4) * 4, shape: 'circle' });
    }
    return {
      mapId,
      stages,
      bridgeHalfWidth: 2.85,
      steppingBridgeIndices: [1, 4, 8, 12, 16, 20, 23],
      movingBridgeStartIndex: 17,
      groundedBase: false,
    };
  }

  if (mapId === 'cyber_neon') {
    // Map 5: 90-Degree Orthogonal CPU Circuit Grid (~1.33x longer laser bridges)
    const dirs: Array<[number, number, number]> = [
      [0, -1, 5],  // 0->5 North (-Z)
      [1, 0, 5],   // 5->10 East (+X)
      [0, 1, 4],   // 10->14 South (+Z)
      [-1, 0, 4],  // 14->18 West (-X)
      [0, -1, 3],  // 18->21 North (-Z)
      [1, 0, 3],   // 21->24 East (+X)
      [0, 1, 2],   // 24->26 South (+Z)
    ];
    let cx = -300;
    let cz = 300;
    let idx = 0;
    const pushCyber = (i: number, x: number, z: number) => {
      const y = 4.0 + i * 16.8;
      const rTop = i === 0 ? 18.0 : i === 26 ? 17.0 : i === 25 ? 15.2 : 13.4 + (i % 2 === 0 ? 0.6 : 0);
      stages.push({ index: i, x, y, z, rTop, cliffHeight: 24 + (i % 3) * 4, shape: 'box' });
    };
    pushCyber(idx++, cx, cz);
    for (const [dx, dz, steps] of dirs) {
      for (let s = 0; s < steps; s++) {
        cx += dx * 120;
        cz += dz * 120;
        pushCyber(idx++, cx, cz);
      }
    }
    return {
      mapId,
      stages,
      bridgeHalfWidth: 2.85,
      steppingBridgeIndices: [],
      movingBridgeStartIndex: 12,
      groundedBase: false,
    };
  }

  // Map 1 (Default): Puncak Nusantara — Roblox Obby Organic Grass Islands (~1.35x extended ridge + alternating bridge mix)
  const sampleN = 560;
  const pts: Array<{ x: number; z: number; s: number }> = [];
  let accumS = 0;
  for (let k = 0; k <= sampleN; k++) {
    const t = k / sampleN;
    const px = 162 * Math.sin(t * Math.PI * 2.5);
    const pz = -1860 * t;
    if (k > 0) {
      const prev = pts[k - 1];
      accumS += Math.hypot(px - prev.x, pz - prev.z);
    }
    pts.push({ x: px, z: pz, s: accumS });
  }
  const totalLen = accumS || 1;
  let ptr = 0;
  for (let i = 0; i <= 26; i++) {
    const targetS = (i / 26) * totalLen;
    while (ptr < sampleN - 1 && pts[ptr + 1].s < targetS) {
      ptr++;
    }
    const a = pts[ptr];
    const b = pts[Math.min(sampleN, ptr + 1)];
    const segSpan = Math.max(1e-5, b.s - a.s);
    const frac = clamp((targetS - a.s) / segSpan, 0, 1);
    const x = Math.round((a.x + (b.x - a.x) * frac) * 100) / 100;
    const z = Math.round((a.z + (b.z - a.z) * frac) * 100) / 100;
    const y = Math.round((4.0 + i * 9.5) * 100) / 100;
    const rTop = i === 0 ? 22.0 : i === 26 ? 19.5 : i === 25 ? 17.5 : 15.6 + (i % 3 === 0 ? 0.8 : 0);
    stages.push({ index: i, x, y, z, rTop, cliffHeight: Math.round(rTop * 0.65), shape: 'obby_island' });
  }
  return {
    mapId: 'nusantara',
    stages,
    bridgeHalfWidth: 5.5,
    steppingBridgeIndices: [],
    movingBridgeStartIndex: 17,
    groundedBase: false,
  };
}

export const ISLAND_STAGES: CliffIslandStage[] = getMapLayout('nusantara').stages;
export const CP_POINTS: CpPoint[] = ISLAND_STAGES.slice(0, 26).map(({ index, x, y, z }) => ({
  index,
  x,
  y,
  z,
}));
export const SUMMIT_EXAM_POINT: CpPoint = {
  index: 26,
  x: ISLAND_STAGES[26].x,
  y: ISLAND_STAGES[26].y,
  z: ISLAND_STAGES[26].z,
};

export const CP_SAFE_RADIUS = 8.5;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
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

interface ObbyPlankEntry {
  bridgeIdx: number;
  uMin: number;
  uMax: number;
  latCenter: number;
  halfW: number;
  mesh?: THREE.Mesh;
  baseLocalX: number;
  moveAmpLat: number;
  moveSpeed: number;
  phase: number;
}

interface BridgeSpan {
  index: number;
  a: CliffIslandStage;
  b: CliffIslandStage;
  tMin: number;
  tMax: number;
  halfWidth: number;
  laneHalfW: number;
  challengeLaneXs: number[];
  safeLaneX: number;
  hasSafeLane: boolean;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  dx: number;
  dz: number;
  lenSq: number;
  sagAmp: number;
  gapFracs: Array<[number, number]>;
  movingPlanks: Array<{
    laneX: number;
    meshes: THREE.Mesh[];
    uMin: number;
    uMax: number;
    baseYs: number[];
    phase: number;
    ampY: number;
    ampLat: number;
    isLateral: boolean;
  }>;
  obbyPlanks: ObbyPlankEntry[];
}

interface TrailSample {
  x: number;
  y: number;
  z: number;
  segIndex: number;
  distFromStart: number;
}

interface KuntilanakEntity {
  mesh: THREE.Group;
  head: THREE.Group;
  active: boolean;
  age: number;
  maxAge: number;
  phase: number;
}

interface PocongEntity {
  mesh: THREE.Group;
  active: boolean;
  originX: number;
  originZ: number;
  dirX: number;
  dirZ: number;
  patrolDir: number;
  vy: number;
  age: number;
  maxAge: number;
}

interface IceHailParticle {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  anchorX: number;
  anchorZ: number;
}

interface FireRainParticle {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  impacted: boolean;
  sparkTimer: number;
  groundY: number;
  age: number;
  maxAge: number;
  anchorX: number;
  anchorZ: number;
}

interface BrainrotEntity {
  mesh: THREE.Group;
  kind: 'skibidi' | 'sigma_sahur';
  headNode: THREE.Object3D;
  bodyNode: THREE.Object3D;
  active: boolean;
  originX: number;
  originZ: number;
  dirX: number;
  dirZ: number;
  patrolDir: number;
  vy: number;
  age: number;
  maxAge: number;
  phase: number;
}

interface YetiEntity {
  mesh: THREE.Group;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  head: THREE.Object3D;
  active: boolean;
  originX: number;
  originZ: number;
  dirX: number;
  dirZ: number;
  patrolDir: number;
  age: number;
  maxAge: number;
  phase: number;
}

interface BoulderEntity {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  rotSpeed: number;
  radius: number;
  age: number;
  maxAge: number;
}

interface RollingLogEntity {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  age: number;
  maxAge: number;
}

interface LavaRainStrike {
  active: boolean;
  x: number;
  z: number;
  groundY: number;
  boulder: THREE.Mesh;
  ring: THREE.Mesh;
  shockwave: THREE.Mesh;
  timer: number;
  age: number;
  maxAge: number;
  impacted: boolean;
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
  age: number;
  maxAge: number;
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

interface MeteorStrike {
  x: number;
  z: number;
  groundY: number;
  boulder: THREE.Mesh;
  ring: THREE.Mesh;
  shockwave: THREE.Mesh;
  timer: number;
  age: number;
  maxAge: number;
  impacted: boolean;
}

interface WalkableBoxSurface {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  cosY: number;
  sinY: number;
  topY: number;
  minPlayerY: number;
}

interface SolidCollider {
  kind: 'circle' | 'box' | 'frustum';
  x: number;
  z: number;
  r: number;
  rTop?: number;
  rBottom?: number;
  halfW?: number;
  halfD?: number;
  cosY?: number;
  sinY?: number;
  minY: number;
  maxY: number;
  gateIndex?: number;
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
  public selectedMap: MapThemeId = 'nusantara';
  private currentElapsed = 0;

  public readonly remotePlayers = new Map<string, RemotePlayerEntry>();

  private readonly colliderCellSize = 40;
  private readonly colliderGrid = new Map<number, SolidCollider[]>();
  private readonly tmpColliderSet = new Set<SolidCollider>();
  private readonly tmpCamColliderSet = new Set<SolidCollider>();
  private readonly bridgeSpans: BridgeSpan[] = [];
  private readonly bridgeBoulders: Array<{
    bridgeIdx: number;
    x: number;
    y: number;
    z: number;
    r: number;
  }> = [];
  private readonly bridgePushBeams: Array<{
    bridgeIdx: number;
    laneX: number;
    mesh: THREE.Mesh;
    centerX: number;
    centerY: number;
    centerZ: number;
    perpX: number;
    perpZ: number;
    halfWidth: number;
    phase: number;
    speed: number;
    curOffset: number;
  }> = [];
  private readonly bridgeRollingLogs: Array<{
    bridgeIdx: number;
    mesh: THREE.Mesh;
    bs: BridgeSpan;
    u: number;
    speed: number;
    latOffset: number;
    radius: number;
    midX: number;
    midZ: number;
  }> = [];
  private readonly trailSamples: TrailSample[] = [];
  private readonly cpBeacons: Array<{
    index: number;
    ring: THREE.Mesh;
    flag: THREE.Mesh;
    flameGroup?: THREE.Group;
    emberMat?: THREE.MeshStandardMaterial;
  }> = [];
  private readonly cpGates: Array<{ index: number; group: THREE.Group; wallMat: THREE.MeshBasicMaterial }> = [];
  private readonly clouds: Array<{ group: THREE.Group; speed: number }> = [];
  private readonly birds: BirdFlockMember[] = [];
  private readonly swayPlanks: SwayPlank[] = [];

  private activeMapGroup = new THREE.Group();
  private builtMapId: MapThemeId | null = null;
  private activeLayout: MapLayoutSpec = getMapLayout('nusantara');
  private activeStages: CliffIslandStage[] = this.activeLayout.stages;
  private activeSteppingStones: SteppingStoneSpan[] = [];
  private lastGateRole: Role = 'student';
  private lastGateCp = 0;
  private lastGateCompleted: number[] = [];

  private dirtTopMat!: THREE.MeshStandardMaterial;
  private grassEdgeMat!: THREE.MeshStandardMaterial;
  private cliffUpperMat!: THREE.MeshStandardMaterial;
  private cliffLowerMat!: THREE.MeshStandardMaterial;
  private buttressMat!: THREE.MeshStandardMaterial;
  private woodMat!: THREE.MeshStandardMaterial;
  private warnWoodMat!: THREE.MeshStandardMaterial;
  private beamMat!: THREE.MeshStandardMaterial;
  private postMat!: THREE.MeshStandardMaterial;
  private ropeMat!: THREE.MeshStandardMaterial;
  private lanternMat!: THREE.MeshStandardMaterial;
  private padMat!: THREE.MeshStandardMaterial;
  private trimMat!: THREE.MeshStandardMaterial;
  private cliffRockMat!: THREE.MeshStandardMaterial;
  private trunkMat!: THREE.MeshStandardMaterial;
  private leafMat1!: THREE.MeshStandardMaterial;
  private leafMat2!: THREE.MeshStandardMaterial;
  private leafMat3!: THREE.MeshStandardMaterial;
  private cloudMat!: THREE.MeshStandardMaterial;
  private nusantaraValleyGroup = new THREE.Group();
  private lavaRiverGroup = new THREE.Group();
  private saljuGlacierGroup = new THREE.Group();
  private skyKingdomGroup = new THREE.Group();
  private cyberNeonGroup = new THREE.Group();

  private readonly walkableBoxes: WalkableBoxSurface[] = [];
  private readonly obbyMovingPlanks: ObbyPlankEntry[] = [];
  private readonly crumbleStones: CrumbleStone[] = [];
  private readonly geysers: GeyserVent[] = [];
  private readonly windZones: WindZone[] = [];
  private readonly lightningStrikes: LightningStrike[] = [];
  private readonly wildfires: WildfireCluster[] = [];
  private readonly meteors: MeteorStrike[] = [];
  private readonly lavaRainPool: LavaRainStrike[] = [];
  private floodPlaneMesh!: THREE.Mesh;
  private floodMat!: THREE.MeshBasicMaterial;
  private floodActive = false;
  private floodKind: 'flash_flood' | 'lava_flood' = 'flash_flood';
  private floodTimer = 0;
  private floodMaxDuration = 7.0;
  private floodBaseY = 0;
  private floodPeakY = 6.0;
  private floodCurrentY = -50;
  private earthquakeTimer = 0;
  private landslideShakeTimer = 0;
  private meteorShakeTimer = 0;
  private brainrotShakeTimer = 0;
  private thunderStormTimer = 0;
  private thunderNextStrikeIn = 0;
  private baseTimeOfDay: TimeOfDay = 'pagi';
  private baseWeather: WeatherType = 'cerah';
  private tempWeatherOverride: 'heavy_rain' | 'thick_fog' | 'snowstorm' | null = null;
  private tempWeatherTimer = 0;
  private snowstormTimer = 0;

  private readonly kuntilanaks: KuntilanakEntity[] = [];
  private readonly pocongs: PocongEntity[] = [];
  private readonly brainrots: BrainrotEntity[] = [];
  private readonly yetis: YetiEntity[] = [];
  private readonly iceHails: IceHailParticle[] = [];
  private readonly fireRains: FireRainParticle[] = [];
  private readonly boulders: BoulderEntity[] = [];
  private readonly rollingLogs: RollingLogEntity[] = [];
  private readonly wildlife: WildlifeEntity[] = [];
  public summitCelebrationActive = false;
  private summitFireworkTimer = 0.25;
  private readonly fireworkGeo = new THREE.SphereGeometry(0.18, 5, 4);
  private readonly fireworkMats = [
    new THREE.MeshBasicMaterial({ color: '#fde047' }),
    new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
    new THREE.MeshBasicMaterial({ color: '#f43f5e' }),
  ];
  private readonly fireworkSparks: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];

  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rainSystem: THREE.Points | null = null;
  private snowSystem: THREE.Points | null = null;
  private emberSystem: THREE.Points | null = null;
  private envMapTexture: THREE.Texture | null = null;
  private blobShadowTexture!: THREE.CanvasTexture;
  private blobShadowGeo!: THREE.PlaneGeometry;
  private sharedBlobShadowMat!: THREE.MeshBasicMaterial;

  private readonly envTarget = {
    sky: new THREE.Color('#8ecae6'),
    fog: new THREE.Color('#bde0fe'),
    fogDensity: 0.00075,
    sunColor: new THREE.Color('#fff7d6'),
    sunIntensity: 1.62,
    ambientIntensity: 0.28,
    hemiSkyColor: new THREE.Color('#bae6fd'),
    hemiGroundColor: new THREE.Color('#5c4033'),
    hemiIntensity: 0.78,
    sunOffset: new THREE.Vector3(240, 360, 260),
  };

  private readonly envCurrent = {
    sky: new THREE.Color('#8ecae6'),
    fog: new THREE.Color('#bde0fe'),
    fogDensity: 0.00075,
    sunColor: new THREE.Color('#fff7d6'),
    sunIntensity: 1.62,
    ambientIntensity: 0.28,
    hemiSkyColor: new THREE.Color('#bae6fd'),
    hemiGroundColor: new THREE.Color('#5c4033'),
    hemiIntensity: 0.78,
    sunOffset: new THREE.Vector3(240, 360, 260),
  };

  private readonly obbyGrassTopTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#3bc654';
      ctx.fillRect(0, 0, 256, 256);
      const greens = ['#4ade80', '#22c55e', '#34d399', '#16a34a'];
      for (let i = 0; i < 420; i++) {
        ctx.fillStyle = greens[i % greens.length];
        const x = (i * 73) % 256;
        const y = (i * 137) % 256;
        ctx.fillRect(x, y, 6 + (i % 6), 4 + (i % 5));
      }
      ctx.fillStyle = '#86efac';
      for (let i = 0; i < 120; i++) {
        ctx.fillRect((i * 59) % 256, (i * 101) % 256, 3, 3);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.userData = { sharedTexture: true };
    return tex;
  })();
  private readonly obbyPlankTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(8, 8, 112, 112);
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(12, 14, 104, 18);
      ctx.fillRect(12, 48, 104, 16);
      ctx.fillRect(12, 82, 104, 18);
      ctx.fillStyle = 'rgba(154, 52, 18, 0.25)';
      ctx.fillRect(8, 40, 112, 3);
      ctx.fillRect(8, 76, 112, 3);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData = { sharedTexture: true };
    return tex;
  })();
  private readonly obbyGrassTopMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: this.obbyGrassTopTex,
      roughness: 0.88,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly obbyPlankMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: this.obbyPlankTex,
      roughness: 0.62,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly obbyRailMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ea580c',
      roughness: 0.56,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly obbyCanopyMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#22c55e',
      roughness: 0.78,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly obbyBushMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.86,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly obbyFruitMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.36,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly obbyPlankUnitGeo = (() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.userData = { shared: true };
    return g;
  })();
  private readonly obbyFruitGeo = (() => {
    const g = new THREE.SphereGeometry(0.24, 6, 5);
    g.userData = { shared: true };
    return g;
  })();

  // Shared Safe Lane (Jalur 3: Jalur Aman / Santai) Materials & Geometries (60 FPS)
  private readonly safeDeckTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, 256, 128);
      for (let y = 0; y < 128; y += 32) {
        ctx.fillStyle = y % 64 === 0 ? '#ca8a04' : '#a16207';
        ctx.fillRect(18, y + 2, 220, 26);
        ctx.fillStyle = 'rgba(69, 26, 3, 0.35)';
        ctx.fillRect(18, y + 28, 220, 4);
      }
      // Crisp bright green safety edge stripes along left & right edges
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 0, 18, 128);
      ctx.fillRect(238, 0, 18, 128);
      ctx.fillStyle = '#dcfce7';
      ctx.fillRect(16, 0, 4, 128);
      ctx.fillRect(236, 0, 4, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 14);
    tex.userData = { sharedTexture: true };
    return tex;
  })();
  private readonly safeSignTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, 496, 112);
      ctx.fillStyle = '#dcfce7';
      ctx.font = 'bold 38px "Barlow Condensed", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JALUR AMAN / SANTAI', 256, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData = { sharedTexture: true };
    return tex;
  })();
  private readonly safeDeckMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: this.safeDeckTex,
      roughness: 0.68,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly safeRailMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.62,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly safeSignGeo = (() => {
    const g = new THREE.BoxGeometry(3.2, 0.78, 0.14);
    g.userData = { shared: true };
    return g;
  })();
  private readonly safeSignMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      map: this.safeSignTex,
      roughness: 0.58,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();

  private readonly rockGeo = (() => {
    const g = new THREE.DodecahedronGeometry(1.15, 0);
    g.userData = { shared: true };
    return g;
  })();
  private readonly rockMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#57534e',
      roughness: 0.94,
      metalness: 0.05,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly snowballGeo = (() => {
    const g = new THREE.DodecahedronGeometry(0.82, 1);
    g.userData = { shared: true };
    return g;
  })();
  private readonly snowballMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#bae6fd',
      emissiveIntensity: 0.22,
      roughness: 0.55,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly iceBoulderGeo = (() => {
    const g = new THREE.IcosahedronGeometry(0.95, 0);
    g.userData = { shared: true };
    return g;
  })();
  private readonly iceBoulderMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#f0f9ff',
      emissive: '#38bdf8',
      emissiveIntensity: 0.28,
      roughness: 0.36,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly floodWaterTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 3;
      for (let y = 12; y < 128; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(32, y - 8, 64, y + 8, 128, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.lineWidth = 2;
      for (let x = 16; x < 128; x += 32) {
        ctx.beginPath();
        ctx.arc(x, (x * 2) % 128, 10, 0, Math.PI);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(34, 34);
    tex.userData = { sharedTexture: true };
    return tex;
  })();
  private readonly yetiTorsoGeo = new THREE.DodecahedronGeometry(0.92, 0);
  private readonly yetiHeadGeo = new THREE.BoxGeometry(0.76, 0.68, 0.72);
  private readonly yetiBrowGeo = new THREE.BoxGeometry(0.82, 0.16, 0.24);
  private readonly yetiLimbGeo = new THREE.BoxGeometry(0.42, 1.08, 0.42);
  private readonly yetiEyeGeo = new THREE.SphereGeometry(0.085, 6, 6);
  private readonly yetiHornGeo = new THREE.ConeGeometry(0.11, 0.42, 6);
  private readonly yetiRingGeo = new THREE.RingGeometry(0.7, 1.65, 16);
  private readonly yetiFurMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    emissive: '#bae6fd',
    emissiveIntensity: 0.14,
    roughness: 0.85,
  });
  private readonly yetiSkinMat = new THREE.MeshStandardMaterial({
    color: '#93c5fd',
    roughness: 0.52,
  });
  private readonly yetiEyeMat = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
  private readonly yetiRingMat = new THREE.MeshBasicMaterial({
    color: '#7dd3fc',
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly magmaBoulderMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#292524',
      emissive: '#ea580c',
      emissiveIntensity: 0.9,
      roughness: 0.78,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly cyberCoreMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      emissive: '#c026d3',
      emissiveIntensity: 1.1,
      roughness: 0.25,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();
  private readonly meteorGeo = new THREE.DodecahedronGeometry(2.4, 1);
  private readonly meteorMat = new THREE.MeshStandardMaterial({
    color: '#292524',
    emissive: '#ea580c',
    emissiveIntensity: 1.15,
    roughness: 0.72,
  });
  private readonly logGeo = (() => {
    const g = new THREE.CylinderGeometry(0.56, 0.64, 4.0, 10);
    g.userData = { shared: true };
    return g;
  })();
  private readonly logMat = (() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#5c3a21',
      roughness: 0.92,
    });
    m.userData = { sharedMaterial: true };
    return m;
  })();

  // Shared Realistic Kuntilanak & Pocong Object Pool Geometries / Materials (Max 3 active each, 0 PointLights)
  private readonly kuntiDressTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(0.65, '#e2e8f0');
      grad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(71, 85, 105, 0.22)';
      for (let x = 14; x < 256; x += 28) {
        ctx.fillRect(x, 0, 6, 256);
      }
      ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
      for (let x = 0; x < 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 256);
        ctx.lineTo(x + 16, 224 + (x % 18));
        ctx.lineTo(x + 32, 256);
        ctx.closePath();
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  private readonly pocongShroudTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e7e5e4';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(87, 83, 78, 0.28)';
      ctx.lineWidth = 4;
      for (let y = 18; y < 256; y += 26) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y + (y % 2 === 0 ? 12 : -10));
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(120, 113, 108, 0.16)';
      ctx.beginPath();
      ctx.arc(88, 120, 34, 0, Math.PI * 2);
      ctx.arc(178, 195, 28, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  private readonly kuntiUpperGeo = new THREE.CylinderGeometry(0.21, 0.27, 0.84, 10);
  private readonly kuntiDressGeo = new THREE.CylinderGeometry(0.26, 0.56, 1.56, 12);
  private readonly kuntiVeilGeo = new THREE.CylinderGeometry(0.32, 0.62, 1.15, 10, 1, true);
  private readonly kuntiHeadGeo = new THREE.SphereGeometry(0.27, 10, 8);
  private readonly kuntiHairCrownGeo = new THREE.SphereGeometry(0.295, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
  private readonly kuntiHairBackGeo = new THREE.BoxGeometry(0.58, 1.82, 0.18);
  private readonly kuntiHairSideGeo = new THREE.BoxGeometry(0.15, 1.32, 0.22);
  private readonly kuntiSocketGeo = new THREE.SphereGeometry(0.056, 8, 6);
  private readonly kuntiEyeGeo = new THREE.SphereGeometry(0.022, 6, 6);
  private readonly kuntiArmGeo = new THREE.CylinderGeometry(0.068, 0.058, 0.92, 6);
  private readonly kuntiHandGeo = new THREE.SphereGeometry(0.065, 6, 6);
  private readonly kuntiRingGeo = new THREE.RingGeometry(0.55, 1.45, 14);
  private readonly kuntiDressMat = new THREE.MeshStandardMaterial({
    map: this.kuntiDressTex,
    color: '#f1f5f9',
    emissive: '#cbd5e1',
    emissiveIntensity: 0.22,
    roughness: 0.82,
  });
  private readonly kuntiVeilMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    emissive: '#94a3b8',
    emissiveIntensity: 0.16,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  private readonly kuntiHeadMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    emissive: '#94a3b8',
    emissiveIntensity: 0.2,
    roughness: 0.72,
  });
  private readonly kuntiHairMat = new THREE.MeshStandardMaterial({ color: '#050507', roughness: 0.95 });
  private readonly kuntiSocketMat = new THREE.MeshBasicMaterial({ color: '#050507' });
  private readonly kuntiEyeMat = new THREE.MeshBasicMaterial({ color: '#dc2626' });
  private readonly kuntiRingMat = new THREE.MeshBasicMaterial({
    color: '#e0f2fe',
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  private readonly pocongUpperGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.96, 10);
  private readonly pocongLowerGeo = new THREE.CylinderGeometry(0.35, 0.21, 1.04, 10);
  private readonly pocongShoulderGeo = new THREE.SphereGeometry(0.34, 10, 8);
  private readonly pocongHeadGeo = new THREE.SphereGeometry(0.3, 10, 8);
  private readonly pocongKnotGeo = new THREE.ConeGeometry(0.18, 0.44, 8);
  private readonly pocongTieGeo = new THREE.TorusGeometry(0.24, 0.052, 6, 12);
  private readonly pocongAnkleTieGeo = new THREE.TorusGeometry(0.21, 0.048, 6, 12);
  private readonly pocongTabGeo = new THREE.BoxGeometry(0.05, 0.2, 0.05);
  private readonly pocongFaceGeo = new THREE.SphereGeometry(0.17, 10, 8);
  private readonly pocongSocketGeo = new THREE.SphereGeometry(0.056, 8, 6);
  private readonly pocongEyeGeo = new THREE.SphereGeometry(0.02, 6, 6);
  private readonly pocongMouthGeo = new THREE.BoxGeometry(0.08, 0.022, 0.03);
  private readonly pocongRingGeo = new THREE.RingGeometry(0.45, 1.25, 14);
  private readonly pocongShroudMat = new THREE.MeshStandardMaterial({
    map: this.pocongShroudTex,
    color: '#e7e5e4',
    emissive: '#a8a29e',
    emissiveIntensity: 0.14,
    roughness: 0.92,
  });
  private readonly pocongTieMat = new THREE.MeshStandardMaterial({ color: '#292524', roughness: 0.9 });
  private readonly pocongFaceMat = new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.85 });
  private readonly pocongSocketMat = new THREE.MeshBasicMaterial({ color: '#09090b' });
  private readonly pocongEyeMat = new THREE.MeshBasicMaterial({ color: '#e2e8f0' });
  private readonly pocongRingMat = new THREE.MeshBasicMaterial({
    color: '#cbd5e1',
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Shared Brainrot Meme Event Geometries / Materials / 128x128 Textures (Pooled size 4, 60 FPS)
  private readonly skibidiFaceTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fcd3b4';
      ctx.fillRect(0, 0, 128, 128);
      // Expressive raised brows
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(38, 30, 16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(90, 30, 16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      // Wide bulging eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(38, 48, 15, 0, Math.PI * 2);
      ctx.arc(90, 48, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(38, 48, 6, 0, Math.PI * 2);
      ctx.arc(90, 48, 6, 0, Math.PI * 2);
      ctx.fill();
      // Meme wide open toothy grin
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.roundRect(24, 76, 80, 34, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(30, 78, 68, 11);
      ctx.fillRect(34, 98, 60, 9);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData = { sharedTexture: true };
    return tex;
  })();

  private readonly sahurSigmaFaceTex: THREE.CanvasTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#9a6334';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.35)';
      ctx.lineWidth = 4;
      for (let x = 12; x < 128; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 4, 128);
        ctx.stroke();
      }
      // Intense "Sigma / Tung Sahur" wide eyes + furrowed brow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(38, 46, 15, 11, 0, 0, Math.PI * 2);
      ctx.ellipse(90, 46, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(38, 47, 6, 0, Math.PI * 2);
      ctx.arc(90, 47, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(20, 30);
      ctx.lineTo(54, 37);
      ctx.moveTo(108, 30);
      ctx.lineTo(74, 37);
      ctx.stroke();
      // Chiseled smirk
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(36, 92);
      ctx.quadraticCurveTo(64, 102, 94, 84);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData = { sharedTexture: true };
    return tex;
  })();

  private readonly brainrotBaseGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.56, 10);
  private readonly brainrotBowlGeo = new THREE.CylinderGeometry(0.48, 0.34, 0.44, 10);
  private readonly brainrotTankGeo = new THREE.BoxGeometry(0.76, 0.72, 0.28);
  private readonly brainrotWaterGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10);
  private readonly brainrotNeckGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.58, 8);
  private readonly brainrotHeadGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
  private readonly brainrotLogBodyGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.38, 10);
  private readonly brainrotLimbGeo = new THREE.BoxGeometry(0.15, 0.58, 0.15);
  private readonly brainrotMalletGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.88, 6);
  private readonly brainrotRingGeo = new THREE.RingGeometry(0.55, 1.35, 14);
  private readonly brainrotPorcelainMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
  private readonly brainrotWaterMat = new THREE.MeshBasicMaterial({ color: '#0891b2' });
  private readonly brainrotSkinMat = new THREE.MeshStandardMaterial({ color: '#fcd3b4', roughness: 0.75 });
  private readonly brainrotHairMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 });
  private readonly brainrotWoodMat = new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.86 });
  private readonly brainrotNeonMat = new THREE.MeshBasicMaterial({
    color: '#c026d3',
    transparent: true,
    opacity: 0.44,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly skibidiHeadMats: THREE.Material[] = (() => {
    const faceMat = new THREE.MeshBasicMaterial({ map: this.skibidiFaceTex });
    return [
      this.brainrotSkinMat,
      this.brainrotSkinMat,
      this.brainrotHairMat,
      this.brainrotSkinMat,
      faceMat, // +Z faces player when lookAt() is used
      this.brainrotHairMat,
    ];
  })();
  private readonly sahurHeadMats: THREE.Material[] = (() => {
    const faceMat = new THREE.MeshBasicMaterial({ map: this.sahurSigmaFaceTex });
    return [
      this.brainrotWoodMat,
      this.brainrotWoodMat,
      this.brainrotWoodMat,
      this.brainrotWoodMat,
      faceMat, // +Z faces player when lookAt() is used
      this.brainrotWoodMat,
    ];
  })();

  // Shared Hujan Es, Hujan Api, Badai Petir & Meteor Geometries / Materials (Max 50 particles)
  private readonly iceHailGeo = new THREE.OctahedronGeometry(0.38, 0);
  private readonly iceHailMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    emissive: '#38bdf8',
    emissiveIntensity: 0.45,
    roughness: 0.15,
    transparent: true,
    opacity: 0.9,
  });
  private readonly fireRainGeo = new THREE.SphereGeometry(0.45, 7, 6);
  private readonly fireRainMat = new THREE.MeshBasicMaterial({ color: '#ff4500' });
  private readonly fireSparkGeo = new THREE.RingGeometry(0.4, 1.4, 12);
  private readonly fireSparkMat = new THREE.MeshBasicMaterial({
    color: '#fb923c',
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  private readonly lightningRingGeo = new THREE.RingGeometry(1.4, 2.5, 20);
  private readonly lightningRingMat = new THREE.MeshBasicMaterial({
    color: '#fde047',
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  private readonly lightningBoltGeo = new THREE.CylinderGeometry(0.28, 0.52, 46, 8);
  private readonly lightningBoltMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
    transparent: true,
    opacity: 0.95,
  });
  private readonly meteorRingGeo = new THREE.RingGeometry(2.4, 4.0, 22);
  private readonly meteorRingMat = new THREE.MeshBasicMaterial({
    color: '#ef4444',
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  private readonly meteorShockGeo = new THREE.RingGeometry(1.4, 4.2, 22);
  private readonly meteorShockMat = new THREE.MeshBasicMaterial({
    color: '#fb923c',
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });

  private readonly onResizeBound: () => void;
  private readonly onContextLostBound: (e: Event) => void;
  private readonly onContextRestoredBound: () => void;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareGl();
    this.logGeo.rotateZ(Math.PI / 2);
    this.kuntiArmGeo.rotateX(Math.PI / 2);
    this.kuntiRingGeo.rotateX(-Math.PI / 2);
    this.pocongTieGeo.rotateX(Math.PI / 2);
    this.pocongAnkleTieGeo.rotateX(Math.PI / 2);
    this.pocongRingGeo.rotateX(-Math.PI / 2);
    this.fireSparkGeo.rotateX(-Math.PI / 2);
    this.lightningRingGeo.rotateX(-Math.PI / 2);
    this.meteorRingGeo.rotateX(-Math.PI / 2);
    this.meteorShockGeo.rotateX(-Math.PI / 2);
    this.brainrotRingGeo.rotateX(-Math.PI / 2);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.3,
      3000,
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.25));
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.userSelect = 'none';
    container.appendChild(this.renderer.domElement);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.obbyGrassTopTex.anisotropy = maxAniso;
    this.obbyPlankTex.anisotropy = maxAniso;
    this.safeDeckTex.anisotropy = maxAniso;
    this.safeSignTex.anisotropy = maxAniso;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envMapTexture = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    this.scene.environment = this.envMapTexture;
    this.scene.environmentIntensity = 0.36;
    pmrem.dispose();

    this.initBlobShadowResources();
    this.initSharedWorldMaterials();
    this.initLightsAndSky();
    this.scene.add(this.activeMapGroup);
    this.buildCloudsAndBirds();
    this.buildWeatherSystems();
    this.initDisasterObjectPools();

    this.applyMapTheme('nusantara', true);
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
    this.renderer.setPixelRatio(
      this.lowGraphics || this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.25),
    );
    this.renderer.setSize(w, h);
  }

  public setLowGraphics(enabled: boolean) {
    this.lowGraphics = enabled;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setPixelRatio(
      enabled || this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.25),
    );
    if (this.rainSystem) {
      const showRain = this.weather === 'hujan' || this.weather === 'badai' || this.tempWeatherOverride === 'heavy_rain';
      this.rainSystem.visible = this.tempWeatherOverride === 'heavy_rain' ? true : !enabled && showRain;
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
    if (changed) {
      this.rebuildWildlifeForDifficulty();
    }
  }

  public getEffectiveTrailHalfWidth(): number {
    return this.activeLayout.bridgeHalfWidth || 2.85;
  }

  public getCpPoint(idx: number): CpPoint {
    const st = this.activeStages[clamp(idx, 0, 25)];
    return { index: st.index, x: st.x, y: st.y, z: st.z };
  }

  public getSummitPoint(): CpPoint {
    const st = this.activeStages[26];
    return { index: st.index, x: st.x, y: st.y, z: st.z };
  }

  public getStages(): ReadonlyArray<CliffIslandStage> {
    return this.activeStages;
  }

  public isOnIceBridge(x: number, z: number, playerY?: number): boolean {
    if (this.selectedMap !== 'salju') return false;
    return this.getBridgeHeightAt(x, z, playerY) !== null;
  }

  private getFullWaypoints(): CpPoint[] {
    return this.activeStages;
  }

  private initBridgeSpans() {
    const stages = this.activeStages;
    const steppingSet = new Set(this.activeLayout.steppingBridgeIndices);
    const mapId = this.activeLayout.mapId;
    const tripleLaneSep = 6.9; // Jalur 1 (+6.9 Kiri), Jalur 2 (0 Tengah), Jalur 3 (-6.9 Kanan Aman)
    const laneHalfW = 1.55; // 3.10m deck width -> 3.80m clear gap between adjacent lanes
    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i];
      const b = stages[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const horizDist = Math.hypot(dx, dz) || 1;
      // Overlap 3.15m onto each island top so all 3 parallel bridge mouths (lat ±8.45) sit solidly on land
      const startOff = a.rTop - 3.15;
      const endOff = b.rTop - 3.15;
      const tMin = startOff / horizDist;
      const tMax = 1 - endOff / horizDist;
      const startX = a.x + dx * tMin;
      const startZ = a.z + dz * tMin;
      const endX = a.x + dx * tMax;
      const endZ = a.z + dz * tMax;
      const bdx = endX - startX;
      const bdz = endZ - startZ;

      const isNusantara = mapId === 'nusantara';
      const isNusantaraSuspension = isNusantara && i % 2 === 1;
      const sagAmp = isNusantaraSuspension
        ? 1.45
        : !isNusantara && mapId !== 'cyber_neon' && !steppingSet.has(i)
          ? 1.15
          : 0;

      this.bridgeSpans.push({
        index: i,
        a,
        b,
        tMin,
        tMax,
        halfWidth: tripleLaneSep + laneHalfW,
        laneHalfW,
        challengeLaneXs: [tripleLaneSep, 0],
        safeLaneX: -tripleLaneSep,
        hasSafeLane: true,
        startX,
        startY: isNusantara ? a.y : a.y + 0.08,
        startZ,
        endX,
        endY: isNusantara ? b.y : b.y + 0.08,
        endZ,
        dx: bdx,
        dz: bdz,
        lenSq: bdx * bdx + bdz * bdz,
        sagAmp,
        gapFracs: [],
        movingPlanks: [],
        obbyPlanks: [],
      });
    }
  }

  private initTrailSamples() {
    const stages = this.activeStages;
    const stepsPerSeg = 28;
    let totalDist = 0;
    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i];
      const b = stages[i + 1];
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
    const last = stages[stages.length - 1];
    const prev = this.trailSamples[this.trailSamples.length - 1];
    totalDist += Math.hypot(last.x - prev.x, last.z - prev.z);
    this.trailSamples.push({
      x: last.x,
      y: last.y,
      z: last.z,
      segIndex: stages.length - 2,
      distFromStart: totalDist,
    });
  }

  public getNearestTrailInfo(x: number, z: number): TrailInfo {
    const stages = this.activeStages;
    let bestDistSq = Infinity;
    let bestProj: TrailInfo = {
      dist: 0,
      x: stages[0].x,
      y: stages[0].y,
      z: stages[0].z,
      segIndex: 0,
      t: 0,
      tx: 0,
      tz: -1,
    };

    for (let i = 0; i < stages.length - 1; i++) {
      const a = stages[i];
      const b = stages[i + 1];
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

  private getIslandSurfaceHeightAt(x: number, z: number, playerY?: number): number | null {
    const stages = this.activeStages;
    let bestY: number | null = null;
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      const dx = x - st.x;
      const dz = z - st.z;
      const inside =
        st.shape === 'box'
          ? Math.abs(dx) <= st.rTop && Math.abs(dz) <= st.rTop
          : dx * dx + dz * dz <= st.rTop * st.rTop;
      if (inside) {
        if (playerY !== undefined && playerY < st.y - 4.0) continue;
        if (bestY === null || st.y > bestY) {
          bestY = st.y;
        }
      }
    }
    return bestY;
  }

  public getBridgeHeightAt(x: number, z: number, playerY?: number): number | null {
    let bestH: number | null = null;
    for (let i = 0; i < this.bridgeSpans.length; i++) {
      const bs = this.bridgeSpans[i];
      const u = ((x - bs.startX) * bs.dx + (z - bs.startZ) * bs.dz) / bs.lenSq;
      if (u < -0.02 || u > 1.02) continue;
      const uc = clamp(u, 0, 1);
      const px = bs.startX + bs.dx * uc;
      const pz = bs.startZ + bs.dz * uc;
      const dxp = x - px;
      const dzp = z - pz;
      const len = Math.sqrt(bs.lenSq) || 1;
      const signedLat = (dxp * bs.dz - dzp * bs.dx) / len;

      // 1) Jalur 3 (Kanan, localX = -6.9): Continuous Safe Straight Bridge (zero gaps, zero sag)
      if (bs.hasSafeLane && Math.abs(signedLat - bs.safeLaneX) <= bs.laneHalfW + 0.18) {
        const safeY = bs.startY + (bs.endY - bs.startY) * uc;
        if (playerY === undefined || playerY >= safeY - 1.25) {
          if (bestH === null || safeY > bestH) {
            bestH = safeY;
          }
        }
        continue;
      }

      // 2) Jalur 1 & 2 (Kiri +6.9 & Tengah 0) — Nusantara Obby Stepping Planks
      if (bs.obbyPlanks.length > 0) {
        let hitPlank = false;
        for (let p = 0; p < bs.obbyPlanks.length; p++) {
          const op = bs.obbyPlanks[p];
          if (u < op.uMin || u > op.uMax) continue;
          const curLatShift =
            op.moveAmpLat > 0
              ? Math.sin(this.currentElapsed * op.moveSpeed + op.phase) * op.moveAmpLat
              : 0;
          if (Math.abs(signedLat - (op.latCenter + curLatShift)) <= op.halfW) {
            hitPlank = true;
            break;
          }
        }
        if (!hitPlank) continue;
        const deckY = bs.startY + (bs.endY - bs.startY) * uc;
        if (playerY !== undefined && playerY < deckY - 0.48) continue;
        if (bestH === null || deckY > bestH) {
          bestH = deckY;
        }
        continue;
      }

      // 3) Jalur 1 & 2 (Kiri +6.9 & Tengah 0) — Suspension / Stepping Challenge Bridges
      let matchedLaneX: number | null = null;
      for (let li = 0; li < bs.challengeLaneXs.length; li++) {
        const lx = bs.challengeLaneXs[li];
        if (Math.abs(signedLat - lx) <= bs.laneHalfW + 1.35) {
          matchedLaneX = lx;
          break;
        }
      }
      if (matchedLaneX === null) continue;

      let handledMoving = false;
      let dynamicDy = 0;
      let dynamicLat = 0;
      for (let m = 0; m < bs.movingPlanks.length; m++) {
        const mp = bs.movingPlanks[m];
        if (mp.laneX === matchedLaneX && uc >= mp.uMin && uc <= mp.uMax) {
          handledMoving = true;
          if (mp.isLateral) {
            dynamicLat = Math.sin(this.currentElapsed * 1.85 + mp.phase) * mp.ampLat;
          } else {
            dynamicDy = Math.sin(this.currentElapsed * 2.1 + mp.phase) * mp.ampY;
          }
          break;
        }
      }

      if (handledMoving) {
        if (Math.abs(signedLat - (matchedLaneX + dynamicLat)) > bs.laneHalfW + 0.14) continue;
      } else {
        if (Math.abs(signedLat - matchedLaneX) > bs.laneHalfW + 0.08) continue;
        let inGap = false;
        for (let g = 0; g < bs.gapFracs.length; g++) {
          const gap = bs.gapFracs[g];
          if (uc > gap[0] && uc < gap[1]) {
            inGap = true;
            break;
          }
        }
        if (inGap) continue;
      }

      const sagOffset = bs.sagAmp > 0 ? bs.sagAmp * Math.sin(uc * Math.PI) : 0;
      const deckY = bs.startY + (bs.endY - bs.startY) * uc - sagOffset + dynamicDy;
      if (playerY !== undefined && playerY < deckY - 0.48) continue;
      if (bestH === null || deckY > bestH) {
        bestH = deckY;
      }
    }
    return bestH;
  }

  public getBridgeLaneAt(x: number, z: number, playerY?: number): 'challenge' | 'safe' | null {
    for (let i = 0; i < this.bridgeSpans.length; i++) {
      const bs = this.bridgeSpans[i];
      const u = ((x - bs.startX) * bs.dx + (z - bs.startZ) * bs.dz) / bs.lenSq;
      if (u <= 0.04 || u >= 0.96) continue;
      const px = bs.startX + bs.dx * u;
      const pz = bs.startZ + bs.dz * u;
      const dxp = x - px;
      const dzp = z - pz;
      const len = Math.sqrt(bs.lenSq) || 1;
      const signedLat = (dxp * bs.dz - dzp * bs.dx) / len;

      if (bs.hasSafeLane && Math.abs(signedLat - bs.safeLaneX) <= bs.laneHalfW + 0.35) {
        const safeY = bs.startY + (bs.endY - bs.startY) * u;
        if (playerY === undefined || Math.abs(playerY - safeY) < 2.4) {
          return 'safe';
        }
      }

      for (let li = 0; li < bs.challengeLaneXs.length; li++) {
        const lx = bs.challengeLaneXs[li];
        if (Math.abs(signedLat - lx) <= bs.laneHalfW + 1.45) {
          const deckY =
            bs.startY +
            (bs.endY - bs.startY) * u -
            (bs.sagAmp > 0 ? bs.sagAmp * Math.sin(u * Math.PI) : 0);
          if (playerY === undefined || Math.abs(playerY - deckY) < 3.0) {
            return 'challenge';
          }
        }
      }
    }

    for (let i = 0; i < this.activeSteppingStones.length; i++) {
      const ss = this.activeSteppingStones[i];
      if (
        Math.hypot(x - ss.x, z - ss.z) <= ss.r + 0.3 &&
        (playerY === undefined || Math.abs(playerY - ss.y) < 2.6)
      ) {
        return 'challenge';
      }
    }
    return null;
  }

  // Strictly returns island/bridge top surface height or -999 over open chasms (zero hidden floor under bridges)
  public getTerrainHeight(x: number, z: number): number {
    const iy = this.getIslandSurfaceHeightAt(x, z);
    const by = this.getBridgeHeightAt(x, z);
    if (iy !== null && by !== null) return Math.max(iy, by);
    if (iy !== null) return iy;
    if (by !== null) return by;
    return -999;
  }

  public getGroundHeight(x: number, z: number, playerY?: number): number {
    const stages = this.activeStages;
    let h = -999;
    const iy = this.getIslandSurfaceHeightAt(x, z, playerY);
    if (iy !== null && iy > h) {
      h = iy;
    }

    const bh = this.getBridgeHeightAt(x, z, playerY);
    if (bh !== null && bh > h) {
      h = bh;
    }

    // Floating / stepping stone hops inside lava & sky_kingdom bridge gaps
    for (let i = 0; i < this.activeSteppingStones.length; i++) {
      const ss = this.activeSteppingStones[i];
      const dx = x - ss.x;
      const dz = z - ss.z;
      const rEff = ss.r + 0.2;
      if (dx * dx + dz * dz <= rEff * rEff) {
        if (ss.y > h && (playerY === undefined || playerY >= ss.y - 2.2)) {
          h = ss.y;
        }
      }
    }

    // CP plaza stone pad (+0.34m on classic maps, flush at st.y on nusantara Obby islands)
    const isObbyMap = this.activeLayout.mapId === 'nusantara';
    if (!isObbyMap) {
      for (let i = 0; i < stages.length; i++) {
        const st = stages[i];
        const dx = x - st.x;
        const dz = z - st.z;
        const dSq = dx * dx + dz * dz;
        const padRadius = i === 26 ? 8.8 : 5.4;
        const stepRadius = i === 26 ? 10.2 : 6.7;
        if (dSq <= padRadius * padRadius) {
          const padTop = st.y + 0.34;
          if (padTop > h && (playerY === undefined || playerY >= st.y - 1.5)) {
            h = padTop;
          }
        } else if (dSq <= stepRadius * stepRadius) {
          const stepTop = st.y + 0.17;
          if (stepTop > h && (playerY === undefined || playerY >= st.y - 1.5)) {
            h = stepTop;
          }
        }
      }
    }

    // Non-fallen crumble stepping stones
    for (let i = 0; i < this.crumbleStones.length; i++) {
      const cs = this.crumbleStones[i];
      if (cs.state === 'fallen') continue;
      const dx = x - cs.x;
      const dz = z - cs.z;
      if (dx * dx + dz * dz <= 6.76) {
        const stoneTop = cs.baseY + 0.34;
        if (stoneTop > h && (playerY === undefined || playerY >= stoneTop - 1.2)) {
          h = stoneTop;
        }
      }
    }

    // Walkable solid obstacles / stairs / timber logs
    for (let i = 0; i < this.walkableBoxes.length; i++) {
      const wb = this.walkableBoxes[i];
      const dx = x - wb.cx;
      const dz = z - wb.cz;
      const lx = dx * wb.cosY - dz * wb.sinY;
      const lz = dx * wb.sinY + dz * wb.cosY;
      if (Math.abs(lx) <= wb.halfW && Math.abs(lz) <= wb.halfD) {
        if (wb.topY > h && (playerY === undefined || playerY >= wb.minPlayerY)) {
          h = wb.topY;
        }
      }
    }

    return h;
  }

  private initBlobShadowResources() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.72)');
      grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.36)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    this.blobShadowTexture = new THREE.CanvasTexture(canvas);
    this.blobShadowTexture.colorSpace = THREE.SRGBColorSpace;
    this.blobShadowTexture.userData = { sharedTexture: true };
    this.blobShadowGeo = new THREE.PlaneGeometry(1.7, 1.7);
    this.blobShadowGeo.rotateX(-Math.PI / 2);
    this.blobShadowGeo.userData = { shared: true };
    this.sharedBlobShadowMat = new THREE.MeshBasicMaterial({
      map: this.blobShadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.56,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }

  private colliderCellKey(cx: number, cz: number): number {
    return (cx + 256) * 512 + (cz + 256);
  }

  private addSolidCollider(col: SolidCollider) {
    const cs = this.colliderCellSize;
    const minCx = Math.floor((col.x - col.r - 1.5) / cs);
    const maxCx = Math.floor((col.x + col.r + 1.5) / cs);
    const minCz = Math.floor((col.z - col.r - 1.5) / cs);
    const maxCz = Math.floor((col.z + col.r + 1.5) / cs);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.colliderCellKey(cx, cz);
        let bucket = this.colliderGrid.get(key);
        if (!bucket) {
          bucket = [];
          this.colliderGrid.set(key, bucket);
        }
        bucket.push(col);
      }
    }
  }

  private initLightsAndSky() {
    this.scene.background = new THREE.Color('#8ecae6');
    this.scene.fog = new THREE.FogExp2('#bde0fe', 0.00058);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.28);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight('#bae6fd', '#5c4033', 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff7d6', 1.62);
    this.sunLight.position.set(240, 360, 260);
    this.sunLight.castShadow = false;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
  }

  private initSharedWorldMaterials() {
    const mk = (params: THREE.MeshStandardMaterialParameters) => {
      const m = new THREE.MeshStandardMaterial(params);
      m.userData = { sharedMaterial: true };
      return m;
    };
    this.dirtTopMat = mk({ color: '#5c4033', roughness: 0.92 });
    this.grassEdgeMat = mk({ color: '#3b7a2a', roughness: 0.88 });
    this.cliffUpperMat = mk({ color: '#57534e', roughness: 0.95 });
    this.cliffLowerMat = mk({ color: '#44403c', roughness: 0.96 });
    this.buttressMat = mk({ color: '#64748b', roughness: 0.94 });
    this.woodMat = mk({ color: '#854d0e', roughness: 0.88 });
    this.warnWoodMat = mk({ color: '#9a3412', roughness: 0.85 });
    this.beamMat = mk({ color: '#451a03', roughness: 0.92 });
    this.postMat = mk({ color: '#5c2d0c', roughness: 0.9 });
    this.ropeMat = mk({ color: '#f3ead8', roughness: 0.82 });
    this.lanternMat = mk({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.25,
      roughness: 0.4,
    });
    this.padMat = mk({ color: '#64748b', roughness: 0.84 });
    this.trimMat = mk({ color: '#94a3b8', roughness: 0.75 });
    this.cliffRockMat = mk({ color: '#57534e', roughness: 0.95 });
    this.trunkMat = mk({ color: '#5c3a21', roughness: 0.95 });
    this.leafMat1 = mk({ color: '#14532d', roughness: 0.85 });
    this.leafMat2 = mk({ color: '#166534', roughness: 0.82 });
    this.leafMat3 = mk({ color: '#15803d', roughness: 0.8 });
    this.cloudMat = mk({
      color: '#ffffff',
      transparent: true,
      opacity: 0.84,
      roughness: 1,
    });
  }

  private clearActiveMapGroup() {
    this.activeMapGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && !mesh.geometry.userData?.shared) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (!mat || mat.userData?.sharedMaterial) continue;
          const std = mat as THREE.MeshStandardMaterial;
          if (std.map && !std.map.userData?.sharedTexture) {
            std.map.dispose();
          }
          mat.dispose();
        }
      }
    });
    this.activeMapGroup.clear();
    this.nusantaraValleyGroup.clear();
    this.lavaRiverGroup.clear();
    this.saljuGlacierGroup.clear();
    this.skyKingdomGroup.clear();
    this.cyberNeonGroup.clear();
  }

  private rebuildMapGeometry(mapId: MapThemeId) {
    this.clearActiveMapGroup();
    this.bridgeSpans.length = 0;
    this.activeSteppingStones.length = 0;
    this.bridgeBoulders.length = 0;
    this.bridgePushBeams.length = 0;
    this.bridgeRollingLogs.length = 0;
    this.trailSamples.length = 0;
    this.cpBeacons.length = 0;
    this.cpGates.length = 0;
    this.swayPlanks.length = 0;
    this.walkableBoxes.length = 0;
    this.obbyMovingPlanks.length = 0;
    this.crumbleStones.length = 0;
    this.geysers.length = 0;
    this.windZones.length = 0;
    this.colliderGrid.clear();

    this.activeLayout = getMapLayout(mapId);
    this.activeStages = this.activeLayout.stages;
    this.builtMapId = mapId;

    this.initBridgeSpans();
    this.initTrailSamples();
    this.buildCliffIslands();
    this.buildSuspensionBridges();
    this.buildCheckpointsAndLandmarks();
    this.buildIslandObstaclesAndHazards();
    this.buildInstancedFoliageAndRocks();
    this.buildMapThemeExtras();
    this.rebuildWildlifeForDifficulty();
    this.updateCpGatesForRole(this.lastGateRole, this.lastGateCp, this.lastGateCompleted);
    this.renderer.renderLists?.dispose();
  }

  private buildCliffIslands() {
    const stages = this.activeStages;
    const isGrounded = this.activeLayout.groundedBase;
    const dirtTopMat = this.dirtTopMat;
    const grassEdgeMat = this.grassEdgeMat;
    const cliffUpperMat = this.cliffUpperMat;
    const cliffLowerMat = this.cliffLowerMat;
    const buttressMat = this.buttressMat;

    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      const group = new THREE.Group();
      group.position.set(st.x, st.y, st.z);

      if (st.shape === 'box') {
        // Map 5 (Cyber Neon): Cubic / Rectangular Circuit Pads with glowing neon edge frame
        const fullW = st.rTop * 2;
        const deck = new THREE.Mesh(new THREE.BoxGeometry(fullW, 0.56, fullW), dirtTopMat);
        deck.position.y = -0.28;
        group.add(deck);

        const rimH = 0.28;
        const rimThick = 0.45;
        const edgeXGeo = new THREE.BoxGeometry(fullW + 0.4, rimH, rimThick);
        const edgeZGeo = new THREE.BoxGeometry(rimThick, rimH, fullW + 0.4);
        [-st.rTop, st.rTop].forEach((off) => {
          const bx = new THREE.Mesh(edgeXGeo, grassEdgeMat);
          bx.position.set(0, -0.05, off);
          const bz = new THREE.Mesh(edgeZGeo, grassEdgeMat);
          bz.position.set(off, -0.05, 0);
          group.add(bx, bz);
        });

        const coreH = st.cliffHeight * 0.72;
        const core = new THREE.Mesh(new THREE.BoxGeometry(fullW * 0.78, coreH, fullW * 0.78), cliffUpperMat);
        core.position.y = -0.56 - coreH * 0.5;
        group.add(core);

        const subCore = new THREE.Mesh(new THREE.BoxGeometry(fullW * 0.42, st.cliffHeight * 0.36, fullW * 0.42), cliffLowerMat);
        subCore.position.y = -0.56 - coreH - st.cliffHeight * 0.18;
        group.add(subCore);
      } else if (st.shape === 'hex') {
        // Map 2 (Lava Vulkanik): 6-sided Grounded Hexagonal Basalt Columns rising solidly from caldera floor Y=0
        const hexTopR = st.rTop * 1.12;
        const earthR = (st.rTop - 1.4) * 1.1;
        const earthDisc = new THREE.Mesh(new THREE.CylinderGeometry(earthR, earthR, 0.36, 6), dirtTopMat);
        earthDisc.position.y = -0.18;
        group.add(earthDisc);

        const hexRim = new THREE.Mesh(new THREE.CylinderGeometry(hexTopR + 0.1, hexTopR + 0.35, 1.35, 6), grassEdgeMat);
        hexRim.position.y = -0.68;
        group.add(hexRim);

        const fullDrop = isGrounded ? st.y + 4 : st.cliffHeight;
        const upperH = fullDrop * 0.42;
        const upperCliff = new THREE.Mesh(
          new THREE.CylinderGeometry(hexTopR + 0.25, hexTopR * 0.94, upperH, 6),
          cliffUpperMat,
        );
        upperCliff.position.y = -1.35 - upperH * 0.5;
        group.add(upperCliff);

        const lowerH = fullDrop * 0.62;
        const lowerCliff = new THREE.Mesh(
          new THREE.CylinderGeometry(hexTopR * 0.94, hexTopR * 1.24, lowerH, 6),
          cliffLowerMat,
        );
        lowerCliff.position.y = -1.35 - upperH - lowerH * 0.5;
        group.add(lowerCliff);

        if (isGrounded) {
          const rTopCol = (hexTopR + 0.25) * 0.88;
          const rBotCol = hexTopR * 1.24 * 0.88;
          this.addSolidCollider({
            kind: 'frustum',
            x: st.x,
            z: st.z,
            r: Math.max(rTopCol, rBotCol),
            rTop: rTopCol,
            rBottom: rBotCol,
            minY: -2,
            maxY: st.y - 1.75,
          });
        }
      } else if (st.shape === 'pyramid') {
        // Map 3 (Salju Everest): Grounded 4-Sided Truncated Alpine Pyramid Peaks descending solidly to Y=0
        const pyrTopR = st.rTop * 1.26;
        const earthDisc = new THREE.Mesh(new THREE.CylinderGeometry(st.rTop - 1.3, st.rTop - 1.3, 0.38, 16), dirtTopMat);
        earthDisc.position.y = -0.19;
        group.add(earthDisc);

        const snowCap = new THREE.Mesh(new THREE.CylinderGeometry(st.rTop + 0.15, pyrTopR, 1.4, 4), grassEdgeMat);
        snowCap.rotation.y = Math.PI / 4;
        snowCap.position.y = -0.7;
        group.add(snowCap);

        const fullDrop = isGrounded ? st.y + 4 : st.cliffHeight;
        const upperH = fullDrop * 0.45;
        const pyrMidR = pyrTopR + fullDrop * 0.08;
        const pyrBotR = pyrTopR + fullDrop * 0.18;
        const pyrUpper = new THREE.Mesh(
          new THREE.CylinderGeometry(pyrTopR, pyrMidR, upperH, 4),
          cliffUpperMat,
        );
        pyrUpper.rotation.y = Math.PI / 4;
        pyrUpper.position.y = -1.4 - upperH * 0.5;
        group.add(pyrUpper);

        const lowerH = fullDrop * 0.6;
        const pyrLower = new THREE.Mesh(
          new THREE.CylinderGeometry(pyrMidR, pyrBotR, lowerH, 4),
          cliffLowerMat,
        );
        pyrLower.rotation.y = Math.PI / 4;
        pyrLower.position.y = -1.4 - upperH - lowerH * 0.5;
        group.add(pyrLower);

        if (isGrounded) {
          const rTopCol = st.rTop * 0.9;
          const rBotCol = pyrBotR * 0.72;
          this.addSolidCollider({
            kind: 'frustum',
            x: st.x,
            z: st.z,
            r: Math.max(rTopCol, rBotCol),
            rTop: rTopCol,
            rBottom: rBotCol,
            minY: -2,
            maxY: st.y - 2.2,
          });
        }
      } else if (st.shape === 'obby_island') {
        // Map 1 (Nusantara Roblox Obby): Flat grassy surface strictly at Y = cp.y (local y = 0)
        // + rounded earthy rock underbelly kept strictly below local y = -0.85 so nothing ever pokes through grass
        const topDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(st.rTop, st.rTop * 1.03, 0.9, 22),
          this.obbyGrassTopMat,
        );
        topDisc.position.y = -0.45; // top face exact at y = 0 (st.y)
        group.add(topDisc);

        const grassShoulder = new THREE.Mesh(
          new THREE.CylinderGeometry(st.rTop + 0.25, st.rTop + 0.52, 1.05, 22),
          grassEdgeMat,
        );
        grassShoulder.position.y = -0.92; // top face at -0.395 (strictly below grass top)
        group.add(grassShoulder);

        const earthSkirt = new THREE.Mesh(
          new THREE.CylinderGeometry(st.rTop + 0.28, st.rTop * 1.04, 2.2, 20),
          cliffUpperMat,
        );
        earthSkirt.position.y = -2.0; // top face at -0.90, bridges rim cleanly to rounded belly
        group.add(earthSkirt);

        const bellyRadius = st.rTop * 1.04;
        const bellyScaleY = 0.34;
        const bellyHalfH = bellyRadius * bellyScaleY;
        const bellyMesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(bellyRadius, 1),
          cliffUpperMat,
        );
        bellyMesh.scale.set(1.04, bellyScaleY, 1.04);
        bellyMesh.rotation.y = i * 0.65;
        bellyMesh.position.y = -bellyHalfH - 0.85; // highest vertex strictly <= -0.85
        group.add(bellyMesh);

        const lobeCount = 3;
        const lobeRadius = st.rTop * 0.45;
        const lobeScaleY = 0.46;
        const lobeHalfH = lobeRadius * lobeScaleY;
        for (let lb = 0; lb < lobeCount; lb++) {
          const ang = (lb / lobeCount) * Math.PI * 2 + i * 0.9;
          const lobe = new THREE.Mesh(
            new THREE.DodecahedronGeometry(lobeRadius, 0),
            lb % 2 === 0 ? cliffLowerMat : cliffUpperMat,
          );
          lobe.scale.set(1.12, lobeScaleY, 1.12);
          lobe.rotation.y = ang;
          lobe.position.set(
            Math.cos(ang) * (st.rTop * 0.52),
            -lobeHalfH - 1.15, // highest vertex strictly <= -1.15
            Math.sin(ang) * (st.rTop * 0.52),
          );
          group.add(lobe);
        }

        this.addSolidCollider({
          kind: 'frustum',
          x: st.x,
          z: st.z,
          r: st.rTop * 1.02,
          rTop: st.rTop * 0.98,
          rBottom: st.rTop * 0.58,
          minY: st.y - bellyHalfH * 2 - 1.0,
          maxY: st.y - 1.1,
        });
      } else {
        // Map 4 (Sky Kingdom Floating Islands)
        const earthR = st.rTop - 1.55;
        const earthDisc = new THREE.Mesh(new THREE.CylinderGeometry(earthR, earthR, 0.36, 22), dirtTopMat);
        earthDisc.position.y = -0.18;
        group.add(earthDisc);

        const grassRing = new THREE.Mesh(new THREE.RingGeometry(earthR - 0.12, st.rTop, 24), grassEdgeMat);
        grassRing.rotation.x = -Math.PI / 2;
        grassRing.position.y = 0.015;
        group.add(grassRing);

        const grassBand = new THREE.Mesh(new THREE.CylinderGeometry(st.rTop + 0.05, st.rTop + 0.35, 1.35, 22), grassEdgeMat);
        grassBand.position.y = -0.68;
        group.add(grassBand);

        if (isGrounded) {
          const fullDrop = st.y + 6;
          const midSlopeR = st.rTop * 1.25 + fullDrop * 0.06;
          const botSlopeR = st.rTop * 1.55 + fullDrop * 0.11;
          const upperSlope = new THREE.Mesh(
            new THREE.CylinderGeometry(st.rTop + 0.35, midSlopeR, fullDrop * 0.45, 12),
            grassEdgeMat,
          );
          upperSlope.position.y = -1.35 - fullDrop * 0.225;
          group.add(upperSlope);

          const baseMountain = new THREE.Mesh(
            new THREE.CylinderGeometry(midSlopeR, botSlopeR, fullDrop * 0.58, 12),
            cliffUpperMat,
          );
          baseMountain.position.y = -1.35 - fullDrop * 0.45 - fullDrop * 0.29;
          group.add(baseMountain);
        } else {
          const upperH = st.cliffHeight * 0.56;
          const upperCliff = new THREE.Mesh(
            new THREE.CylinderGeometry(st.rTop + 0.22, st.rTop * 0.74, upperH, 12),
            cliffUpperMat,
          );
          upperCliff.position.y = -1.35 - upperH * 0.5;
          group.add(upperCliff);

          const lowerH = st.cliffHeight * 0.44;
          const lowerCliff = new THREE.Mesh(
            new THREE.CylinderGeometry(st.rTop * 0.74, st.rTop * 0.28, lowerH, 10),
            cliffLowerMat,
          );
          lowerCliff.position.y = -1.35 - upperH - lowerH * 0.5;
          group.add(lowerCliff);

          const spireCap = new THREE.Mesh(new THREE.ConeGeometry(st.rTop * 0.28, 6.5, 8), cliffLowerMat);
          spireCap.rotation.x = Math.PI;
          spireCap.position.y = -1.35 - upperH - lowerH - 3.25;
          group.add(spireCap);
        }
      }

      if (st.shape !== 'box' && st.shape !== 'obby_island') {
        const buttressCount = 4;
        for (let b = 0; b < buttressCount; b++) {
          const ang = (b / buttressCount) * Math.PI * 2 + i * 0.7;
          const dist = st.rTop * 0.84;
          const bh = 8.5 + (b % 3) * 3.5;
          const buttress = new THREE.Mesh(
            new THREE.CylinderGeometry(st.rTop * 0.16, st.rTop * 0.08, bh, 6),
            buttressMat,
          );
          buttress.position.set(Math.cos(ang) * dist, -3.2 - bh * 0.45, Math.sin(ang) * dist);
          group.add(buttress);
        }
      }

      this.activeMapGroup.add(group);
    }
  }

  private buildSuspensionBridges() {
    const woodMat = this.woodMat;
    const warnWoodMat = this.warnWoodMat;
    const beamMat = this.beamMat;
    const postMat = this.postMat;
    const ropeMat = this.ropeMat;
    const lanternMat = this.lanternMat;
    const pushBeamGeo = new THREE.BoxGeometry(2.35, 0.65, 0.65);
    const steppingSet = new Set(this.activeLayout.steppingBridgeIndices);
    const movingStart = this.activeLayout.movingBridgeStartIndex;
    const mapId = this.activeLayout.mapId;
    const stepStoneShape: 'hex' | 'circle' = mapId === 'lava' ? 'hex' : 'circle';
    const stepStoneGeo = new THREE.CylinderGeometry(1.52, 1.25, 0.65, stepStoneShape === 'hex' ? 6 : 12);

    const staticPlankMatrices: THREE.Matrix4[] = [];
    const dummyObj = new THREE.Object3D();
    const railGeoEndCap = new THREE.BoxGeometry(0.38, 0.48, 0.38);
    const safePostGeo = new THREE.BoxGeometry(0.14, 2.35, 0.14);

    const appendSafeLaneJalur3 = (
      bridgeGroup: THREE.Group,
      bs: BridgeSpan,
      midX: number,
      midZ: number,
      deckLen: number,
      cosBridge: number,
      sinBridge: number,
    ) => {
      const safeX = bs.safeLaneX;
      // 1) Solid continuous straight wooden deck (zero holes, zero sag, zero obstacles)
      const safeDeck = new THREE.Mesh(
        new THREE.BoxGeometry(bs.laneHalfW * 2, 0.36, deckLen + 0.4),
        this.safeDeckMat,
      );
      safeDeck.position.set(safeX, -0.18, 0);
      bridgeGroup.add(safeDeck);

      // 2) Low green wooden safety guard rails along both edges + solid side colliders
      const railDist = bs.laneHalfW + 0.14;
      const safeRailGeo = new THREE.BoxGeometry(0.22, 0.84, deckLen);
      [-railDist, railDist].forEach((rOff) => {
        const railX = safeX + rOff;
        const rail = new THREE.Mesh(safeRailGeo, this.safeRailMat);
        rail.position.set(railX, 0.42, 0);
        bridgeGroup.add(rail);

        this.addSolidCollider({
          kind: 'box',
          x: midX + railX * cosBridge,
          z: midZ - railX * sinBridge,
          r: deckLen * 0.52,
          halfW: 0.24,
          halfD: Math.max(2, deckLen * 0.45),
          cosY: cosBridge,
          sinY: sinBridge,
          minY: Math.min(bs.startY, bs.endY) - 0.5,
          maxY: Math.max(bs.startY, bs.endY) + 1.8,
        });
      });

      // 3) Small green entrance sign "JALUR AMAN / SANTAI" at bridge start
      const zSign = -deckLen * 0.5 + 1.25;
      [-1.46, 1.46].forEach((pxOff) => {
        const post = new THREE.Mesh(safePostGeo, this.safeRailMat);
        post.position.set(safeX + pxOff, 1.18, zSign);
        bridgeGroup.add(post);
      });
      const signBoard = new THREE.Mesh(this.safeSignGeo, this.safeSignMat);
      signBoard.position.set(safeX, 2.28, zSign);
      signBoard.rotation.y = Math.PI;
      bridgeGroup.add(signBoard);
    };

    for (let i = 0; i < this.bridgeSpans.length; i++) {
      const bs = this.bridgeSpans[i];
      const midX = (bs.startX + bs.endX) * 0.5;
      const midY = (bs.startY + bs.endY) * 0.5;
      const midZ = (bs.startZ + bs.endZ) * 0.5;
      const dy = bs.endY - bs.startY;
      const deckLen = Math.hypot(bs.dx, bs.dz);
      const angleY = Math.atan2(bs.dx, bs.dz);
      const cosBridge = Math.cos(angleY);
      const sinBridge = Math.sin(angleY);
      const pitch = -Math.atan2(dy, deckLen);

      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(midX, midY, midZ);
      bridgeGroup.rotation.order = 'YXZ';
      bridgeGroup.rotation.y = angleY;
      bridgeGroup.rotation.x = pitch;

      // Always construct Jalur 3 (Kanan, localX = -6.9) as Safe Continuous Straight Bridge
      appendSafeLaneJalur3(bridgeGroup, bs, midX, midZ, deckLen, cosBridge, sinBridge);

      // Map Nusantara alternates: even indices (CP 0->1, 2->3, ...) = Dual Challenge Obby Planks (Jalur 1 & Jalur 2),
      // odd indices (CP 1->2, 3->4, ...) = Dual Challenge Curved Wooden Rope Suspension Bridges.
      if (mapId === 'nusantara' && i % 2 === 0) {
        const railGeo = new THREE.BoxGeometry(0.24, 0.34, deckLen + 0.4);
        const isMidUpper = i >= 10;
        const fastLaneIdx = (i / 2) % 2 === 0 ? 0 : 1;

        for (let lIdx = 0; lIdx < bs.challengeLaneXs.length; lIdx++) {
          const laneCenter = bs.challengeLaneXs[lIdx];
          const isFastLane = isMidUpper && lIdx === fastLaneIdx;
          const laneHalfW = bs.laneHalfW;
          const railSpread = laneHalfW + 0.28;

          [-railSpread, railSpread].forEach((rOff) => {
            const rail = new THREE.Mesh(railGeo, this.obbyRailMat);
            rail.position.set(laneCenter + rOff, 0.04, 0);
            bridgeGroup.add(rail);

            [-deckLen * 0.5, deckLen * 0.5].forEach((capZ) => {
              const cap = new THREE.Mesh(railGeoEndCap, this.obbyRailMat);
              cap.position.set(laneCenter + rOff, 0.14, capZ);
              bridgeGroup.add(cap);
            });
          });

          // Mandatory jumpable clear air gaps of 2.55 - 2.95 units between planks
          const plankLen = isFastLane ? 2.35 : isMidUpper ? 2.55 : 2.75;
          const targetGap = isFastLane ? 2.95 : isMidUpper ? 2.75 : 2.58;
          const dFirst = 1.65 + plankLen * 0.5;
          const dLast = deckLen - 1.65 - plankLen * 0.5;
          const spanD = Math.max(plankLen, dLast - dFirst);
          const count = Math.max(4, Math.floor(spanD / (plankLen + targetGap)) + 1);
          const step = count > 1 ? spanD / (count - 1) : 0;
          const hasMovingInBridge = i >= 10;

          for (let p = 0; p < count; p++) {
            const dAlong = count > 1 ? dFirst + p * step : deckLen * 0.5;
            const zLocal = dAlong - deckLen * 0.5;
            const uCenter = dAlong / deckLen;
            const halfU = (plankLen * 0.5 + 0.04) / deckLen;
            const isMoving =
              hasMovingInBridge &&
              ((lIdx === 0 && p === Math.floor(count / 2)) ||
                (lIdx === 1 && count >= 5 && p === Math.floor(count / 2) - 1));
            const plankWidth = isMoving ? 2.55 : laneHalfW * 2;
            const moveAmp = isMoving ? 0.62 : 0;
            const moveSpeed = 1.55 + (i % 4) * 0.12;
            const phase = i * 1.15 + lIdx * 2.3 + p * 0.7;

            if (isMoving) {
              const movingMesh = new THREE.Mesh(this.obbyPlankUnitGeo, this.obbyPlankMat);
              movingMesh.scale.set(plankWidth, 0.3, plankLen);
              movingMesh.position.set(laneCenter, -0.15, zLocal);
              bridgeGroup.add(movingMesh);

              const entry: ObbyPlankEntry = {
                bridgeIdx: i,
                uMin: uCenter - halfU,
                uMax: uCenter + halfU,
                latCenter: laneCenter,
                halfW: plankWidth * 0.5 + 0.14,
                mesh: movingMesh,
                baseLocalX: laneCenter,
                moveAmpLat: moveAmp,
                moveSpeed,
                phase,
              };
              bs.obbyPlanks.push(entry);
              this.obbyMovingPlanks.push(entry);
            } else {
              bridgeGroup.updateMatrixWorld(true);
              dummyObj.position.set(laneCenter, -0.15, zLocal);
              dummyObj.rotation.set(0, 0, 0);
              dummyObj.scale.set(plankWidth, 0.3, plankLen);
              dummyObj.updateMatrix();
              const worldMat = new THREE.Matrix4().multiplyMatrices(
                bridgeGroup.matrixWorld,
                dummyObj.matrix,
              );
              staticPlankMatrices.push(worldMat);

              bs.obbyPlanks.push({
                bridgeIdx: i,
                uMin: uCenter - halfU,
                uMax: uCenter + halfU,
                latCenter: laneCenter,
                halfW: plankWidth * 0.5 + 0.14,
                baseLocalX: laneCenter,
                moveAmpLat: 0,
                moveSpeed: 0,
                phase: 0,
              });
            }
          }
        }

        this.activeMapGroup.add(bridgeGroup);
        continue;
      }

      const isSteppingBridge = mapId !== 'nusantara' && steppingSet.has(i);
      const gapHalfU = (2.82 * 0.5) / Math.max(10, deckLen); // ~2.82m clear missing-plank hole
      if (isSteppingBridge) {
        bs.gapFracs.push([0.33, 0.67]);
        bs.challengeLaneXs.forEach((laneX) => {
          [0.37, 0.455, 0.545, 0.63].forEach((sf, sIdx) => {
            const latShift =
              laneX + (sIdx % 2 === 0 ? -0.68 : 0.68) * (mapId === 'lava' ? 1.0 : 0.78);
            const sx = bs.startX + bs.dx * sf + latShift * cosBridge;
            const sz = bs.startZ + bs.dz * sf - latShift * sinBridge;
            const sy =
              bs.startY +
              (bs.endY - bs.startY) * sf +
              (mapId === 'sky_kingdom' ? (sIdx % 2) * 0.55 : 0);
            const stMesh = new THREE.Mesh(
              stepStoneGeo,
              sIdx % 2 === 0 ? (mapId === 'lava' ? this.warnWoodMat : this.padMat) : this.trimMat,
            );
            stMesh.position.set(sx, sy - 0.32, sz);
            this.activeMapGroup.add(stMesh);
            if (mapId === 'lava') {
              const pillarH = sy + 2;
              const pillarMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(1.18, 1.4, pillarH, 6),
                this.cliffUpperMat,
              );
              pillarMesh.position.set(sx, sy - 0.64 - pillarH * 0.5, sz);
              this.activeMapGroup.add(pillarMesh);
            }
            this.activeSteppingStones.push({
              bridgeIdx: i,
              x: sx,
              y: sy,
              z: sz,
              r: 1.52,
              shape: stepStoneShape,
            });
          });
        });
      } else if (mapId === 'nusantara') {
        const holeCenters = i <= 5 ? [0.36, 0.66] : i < movingStart ? [0.27, 0.51, 0.75] : [0.22, 0.78];
        holeCenters.forEach((hc) => {
          bs.gapFracs.push([hc - gapHalfU, hc + gapHalfU]);
        });
      } else if (i <= 7) {
        bs.gapFracs.push([0.40 - gapHalfU, 0.40 + gapHalfU]);
        if (i >= 3) bs.gapFracs.push([0.70 - gapHalfU, 0.70 + gapHalfU]);
      } else if (i >= 11 && i <= 16 && i < movingStart) {
        bs.gapFracs.push([0.52 - gapHalfU, 0.52 + gapHalfU]);
      }

      const plankCount = Math.max(24, Math.ceil(deckLen / 0.95));
      const plankStep = deckLen / plankCount;
      const plankDepth = plankStep * 0.9;
      const plankGeo = new THREE.BoxGeometry(bs.laneHalfW * 2, 0.34, plankDepth);
      const swayBridge = !isSteppingBridge && i >= 10 && i % 4 === 2;
      const beamSegCount = bs.sagAmp > 0 ? 10 : 1;
      const ropeSegCount = bs.sagAmp > 0 ? 12 : 1;
      const stanchionCount = Math.max(6, Math.round(deckLen / 4.2));

      // Build Jalur 1 (+6.9 Kiri) and Jalur 2 (0 Tengah) as parallel Challenge Obby Lanes
      for (let lIdx = 0; lIdx < bs.challengeLaneXs.length; lIdx++) {
        const laneX = bs.challengeLaneXs[lIdx];
        const movingClusters: Array<{
          laneX: number;
          uMin: number;
          uMax: number;
          meshes: THREE.Mesh[];
          baseYs: number[];
          phase: number;
          ampY: number;
          ampLat: number;
          isLateral: boolean;
        }> =
          !isSteppingBridge && i >= movingStart
            ? [
                {
                  laneX,
                  uMin: 0.31,
                  uMax: 0.39,
                  meshes: [],
                  baseYs: [],
                  phase: i * 1.1 + lIdx * 1.8,
                  ampY: mapId === 'cyber_neon' ? 0.9 : 1.05,
                  ampLat: 1.15,
                  isLateral: mapId === 'cyber_neon' ? true : (i + lIdx) % 2 === 0,
                },
                {
                  laneX,
                  uMin: 0.61,
                  uMax: 0.69,
                  meshes: [],
                  baseYs: [],
                  phase: i * 1.7 + 1.5 + lIdx * 1.4,
                  ampY: mapId === 'cyber_neon' ? 0.9 : 1.05,
                  ampLat: 1.15,
                  isLateral: mapId === 'cyber_neon' ? true : (i + lIdx) % 2 !== 0,
                },
              ]
            : [];

        for (let p = 0; p < plankCount; p++) {
          const frac = (p + 0.5) / plankCount;
          let skipPlank = false;
          let nearGap = false;
          for (let g = 0; g < bs.gapFracs.length; g++) {
            const [gMin, gMax] = bs.gapFracs[g];
            if (frac > gMin && frac < gMax) {
              skipPlank = true;
              break;
            }
            if (Math.abs(frac - gMin) < 0.025 || Math.abs(frac - gMax) < 0.025) {
              nearGap = true;
            }
          }
          if (skipPlank) continue;

          const zOff = -deckLen * 0.5 + (p + 0.5) * plankStep;
          const sagY = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(frac * Math.PI) : 0;
          const baseLocalY = -0.17 + sagY;
          const movingCluster = movingClusters.find((mc) => frac >= mc.uMin && frac <= mc.uMax);
          const isRickety = !movingCluster && swayBridge && p > 4 && p < plankCount - 5 && p % 5 === 0;
          const plank = new THREE.Mesh(
            plankGeo,
            isRickety || nearGap || movingCluster ? warnWoodMat : woodMat,
          );
          plank.position.set(laneX, baseLocalY, zOff);
          bridgeGroup.add(plank);

          if (movingCluster) {
            movingCluster.meshes.push(plank);
            movingCluster.baseYs.push(baseLocalY);
          } else if (isRickety) {
            this.swayPlanks.push({
              mesh: plank,
              baseY: baseLocalY,
              phase: i * 0.7 + p * 1.1 + lIdx,
              worldX: bs.startX + bs.dx * frac + laneX * cosBridge,
              worldZ: bs.startZ + bs.dz * frac - laneX * sinBridge,
            });
          }
        }
        if (movingClusters.length > 0) {
          bs.movingPlanks.push(...movingClusters);
        }

        if (!isSteppingBridge) {
          for (let sg = 0; sg < beamSegCount; sg++) {
            const u0 = sg / beamSegCount;
            const u1 = (sg + 1) / beamSegCount;
            const uMid = (u0 + u1) * 0.5;
            const sag0 = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(u0 * Math.PI) : 0;
            const sag1 = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(u1 * Math.PI) : 0;
            const sagM = (sag0 + sag1) * 0.5;
            const segDz = deckLen / beamSegCount;
            const segDy = sag1 - sag0;
            const segLen = Math.hypot(segDz, segDy) + 0.12;
            const segTilt = -Math.atan2(segDy, segDz);
            const zM = (uMid - 0.5) * deckLen;

            [-1.12, 1.12].forEach((bx) => {
              const beam = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, segLen), beamMat);
              beam.position.set(laneX + bx, -0.44 + sagM, zM);
              beam.rotation.x = segTilt;
              bridgeGroup.add(beam);
            });
          }
        }

        const postSpan = bs.laneHalfW + 0.22;
        [-deckLen * 0.5 + 0.35, deckLen * 0.5 - 0.35].forEach((endZ) => {
          [-postSpan, postSpan].forEach((pxOff) => {
            const portalPost = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.85, 0.34), postMat);
            portalPost.position.set(laneX + pxOff, 1.75, endZ);
            bridgeGroup.add(portalPost);

            const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), lanternMat);
            lantern.position.set(laneX + pxOff * 0.82, 2.88, endZ);
            bridgeGroup.add(lantern);
          });
          const lintel = new THREE.Mesh(new THREE.BoxGeometry(postSpan * 2 + 0.55, 0.32, 0.36), postMat);
          lintel.position.set(laneX, 3.55, endZ);
          bridgeGroup.add(lintel);
        });

        const railSideOffset = bs.laneHalfW + 0.1;
        if (!isSteppingBridge) {
          [-railSideOffset, railSideOffset].forEach((sideOff) => {
            const sideX = laneX + sideOff;
            for (let sg = 0; sg < ropeSegCount; sg++) {
              const u0 = sg / ropeSegCount;
              const u1 = (sg + 1) / ropeSegCount;
              const uMid = (u0 + u1) * 0.5;
              const sag0 = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(u0 * Math.PI) : 0;
              const sag1 = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(u1 * Math.PI) : 0;
              const sagM = (sag0 + sag1) * 0.5;
              const segDz = deckLen / ropeSegCount;
              const segDy = sag1 - sag0;
              const segLen = Math.hypot(segDz, segDy) + 0.08;
              const segTilt = -Math.atan2(segDy, segDz);
              const zM = (uMid - 0.5) * deckLen;

              const topRope = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, segLen), ropeMat);
              topRope.position.set(sideX, 1.18 + sagM, zM);
              topRope.rotation.x = segTilt;
              const midRope = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, segLen), ropeMat);
              midRope.position.set(sideX, 0.62 + sagM, zM);
              midRope.rotation.x = segTilt;
              bridgeGroup.add(topRope, midRope);
            }

            for (let s = 1; s < stanchionCount; s++) {
              const sFrac = s / stanchionCount;
              const zSt = -deckLen * 0.5 + sFrac * deckLen;
              const stSag = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(sFrac * Math.PI) : 0;
              const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.48, 0.2), beamMat);
              stanchion.position.set(sideX, 0.64 + stSag, zSt);
              bridgeGroup.add(stanchion);
            }

            this.addSolidCollider({
              kind: 'box',
              x: midX + sideX * cosBridge,
              z: midZ - sideX * sinBridge,
              r: deckLen * 0.52,
              halfW: 0.26,
              halfD: Math.max(2, deckLen * 0.45),
              cosY: cosBridge,
              sinY: sinBridge,
              minY: Math.min(bs.startY, bs.endY) - bs.sagAmp - 0.5,
              maxY: Math.max(bs.startY, bs.endY) + 1.5,
            });
          });
        }

        // Dynamic obstacles strictly on Challenge Lanes (+6.9 & 0), never on Safe Lane (-6.9)
        if (!isSteppingBridge && i >= 1 && i <= 7) {
          [
            { u: 0.21, lat: laneX - 0.65 },
            { u: 0.54, lat: laneX + 0.65 },
          ].forEach((cfg) => {
            if (bs.gapFracs.some(([g0, g1]) => cfg.u > g0 - 0.03 && cfg.u < g1 + 0.03)) return;
            const rock = new THREE.Mesh(
              mapId === 'salju' ? this.snowballGeo : this.rockGeo,
              mapId === 'salju' ? this.snowballMat : mapId === 'lava' ? this.magmaBoulderMat : this.rockMat,
            );
            rock.scale.set(0.42, 0.38, 0.42);
            const zOff = (cfg.u - 0.5) * deckLen;
            const sagY = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(cfg.u * Math.PI) : 0;
            rock.position.set(cfg.lat, 0.22 + sagY, zOff);
            bridgeGroup.add(rock);
            const wx = bs.startX + bs.dx * cfg.u + cfg.lat * cosBridge;
            const wz = bs.startZ + bs.dz * cfg.u - cfg.lat * sinBridge;
            const wy = bs.startY + (bs.endY - bs.startY) * cfg.u + sagY;
            this.bridgeBoulders.push({ bridgeIdx: i, x: wx, y: wy, z: wz, r: 0.58 });
          });
        } else if (!isSteppingBridge && i >= 8 && i <= 16) {
          const beamFracs = i >= 12 ? [0.36, 0.64] : [0.46];
          beamFracs.forEach((bFrac, bi) => {
            const pushBeam = new THREE.Mesh(pushBeamGeo, warnWoodMat);
            const zOff = (bFrac - 0.5) * deckLen;
            const sagY = bs.sagAmp > 0 ? -bs.sagAmp * Math.sin(bFrac * Math.PI) : 0;
            pushBeam.position.set(laneX, 0.88 + sagY, zOff);
            bridgeGroup.add(pushBeam);
            this.bridgePushBeams.push({
              bridgeIdx: i,
              laneX,
              mesh: pushBeam,
              centerX: bs.startX + bs.dx * bFrac + laneX * cosBridge,
              centerY: bs.startY + (bs.endY - bs.startY) * bFrac + sagY + 0.88,
              centerZ: bs.startZ + bs.dz * bFrac - laneX * sinBridge,
              perpX: cosBridge,
              perpZ: -sinBridge,
              halfWidth: bs.laneHalfW,
              phase: i * 1.3 + bi * 2.1 + lIdx * 1.7,
              speed: 1.85 + (i - 8) * 0.08,
              curOffset: 0,
            });
          });
        } else if (!isSteppingBridge && i >= 17) {
          const rollGeo = mapId === 'salju' ? this.snowballGeo : mapId === 'lava' || mapId === 'cyber_neon' ? this.rockGeo : this.logGeo;
          const rollMat = mapId === 'salju' ? this.snowballMat : mapId === 'lava' ? this.magmaBoulderMat : mapId === 'cyber_neon' ? this.cyberCoreMat : this.logMat;
          const rollLog = new THREE.Mesh(rollGeo, rollMat);
          rollLog.scale.setScalar(mapId === 'salju' ? 0.86 : 0.7);
          rollLog.rotation.y = angleY;
          rollLog.visible = false;
          this.activeMapGroup.add(rollLog);
          this.bridgeRollingLogs.push({
            bridgeIdx: i,
            mesh: rollLog,
            bs,
            u: lIdx === 0 ? 0.92 : 0.56,
            speed: 0.14 + (i - 17) * 0.008,
            latOffset: laneX + (i % 2 === 0 ? -0.45 : 0.45),
            radius: mapId === 'salju' ? 0.65 : 0.48,
            midX,
            midZ,
          });
        }
      }

      this.activeMapGroup.add(bridgeGroup);
    }

    if (staticPlankMatrices.length > 0) {
      const instPlanks = new THREE.InstancedMesh(
        this.obbyPlankUnitGeo,
        this.obbyPlankMat,
        staticPlankMatrices.length,
      );
      for (let k = 0; k < staticPlankMatrices.length; k++) {
        instPlanks.setMatrixAt(k, staticPlankMatrices[k]);
      }
      instPlanks.computeBoundingSphere();
      this.activeMapGroup.add(instPlanks);
    }
  }

  private getIslandOutwardSideAngle(idx: number): number {
    const stages = this.activeStages;
    const st = stages[idx];
    const next = idx < stages.length - 1 ? stages[idx + 1] : null;
    const prev = idx > 0 ? stages[idx - 1] : null;
    const outAng = next
      ? Math.atan2(next.z - st.z, next.x - st.x)
      : Math.atan2(st.z - prev!.z, st.x - prev!.x);
    const perpA = outAng + Math.PI / 2;
    const perpB = outAng - Math.PI / 2;
    const dotA = Math.cos(perpA) * st.x + Math.sin(perpA) * st.z;
    const dotB = Math.cos(perpB) * st.x + Math.sin(perpB) * st.z;
    return dotA >= dotB ? perpA : perpB;
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
    const stages = this.activeStages;
    const cpStages = stages.slice(0, 26);

    // 1) Basecamp Welcome Wooden Arch at Island 0 bridge mouth pointing toward Island 1
    const bc = stages[0];
    const cp1 = stages[1];
    const bdx = cp1.x - bc.x;
    const bdz = cp1.z - bc.z;
    const bLen = Math.hypot(bdx, bdz) || 1;
    const ux = bdx / bLen;
    const uz = bdz / bLen;
    const gateDist = bc.rTop - 2.6;
    const gateX = bc.x + ux * gateDist;
    const gateZ = bc.z + uz * gateDist;
    const gateYaw = Math.atan2(ux, uz);
    const gateCos = Math.cos(gateYaw);
    const gateSin = Math.sin(gateYaw);

    const gateGroup = new THREE.Group();
    gateGroup.position.set(gateX, bc.y, gateZ);
    gateGroup.rotation.y = gateYaw;
    const logMat = new THREE.MeshStandardMaterial({ color: '#6b3a15', roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.85 });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.4,
    });

    const isObbyMap = this.activeLayout.mapId === 'nusantara';
    const archHalfSpan = 9.4;
    [-archHalfSpan, archHalfSpan].forEach((sideX) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 8.8, 10), logMat);
      post.position.set(sideX, 4.2, 0);
      gateGroup.add(post);

      const baseStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.95, 1.3, 8),
        new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.92 }),
      );
      baseStone.position.set(sideX, 0.45, 0);
      gateGroup.add(baseStone);

      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.58, 0.45), lanternMat);
      lantern.position.set(sideX * 0.86, 5.4, -0.5);
      gateGroup.add(lantern);

      this.addSolidCollider({
        kind: 'circle',
        x: gateX + sideX * gateCos,
        z: gateZ - sideX * gateSin,
        r: 0.9,
        minY: bc.y - 0.5,
        maxY: bc.y + 8.8,
      });
    });

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(archHalfSpan * 2 + 1.8, 0.55, 0.72), logMat);
    crossBeam.position.set(0, 8.2, 0);
    gateGroup.add(crossBeam);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(archHalfSpan * 2 + 2.8, 0.4, 2.2), roofMat);
    roof.position.set(0, 8.72, 0);
    gateGroup.add(roof);

    const signBoard = this.createTextSign(
      'BASE CAMP CLIMBING MOUNT WOWO',
      '#5c2d0c',
      '#fde047',
      15.4,
      2.1,
    );
    signBoard.position.set(0, 6.95, -0.2);
    signBoard.rotation.y = Math.PI;
    gateGroup.add(signBoard);
    this.activeMapGroup.add(gateGroup);

    // 2) Checkpoint Stone Plazas, Stepped Rings, Tents, Campfires, Signs & Exit Energy Gates
    const padMat = this.padMat;
    const trimMat = this.trimMat;
    const poleMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.5, roughness: 0.35 });

    cpStages.forEach((cp, idx) => {
      const st = stages[idx];
      const padGroup = new THREE.Group();
      padGroup.position.set(cp.x, st.y, cp.z);

      if (isObbyMap) {
        const stepOuter = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.8, 0.12, 18), padMat);
        stepOuter.position.y = -0.05; // top at +0.01 (flush inlaid CP plaza at cp.y)
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.4, 0.12, 18), trimMat);
        pad.position.y = -0.04; // top at +0.02
        padGroup.add(stepOuter, pad);
      } else {
        const stepOuter = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.9, 0.34, 16), padMat);
        stepOuter.position.y = 0.0;
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.5, 0.36, 16), trimMat);
        pad.position.y = 0.16;
        padGroup.add(stepOuter, pad);
      }

      if (idx > 0) {
        const ringMat = new THREE.MeshBasicMaterial({
          color: idx === 25 ? '#f59e0b' : '#38bdf8',
          transparent: true,
          opacity: 0.62,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 5.05, 24), ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = isObbyMap ? 0.04 : 0.36;
        padGroup.add(ring);

        const sideAng = this.getIslandOutwardSideAngle(idx);
        const sideCos = Math.cos(sideAng);
        const sideSin = Math.sin(sideAng);

        const poleX = sideCos * 6.8;
        const poleZ = sideSin * 6.8;
        const poleH = idx === 25 ? 7.2 : 4.6;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, poleH, 8), poleMat);
        pole.position.set(poleX, poleH / 2, poleZ);
        padGroup.add(pole);
        this.addSolidCollider({
          kind: 'circle',
          x: cp.x + poleX,
          z: cp.z + poleZ,
          r: 0.35,
          minY: st.y - 0.2,
          maxY: st.y + poleH,
        });

        const flagMat = new THREE.MeshStandardMaterial({
          color: idx === 25 ? '#dc2626' : '#f59e0b',
          emissive: idx === 25 ? '#991b1b' : '#b45309',
          emissiveIntensity: 0.35,
          roughness: 0.6,
        });
        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(idx === 25 ? 3.4 : 1.9, idx === 25 ? 1.9 : 1.1, 0.1),
          flagMat,
        );
        flag.position.set(poleX + (idx === 25 ? 1.7 : 0.95), poleH - (idx === 25 ? 1.0 : 0.6), poleZ);
        padGroup.add(flag);

        if (idx === 25) {
          const whiteStripe = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.95, 0.11),
            new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 }),
          );
          whiteStripe.position.set(poleX + 1.7, poleH - 1.5, poleZ);
          padGroup.add(whiteStripe);
        }

        const plaqueAng = sideAng + 0.52;
        const plX = Math.cos(plaqueAng) * 6.2;
        const plZ = Math.sin(plaqueAng) * 6.2;
        const plaque = this.createTextSign(
          idx === 25 ? 'PUNCAK CP 25' : `CP ${idx}`,
          '#1e293b',
          '#f8fafc',
          2.6,
          0.88,
          idx === 25 ? '#f59e0b' : '#38bdf8',
        );
        plaque.position.set(plX, 1.55, plZ);
        plaque.lookAt(cp.x, st.y + 1.55, cp.z);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.6, 6), poleMat);
        post.position.set(plX, 0.8, plZ);
        padGroup.add(plaque, post);
        this.addSolidCollider({
          kind: 'circle',
          x: cp.x + plX,
          z: cp.z + plZ,
          r: 0.4,
          minY: st.y - 0.2,
          maxY: st.y + 2.2,
        });

        const tentAng = sideAng - 0.55;
        const tentX = Math.cos(tentAng) * 7.6;
        const tentZ = Math.sin(tentAng) * 7.6;
        const tentGroup = new THREE.Group();
        tentGroup.position.set(tentX, 0, tentZ);
        tentGroup.lookAt(cp.x, st.y, cp.z);
        const tentBody = new THREE.Mesh(
          new THREE.ConeGeometry(1.4, 1.85, 4),
          new THREE.MeshStandardMaterial({
            color: idx === 25 ? '#b45309' : idx % 2 === 0 ? '#0369a1' : '#0f766e',
            roughness: 0.85,
          }),
        );
        tentBody.rotation.y = Math.PI / 4;
        tentBody.position.y = 0.92;
        const tentDoor = new THREE.Mesh(
          new THREE.BoxGeometry(0.68, 1.1, 0.14),
          new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.95 }),
        );
        tentDoor.position.set(0, 0.55, 0.85);
        tentGroup.add(tentBody, tentDoor);
        padGroup.add(tentGroup);
        this.addSolidCollider({
          kind: 'circle',
          x: cp.x + tentX,
          z: cp.z + tentZ,
          r: 1.05,
          minY: st.y - 0.2,
          maxY: st.y + 2.2,
        });

        const fireAng = sideAng + 0.15;
        const fireX = Math.cos(fireAng) * 4.1;
        const fireZ = Math.sin(fireAng) * 4.1;
        const campFireGroup = new THREE.Group();
        campFireGroup.position.set(fireX, isObbyMap ? 0.03 : 0.34, fireZ);
        const emberStoneMat = new THREE.MeshStandardMaterial({
          color: '#334155',
          emissive: '#ea580c',
          emissiveIntensity: 0.15,
          roughness: 0.9,
        });
        const pitRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.15, 6, 10), emberStoneMat);
        pitRing.rotation.x = Math.PI / 2;
        pitRing.position.y = 0.1;
        campFireGroup.add(pitRing);

        [-0.45, 0.45].forEach((ang) => {
          const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.11, 0.98, 6),
            new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.92 }),
          );
          log.rotation.z = Math.PI / 2.4;
          log.rotation.y = ang * 1.4;
          log.position.y = 0.22;
          campFireGroup.add(log);
        });

        const flameGroup = new THREE.Group();
        const outerFlame = new THREE.Mesh(
          new THREE.ConeGeometry(0.4, 1.15, 7),
          new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.92 }),
        );
        outerFlame.position.y = 0.62;
        const innerFlame = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.78, 7),
          new THREE.MeshBasicMaterial({ color: '#fde047' }),
        );
        innerFlame.position.y = 0.48;
        flameGroup.add(outerFlame, innerFlame);
        flameGroup.visible = false;
        campFireGroup.add(flameGroup);
        padGroup.add(campFireGroup);

        this.cpBeacons.push({
          index: idx,
          ring,
          flag,
          flameGroup,
          emberMat: emberStoneMat,
        });

        const nextStage = stages[idx + 1];
        const edx = nextStage.x - cp.x;
        const edz = nextStage.z - cp.z;
        const eLen = Math.hypot(edx, edz) || 1;
        const gDist = st.rTop - 2.6;
        const gx = cp.x + (edx / eLen) * gDist;
        const gz = cp.z + (edz / eLen) * gDist;
        const gYaw = Math.atan2(edx, edz);
        const gCos = Math.cos(gYaw);
        const gSin = Math.sin(gYaw);

        const energyGate = new THREE.Group();
        energyGate.position.set(gx, st.y, gz);
        energyGate.rotation.y = gYaw;

        const pillarMat = new THREE.MeshStandardMaterial({
          color: idx === 25 ? '#d97706' : '#0284c7',
          emissive: idx === 25 ? '#f59e0b' : '#0ea5e9',
          emissiveIntensity: 0.75,
          metalness: 0.65,
          roughness: 0.28,
        });
        const energyPylonSpan = 9.2;
        [-energyPylonSpan, energyPylonSpan].forEach((px) => {
          const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 5.4, 10), pillarMat);
          pylon.position.set(px, 2.5, 0);
          energyGate.add(pylon);

          this.addSolidCollider({
            kind: 'circle',
            x: gx + px * gCos,
            z: gz - px * gSin,
            r: 0.45,
            minY: st.y - 0.5,
            maxY: st.y + 5.2,
            gateIndex: idx,
          });
        });

        const topBar = new THREE.Mesh(new THREE.BoxGeometry(energyPylonSpan * 2 + 0.5, 0.34, 0.34), pillarMat);
        topBar.position.set(0, 5.15, 0);
        energyGate.add(topBar);

        const wallMat = new THREE.MeshBasicMaterial({
          color: idx === 25 ? '#fbbf24' : '#38bdf8',
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const forceField = new THREE.Mesh(new THREE.PlaneGeometry(energyPylonSpan * 2 - 0.1, 4.8), wallMat);
        forceField.position.set(0, 2.55, 0);
        energyGate.add(forceField);

        const lockSign = this.createTextSign(
          idx === 25 ? 'GERBANG POS UJIAN AKHIR' : `GERBANG CP ${idx}`,
          idx === 25 ? '#78350f' : '#0c4a6e',
          idx === 25 ? '#fde047' : '#7dd3fc',
          8.8,
          0.95,
          idx === 25 ? '#fbbf24' : '#38bdf8',
        );
        lockSign.position.set(0, 5.8, 0);
        lockSign.rotation.y = Math.PI;
        energyGate.add(lockSign);

        this.activeMapGroup.add(energyGate);
        this.cpGates.push({ index: idx, group: energyGate, wallMat });
      }

      this.activeMapGroup.add(padGroup);
    });

    // 3) GAPURA PUNCAK MOUNT WOWO — POS UJIAN AKHIR (Island 26)
    const se = stages[26];
    const cp25 = stages[25];
    const inYaw = Math.atan2(cp25.x - se.x, cp25.z - se.z);
    const inCos = Math.cos(inYaw);
    const inSin = Math.sin(inYaw);

    const summitGroup = new THREE.Group();
    summitGroup.position.set(se.x, se.y, se.z);
    summitGroup.rotation.y = inYaw;

    if (isObbyMap) {
      const stepRing = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.4, 0.12, 18), padMat);
      stepRing.position.y = -0.05;
      const plazaBase = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.0, 0.12, 18), trimMat);
      plazaBase.position.y = -0.04;
      summitGroup.add(stepRing, plazaBase);
    } else {
      const stepRing = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.6, 0.34, 18), padMat);
      stepRing.position.y = 0.0;
      const plazaBase = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.1, 0.38, 18), trimMat);
      plazaBase.position.y = 0.17;
      summitGroup.add(stepRing, plazaBase);
    }

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
    goldRing.position.y = isObbyMap ? 0.04 : 0.39;
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

    [-5.4, 5.4].forEach((px) => {
      const localZ = -2.2;
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 2.0), padMat);
      plinth.position.set(px, 0.75, localZ);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.6, 9.0, 12), redGapuraMat);
      col.position.set(px, 5.1, localZ);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 1.45), goldAccentMat);
      cap.position.set(px, 9.7, localZ);
      summitGroup.add(plinth, col, cap);

      const wx = se.x + px * inCos + localZ * inSin;
      const wz = se.z - px * inSin + localZ * inCos;
      this.addSolidCollider({
        kind: 'box',
        x: wx,
        z: wz,
        r: 1.5,
        halfW: 1.0,
        halfD: 1.0,
        cosY: inCos,
        sinY: inSin,
        minY: se.y - 0.5,
        maxY: se.y + 10.0,
      });
    });

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.88, 1.3), redGapuraMat);
    archBeam.position.set(0, 9.2, -2.2);
    const archRoof = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.52, 2.2), goldAccentMat);
    archRoof.position.set(0, 9.95, -2.2);
    summitGroup.add(archBeam, archRoof);

    const summitSign = this.createTextSign(
      'GAPURA PUNCAK WOWO · POS UJIAN AKHIR',
      '#7f1d1d',
      '#fde047',
      12.8,
      2.15,
      '#fbbf24',
    );
    summitSign.position.set(0, 7.5, -1.6);
    summitGroup.add(summitSign);

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 8.6, 8), poleMat);
    flagPole.position.set(0, 14.0, -2.2);
    const redFlag = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 1.3, 0.12),
      new THREE.MeshStandardMaterial({ color: '#dc2626', emissive: '#991b1b', emissiveIntensity: 0.35 }),
    );
    redFlag.position.set(2.0, 17.5, -2.2);
    const whiteFlag = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 1.3, 0.12),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.55 }),
    );
    whiteFlag.position.set(2.0, 16.2, -2.2);
    summitGroup.add(flagPole, redFlag, whiteFlag);

    this.cpBeacons.push({ index: 26, ring: goldRing, flag: redFlag });
    this.activeMapGroup.add(summitGroup);
  }

  private buildIslandObstaclesAndHazards() {
    const stages = this.activeStages;
    const barkMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.94 });
    const cutRingMat = new THREE.MeshStandardMaterial({ color: '#d6a56d', roughness: 0.84 });
    const logIslands = [2, 5, 9, 13, 17, 21];
    logIslands.forEach((islIdx, idx) => {
      const st = stages[islIdx];
      const next = stages[islIdx + 1];
      const dx = next.x - st.x;
      const dz = next.z - st.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      const nx = -uz;
      const nz = ux;

      const distOut = 9.4;
      const sideOff = idx % 2 === 0 ? -1.4 : 1.4;
      const lx = st.x + ux * distOut + nx * sideOff;
      const lz = st.z + uz * distOut + nz * sideOff;
      const logRadius = 0.44;
      const logLen = 4.2;
      const centerY = st.y + logRadius - 0.05;
      const topY = st.y + logRadius * 2 - 0.05;
      const yaw = Math.atan2(ux, uz);
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);

      const logGroup = new THREE.Group();
      logGroup.position.set(lx, centerY, lz);
      logGroup.rotation.y = yaw;

      const trunkGeo = new THREE.CylinderGeometry(logRadius, logRadius * 1.04, logLen, 10);
      trunkGeo.rotateZ(Math.PI / 2);
      logGroup.add(new THREE.Mesh(trunkGeo, barkMat));

      [-logLen / 2, logLen / 2].forEach((endX) => {
        const capGeo = new THREE.CylinderGeometry(logRadius * 0.84, logRadius * 0.84, 0.06, 10);
        capGeo.rotateZ(Math.PI / 2);
        const cap = new THREE.Mesh(capGeo, cutRingMat);
        cap.position.x = endX;
        logGroup.add(cap);
      });
      this.activeMapGroup.add(logGroup);

      this.addSolidCollider({
        kind: 'box',
        x: lx,
        z: lz,
        r: logLen * 0.6,
        halfW: logLen * 0.5,
        halfD: logRadius + 0.05,
        cosY,
        sinY,
        minY: st.y - 0.4,
        maxY: topY,
      });

      this.walkableBoxes.push({
        cx: lx,
        cz: lz,
        halfW: logLen * 0.5,
        halfD: logRadius + 0.1,
        cosY,
        sinY,
        topY,
        minPlayerY: topY - 0.48,
      });
    });

    const crumbleIslands = [6, 10, 14, 18, 22, 24];
    const stoneGeo = new THREE.CylinderGeometry(2.3, 2.1, 0.56, 10);
    crumbleIslands.forEach((islIdx) => {
      const st = stages[islIdx];
      const prev = stages[islIdx - 1];
      const dx = prev.x - st.x;
      const dz = prev.z - st.z;
      const len = Math.hypot(dx, dz) || 1;
      const sx = st.x + (dx / len) * 9.5;
      const sz = st.z + (dz / len) * 9.5;
      const baseY = st.y + 0.06;
      const mat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.78 });
      const mesh = new THREE.Mesh(stoneGeo, mat);
      mesh.position.set(sx, baseY, sz);
      this.activeMapGroup.add(mesh);
      this.crumbleStones.push({
        mesh,
        x: sx,
        z: sz,
        baseY,
        state: 'solid',
        timer: 0,
      });
    });

    const geyserIslands = [7, 11, 15, 19, 23];
    const ventRingGeo = new THREE.TorusGeometry(1.55, 0.36, 8, 16);
    const ventBaseGeo = new THREE.CylinderGeometry(1.55, 2.05, 0.65, 12);
    const ventBaseMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.94 });
    const plumeGeo = new THREE.CylinderGeometry(0.55, 1.5, 7.2, 12);
    plumeGeo.translate(0, 3.6, 0);
    geyserIslands.forEach((islIdx, idx) => {
      const st = stages[islIdx];
      const sideAng = this.getIslandOutwardSideAngle(islIdx) + Math.PI;
      const gx = st.x + Math.cos(sideAng) * 9.2;
      const gz = st.z + Math.sin(sideAng) * 9.2;
      const baseY = st.y;

      const mound = new THREE.Mesh(ventBaseGeo, ventBaseMat);
      mound.position.set(gx, baseY - 0.1, gz);

      const ring = new THREE.Mesh(
        ventRingGeo,
        new THREE.MeshStandardMaterial({
          color: '#475569',
          emissive: '#ea580c',
          emissiveIntensity: 0.35,
          roughness: 0.85,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(gx, baseY + 0.16, gz);

      const plume = new THREE.Mesh(
        plumeGeo,
        new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.65 }),
      );
      plume.position.set(gx, baseY, gz);
      plume.scale.set(1, 0.05, 1);
      plume.visible = false;

      this.activeMapGroup.add(mound, ring, plume);
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

    const windBridgeIndices = [16, 20, 24];
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    windBridgeIndices.forEach((bIdx, idx) => {
      const bs = this.bridgeSpans[bIdx];
      if (!bs) return;
      const wx = (bs.startX + bs.endX) * 0.5;
      const wy = (bs.startY + bs.endY) * 0.5;
      const wz = (bs.startZ + bs.endZ) * 0.5;
      const len = Math.hypot(bs.dx, bs.dz) || 1;
      const perpX = (-bs.dz / len) * (idx % 2 === 0 ? 1 : -1);
      const perpZ = (bs.dx / len) * (idx % 2 === 0 ? 1 : -1);

      const ribbons: THREE.Mesh[] = [];
      for (let r = 0; r < 5; r++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 0.36), ribbonMat);
        rib.position.set(
          wx + (Math.random() - 0.5) * 20,
          wy + 1.2 + r * 0.75,
          wz + (Math.random() - 0.5) * 20,
        );
        rib.rotation.y = Math.atan2(perpX, perpZ) + Math.PI / 2;
        this.activeMapGroup.add(rib);
        ribbons.push(rib);
      }
      this.windZones.push({
        x: wx,
        z: wz,
        radius: 18.0,
        dirX: perpX,
        dirZ: perpZ,
        ribbons,
      });
    });
  }

  private buildInstancedFoliageAndRocks() {
    const stages = this.activeStages;
    const mapId = this.activeLayout.mapId;
    const placedProps: Array<{ x: number; z: number; clearRadius: number }> = [];
    const hasMinSpacing = (x: number, z: number, minRadius: number): boolean => {
      for (let i = 0; i < placedProps.length; i++) {
        const p = placedProps[i];
        const req = p.clearRadius + minRadius + 1.2;
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz < req * req) return false;
      }
      return true;
    };

    const rockCoords: Array<{ x: number; y: number; z: number; s: number; i: number }> = [];
    const treePositions: Array<{ x: number; y: number; z: number; scale: number; rotY: number }> = [];

    for (let i = 0; i < stages.length; i++) {
      const st = stages[i];
      const next = i < stages.length - 1 ? stages[i + 1] : null;
      const prev = i > 0 ? stages[i - 1] : null;
      const outAngle = next ? Math.atan2(next.z - st.z, next.x - st.x) : null;
      const inAngle = prev ? Math.atan2(prev.z - st.z, prev.x - st.x) : null;

      const slots = i === 0 ? 18 : i === 26 ? 14 : 12;
      const clearAng = mapId === 'nusantara' ? 0.9 : 0.75;
      for (let k = 0; k < slots; k++) {
        const ang = (k / slots) * Math.PI * 2 + i * 0.37;
        if (outAngle !== null && normalizeAngleDiff(ang, outAngle) < clearAng) continue;
        if (inAngle !== null && normalizeAngleDiff(ang, inAngle) < clearAng) continue;
        // Keep wide clear corridor behind Base Camp spawn (CP 0) so camera view is unobstructed
        if (i === 0 && outAngle !== null && normalizeAngleDiff(ang, outAngle + Math.PI) < 1.25) continue;

        const r = st.rTop - (k % 2 === 0 ? 1.55 : 2.35);
        const px = st.x + Math.cos(ang) * r;
        const pz = st.z + Math.sin(ang) * r;
        if (i === 0 && mapId === 'nusantara' && pz > st.z - 2) continue;
        if (Math.hypot(px - st.x, pz - st.z) < Math.max(9.5, st.rTop * 0.62)) continue;

        if (k % 3 === 0 || mapId === 'lava') {
          const s = 0.65 + ((i + k) % 3) * 0.25;
          if (!hasMinSpacing(px, pz, 1.9 * s)) continue;
          const ry = mapId === 'nusantara' ? st.y : st.y - 0.1;
          rockCoords.push({ x: px, y: ry, z: pz, s, i: i * 16 + k });
          placedProps.push({ x: px, z: pz, clearRadius: 1.9 * s });
          if (mapId !== 'nusantara') {
            this.addSolidCollider({
              kind: 'circle',
              x: px,
              z: pz,
              r: 1.45 * s,
              minY: ry - 0.6,
              maxY: ry + 1.8 * s,
            });
          }
        } else if (i <= 24) {
          const scale = 0.92 + ((i + k) % 5) * 0.14;
          if (!hasMinSpacing(px, pz, 2.2 * scale)) continue;
          const ty = mapId === 'nusantara' ? st.y : st.y - 0.12;
          treePositions.push({
            x: px,
            y: ty,
            z: pz,
            scale,
            rotY: ((i * 7 + k) * 1.3) % (Math.PI * 2),
          });
          placedProps.push({ x: px, z: pz, clearRadius: 2.2 * scale });
          this.addSolidCollider({
            kind: 'circle',
            x: px,
            z: pz,
            r: 0.52 * scale,
            minY: ty - 0.5,
            maxY: ty + 7.5 * scale,
          });
        }
      }
    }

    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    if (rockCoords.length > 0) {
      if (mapId === 'nusantara') {
        const bushGeo = new THREE.DodecahedronGeometry(1.05, 1);
        bushGeo.translate(0, 0.45, 0);
        const bushInst = new THREE.InstancedMesh(bushGeo, this.obbyBushMat, rockCoords.length);
        rockCoords.forEach((r, idx) => {
          dummy.position.set(r.x, r.y, r.z);
          dummy.rotation.set(0, r.i * 0.85, 0);
          dummy.scale.set(r.s * 1.25, r.s * 0.65, r.s * 1.25);
          dummy.updateMatrix();
          bushInst.setMatrixAt(idx, dummy.matrix);
          tint.setHSL(0.35 + (idx % 3) * 0.02, 0.7, 0.46 + (idx % 4) * 0.05);
          bushInst.setColorAt(idx, tint);
        });
        bushInst.computeBoundingSphere();
        this.activeMapGroup.add(bushInst);
      } else {
        const cliffRockGeo = new THREE.DodecahedronGeometry(1.75, 0);
        cliffRockGeo.translate(0, 0.72, 0);
        const cliffInst = new THREE.InstancedMesh(cliffRockGeo, this.cliffRockMat, rockCoords.length);
        rockCoords.forEach((r, idx) => {
          dummy.position.set(r.x, r.y, r.z);
          dummy.rotation.set((r.i % 3) * 0.18, r.i * 0.7, (r.i % 4) * 0.14);
          dummy.scale.set(r.s * 1.2, r.s * 0.82, r.s);
          dummy.updateMatrix();
          cliffInst.setMatrixAt(idx, dummy.matrix);
          tint.setHSL(0.08, 0.08, 0.34 + (idx % 5) * 0.035);
          cliffInst.setColorAt(idx, tint);
        });
        cliffInst.computeBoundingSphere();
        this.activeMapGroup.add(cliffInst);
      }
    }

    if (treePositions.length > 0) {
      if (mapId === 'nusantara') {
        // Lush shaded leafy canopy trees bearing bright red/orange fruits (InstancedMesh for 60 FPS)
        const count = treePositions.length;
        const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 2.9, 7);
        trunkGeo.translate(0, 1.45, 0); // base flush at y = 0 (st.y)
        const canopyMainGeo = new THREE.DodecahedronGeometry(1.95, 1);
        canopyMainGeo.translate(0, 4.15, 0);
        const canopyTopGeo = new THREE.DodecahedronGeometry(1.4, 1);
        canopyTopGeo.translate(0.32, 5.2, -0.25);
        const canopySideGeo = new THREE.DodecahedronGeometry(1.32, 1);
        canopySideGeo.translate(-0.62, 3.85, 0.45);

        const trunkInst = new THREE.InstancedMesh(trunkGeo, this.trunkMat, count);
        const canopyMainInst = new THREE.InstancedMesh(canopyMainGeo, this.obbyCanopyMat, count);
        const canopyTopInst = new THREE.InstancedMesh(canopyTopGeo, this.obbyCanopyMat, count);
        const canopySideInst = new THREE.InstancedMesh(canopySideGeo, this.obbyCanopyMat, count);
        const fruitInst = new THREE.InstancedMesh(this.obbyFruitGeo, this.obbyFruitMat, count * 5);

        const fruitOffsets: Array<[number, number, number]> = [
          [1.45, 4.05, 0.75],
          [-1.35, 3.85, -0.85],
          [0.65, 4.85, -1.25],
          [-0.95, 4.55, 1.35],
          [0.1, 3.55, 1.65],
        ];

        treePositions.forEach((t, i) => {
          dummy.position.set(t.x, t.y, t.z);
          dummy.rotation.set(0, t.rotY, 0);
          dummy.scale.setScalar(t.scale);
          dummy.updateMatrix();
          trunkInst.setMatrixAt(i, dummy.matrix);
          canopyMainInst.setMatrixAt(i, dummy.matrix);
          canopyTopInst.setMatrixAt(i, dummy.matrix);
          canopySideInst.setMatrixAt(i, dummy.matrix);

          tint.setHSL(0.34 + (i % 4) * 0.015, 0.72, 0.44 + (i % 3) * 0.04);
          canopyMainInst.setColorAt(i, tint);
          tint.setHSL(0.35 + (i % 4) * 0.015, 0.76, 0.52);
          canopyTopInst.setColorAt(i, tint);
          canopySideInst.setColorAt(i, tint);

          const cosR = Math.cos(t.rotY);
          const sinR = Math.sin(t.rotY);
          for (let f = 0; f < 5; f++) {
            const [fx, fy, fz] = fruitOffsets[f];
            const wx = t.x + (fx * cosR + fz * sinR) * t.scale;
            const wy = t.y + fy * t.scale;
            const wz = t.z + (-fx * sinR + fz * cosR) * t.scale;
            dummy.position.set(wx, wy, wz);
            dummy.rotation.set(0, 0, 0);
            dummy.scale.setScalar(t.scale);
            dummy.updateMatrix();
            const fIdx = i * 5 + f;
            fruitInst.setMatrixAt(fIdx, dummy.matrix);
            tint.set((i + f) % 2 === 0 ? '#ef4444' : '#f97316');
            fruitInst.setColorAt(fIdx, tint);
          }
        });

        [trunkInst, canopyMainInst, canopyTopInst, canopySideInst, fruitInst].forEach((inst) => {
          inst.computeBoundingSphere();
          this.activeMapGroup.add(inst);
        });
      } else {
        const isCyber = mapId === 'cyber_neon';
        const trunkGeo = isCyber
          ? new THREE.BoxGeometry(0.65, 3.6, 0.65)
          : new THREE.CylinderGeometry(0.32, 0.5, 3.0, 7);
        trunkGeo.translate(0, isCyber ? 1.8 : 1.35, 0);
        const cone1Geo = isCyber ? new THREE.BoxGeometry(2.4, 1.5, 2.4) : new THREE.ConeGeometry(2.25, 4.1, 7);
        cone1Geo.translate(0, 3.9, 0);
        const cone2Geo = isCyber ? new THREE.BoxGeometry(1.7, 1.4, 1.7) : new THREE.ConeGeometry(1.68, 3.5, 7);
        cone2Geo.translate(0, 5.7, 0);
        const cone3Geo = isCyber ? new THREE.OctahedronGeometry(1.0, 0) : new THREE.ConeGeometry(1.08, 2.7, 7);
        cone3Geo.translate(0, 7.3, 0);

        const count = treePositions.length;
        const trunkInst = new THREE.InstancedMesh(trunkGeo, this.trunkMat, count);
        const cone1Inst = new THREE.InstancedMesh(cone1Geo, this.leafMat1, count);
        const cone2Inst = new THREE.InstancedMesh(cone2Geo, this.leafMat2, count);
        const cone3Inst = new THREE.InstancedMesh(cone3Geo, this.leafMat3, count);

        treePositions.forEach((t, i) => {
          dummy.position.set(t.x, t.y, t.z);
          dummy.rotation.set(0, t.rotY, 0);
          dummy.scale.setScalar(t.scale);
          dummy.updateMatrix();
          trunkInst.setMatrixAt(i, dummy.matrix);
          cone1Inst.setMatrixAt(i, dummy.matrix);
          cone2Inst.setMatrixAt(i, dummy.matrix);
          cone3Inst.setMatrixAt(i, dummy.matrix);

          if (isCyber) {
            tint.setHex(i % 2 === 0 ? 0x22d3ee : 0xc026d3);
          } else if (mapId === 'salju') {
            tint.setHSL(0.56, 0.45, 0.78 + (i % 4) * 0.04);
          } else if (mapId === 'sky_kingdom') {
            tint.setHSL(0.88 + (i % 5) * 0.02, 0.7, 0.74);
          } else {
            tint.setHSL(0.33 + (i % 6) * 0.014, 0.56, 0.27 + (i % 4) * 0.035);
          }
          cone1Inst.setColorAt(i, tint);
          cone2Inst.setColorAt(i, tint);
          cone3Inst.setColorAt(i, tint);
        });

        [trunkInst, cone1Inst, cone2Inst, cone3Inst].forEach((inst) => {
          inst.computeBoundingSphere();
          this.activeMapGroup.add(inst);
        });
      }
    }
  }

  private buildCloudsAndBirds() {
    const cloudMat = this.cloudMat;
    for (let i = 0; i < 18; i++) {
      const cg = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(18 + p * 5, 8, 6), cloudMat);
        puff.position.set((p - 1) * 16, (p % 2) * 4.5, 0);
        puff.scale.y = 0.42;
        cg.add(puff);
      }
      // Keep ALL sky clouds strictly high above mountain summits (Y > 280) and spanning elongated ridge Z
      cg.position.set(
        -800 + (i % 6) * 320,
        295 + (i % 6) * 36,
        -1900 + (i % 6) * 400,
      );
      this.scene.add(cg);
      this.clouds.push({ group: cg, speed: 3.4 + (i % 4) * 1.4 });
    }

    const wingGeo = new THREE.BoxGeometry(2.0, 0.08, 0.58);
    wingGeo.translate(1.0, 0, 0);
    const birdBodyGeo = new THREE.ConeGeometry(0.24, 1.3, 5);
    birdBodyGeo.rotateX(Math.PI / 2);
    const birdMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.75 });

    for (let i = 0; i < 10; i++) {
      const bg = new THREE.Group();
      const body = new THREE.Mesh(birdBodyGeo, birdMat);
      const lw = new THREE.Mesh(wingGeo, birdMat);
      const rw = new THREE.Mesh(wingGeo, birdMat);
      rw.scale.x = -1;
      bg.add(body, lw, rw);
      const cx = ((i % 5) - 2) * 185;
      const cz = -1750 + Math.floor(i / 2) * 380;
      const baseY = 125 + (i % 5) * 52;
      bg.position.set(cx, baseY, cz);
      this.scene.add(bg);
      this.birds.push({
        group: bg,
        leftWing: lw,
        rightWing: rw,
        centerX: cx,
        centerZ: cz,
        baseY,
        radius: 75 + (i % 3) * 35,
        angle: i * 0.9,
        speed: 0.2 + (i % 3) * 0.07,
        flapPhase: i * 1.4,
      });
    }
  }

  private buildWeatherSystems() {
    // Capped at exact 50 particles for guaranteed 60 FPS across Android & school lab PCs
    const rainCount = 50;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 76;
      rainPos[i * 3 + 1] = Math.random() * 56;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 76;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    this.rainSystem = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: '#bae6fd', size: 1.45, transparent: true, opacity: 0.78 }),
    );
    this.rainSystem.visible = false;
    this.scene.add(this.rainSystem);

    const snowCount = 50;
    const snowPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPos[i * 3] = (Math.random() - 0.5) * 90;
      snowPos[i * 3 + 1] = Math.random() * 64;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    this.snowSystem = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({ color: '#ffffff', size: 1.55, transparent: true, opacity: 0.85 }),
    );
    this.snowSystem.visible = false;
    this.scene.add(this.snowSystem);

    const emberCount = 50;
    const emberPos = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = (Math.random() - 0.5) * 86;
      emberPos[i * 3 + 1] = Math.random() * 60;
      emberPos[i * 3 + 2] = (Math.random() - 0.5) * 86;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    this.emberSystem = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({ color: '#fb923c', size: 1.65, transparent: true, opacity: 0.9 }),
    );
    this.emberSystem.visible = false;
    this.scene.add(this.emberSystem);
  }

  private buildMapThemeExtras() {
    const stages = this.activeStages;
    const mapId = this.activeLayout.mapId;

    if (mapId === 'nusantara') {
      // Wide open bright blue sky & horizon clouds — zero blocking valley walls or flanking mountain cones
      this.activeMapGroup.add(this.nusantaraValleyGroup);
    } else if (mapId === 'lava') {
      // Grounded dark volcanic caldera floor (1800x1800 at Y=0) + glowing magma lake & crater rim
      const basaltFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(1800, 1800),
        new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.96 }),
      );
      basaltFloor.rotation.x = -Math.PI / 2;
      basaltFloor.position.y = 0;

      const lavaLake = new THREE.Mesh(
        new THREE.CircleGeometry(490, 32),
        new THREE.MeshBasicMaterial({
          color: '#ea580c',
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      lavaLake.rotation.x = -Math.PI / 2;
      lavaLake.position.y = 0.08;

      const lavaRingInner = new THREE.Mesh(
        new THREE.RingGeometry(140, 260, 28),
        new THREE.MeshBasicMaterial({
          color: '#fb923c',
          transparent: true,
          opacity: 0.78,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      lavaRingInner.rotation.x = -Math.PI / 2;
      lavaRingInner.position.y = 0.14;

      const lavaRingOuter = new THREE.Mesh(
        new THREE.RingGeometry(330, 440, 28),
        new THREE.MeshBasicMaterial({
          color: '#facc15',
          transparent: true,
          opacity: 0.44,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      lavaRingOuter.rotation.x = -Math.PI / 2;
      lavaRingOuter.position.y = 0.18;

      const craterRim = new THREE.Mesh(
        new THREE.CylinderGeometry(620, 700, 75, 20, 1, true),
        new THREE.MeshStandardMaterial({ color: '#292524', roughness: 0.96, side: THREE.DoubleSide }),
      );
      craterRim.position.y = 37;

      this.lavaRiverGroup.add(basaltFloor, lavaLake, lavaRingInner, lavaRingOuter, craterRim);
      this.activeMapGroup.add(this.lavaRiverGroup);
    } else if (mapId === 'salju') {
      // Grounded glacial valley floor (1800x1800 at Y=0), frozen turquoise glacier strip & perimeter ice peaks
      const snowFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(1800, 1800),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.72 }),
      );
      snowFloor.rotation.x = -Math.PI / 2;
      snowFloor.position.y = 0;

      const glacierRiver = new THREE.Mesh(
        new THREE.PlaneGeometry(160, 1650),
        new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          roughness: 0.25,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      glacierRiver.rotation.x = -Math.PI / 2;
      glacierRiver.position.set(0, 0.08, 0);

      const spireGeo = new THREE.ConeGeometry(42, 165, 4);
      const spireMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.65 });
      const spireInst = new THREE.InstancedMesh(spireGeo, spireMat, 12);
      const sDummy = new THREE.Object3D();
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const rad = 580 + (i % 3) * 55;
        sDummy.position.set(Math.cos(ang) * rad, 80, Math.sin(ang) * rad);
        sDummy.rotation.set(0, ang, 0);
        sDummy.scale.set(1 + (i % 3) * 0.22, 0.8 + (i % 4) * 0.2, 1 + (i % 2) * 0.25);
        sDummy.updateMatrix();
        spireInst.setMatrixAt(i, sDummy.matrix);
      }
      spireInst.computeBoundingSphere();

      this.saljuGlacierGroup.add(snowFloor, glacierRiver, spireInst);
      this.activeMapGroup.add(this.saljuGlacierGroup);
    } else if (mapId === 'sky_kingdom') {
      const rainbowColors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8'];
      rainbowColors.forEach((hex, idx) => {
        const arc = new THREE.Mesh(
          new THREE.TorusGeometry(500 - idx * 14, 6.2, 6, 36, Math.PI),
          new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.82 }),
        );
        arc.position.set(0, 105, -360);
        this.skyKingdomGroup.add(arc);
      });

      const seaOfClouds = new THREE.Mesh(
        new THREE.CircleGeometry(780, 28),
        new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.86 }),
      );
      seaOfClouds.rotation.x = -Math.PI / 2;
      seaOfClouds.position.y = -28;
      this.skyKingdomGroup.add(seaOfClouds);

      const crystalGeo = new THREE.OctahedronGeometry(1.3, 0);
      crystalGeo.scale(1, 2.7, 1);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: '#f472b6',
        emissive: '#38bdf8',
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.2,
      });
      const crystalStages = [0, 3, 6, 9, 12, 15, 18, 21, 24, 25];
      const crystalInst = new THREE.InstancedMesh(crystalGeo, crystalMat, crystalStages.length);
      const cDummy = new THREE.Object3D();
      crystalStages.forEach((stIdx, idx) => {
        const st = stages[stIdx];
        const sideAng = this.getIslandOutwardSideAngle(stIdx) + 0.9;
        cDummy.position.set(
          st.x + Math.cos(sideAng) * (st.rTop - 1.6),
          st.y + 3.4,
          st.z + Math.sin(sideAng) * (st.rTop - 1.6),
        );
        cDummy.rotation.set(0, stIdx * 0.8, 0);
        cDummy.scale.setScalar(1.0 + (idx % 3) * 0.25);
        cDummy.updateMatrix();
        crystalInst.setMatrixAt(idx, cDummy.matrix);
      });
      crystalInst.computeBoundingSphere();
      this.skyKingdomGroup.add(crystalInst);
      this.activeMapGroup.add(this.skyKingdomGroup);
    } else if (mapId === 'cyber_neon') {
      const cyberGrid = new THREE.Mesh(
        new THREE.PlaneGeometry(1400, 1400, 22, 22),
        new THREE.MeshBasicMaterial({
          color: '#06b6d4',
          wireframe: true,
          transparent: true,
          opacity: 0.26,
        }),
      );
      cyberGrid.rotation.x = -Math.PI / 2;
      cyberGrid.position.y = -34;
      this.cyberNeonGroup.add(cyberGrid);

      const rimGeo = new THREE.RingGeometry(0.95, 1.04, 4);
      rimGeo.rotateX(-Math.PI / 2);
      rimGeo.rotateY(Math.PI / 4);
      const rimMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
      const rimInst = new THREE.InstancedMesh(rimGeo, rimMat, stages.length);
      const rDummy = new THREE.Object3D();
      const neonCyan = new THREE.Color('#22d3ee');
      const neonPurple = new THREE.Color('#c026d3');
      stages.forEach((st, idx) => {
        rDummy.position.set(st.x, st.y + 0.06, st.z);
        rDummy.scale.set(st.rTop * 1.42, 1, st.rTop * 1.42);
        rDummy.updateMatrix();
        rimInst.setMatrixAt(idx, rDummy.matrix);
        rimInst.setColorAt(idx, idx % 2 === 0 ? neonCyan : neonPurple);
      });
      rimInst.computeBoundingSphere();
      this.cyberNeonGroup.add(rimInst);
      this.activeMapGroup.add(this.cyberNeonGroup);
    }
  }

  public applyMapTheme(mapId: MapThemeId, immediate = false) {
    this.selectedMap = mapId;

    if (mapId === 'lava') {
      this.dirtTopMat.color.set('#292524');
      this.grassEdgeMat.color.set('#b91c1c');
      this.grassEdgeMat.emissive.set('#7f1d1d');
      this.grassEdgeMat.emissiveIntensity = 0.35;
      this.cliffUpperMat.color.set('#1c1917');
      this.cliffLowerMat.color.set('#0c0a09');
      this.buttressMat.color.set('#451a03');
      this.woodMat.color.set('#3f3f46');
      this.warnWoodMat.color.set('#ea580c');
      this.beamMat.color.set('#18181b');
      this.postMat.color.set('#27272a');
      this.ropeMat.color.set('#f97316');
      this.ropeMat.emissive.set('#ea580c');
      this.ropeMat.emissiveIntensity = 0.45;
      this.lanternMat.color.set('#fb923c');
      this.lanternMat.emissive.set('#ea580c');
      this.lanternMat.emissiveIntensity = 1.6;
      this.padMat.color.set('#27272a');
      this.trimMat.color.set('#f97316');
      this.cliffRockMat.color.set('#292524');
      this.trunkMat.color.set('#1c1917');
      [this.leafMat1, this.leafMat2, this.leafMat3].forEach((m) => {
        m.color.set('#7c2d12');
        m.emissive.set('#9a3412');
        m.emissiveIntensity = 0.35;
      });
      this.cloudMat.color.set('#fca5a5');
      this.cloudMat.opacity = 0.45;
    } else if (mapId === 'salju') {
      this.dirtTopMat.color.set('#cbd5e1');
      this.grassEdgeMat.color.set('#f8fafc');
      this.grassEdgeMat.emissive.set('#bae6fd');
      this.grassEdgeMat.emissiveIntensity = 0.14;
      this.cliffUpperMat.color.set('#64748b');
      this.cliffLowerMat.color.set('#475569');
      this.buttressMat.color.set('#93c5fd');
      this.woodMat.color.set('#7dd3fc');
      this.warnWoodMat.color.set('#e0f2fe');
      this.beamMat.color.set('#475569');
      this.postMat.color.set('#64748b');
      this.ropeMat.color.set('#e0f2fe');
      this.ropeMat.emissive.set('#bae6fd');
      this.ropeMat.emissiveIntensity = 0.22;
      this.lanternMat.color.set('#bae6fd');
      this.lanternMat.emissive.set('#38bdf8');
      this.lanternMat.emissiveIntensity = 1.3;
      this.padMat.color.set('#cbd5e1');
      this.trimMat.color.set('#e0f2fe');
      this.cliffRockMat.color.set('#cbd5e1');
      this.trunkMat.color.set('#475569');
      [this.leafMat1, this.leafMat2, this.leafMat3].forEach((m) => {
        m.color.set('#e0f2fe');
        m.emissive.set('#bae6fd');
        m.emissiveIntensity = 0.36;
      });
      this.cloudMat.color.set('#ffffff');
      this.cloudMat.opacity = 0.9;
    } else if (mapId === 'sky_kingdom') {
      this.dirtTopMat.color.set('#fef3c7');
      this.grassEdgeMat.color.set('#6ee7b7');
      this.grassEdgeMat.emissive.set('#34d399');
      this.grassEdgeMat.emissiveIntensity = 0.16;
      this.cliffUpperMat.color.set('#c4b5fd');
      this.cliffLowerMat.color.set('#a78bfa');
      this.buttressMat.color.set('#f9a8d4');
      this.woodMat.color.set('#f59e0b');
      this.warnWoodMat.color.set('#ec4899');
      this.beamMat.color.set('#d97706');
      this.postMat.color.set('#fbbf24');
      this.ropeMat.color.set('#fdf2f8');
      this.ropeMat.emissive.set('#fbcfe8');
      this.ropeMat.emissiveIntensity = 0.25;
      this.lanternMat.color.set('#fde047');
      this.lanternMat.emissive.set('#f472b6');
      this.lanternMat.emissiveIntensity = 1.45;
      this.padMat.color.set('#e0e7ff');
      this.trimMat.color.set('#f472b6');
      this.cliffRockMat.color.set('#ddd6fe');
      this.trunkMat.color.set('#d97706');
      [this.leafMat1, this.leafMat2, this.leafMat3].forEach((m) => {
        m.color.set('#fbcfe8');
        m.emissive.set('#f472b6');
        m.emissiveIntensity = 0.35;
      });
      this.cloudMat.color.set('#ffffff');
      this.cloudMat.opacity = 0.94;
    } else if (mapId === 'cyber_neon') {
      this.dirtTopMat.color.set('#0f172a');
      this.grassEdgeMat.color.set('#06b6d4');
      this.grassEdgeMat.emissive.set('#06b6d4');
      this.grassEdgeMat.emissiveIntensity = 0.65;
      this.cliffUpperMat.color.set('#1e1b4b');
      this.cliffLowerMat.color.set('#090d16');
      this.buttressMat.color.set('#7e22ce');
      this.woodMat.color.set('#1e293b');
      this.warnWoodMat.color.set('#d946ef');
      this.beamMat.color.set('#0f172a');
      this.postMat.color.set('#312e81');
      this.ropeMat.color.set('#22d3ee');
      this.ropeMat.emissive.set('#06b6d4');
      this.ropeMat.emissiveIntensity = 0.85;
      this.lanternMat.color.set('#f0abfc');
      this.lanternMat.emissive.set('#c026d3');
      this.lanternMat.emissiveIntensity = 1.85;
      this.padMat.color.set('#1e1b4b');
      this.trimMat.color.set('#22d3ee');
      this.cliffRockMat.color.set('#312e81');
      this.trunkMat.color.set('#1e1b4b');
      [this.leafMat1, this.leafMat2, this.leafMat3].forEach((m) => {
        m.color.set('#06b6d4');
        m.emissive.set('#9333ea');
        m.emissiveIntensity = 0.52;
      });
      this.cloudMat.color.set('#a855f7');
      this.cloudMat.opacity = 0.32;
    } else {
      this.dirtTopMat.color.set('#4ade80');
      this.grassEdgeMat.color.set('#22c55e');
      this.grassEdgeMat.emissive.set('#000000');
      this.grassEdgeMat.emissiveIntensity = 0;
      this.cliffUpperMat.color.set('#8b6b4a');
      this.cliffLowerMat.color.set('#6b5344');
      this.buttressMat.color.set('#78716c');
      this.woodMat.color.set('#f97316');
      this.warnWoodMat.color.set('#ea580c');
      this.beamMat.color.set('#451a03');
      this.postMat.color.set('#5c2d0c');
      this.ropeMat.color.set('#f3ead8');
      this.ropeMat.emissive.set('#000000');
      this.ropeMat.emissiveIntensity = 0;
      this.lanternMat.color.set('#fef08a');
      this.lanternMat.emissive.set('#f59e0b');
      this.lanternMat.emissiveIntensity = 1.25;
      this.padMat.color.set('#cbd5e1');
      this.trimMat.color.set('#e2e8f0');
      this.cliffRockMat.color.set('#78716c');
      this.trunkMat.color.set('#6b3f1d');
      this.leafMat1.color.set('#22c55e');
      this.leafMat2.color.set('#4ade80');
      this.leafMat3.color.set('#16a34a');
      [this.leafMat1, this.leafMat2, this.leafMat3].forEach((m) => {
        m.emissive.set('#000000');
        m.emissiveIntensity = 0;
      });
      this.cloudMat.color.set('#ffffff');
      this.cloudMat.opacity = 0.88;
    }

    if (this.builtMapId !== mapId) {
      this.rebuildMapGeometry(mapId);
    }

    const effectiveWeather: WeatherType =
      this.tempWeatherOverride === 'heavy_rain'
        ? 'hujan'
        : this.tempWeatherOverride === 'thick_fog'
          ? 'berkabut'
          : this.baseWeather;
    this.applyEffectiveEnvironment(this.baseTimeOfDay, effectiveWeather, immediate);
  }

  public applyEnvironment(timeOfDay: TimeOfDay, weather: WeatherType, immediate = false) {
    this.baseTimeOfDay = timeOfDay;
    this.baseWeather = weather;
    const effectiveWeather: WeatherType =
      this.tempWeatherOverride === 'heavy_rain'
        ? 'hujan'
        : this.tempWeatherOverride === 'thick_fog'
          ? 'berkabut'
          : this.tempWeatherOverride === 'snowstorm'
            ? 'salju'
            : weather;
    this.applyEffectiveEnvironment(timeOfDay, effectiveWeather, immediate);
  }

  public triggerTemporaryWeather(kind: 'heavy_rain' | 'thick_fog', durationSec = 5.0) {
    this.tempWeatherOverride = kind;
    this.tempWeatherTimer = durationSec;
    this.applyEffectiveEnvironment(
      this.baseTimeOfDay,
      kind === 'heavy_rain' ? 'hujan' : 'berkabut',
      false,
    );
  }

  public triggerSnowstorm(durationSec = 7.0) {
    this.snowstormTimer = durationSec;
    this.tempWeatherOverride = 'snowstorm';
    this.tempWeatherTimer = durationSec;
    this.applyEffectiveEnvironment(this.baseTimeOfDay, 'salju', false);
  }

  public isFrostSlowActive(): boolean {
    return this.weather === 'salju' || this.snowstormTimer > 0 || this.tempWeatherOverride === 'snowstorm';
  }

  private applyEffectiveEnvironment(timeOfDay: TimeOfDay, weather: WeatherType, immediate = false) {
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
        hemiSky: string;
        hemiGround: string;
        hemi: number;
        sunOffset: [number, number, number];
      }
    > = {
      pagi: {
        sky: '#8ecae6',
        fog: '#bde0fe',
        sunColor: '#fffbeb',
        sunInt: 1.62,
        amb: 0.28,
        hemiSky: '#bae6fd',
        hemiGround: '#5c4033',
        hemi: 0.78,
        sunOffset: [240, 360, 260],
      },
      siang: {
        sky: '#56bdf7',
        fog: '#a5dcfb',
        sunColor: '#ffffff',
        sunInt: 1.82,
        amb: 0.3,
        hemiSky: '#e0f2fe',
        hemiGround: '#604b34',
        hemi: 0.8,
        sunOffset: [120, 480, 180],
      },
      sore: {
        sky: '#ea7a45',
        fog: '#f5a572',
        sunColor: '#ffedd5',
        sunInt: 1.38,
        amb: 0.22,
        hemiSky: '#fed7aa',
        hemiGround: '#432d22',
        hemi: 0.62,
        sunOffset: [-320, 180, 280],
      },
      malam: {
        sky: '#0f172a',
        fog: '#172338',
        sunColor: '#93c5fd',
        sunInt: 0.68,
        amb: 0.18,
        hemiSky: '#3b5178',
        hemiGround: '#111827',
        hemi: 0.46,
        sunOffset: [-210, 420, -240],
      },
    };

    const tc = timeConfigs[timeOfDay] || timeConfigs.pagi;
    this.envTarget.sky.set(tc.sky);
    this.envTarget.fog.set(tc.fog);
    this.envTarget.sunColor.set(tc.sunColor);
    this.envTarget.sunIntensity = tc.sunInt;
    this.envTarget.ambientIntensity = tc.amb;
    this.envTarget.hemiSkyColor.set(tc.hemiSky);
    this.envTarget.hemiGroundColor.set(tc.hemiGround);
    this.envTarget.hemiIntensity = tc.hemi;
    this.envTarget.sunOffset.set(...tc.sunOffset);
    this.envTarget.fogDensity = 0.00058;

    // Apply 5-map atmosphere signature before weather overlays
    if (this.selectedMap === 'nusantara') {
      if (timeOfDay === 'pagi' || timeOfDay === 'siang') {
        this.envTarget.sky.set('#4fc3f7');
        this.envTarget.fog.set('#bae6fd');
        this.envTarget.hemiSkyColor.set('#e0f2fe');
        this.envTarget.hemiGroundColor.set('#4ade80');
      }
      this.envTarget.fogDensity = 0.00038;
    } else if (this.selectedMap === 'lava') {
      this.envTarget.sky.lerp(new THREE.Color('#9a3412'), 0.78);
      this.envTarget.fog.lerp(new THREE.Color('#c2410c'), 0.8);
      this.envTarget.sunColor.set('#fed7aa');
      this.envTarget.hemiSkyColor.set('#fb923c');
      this.envTarget.hemiGroundColor.set('#431407');
      this.envTarget.fogDensity = 0.00085;
    } else if (this.selectedMap === 'salju') {
      this.envTarget.sky.lerp(new THREE.Color('#bae6fd'), 0.68);
      this.envTarget.fog.lerp(new THREE.Color('#e0f2fe'), 0.75);
      this.envTarget.sunColor.set('#f8fafc');
      this.envTarget.hemiSkyColor.set('#e0f2fe');
      this.envTarget.hemiGroundColor.set('#64748b');
      this.envTarget.fogDensity = 0.00095;
    } else if (this.selectedMap === 'sky_kingdom') {
      this.envTarget.sky.lerp(new THREE.Color('#7dd3fc'), 0.62);
      this.envTarget.fog.lerp(new THREE.Color('#f0f9ff'), 0.72);
      this.envTarget.sunColor.set('#fef9c3');
      this.envTarget.hemiSkyColor.set('#fbcfe8');
      this.envTarget.hemiGroundColor.set('#a5b4fc');
    } else if (this.selectedMap === 'cyber_neon') {
      this.envTarget.sky.set('#070b1e');
      this.envTarget.fog.set('#13112c');
      this.envTarget.sunColor.set('#67e8f9');
      this.envTarget.sunIntensity = 1.05;
      this.envTarget.ambientIntensity = 0.34;
      this.envTarget.hemiSkyColor.set('#a855f7');
      this.envTarget.hemiGroundColor.set('#083344');
      this.envTarget.hemiIntensity = 0.7;
      this.envTarget.fogDensity = 0.00072;
    }

    if (weather === 'berkabut') {
      this.envTarget.fogDensity = 0.0038;
      this.envTarget.sky.lerp(new THREE.Color('#cbd5e1'), 0.68);
      this.envTarget.fog.copy(this.envTarget.sky);
      this.envTarget.sunIntensity *= 0.6;
    } else if (weather === 'hujan') {
      this.envTarget.fogDensity = 0.0016;
      this.envTarget.sky.lerp(new THREE.Color('#475569'), 0.58);
      this.envTarget.fog.copy(this.envTarget.sky).lerp(new THREE.Color('#64748b'), 0.25);
      this.envTarget.hemiSkyColor.lerp(new THREE.Color('#94a3b8'), 0.6);
      this.envTarget.sunIntensity *= 0.55;
    } else if (weather === 'badai') {
      this.envTarget.fogDensity = 0.002;
      this.envTarget.sky.lerp(new THREE.Color('#1e293b'), 0.75);
      this.envTarget.fog.copy(this.envTarget.sky);
      this.envTarget.hemiSkyColor.lerp(new THREE.Color('#475569'), 0.7);
      this.envTarget.sunIntensity *= 0.42;
    } else if (weather === 'salju') {
      const isBlizzard = this.tempWeatherOverride === 'snowstorm' || this.snowstormTimer > 0;
      this.envTarget.fogDensity = isBlizzard ? 0.0034 : 0.0015;
      this.envTarget.sky.lerp(new THREE.Color(isBlizzard ? '#dbeafe' : '#dbe4ee'), isBlizzard ? 0.88 : 0.78);
      this.envTarget.fog.copy(this.envTarget.sky);
      this.envTarget.hemiSkyColor.set('#f1f5f9');
      this.envTarget.hemiGroundColor.set('#64748b');
      this.envTarget.sunColor.set('#f1f5f9');
      this.envTarget.sunIntensity *= isBlizzard ? 0.52 : 0.75;
    } else if (weather === 'kiamat') {
      this.envTarget.fogDensity = 0.0019;
      this.envTarget.sky.set('#450a0a');
      this.envTarget.fog.set('#5c1212');
      this.envTarget.sunColor.set('#fca5a5');
      this.envTarget.sunIntensity = 0.9;
      this.envTarget.ambientIntensity = 0.2;
      this.envTarget.hemiSkyColor.set('#dc2626');
      this.envTarget.hemiGroundColor.set('#29130e');
      this.envTarget.hemiIntensity = 0.5;
    }

    if (this.rainSystem) {
      this.rainSystem.visible =
        this.tempWeatherOverride === 'heavy_rain' ||
        (!this.lowGraphics && (weather === 'hujan' || weather === 'badai'));
    }
    if (this.snowSystem) {
      this.snowSystem.visible =
        this.tempWeatherOverride === 'snowstorm' ||
        this.snowstormTimer > 0 ||
        (!this.lowGraphics && weather === 'salju');
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
      this.envCurrent.hemiSkyColor.copy(this.envTarget.hemiSkyColor);
      this.envCurrent.hemiGroundColor.copy(this.envTarget.hemiGroundColor);
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
    this.hemiLight.color.copy(this.envCurrent.hemiSkyColor);
    this.hemiLight.groundColor.copy(this.envCurrent.hemiGroundColor);
    this.hemiLight.intensity = this.envCurrent.hemiIntensity;
  }

  // --- R15 ARTICULATED AVATAR + LIGHTWEIGHT CONTACT BLOB SHADOW ---
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
      castShadow: false,
    });

    const blobShadowMat = this.sharedBlobShadowMat.clone();
    const blobShadow = new THREE.Mesh(this.blobShadowGeo, blobShadowMat);
    blobShadow.position.set(0, 0.05, 0);
    blobShadow.renderOrder = 2;
    group.add(blobShadow);

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
      blobShadow,
      tagSprite,
      emoteSprite,
      name,
      role,
    };
    return group;
  }

  public updateAvatarBlobShadow(mesh: THREE.Group | null, pos: THREE.Vector3) {
    if (!mesh) return;
    const shadow = mesh.userData.blobShadow as THREE.Mesh | undefined;
    if (!shadow) return;
    const gy = this.getGroundHeight(pos.x, pos.z, pos.y);
    if (gy < -100) {
      shadow.visible = false;
      return;
    }
    shadow.visible = true;
    const hAbove = Math.max(0, pos.y - gy);
    shadow.position.y = gy - pos.y + 0.05;
    const s = clamp(1 - hAbove * 0.075, 0.42, 1.0);
    shadow.scale.set(s, 1, s);
    (shadow.material as THREE.MeshBasicMaterial).opacity = clamp(0.58 - hAbove * 0.07, 0.14, 0.58);
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

  // --- INTERACTIVE 3D MOUNTAIN WILDLIFE (ISLAND-GROUNDED) ---
  private createTigerMesh() {
    const group = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.72 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: '#ffedd5', roughness: 0.78 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.25, 6, 10), furMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.92, 0);
    group.add(body);

    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.05, 6, 8), bellyMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, 0.72, 0);
    group.add(belly);

    [-0.45, -0.15, 0.15, 0.45].forEach((sz) => {
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.05, 6, 12), stripeMat);
      stripe.position.set(0, 0.92, sz);
      group.add(stripe);
    });

    const head = new THREE.Group();
    head.position.set(0, 1.12, -0.98);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), furMat);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.26), bellyMat);
    snout.position.set(0, -0.07, -0.3);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), stripeMat);
    nose.position.set(0, -0.02, -0.44);
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#facc15' });
    [-0.13, 0.13].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 6), furMat);
      ear.position.set(ex * 1.4, 0.32, 0.05);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 6), eyeMat);
      eye.position.set(ex, 0.08, -0.32);
      head.add(ear, eye);
    });
    head.add(skull, snout, nose);
    group.add(head);

    const legs: THREE.Object3D[] = [];
    [
      [-0.26, -0.58],
      [0.26, -0.58],
      [-0.26, 0.58],
      [0.26, 0.58],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.52, 6, 8), furMat);
      leg.position.set(lx, 0.42, lz);
      group.add(leg);
      legs.push(leg);
    });

    const tail = new THREE.Group();
    tail.position.set(0, 1.0, 0.88);
    const tailSeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.88, 5, 8), furMat);
    tailSeg.rotation.x = 1.05;
    tailSeg.position.set(0, 0.15, 0.42);
    tail.add(tailSeg);
    group.add(tail);

    return { group, legs, tail, head };
  }

  private createSunBearMesh() {
    const group = new THREE.Group();
    const blackFur = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.9 });
    const crescentMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.72 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.05, 8, 12), blackFur);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.9, 0);
    group.add(body);

    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.08, 6, 12, Math.PI),
      crescentMat,
    );
    crescent.rotation.z = Math.PI;
    crescent.position.set(0, 0.85, -0.78);
    group.add(crescent);

    const head = new THREE.Group();
    head.position.set(0, 1.18, -0.84);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), blackFur);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.28, 10), snoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.06, -0.32);
    [-0.26, 0.26].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), blackFur);
      ear.position.set(ex, 0.3, 0.02);
      head.add(ear);
    });
    head.add(skull, snout);
    group.add(head);

    const legs: THREE.Object3D[] = [];
    [
      [-0.32, -0.42],
      [0.32, -0.42],
      [-0.32, 0.44],
      [0.32, 0.44],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.44, 6, 8), blackFur);
      leg.position.set(lx, 0.4, lz);
      group.add(leg);
      legs.push(leg);
    });

    return { group, legs, head };
  }

  private createBoarMesh() {
    const group = new THREE.Group();
    const hideMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.92 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.8, 6, 10), hideMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.65, 0);
    group.add(body);

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.85), hideMat);
    ridge.position.set(0, 1.0, 0);
    group.add(ridge);

    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.4, 8), hideMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.62, -0.74);
    group.add(snout);

    [-0.13, 0.13].forEach((tx) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.22, 6), tuskMat);
      tusk.rotation.z = tx < 0 ? 0.5 : -0.5;
      tusk.rotation.x = -0.35;
      tusk.position.set(tx, 0.65, -0.88);
      group.add(tusk);
    });

    const legs: THREE.Object3D[] = [];
    [
      [-0.2, -0.34],
      [0.2, -0.34],
      [-0.2, 0.34],
      [0.2, 0.34],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.32, 5, 6), hideMat);
      leg.position.set(lx, 0.26, lz);
      group.add(leg);
      legs.push(leg);
    });

    return { group, legs };
  }

  private createPythonMesh() {
    const group = new THREE.Group();
    const scaleMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.55 });
    const patternMat = new THREE.MeshStandardMaterial({ color: '#365314', roughness: 0.62 });

    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2.5;
      const r = 0.82 - i * 0.03;
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(0.19 - i * 0.006, 8, 8),
        i % 2 === 0 ? scaleMat : patternMat,
      );
      seg.position.set(Math.cos(a) * r, 0.2 + (i > 10 ? (i - 10) * 0.22 : 0), Math.sin(a) * r);
      group.add(seg);
    }

    const head = new THREE.Group();
    head.position.set(0.1, 1.1, -0.32);
    const skull = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 6), scaleMat);
    skull.rotation.x = -Math.PI / 2;
    const tongue = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.02, 0.24),
      new THREE.MeshBasicMaterial({ color: '#ef4444' }),
    );
    tongue.position.set(0, -0.04, -0.3);
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
    const totalCount = Math.min(24, 4 + lvl.wildlifeCountPerTier * 2);
    const speciesList: Array<'tiger' | 'bear' | 'boar' | 'snake'> = [
      'boar',
      'bear',
      'tiger',
      'snake',
    ];

    for (let i = 0; i < totalCount; i++) {
      const islIdx = 1 + Math.floor((i / Math.max(1, totalCount)) * 24);
      const st = this.activeStages[clamp(islIdx, 1, 24)];
      const sideAng = this.getIslandOutwardSideAngle(islIdx) + (i % 2 === 0 ? 0.35 : -0.35);
      const ox = st.x + Math.cos(sideAng) * 9.8;
      const oz = st.z + Math.sin(sideAng) * 9.8;
      if (this.isInsideAnyCheckpointSafeZone(ox, oz)) continue;

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

      const wildShadow = new THREE.Mesh(this.blobShadowGeo, this.sharedBlobShadowMat);
      wildShadow.position.set(0, 0.05, 0);
      wildShadow.scale.setScalar(species === 'bear' ? 1.25 : species === 'snake' ? 1.1 : 1.0);
      mesh.add(wildShadow);
      mesh.position.set(ox, st.y - 0.04, oz);
      this.scene.add(mesh);

      this.wildlife.push({
        id: `wild_${i}`,
        species,
        mesh,
        originX: ox,
        originZ: oz,
        dirX: -Math.sin(sideAng),
        dirZ: Math.cos(sideAng),
        patrolSign: i % 2 === 0 ? 1 : -1,
        patrolRadius: species === 'snake' ? 0.4 : 2.8,
        phase: i * 1.3,
        soundCooldown: 0,
        legs,
        tail,
        head,
        age: 0,
        maxAge: Infinity,
      });
    }
  }

  public spawnWildlifeAhead(
    playerX: number,
    playerZ: number,
    speciesOverride?: 'tiger' | 'bear' | 'boar' | 'snake',
    maxAge = 5.0,
  ): 'tiger' | 'bear' | 'boar' | 'snake' {
    const speciesList: Array<'tiger' | 'bear' | 'boar' | 'snake'> = [
      'tiger',
      'bear',
      'boar',
      'snake',
    ];
    const species =
      speciesOverride || speciesList[Math.floor(Math.random() * speciesList.length)];

    if (this.wildlife.length >= 34) {
      const oldManualIdx = this.wildlife.findIndex((w) => w.id.startsWith('manual_'));
      const dropIdx = oldManualIdx >= 0 ? oldManualIdx : 0;
      const [removed] = this.wildlife.splice(dropIdx, 1);
      if (removed) this.scene.remove(removed.mesh);
    }

    const ahead = this.getTrailPointAhead(playerX, playerZ, 12);
    const ox = ahead.x;
    const oz = ahead.z;

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

    const wildShadow = new THREE.Mesh(this.blobShadowGeo, this.sharedBlobShadowMat);
    wildShadow.position.set(0, 0.05, 0);
    mesh.add(wildShadow);
    const gy = this.getGroundHeight(ox, oz);
    mesh.position.set(ox, (gy > -100 ? gy : ahead.y) - 0.04, oz);
    this.scene.add(mesh);

    this.wildlife.push({
      id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      species,
      mesh,
      originX: ox,
      originZ: oz,
      dirX: ahead.tx,
      dirZ: ahead.tz,
      patrolSign: 1,
      patrolRadius: species === 'snake' ? 0.4 : 4.0,
      phase: Math.random() * Math.PI * 2,
      soundCooldown: 1.5,
      legs,
      tail,
      head,
      age: 0,
      maxAge,
    });

    return species;
  }

  private initDisasterObjectPools() {
    // 1. Pre-allocate 3 Realistic Indonesian Kuntilanak Meshes (Shared Geo/Mat, 0 PointLights)
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      const upperBody = new THREE.Mesh(this.kuntiUpperGeo, this.kuntiDressMat);
      upperBody.position.y = 1.96;

      const dress = new THREE.Mesh(this.kuntiDressGeo, this.kuntiDressMat);
      dress.position.y = 0.86;

      const veil = new THREE.Mesh(this.kuntiVeilGeo, this.kuntiVeilMat);
      veil.position.y = 0.68;

      const headGroup = new THREE.Group();
      headGroup.position.set(0, 2.58, 0);

      const head = new THREE.Mesh(this.kuntiHeadGeo, this.kuntiHeadMat);
      const hairCrown = new THREE.Mesh(this.kuntiHairCrownGeo, this.kuntiHairMat);
      hairCrown.position.set(0, 0.04, 0.01);

      const hairBack = new THREE.Mesh(this.kuntiHairBackGeo, this.kuntiHairMat);
      hairBack.position.set(0, -0.78, 0.2);

      // Long front side locks draping partly across the pale face
      const hairLeft = new THREE.Mesh(this.kuntiHairSideGeo, this.kuntiHairMat);
      hairLeft.position.set(-0.22, -0.52, -0.08);
      hairLeft.rotation.z = -0.06;
      const hairRight = new THREE.Mesh(this.kuntiHairSideGeo, this.kuntiHairMat);
      hairRight.position.set(0.22, -0.52, -0.08);
      hairRight.rotation.z = 0.06;

      const socketL = new THREE.Mesh(this.kuntiSocketGeo, this.kuntiSocketMat);
      socketL.scale.set(1.1, 1.0, 0.48);
      socketL.position.set(-0.095, 0.02, -0.235);
      const socketR = new THREE.Mesh(this.kuntiSocketGeo, this.kuntiSocketMat);
      socketR.scale.set(1.1, 1.0, 0.48);
      socketR.position.set(0.095, 0.02, -0.235);

      const eyeL = new THREE.Mesh(this.kuntiEyeGeo, this.kuntiEyeMat);
      eyeL.position.set(-0.095, 0.02, -0.268);
      const eyeR = new THREE.Mesh(this.kuntiEyeGeo, this.kuntiEyeMat);
      eyeR.position.set(0.095, 0.02, -0.268);

      headGroup.add(head, hairCrown, hairBack, hairLeft, hairRight, socketL, socketR, eyeL, eyeR);

      const armL = new THREE.Mesh(this.kuntiArmGeo, this.kuntiDressMat);
      armL.position.set(-0.34, 2.08, -0.44);
      const handL = new THREE.Mesh(this.kuntiHandGeo, this.kuntiHeadMat);
      handL.position.set(-0.34, 2.08, -0.92);
      const armR = new THREE.Mesh(this.kuntiArmGeo, this.kuntiDressMat);
      armR.position.set(0.34, 2.08, -0.44);
      const handR = new THREE.Mesh(this.kuntiHandGeo, this.kuntiHeadMat);
      handR.position.set(0.34, 2.08, -0.92);

      const mistRing = new THREE.Mesh(this.kuntiRingGeo, this.kuntiRingMat);
      mistRing.position.y = 0.06;

      group.add(upperBody, dress, veil, headGroup, armL, handL, armR, handR, mistRing);
      group.visible = false;
      this.scene.add(group);
      this.kuntilanaks.push({
        mesh: group,
        head: headGroup,
        active: false,
        age: 0,
        maxAge: 5.0,
        phase: i * 1.9,
      });
    }

    // 2. Pre-allocate 3 Realistic Indonesian Pocong Meshes (Weathered Shroud, 3 Ties, Hollow Eyes)
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      const upperShroud = new THREE.Mesh(this.pocongUpperGeo, this.pocongShroudMat);
      upperShroud.position.y = 1.54;
      const lowerShroud = new THREE.Mesh(this.pocongLowerGeo, this.pocongShroudMat);
      lowerShroud.position.y = 0.62;
      const shoulders = new THREE.Mesh(this.pocongShoulderGeo, this.pocongShroudMat);
      shoulders.scale.set(1.12, 0.68, 0.88);
      shoulders.position.y = 1.88;

      const head = new THREE.Mesh(this.pocongHeadGeo, this.pocongShroudMat);
      head.position.y = 2.24;
      const topKnot = new THREE.Mesh(this.pocongKnotGeo, this.pocongShroudMat);
      topKnot.position.y = 2.66;

      // 3 Clear Shroud Rope Ties (Top head knot, Neck, Ankles) + tie knot tabs
      const tieHead = new THREE.Mesh(this.pocongTieGeo, this.pocongTieMat);
      tieHead.position.y = 2.46;
      const tabTop = new THREE.Mesh(this.pocongTabGeo, this.pocongTieMat);
      tabTop.position.set(0.24, 2.46, 0);
      tabTop.rotation.z = -0.5;

      const tieNeck = new THREE.Mesh(this.pocongTieGeo, this.pocongTieMat);
      tieNeck.position.y = 1.98;
      const tabNeck = new THREE.Mesh(this.pocongTabGeo, this.pocongTieMat);
      tabNeck.position.set(-0.23, 1.94, 0);
      tabNeck.rotation.z = 0.45;

      const tieAnkles = new THREE.Mesh(this.pocongAnkleTieGeo, this.pocongTieMat);
      tieAnkles.position.y = 0.24;

      // Exposed pale corpse gray face with hollow black eye sockets & pinpoint eyes
      const face = new THREE.Mesh(this.pocongFaceGeo, this.pocongFaceMat);
      face.scale.set(0.92, 1.15, 0.42);
      face.position.set(0, 2.22, -0.24);

      const socketL = new THREE.Mesh(this.pocongSocketGeo, this.pocongSocketMat);
      socketL.scale.set(1.05, 1.0, 0.45);
      socketL.position.set(-0.072, 2.26, -0.295);
      const socketR = new THREE.Mesh(this.pocongSocketGeo, this.pocongSocketMat);
      socketR.scale.set(1.05, 1.0, 0.45);
      socketR.position.set(0.072, 2.26, -0.295);

      const eyeL = new THREE.Mesh(this.pocongEyeGeo, this.pocongEyeMat);
      eyeL.position.set(-0.072, 2.26, -0.322);
      const eyeR = new THREE.Mesh(this.pocongEyeGeo, this.pocongEyeMat);
      eyeR.position.set(0.072, 2.26, -0.322);

      const mouth = new THREE.Mesh(this.pocongMouthGeo, this.pocongSocketMat);
      mouth.position.set(0, 2.13, -0.305);

      const mistRing = new THREE.Mesh(this.pocongRingGeo, this.pocongRingMat);
      mistRing.position.y = 0.06;

      group.add(
        upperShroud,
        lowerShroud,
        shoulders,
        head,
        topKnot,
        tieHead,
        tabTop,
        tieNeck,
        tabNeck,
        tieAnkles,
        face,
        socketL,
        socketR,
        eyeL,
        eyeR,
        mouth,
        mistRing,
      );
      group.visible = false;
      this.scene.add(group);
      this.pocongs.push({
        mesh: group,
        active: false,
        originX: 0,
        originZ: 0,
        dirX: 1,
        dirZ: 0,
        patrolDir: 1,
        vy: 0,
        age: 0,
        maxAge: 5.0,
      });
    }

    // 3. Pre-allocate 50 Hujan Es Crystals (Pooled, Max 50)
    for (let i = 0; i < 50; i++) {
      const mesh = new THREE.Mesh(this.iceHailGeo, this.iceHailMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.iceHails.push({
        mesh,
        active: false,
        vx: 0,
        vy: -24,
        vz: 0,
        age: 0,
        maxAge: 5.0,
        anchorX: 0,
        anchorZ: 0,
      });
    }

    // 4. Pre-allocate 50 Hujan Api Fireballs (Pooled, Max 50)
    for (let i = 0; i < 50; i++) {
      const mesh = new THREE.Mesh(this.fireRainGeo, this.fireRainMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.fireRains.push({
        mesh,
        active: false,
        vx: 0,
        vy: -26,
        vz: 0,
        impacted: false,
        sparkTimer: 0.45,
        groundY: 0,
        age: 0,
        maxAge: 5.0,
        anchorX: 0,
        anchorZ: 0,
      });
    }

    // 5. Pre-allocate 24 Pooled Summit Celebration Firework Sparks (0 runtime allocations)
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(
        this.fireworkGeo,
        this.fireworkMats[i % this.fireworkMats.length],
      );
      mesh.visible = false;
      this.scene.add(mesh);
      this.fireworkSparks.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 1.25,
        active: false,
      });
    }

    // 6. Pre-allocate 4 Brainrot Meme Actors (2 Skibidi Toilet + 2 Kepala Sigma / Tung Tung Sahur, 60 FPS)
    for (let i = 0; i < 4; i++) {
      const kind: 'skibidi' | 'sigma_sahur' = i % 2 === 0 ? 'skibidi' : 'sigma_sahur';
      const group = new THREE.Group();
      const ring = new THREE.Mesh(this.brainrotRingGeo, this.brainrotNeonMat);
      ring.position.y = 0.06;
      group.add(ring);

      if (kind === 'skibidi') {
        const base = new THREE.Mesh(this.brainrotBaseGeo, this.brainrotPorcelainMat);
        base.position.y = 0.28;
        const bowl = new THREE.Mesh(this.brainrotBowlGeo, this.brainrotPorcelainMat);
        bowl.position.y = 0.72;
        const water = new THREE.Mesh(this.brainrotWaterGeo, this.brainrotWaterMat);
        water.position.y = 0.93;
        const tank = new THREE.Mesh(this.brainrotTankGeo, this.brainrotPorcelainMat);
        tank.position.set(0, 1.15, -0.34);
        const bodyNode = new THREE.Group();
        bodyNode.add(base, bowl, water, tank);

        const headNode = new THREE.Group();
        headNode.position.set(0, 1.05, 0.04);
        const neck = new THREE.Mesh(this.brainrotNeckGeo, this.brainrotSkinMat);
        neck.position.y = 0.25;
        const head = new THREE.Mesh(this.brainrotHeadGeo, this.skibidiHeadMats);
        head.position.y = 0.68;
        headNode.add(neck, head);

        group.add(bodyNode, headNode);
        group.visible = false;
        this.scene.add(group);
        this.brainrots.push({
          mesh: group,
          kind,
          headNode,
          bodyNode,
          active: false,
          originX: 0,
          originZ: 0,
          dirX: 1,
          dirZ: 0,
          patrolDir: 1,
          vy: 0,
          age: 0,
          maxAge: 6.0,
          phase: i * 1.5,
        });
      } else {
        const bodyNode = new THREE.Group();
        const trunk = new THREE.Mesh(this.brainrotLogBodyGeo, this.brainrotWoodMat);
        trunk.position.y = 1.05;
        const legL = new THREE.Mesh(this.brainrotLimbGeo, this.brainrotWoodMat);
        legL.position.set(-0.16, 0.29, 0);
        const legR = new THREE.Mesh(this.brainrotLimbGeo, this.brainrotWoodMat);
        legR.position.set(0.16, 0.29, 0);
        const armL = new THREE.Mesh(this.brainrotLimbGeo, this.brainrotWoodMat);
        armL.position.set(-0.42, 1.15, 0.12);
        armL.rotation.x = -0.65;
        const armR = new THREE.Mesh(this.brainrotLimbGeo, this.brainrotWoodMat);
        armR.position.set(0.42, 1.15, 0.16);
        armR.rotation.x = -0.95;
        const mallet = new THREE.Mesh(this.brainrotMalletGeo, this.brainrotSkinMat);
        mallet.position.set(0.44, 1.38, 0.44);
        mallet.rotation.x = 0.4;
        bodyNode.add(trunk, legL, legR, armL, armR, mallet);

        const headNode = new THREE.Group();
        headNode.position.set(0, 1.92, 0);
        const head = new THREE.Mesh(this.brainrotHeadGeo, this.sahurHeadMats);
        headNode.add(head);

        group.add(bodyNode, headNode);
        group.visible = false;
        this.scene.add(group);
        this.brainrots.push({
          mesh: group,
          kind,
          headNode,
          bodyNode,
          active: false,
          originX: 0,
          originZ: 0,
          dirX: 1,
          dirZ: 0,
          patrolDir: 1,
          vy: 0,
          age: 0,
          maxAge: 6.0,
          phase: i * 1.5,
        });
      }
    }

    // 7. Pre-allocate 24 Pooled Landslide / Magma / Snow Boulders (0 runtime allocations)
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(this.rockGeo, this.rockMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.boulders.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        rotSpeed: 4.5,
        radius: 1.0,
        age: 0,
        maxAge: 7.0,
      });
    }

    // 8. Pre-allocate 4 Pooled Rolling Logs (0 runtime allocations)
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(this.logGeo, this.logMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.rollingLogs.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: 0.64,
        age: 0,
        maxAge: 7.0,
      });
    }

    // 9. Pre-allocate 14 Pooled Lava Rain Projectiles with Ground Warning Rings
    for (let i = 0; i < 14; i++) {
      const boulder = new THREE.Mesh(this.meteorGeo, this.magmaBoulderMat);
      const ring = new THREE.Mesh(this.meteorRingGeo, this.meteorRingMat);
      const shockwave = new THREE.Mesh(this.meteorShockGeo, this.meteorShockMat);
      boulder.visible = false;
      ring.visible = false;
      shockwave.visible = false;
      this.scene.add(boulder, ring, shockwave);
      this.lavaRainPool.push({
        active: false,
        x: 0,
        z: 0,
        groundY: 0,
        boulder,
        ring,
        shockwave,
        timer: 0,
        age: 0,
        maxAge: 7.0,
        impacted: false,
      });
    }

    // 10. Pre-allocate Rising Flood Plane Mesh (Flash Flood & Lava Flood)
    const floodGeo = new THREE.PlaneGeometry(2600, 2600);
    floodGeo.rotateX(-Math.PI / 2);
    this.floodMat = new THREE.MeshBasicMaterial({
      color: '#1D9BF0',
      map: this.floodWaterTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.floodPlaneMesh = new THREE.Mesh(floodGeo, this.floodMat);
    this.floodPlaneMesh.visible = false;
    this.floodPlaneMesh.position.y = -50;
    this.scene.add(this.floodPlaneMesh);

    // 11. Pre-allocate 3 Composite Low-Poly 3D Snow Monsters (Yeti Pool, 60 FPS)
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      const frostRing = new THREE.Mesh(this.yetiRingGeo, this.yetiRingMat);
      frostRing.rotation.x = -Math.PI / 2;
      frostRing.position.y = 0.08;
      group.add(frostRing);

      const torso = new THREE.Mesh(this.yetiTorsoGeo, this.yetiFurMat);
      torso.scale.set(1.18, 1.38, 0.95);
      torso.position.y = 1.68;

      const legL = new THREE.Mesh(this.yetiLimbGeo, this.yetiFurMat);
      legL.position.set(-0.44, 0.54, 0);
      const legR = new THREE.Mesh(this.yetiLimbGeo, this.yetiFurMat);
      legR.position.set(0.44, 0.54, 0);

      const armL = new THREE.Mesh(this.yetiLimbGeo, this.yetiSkinMat);
      armL.scale.set(1.05, 1.18, 1.05);
      armL.position.set(-1.08, 1.72, 0.14);
      const armR = new THREE.Mesh(this.yetiLimbGeo, this.yetiSkinMat);
      armR.scale.set(1.05, 1.18, 1.05);
      armR.position.set(1.08, 1.72, 0.14);

      const head = new THREE.Group();
      head.position.set(0, 2.86, 0.08);
      const skull = new THREE.Mesh(this.yetiHeadGeo, this.yetiFurMat);
      const faceMask = new THREE.Mesh(this.yetiHeadGeo, this.yetiSkinMat);
      faceMask.scale.set(0.84, 0.72, 0.25);
      faceMask.position.set(0, -0.04, 0.3);
      const brow = new THREE.Mesh(this.yetiBrowGeo, this.yetiFurMat);
      brow.position.set(0, 0.18, 0.34);
      const eyeL = new THREE.Mesh(this.yetiEyeGeo, this.yetiEyeMat);
      eyeL.position.set(-0.16, 0.04, 0.39);
      const eyeR = new THREE.Mesh(this.yetiEyeGeo, this.yetiEyeMat);
      eyeR.position.set(0.16, 0.04, 0.39);
      const hornL = new THREE.Mesh(this.yetiHornGeo, this.yetiSkinMat);
      hornL.position.set(-0.28, 0.44, 0);
      hornL.rotation.z = 0.35;
      const hornR = new THREE.Mesh(this.yetiHornGeo, this.yetiSkinMat);
      hornR.position.set(0.28, 0.44, 0);
      hornR.rotation.z = -0.35;
      head.add(skull, faceMask, brow, eyeL, eyeR, hornL, hornR);

      group.add(torso, legL, legR, armL, armR, head);
      group.scale.setScalar(1.16);
      group.visible = false;
      this.scene.add(group);
      this.yetis.push({
        mesh: group,
        armL,
        armR,
        legL,
        legR,
        head,
        active: false,
        originX: 0,
        originZ: 0,
        dirX: 1,
        dirZ: 0,
        patrolDir: 1,
        age: 0,
        maxAge: 7.0,
        phase: i * 1.7,
      });
    }
  }

  public clearDisasterEffect(type: DisasterEventType | 'all') {
    if (type === 'kuntilanak' || type === 'all') {
      for (const k of this.kuntilanaks) {
        k.active = false;
        k.mesh.visible = false;
      }
    }
    if (type === 'pocong' || type === 'all') {
      for (const p of this.pocongs) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
    if (type === 'brainrot' || type === 'all') {
      this.brainrotShakeTimer = 0;
      for (const b of this.brainrots) {
        b.active = false;
        b.mesh.visible = false;
      }
    }
    if (type === 'yeti' || type === 'all') {
      for (const y of this.yetis) {
        y.active = false;
        y.mesh.visible = false;
      }
    }
    if (type === 'hail' || type === 'all') {
      for (const h of this.iceHails) {
        h.active = false;
        h.mesh.visible = false;
      }
    }
    if (type === 'landslide' || type === 'lava_landslide' || type === 'all') {
      this.landslideShakeTimer = 0;
      for (const b of this.boulders) {
        b.active = false;
        b.mesh.visible = false;
      }
      for (const rl of this.rollingLogs) {
        rl.active = false;
        rl.mesh.visible = false;
      }
    }
    if (type === 'lava_rain' || type === 'all') {
      for (const lr of this.lavaRainPool) {
        lr.active = false;
        lr.boulder.visible = false;
        lr.ring.visible = false;
        lr.shockwave.visible = false;
      }
    }
    if (type === 'flash_flood' || type === 'lava_flood' || type === 'all') {
      this.floodActive = false;
      this.floodTimer = 0;
      this.floodPlaneMesh.visible = false;
      this.floodCurrentY = -50;
    }
    if (type === 'fire_rain' || type === 'wildfire' || type === 'all') {
      for (const f of this.fireRains) {
        f.active = false;
        f.mesh.visible = false;
        f.mesh.geometry = this.fireRainGeo;
        f.mesh.material = this.fireRainMat;
      }
    }
    if (type === 'thunder' || type === 'all') {
      this.thunderStormTimer = 0;
      for (const ls of this.lightningStrikes) {
        this.scene.remove(ls.ring, ls.bolt);
      }
      this.lightningStrikes.length = 0;
    }
    if (type === 'meteor' || type === 'all') {
      this.meteorShakeTimer = 0;
      for (const m of this.meteors) {
        this.scene.remove(m.boulder, m.ring, m.shockwave);
      }
      this.meteors.length = 0;
    }
    if (type === 'earthquake' || type === 'all') {
      this.earthquakeTimer = 0;
    }
    if (type === 'heavy_rain' || type === 'thick_fog' || type === 'snowstorm' || type === 'all') {
      if (type === 'snowstorm' || type === 'all') {
        this.snowstormTimer = 0;
      }
      if (type === 'all' || this.tempWeatherOverride === type) {
        this.tempWeatherOverride = null;
        this.tempWeatherTimer = 0;
        this.applyEffectiveEnvironment(this.baseTimeOfDay, this.baseWeather, false);
      }
    }
    if (type === 'wildlife' || type === 'all') {
      for (let i = this.wildlife.length - 1; i >= 0; i--) {
        const w = this.wildlife[i];
        if (w.maxAge < Infinity) {
          this.scene.remove(w.mesh);
          this.wildlife.splice(i, 1);
        }
      }
    }
  }

  /**
   * Free temporary per-student meshes, remote avatars, sprite CanvasTextures, and WebGL render lists
   * when switching to the next student on a shared lab PC without tearing down the mountain world.
   */
  public resetForNextStudentShift() {
    for (const rp of this.remotePlayers.values()) {
      this.scene.remove(rp.mesh);
      disposeAvatarGroup(rp.mesh);
    }
    this.remotePlayers.clear();
    this.clearDisasterEffect('all');
    this.summitCelebrationActive = false;
    this.summitFireworkTimer = 0;
    for (const sp of this.fireworkSparks) {
      sp.active = false;
      sp.mesh.visible = false;
    }
    this.updateCpGatesForRole('student', 0, []);
    this.renderer.renderLists?.dispose();
  }

  // --- LOCAL GHOST 1: KUNTILANAK (OBJECT POOL SIZE 3, FLOATING GLIDE, 5s LIFETIME) ---
  public spawnKuntilanak(x: number, z: number, maxAge = 5.0) {
    const slot =
      this.kuntilanaks.find((k) => !k.active) ||
      this.kuntilanaks.reduce((oldest, k) => (k.age > oldest.age ? k : oldest), this.kuntilanaks[0]);
    if (!slot) return;
    let gy = this.getGroundHeight(x, z);
    if (gy < -100) gy = this.getNearestTrailInfo(x, z).y;
    slot.mesh.position.set(x, gy + 0.52, z);
    slot.head.rotation.set(0, 0, 0);
    slot.age = 0;
    slot.maxAge = maxAge;
    slot.active = true;
    slot.mesh.visible = true;
  }

  public spawnKuntilanakHorde(
    playerX: number,
    playerZ: number,
    count = 3,
    offsets?: number[],
    maxAge = 5.0,
  ) {
    const targetCount = Math.min(3, Math.max(1, Math.round(count)));
    const defaultOffsets = [9, 15, 21];
    for (let i = 0; i < targetCount; i++) {
      const slot = this.kuntilanaks[i];
      if (!slot) break;
      const distAhead = offsets?.[i] ?? defaultOffsets[i] ?? (9 + i * 6);
      const pt = this.getTrailPointAhead(playerX, playerZ, distAhead);
      const lat = (i % 2 === 0 ? 1 : -1) * (1.8 + i * 0.7);
      let sx = pt.x - pt.tz * lat;
      let sz = pt.z + pt.tx * lat;
      if (this.getGroundHeight(sx, sz) < -100) {
        sx = pt.x;
        sz = pt.z;
      }
      if (this.isInsideAnyCheckpointSafeZone(sx, sz)) {
        const pushPt = this.getTrailPointAhead(sx, sz, 11);
        sx = pushPt.x;
        sz = pushPt.z;
      }
      let gy = this.getGroundHeight(sx, sz);
      if (gy < -100) gy = this.getNearestTrailInfo(sx, sz).y;
      slot.mesh.position.set(sx, gy + 0.52, sz);
      slot.head.rotation.set(0, 0, 0);
      slot.age = 0;
      slot.maxAge = maxAge;
      slot.active = true;
      slot.mesh.visible = true;
    }
  }

  // --- LOCAL GHOST 2: POCONG (OBJECT POOL SIZE 3, HOPPING, 5s LIFETIME) ---
  public spawnPocong(x: number, z: number, tx = 1, tz = 0, maxAge = 5.0) {
    const slot =
      this.pocongs.find((p) => !p.active) ||
      this.pocongs.reduce((oldest, p) => (p.age > oldest.age ? p : oldest), this.pocongs[0]);
    if (!slot) return;
    let gy = this.getGroundHeight(x, z);
    if (gy < -100) gy = this.getNearestTrailInfo(x, z).y;
    slot.mesh.position.set(x, gy, z);
    slot.originX = x;
    slot.originZ = z;
    slot.dirX = tx;
    slot.dirZ = tz;
    slot.patrolDir = 1;
    slot.vy = 6.8;
    slot.age = 0;
    slot.maxAge = maxAge;
    slot.active = true;
    slot.mesh.visible = true;
  }

  public spawnPocongHorde(
    playerX: number,
    playerZ: number,
    count = 3,
    offsets?: number[],
    maxAge = 5.0,
  ) {
    const targetCount = Math.min(3, Math.max(1, Math.round(count)));
    const defaultOffsets = [9, 15, 21];
    for (let i = 0; i < targetCount; i++) {
      const slot = this.pocongs[i];
      if (!slot) break;
      const distAhead = offsets?.[i] ?? defaultOffsets[i] ?? (9 + i * 6);
      const pt = this.getTrailPointAhead(playerX, playerZ, distAhead);
      const lat = (i % 2 === 0 ? -1 : 1) * (1.6 + i * 0.6);
      let sx = pt.x - pt.tz * lat;
      let sz = pt.z + pt.tx * lat;
      if (this.getGroundHeight(sx, sz) < -100) {
        sx = pt.x;
        sz = pt.z;
      }
      if (this.isInsideAnyCheckpointSafeZone(sx, sz)) {
        const pushPt = this.getTrailPointAhead(sx, sz, 11);
        sx = pushPt.x;
        sz = pushPt.z;
      }
      let gy = this.getGroundHeight(sx, sz);
      if (gy < -100) gy = this.getNearestTrailInfo(sx, sz).y;
      slot.mesh.position.set(sx, gy, sz);
      slot.originX = sx;
      slot.originZ = sz;
      slot.dirX = pt.tx;
      slot.dirZ = pt.tz;
      slot.patrolDir = 1;
      slot.vy = 6.5 + i * 0.6;
      slot.age = 0;
      slot.maxAge = maxAge;
      slot.active = true;
      slot.mesh.visible = true;
    }
  }

  // --- DISASTER: KEMUNCULAN BRAINROT (POOLED SIZE 4: SKIBIDI TOILET + KEPALA SIGMA/SAHUR, 6s) ---
  public spawnBrainrotWave(playerX: number, playerZ: number, maxAge = 6.0) {
    const offsets = [8, 13, 18, 24];
    const laterals = [-1.8, 1.8, -1.4, 1.6];
    this.brainrotShakeTimer = Math.max(this.brainrotShakeTimer, maxAge);
    for (let i = 0; i < this.brainrots.length; i++) {
      const slot = this.brainrots[i];
      if (!slot) break;
      const distAhead = offsets[i] ?? 8 + i * 5;
      const pt = this.getTrailPointAhead(playerX, playerZ, distAhead);
      const lat = laterals[i] ?? 0;
      let sx = pt.x - pt.tz * lat;
      let sz = pt.z + pt.tx * lat;
      if (this.getGroundHeight(sx, sz) < -100) {
        sx = pt.x;
        sz = pt.z;
      }
      if (this.isInsideAnyCheckpointSafeZone(sx, sz)) {
        const pushPt = this.getTrailPointAhead(sx, sz, 11);
        sx = pushPt.x;
        sz = pushPt.z;
      }
      let gy = this.getGroundHeight(sx, sz);
      if (gy < -100) gy = this.getNearestTrailInfo(sx, sz).y;
      slot.mesh.position.set(sx, gy, sz);
      slot.originX = sx;
      slot.originZ = sz;
      slot.dirX = -pt.tz;
      slot.dirZ = pt.tx;
      slot.patrolDir = i % 2 === 0 ? 1 : -1;
      slot.vy = 5.2 + i * 0.4;
      slot.age = 0;
      slot.maxAge = maxAge;
      slot.active = true;
      slot.mesh.visible = true;
    }
  }

  // --- CONTEXTUAL DISASTER: MONSTER SALJU / YETI (POOLED SIZE 3, KNOCKBACK) ---
  public spawnYetiHorde(playerX: number, playerZ: number, count = 3, maxAge = 7.0) {
    const targetCount = Math.min(3, Math.max(1, Math.round(count)));
    const offsets = [9, 16, 23];
    const laterals = [-1.6, 1.5, -0.5];
    for (let i = 0; i < targetCount; i++) {
      const slot = this.yetis[i];
      if (!slot) break;
      const distAhead = offsets[i] ?? 9 + i * 7;
      const pt = this.getTrailPointAhead(playerX, playerZ, distAhead);
      const lat = laterals[i] ?? 0;
      let sx = pt.x - pt.tz * lat;
      let sz = pt.z + pt.tx * lat;
      if (this.getGroundHeight(sx, sz) < -100) {
        sx = pt.x;
        sz = pt.z;
      }
      if (this.isInsideAnyCheckpointSafeZone(sx, sz)) {
        const pushPt = this.getTrailPointAhead(sx, sz, 11);
        sx = pushPt.x;
        sz = pushPt.z;
      }
      let gy = this.getGroundHeight(sx, sz);
      if (gy < -100) gy = this.getNearestTrailInfo(sx, sz).y;
      slot.mesh.position.set(sx, gy, sz);
      slot.originX = sx;
      slot.originZ = sz;
      slot.dirX = -pt.tz;
      slot.dirZ = pt.tx;
      slot.patrolDir = i % 2 === 0 ? 1 : -1;
      slot.age = 0;
      slot.maxAge = maxAge;
      slot.active = true;
      slot.mesh.visible = true;
    }
  }

  // --- DISASTER: HUJAN ES (POOLED, MAX 50 PARTICLES, 5s DURATION) ---
  public spawnIceHailAhead(playerX: number, playerZ: number, count = 50, maxAge = 5.0) {
    const targetCount = Math.min(50, Math.max(1, Math.round(count)));
    for (let i = 0; i < targetCount; i++) {
      const slot = this.iceHails[i];
      if (!slot) break;
      const ahead = this.getTrailPointAhead(playerX, playerZ, -8 + Math.random() * 34);
      const sx = ahead.x + (Math.random() - 0.5) * 18;
      const sz = ahead.z + (Math.random() - 0.5) * 18;
      const baseGy = this.getGroundHeight(sx, sz);
      const sy = (baseGy > -100 ? baseGy : ahead.y) + 14 + Math.random() * 24 + (i % 5) * 2.5;

      slot.mesh.scale.setScalar(0.8 + Math.random() * 0.65);
      slot.mesh.position.set(sx, sy, sz);
      slot.vx = (Math.random() - 0.5) * 3.2;
      slot.vy = -(20 + Math.random() * 8);
      slot.vz = (Math.random() - 0.5) * 3.2;
      slot.age = 0;
      slot.maxAge = maxAge;
      slot.anchorX = playerX;
      slot.anchorZ = playerZ;
      slot.active = true;
      slot.mesh.visible = true;
    }
  }

  // --- DISASTER: HUJAN API (POOLED, MAX 50 PARTICLES, 5s DURATION) ---
  public spawnFireRainAhead(playerX: number, playerZ: number, count = 50, maxAge = 5.0) {
    const targetCount = Math.min(50, Math.max(1, Math.round(count)));
    for (let i = 0; i < targetCount; i++) {
      const slot = this.fireRains[i];
      if (!slot) break;
      const ahead = this.getTrailPointAhead(playerX, playerZ, -6 + Math.random() * 34);
      const sx = ahead.x + (Math.random() - 0.5) * 16;
      const sz = ahead.z + (Math.random() - 0.5) * 16;
      const baseGy = this.getGroundHeight(sx, sz);
      const groundY = baseGy > -100 ? baseGy : ahead.y;
      const sy = groundY + 16 + Math.random() * 26 + (i % 5) * 2.8;

      slot.mesh.geometry = this.fireRainGeo;
      slot.mesh.material = this.fireRainMat;
      slot.mesh.scale.setScalar(0.8 + Math.random() * 0.6);
      slot.mesh.position.set(sx, sy, sz);
      slot.vx = (Math.random() - 0.5) * 2.6;
      slot.vy = -(22 + Math.random() * 8);
      slot.vz = (Math.random() - 0.5) * 2.6;
      slot.impacted = false;
      slot.sparkTimer = 0.45;
      slot.groundY = groundY;
      slot.age = 0;
      slot.maxAge = maxAge;
      slot.anchorX = playerX;
      slot.anchorZ = playerZ;
      slot.active = true;
      slot.mesh.visible = true;
    }
  }

  // --- LANDSLIDE BOULDERS & ROLLING LOGS (POOLED, ZERO GC) ---
  public spawnLandslideAhead(
    playerX: number,
    playerZ: number,
    modeOrCount: 'rock' | 'ice' | 'lava' | number = 'rock',
    forcedCount?: number,
  ) {
    const mode: 'rock' | 'ice' | 'lava' =
      typeof modeOrCount === 'string' ? modeOrCount : this.selectedMap === 'salju' ? 'ice' : this.selectedMap === 'lava' ? 'lava' : 'rock';
    const explicitCount = typeof modeOrCount === 'number' ? modeOrCount : forcedCount;

    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const minC = lvl.landslideCountMin;
    const maxC = lvl.landslideCountMax;
    const desired =
      explicitCount !== undefined
        ? explicitCount
        : minC + Math.floor(Math.random() * (maxC - minC + 1));
    const count = Math.min(this.boulders.length, desired);

    const bGeo = mode === 'ice' ? this.iceBoulderGeo : this.rockGeo;
    const bMat = mode === 'ice' ? this.iceBoulderMat : mode === 'lava' ? this.magmaBoulderMat : this.rockMat;

    let spawned = 0;
    for (let i = 0; i < this.boulders.length && spawned < count; i++) {
      const slot = this.boulders[i];
      if (slot.active) continue;
      const ahead = this.getTrailPointAhead(playerX, playerZ, 12 + Math.random() * 16);
      let sx = ahead.x + (Math.random() - 0.5) * 4.5;
      let sz = ahead.z + (Math.random() - 0.5) * 4.5;
      let trailY = this.getGroundHeight(sx, sz);
      if (trailY < -100) {
        sx = ahead.x;
        sz = ahead.z;
        trailY = this.getNearestTrailInfo(sx, sz).y;
      }
      const sy = trailY + 8 + Math.random() * 12 + (spawned % 4) * 2.0;

      const scale = mode === 'ice' ? 0.95 + Math.random() * 0.55 : 0.72 + Math.random() * 0.58;
      slot.mesh.geometry = bGeo;
      slot.mesh.material = bMat;
      slot.mesh.scale.setScalar(scale);
      slot.mesh.position.set(sx, sy, sz);
      slot.mesh.visible = true;

      const dx = playerX - sx;
      const dz = playerZ - sz;
      const len = Math.hypot(dx, dz) || 1;
      const speed = (10.5 + Math.random() * 4.5) * lvl.speedMult;

      slot.active = true;
      slot.vx = (dx / len) * speed;
      slot.vy = -1.5 - Math.random() * 3.0;
      slot.vz = (dz / len) * speed;
      slot.rotSpeed = 4.5 * lvl.speedMult;
      slot.radius = 1.15 * scale;
      slot.age = 0;
      slot.maxAge = 7.0;
      spawned++;
    }

    this.landslideShakeTimer = Math.max(this.landslideShakeTimer, 1.5);

    if (mode === 'rock') {
      const logAhead = this.getTrailPointAhead(playerX, playerZ, 18 + Math.random() * 8);
      const logCount = this.difficultyLevel >= 7 ? 2 : this.difficultyLevel >= 3 ? 1 : 0;
      let spawnedLogs = 0;
      for (let i = 0; i < this.rollingLogs.length && spawnedLogs < logCount; i++) {
        const slot = this.rollingLogs[i];
        if (slot.active) continue;
        const baseLogY = this.getGroundHeight(logAhead.x, logAhead.z);
        const sy = (baseLogY > -100 ? baseLogY : logAhead.y) + 2.2 + spawnedLogs * 1.3;
        slot.mesh.position.set(logAhead.x, sy, logAhead.z);
        slot.mesh.rotation.y = Math.atan2(-logAhead.tx, -logAhead.tz);
        slot.mesh.visible = true;
        const speed = 10.5 * lvl.speedMult;
        slot.active = true;
        slot.vx = -logAhead.tx * speed;
        slot.vy = 0;
        slot.vz = -logAhead.tz * speed;
        slot.radius = 0.64;
        slot.age = 0;
        slot.maxAge = 7.0;
        spawnedLogs++;
      }
    }
  }

  // --- CONTEXTUAL DISASTER: HUJAN LAVA (POOLED SIZE 14, RED WARNING RINGS) ---
  public spawnLavaRainAhead(playerX: number, playerZ: number, maxAge = 7.0) {
    let spawned = 0;
    for (let i = 0; i < this.lavaRainPool.length && spawned < 12; i++) {
      const lr = this.lavaRainPool[i];
      let ahead = this.getTrailPointAhead(playerX, playerZ, 8 + spawned * 3.2 + Math.random() * 4);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) {
        ahead = this.getTrailPointAhead(playerX, playerZ, 22 + spawned * 4);
        if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
      }
      let mx = ahead.x + (Math.random() - 0.5) * 4.0;
      let mz = ahead.z + (Math.random() - 0.5) * 4.0;
      let gy = this.getGroundHeight(mx, mz);
      if (gy < -100) {
        mx = ahead.x;
        mz = ahead.z;
        gy = this.getNearestTrailInfo(mx, mz).y;
      }

      lr.x = mx;
      lr.z = mz;
      lr.groundY = gy;
      lr.ring.position.set(mx, gy + 0.2, mz);
      lr.ring.scale.setScalar(0.75);
      lr.ring.visible = true;

      lr.shockwave.position.set(mx, gy + 0.35, mz);
      lr.shockwave.scale.setScalar(1.0);
      lr.shockwave.visible = false;

      lr.boulder.position.set(mx + 10, gy + 72, mz + 8);
      lr.boulder.scale.setScalar(0.85);
      lr.boulder.visible = true;

      lr.timer = 1.0 + spawned * 0.42;
      lr.age = 0;
      lr.maxAge = maxAge;
      lr.impacted = false;
      lr.active = true;
      spawned++;
    }
  }

  // --- CONTEXTUAL DISASTER: BANJIR BANDANG (CLEAR BLUE RIVER) & BANJIR LAVA (RISING PRE-ALLOCATED PLANE) ---
  public triggerFloodDisaster(
    kind: 'flash_flood' | 'lava_flood',
    playerY: number,
    durationSec = 7.0,
    centerX = 0,
    centerZ = 0,
  ) {
    this.floodKind = kind;
    this.floodActive = true;
    this.floodMaxDuration = durationSec;
    this.floodTimer = durationSec;
    this.floodBaseY = Math.max(0.15, playerY - 7.5);
    this.floodPeakY = Math.max(3.6, playerY + 0.85);
    this.floodCurrentY = this.floodBaseY;
    if (kind === 'lava_flood') {
      this.floodMat.color.set('#ea580c');
      this.floodMat.map = null;
      this.floodMat.opacity = 0.78;
    } else {
      this.floodMat.color.set('#1D9BF0');
      this.floodMat.map = this.floodWaterTex;
      this.floodMat.opacity = 0.72;
    }
    this.floodMat.needsUpdate = true;
    this.floodPlaneMesh.position.set(centerX, this.floodCurrentY, centerZ);
    this.floodPlaneMesh.visible = true;
  }

  // --- STORM LIGHTNING STRIKES AHEAD (5s MAX, SHARED GEO/MAT) ---
  public triggerThunderStorm(playerX: number, playerZ: number, durationSec = 5.0) {
    this.thunderStormTimer = durationSec;
    this.thunderNextStrikeIn = 1.4;
    this.spawnLightningStrikeAhead(playerX, playerZ);
  }

  public spawnLightningStrikeAhead(playerX: number, playerZ: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const count = Math.min(4, Math.max(2, lvl.lightningCount));
    for (let i = 0; i < count && this.lightningStrikes.length < 10; i++) {
      const ahead = this.getTrailPointAhead(playerX, playerZ, 10 + i * 5.5 + Math.random() * 4);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
      let gy = this.getGroundHeight(ahead.x, ahead.z);
      if (gy < -100) gy = this.getNearestTrailInfo(ahead.x, ahead.z).y;

      const ring = new THREE.Mesh(this.lightningRingGeo, this.lightningRingMat);
      ring.position.set(ahead.x, gy + 0.16, ahead.z);

      const bolt = new THREE.Mesh(this.lightningBoltGeo, this.lightningBoltMat);
      bolt.position.set(ahead.x, gy + 23, ahead.z);
      bolt.visible = false;

      this.scene.add(ring, bolt);
      this.lightningStrikes.push({
        x: ahead.x,
        z: ahead.z,
        y: gy,
        ring,
        bolt,
        timer: 0.85 + i * 0.22,
        struck: false,
      });
    }
  }

  // --- EARTHQUAKE DISASTER (EXACT 5s DURATION) ---
  public triggerEarthquake(_playerX?: number, _playerZ?: number, durationSec = 5.0) {
    this.earthquakeTimer = Math.max(this.earthquakeTimer, durationSec);
  }

  // --- WILDFIRE DISASTER ---
  public triggerWildfire(playerX: number, playerZ: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const clusters = Math.min(4, Math.max(1, lvl.wildfireClusters));
    const flameMat = new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.9 });
    const coreMat = new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.92 });
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#334155', transparent: true, opacity: 0.45 });

    for (let i = 0; i < clusters && this.wildfires.length < 10; i++) {
      const ahead = this.getTrailPointAhead(playerX, playerZ, 12 + i * 6 + Math.random() * 4);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
      let fx = ahead.x + (Math.random() - 0.5) * 3.0;
      let fz = ahead.z + (Math.random() - 0.5) * 3.0;
      let fy = this.getGroundHeight(fx, fz);
      if (fy < -100) {
        fx = ahead.x;
        fz = ahead.z;
        fy = this.getNearestTrailInfo(fx, fz).y;
      }

      const group = new THREE.Group();
      group.position.set(fx, fy, fz);
      const flames: THREE.Mesh[] = [];
      const smokes: THREE.Mesh[] = [];

      for (let f = 0; f < 5; f++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.55 - f * 0.05, 2.0 + (f % 2) * 0.6, 7),
          f % 2 === 0 ? flameMat : coreMat,
        );
        cone.position.set((Math.random() - 0.5) * 1.4, 1.0, (Math.random() - 0.5) * 1.4);
        group.add(cone);
        flames.push(cone);
      }

      for (let s = 0; s < 3; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7 + s * 0.14, 7, 7), smokeMat);
        puff.position.set((Math.random() - 0.5) * 1.1, 2.6 + s * 1.0, (Math.random() - 0.5) * 1.1);
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
        maxAge: 5.0,
      });
    }
  }

  // --- KIAMAT METEOR SHOWER AHEAD (SHARED GEO/MAT, MAX 5s DURATION) ---
  public spawnMeteorAhead(playerX: number, playerZ: number, maxAge = 5.0) {
    const count = 4;
    for (let i = 0; i < count && this.meteors.length < 10; i++) {
      let ahead = this.getTrailPointAhead(playerX, playerZ, 12 + i * 7 + Math.random() * 5);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) {
        ahead = this.getTrailPointAhead(playerX, playerZ, 24 + i * 8);
        if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
      }
      let mx = ahead.x + (Math.random() - 0.5) * 3.5;
      let mz = ahead.z + (Math.random() - 0.5) * 3.5;
      let gy = this.getGroundHeight(mx, mz);
      if (gy < -100) {
        mx = ahead.x;
        mz = ahead.z;
        gy = this.getNearestTrailInfo(mx, mz).y;
      }

      const ring = new THREE.Mesh(this.meteorRingGeo, this.meteorRingMat);
      ring.position.set(mx, gy + 0.2, mz);

      const shockwave = new THREE.Mesh(this.meteorShockGeo, this.meteorShockMat);
      shockwave.position.set(mx, gy + 0.35, mz);
      shockwave.visible = false;

      const boulder = new THREE.Mesh(this.meteorGeo, this.meteorMat);
      boulder.position.set(mx + 14, gy + 85, mz + 10);
      boulder.scale.setScalar(1.2);

      this.scene.add(ring, shockwave, boulder);
      this.meteors.push({
        x: mx,
        z: mz,
        groundY: gy,
        boulder,
        ring,
        shockwave,
        timer: 1.2 + i * 0.28,
        age: 0,
        maxAge,
        impacted: false,
      });
    }
  }

  public handleLadderMovement(
    _pos: THREE.Vector3,
    _forwardInput: number,
    _dt: number,
  ): { climbing: boolean; exitedTop: boolean } {
    return { climbing: false, exitedTop: false };
  }

  public handleSlideMovement(
    _pos: THREE.Vector3,
    _dt: number,
    _soundEngine?: SoundEngine,
  ): { sliding: boolean; yaw: number } {
    return { sliding: false, yaw: 0 };
  }

  // --- WIND ZONE & SNOWSTORM BLIZZARD PUSH (STUDENTS ONLY) ---
  public applyWindPush(pos: THREE.Vector3, dt: number, isPaused: boolean): boolean {
    if (isPaused) return false;
    let pushed = false;
    if (this.snowstormTimer > 0) {
      pos.x += 2.8 * dt;
      pos.z += 0.9 * dt;
      pushed = true;
    }
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const windStrength = 3.2 + lvl.speedMult * 1.4;
    for (const wz of this.windZones) {
      if (Math.hypot(pos.x - wz.x, pos.z - wz.z) < wz.radius) {
        pos.x += wz.dirX * windStrength * dt;
        pos.z += wz.dirZ * windStrength * dt;
        return true;
      }
    }
    return pushed;
  }

  public isInsideAnyCheckpointSafeZone(x: number, z: number): boolean {
    const stages = this.activeStages;
    for (let i = 0; i < 26; i++) {
      const cp = stages[i];
      if (Math.hypot(x - cp.x, z - cp.z) <= CP_SAFE_RADIUS) return true;
    }
    const se = stages[26];
    if (Math.hypot(x - se.x, z - se.z) <= CP_SAFE_RADIUS + 2.5) {
      return true;
    }
    return false;
  }

  public updateCpGatesForRole(role: Role, currentCP: number, completedCPs: number[]) {
    this.lastGateRole = role;
    this.lastGateCp = currentCP;
    this.lastGateCompleted = completedCPs;
    for (const g of this.cpGates) {
      if (role === 'teacher') {
        g.group.visible = false;
      } else {
        const unlocked = completedCPs.includes(g.index) || (g.index < 25 && currentCP >= g.index);
        g.group.visible = !unlocked;
      }
    }
    this.updateCpBeacons(role, currentCP, completedCPs);
  }

  public updateCpBeacons(role: Role, currentCP: number, completedCPs: number[]) {
    for (const b of this.cpBeacons) {
      if (b.index <= 0 || b.index > 25) continue;
      const reached =
        role === 'teacher' ||
        currentCP >= b.index ||
        completedCPs.includes(b.index);
      if (b.flameGroup) {
        b.flameGroup.visible = reached;
      }
      if (b.emberMat) {
        b.emberMat.emissiveIntensity = reached ? 1.6 : 0.15;
      }
      const ringMat = b.ring.material as THREE.MeshBasicMaterial;
      if (reached) {
        ringMat.color.set('#22c55e');
        ringMat.opacity = 0.72;
      } else {
        ringMat.color.set(b.index === 25 ? '#f59e0b' : '#38bdf8');
        ringMat.opacity = 0.62;
      }
    }
  }

  public enforceStudentTrailAndGates(
    pos: THREE.Vector3,
    currentCP: number,
    completedCPs: number[],
  ): { blockedByGateCp: number | null; skippedAheadCp: number | null } {
    const stages = this.activeStages;
    // 1. Sequential CP anti-cheat validation
    for (let c = currentCP + 2; c <= 25; c++) {
      const cp = stages[c];
      if (Math.hypot(pos.x - cp.x, pos.z - cp.z) < 9.5 && Math.abs(pos.y - cp.y) < 10) {
        return { blockedByGateCp: null, skippedAheadCp: c };
      }
    }
    if (!completedCPs.includes(25)) {
      const se = stages[26];
      if (
        Math.hypot(pos.x - se.x, pos.z - se.z) < 11.5 &&
        Math.abs(pos.y - se.y) < 12
      ) {
        return { blockedByGateCp: null, skippedAheadCp: 26 };
      }
    }

    // 2. CP Energy Barrier Gate positioned cleanly across the outgoing bridge mouth
    let blockedByGateCp: number | null = null;
    const targetCpIdx = currentCP < 25 ? currentCP + 1 : 25;
    if (targetCpIdx <= 25 && !completedCPs.includes(targetCpIdx)) {
      const gateCp = stages[targetCpIdx];
      const nextCp = stages[targetCpIdx + 1];
      const gdx = nextCp.x - gateCp.x;
      const gdz = nextCp.z - gateCp.z;
      const gLen = Math.hypot(gdx, gdz) || 1;
      const ux = gdx / gLen;
      const uz = gdz / gLen;
      const gateDist = gateCp.rTop - 2.6;
      const dx = pos.x - gateCp.x;
      const dz = pos.z - gateCp.z;
      const projPast = dx * ux + dz * uz;
      const perp = Math.abs(-dx * uz + dz * ux);
      const perpLimit = 9.6;
      if (perp < perpLimit && Math.abs(pos.y - gateCp.y) < 5.0 && projPast > gateDist && projPast < gateDist + 8.0) {
        const pushBack = projPast - gateDist;
        pos.x -= ux * pushBack;
        pos.z -= uz * pushBack;
        blockedByGateCp = targetCpIdx;
      }
    }

    // Outer bounds clamp (open chasms remain drop-through so cliff falls respawn cleanly)
    pos.x = clamp(pos.x, -2200, 2200);
    pos.z = clamp(pos.z, -2200, 2200);

    return { blockedByGateCp, skippedAheadCp: null };
  }

  public applySlipperySlopeAndPerimeter(_pos: THREE.Vector3, _dt: number, _role: Role): boolean {
    return false;
  }

  public resolveHorizontalCollisions(
    pos: THREE.Vector3,
    radius: number,
    role: Role,
    currentCP: number,
    completedCPs: number[],
  ) {
    const cs = this.colliderCellSize;
    const minCx = Math.floor((pos.x - radius - 4) / cs);
    const maxCx = Math.floor((pos.x + radius + 4) / cs);
    const minCz = Math.floor((pos.z - radius - 4) / cs);
    const maxCz = Math.floor((pos.z + radius + 4) / cs);
    const checked = this.tmpColliderSet;
    checked.clear();

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const bucket = this.colliderGrid.get(this.colliderCellKey(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const col = bucket[i];
          if (checked.has(col)) continue;
          checked.add(col);

          if (col.gateIndex !== undefined) {
            if (role === 'teacher') continue;
            const unlocked =
              completedCPs.includes(col.gateIndex) || (col.gateIndex < 25 && currentCP >= col.gateIndex);
            if (unlocked) continue;
          }

          if (col.kind === 'frustum') {
            if (pos.y + 0.5 >= col.maxY || pos.y + 2.2 <= col.minY) continue;
            const tH = clamp((pos.y - col.minY) / Math.max(0.01, col.maxY - col.minY), 0, 1);
            const rBot = col.rBottom ?? col.r;
            const rTop = col.rTop ?? col.r;
            const effectiveR = rBot + (rTop - rBot) * tH;
            const dx = pos.x - col.x;
            const dz = pos.z - col.z;
            const minDist = effectiveR + radius;
            const distSq = dx * dx + dz * dz;
            if (distSq < minDist * minDist) {
              if (distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const push = minDist - dist;
                pos.x += (dx / dist) * push;
                pos.z += (dz / dist) * push;
              } else {
                pos.x += minDist;
              }
            }
            continue;
          }

          if (pos.y >= col.maxY - 0.24 || pos.y + 2.2 <= col.minY) continue;

          if (col.kind === 'circle') {
            const dx = pos.x - col.x;
            const dz = pos.z - col.z;
            const minDist = col.r + radius;
            const distSq = dx * dx + dz * dz;
            if (distSq < minDist * minDist) {
              if (distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const push = minDist - dist;
                pos.x += (dx / dist) * push;
                pos.z += (dz / dist) * push;
              } else {
                pos.x += minDist;
              }
            }
          } else {
            const halfW = col.halfW ?? 1;
            const halfD = col.halfD ?? 1;
            const cosY = col.cosY ?? 1;
            const sinY = col.sinY ?? 0;
            const dx = pos.x - col.x;
            const dz = pos.z - col.z;
            const lx = dx * cosY - dz * sinY;
            const lz = dx * sinY + dz * cosY;

            const qx = clamp(lx, -halfW, halfW);
            const qz = clamp(lz, -halfD, halfD);
            const vx = lx - qx;
            const vz = lz - qz;
            const distSq = vx * vx + vz * vz;

            if (distSq < radius * radius) {
              let pushLx = 0;
              let pushLz = 0;
              if (distSq > 1e-6) {
                const dist = Math.sqrt(distSq);
                const overlap = radius - dist;
                pushLx = (vx / dist) * overlap;
                pushLz = (vz / dist) * overlap;
              } else {
                const penX = halfW - Math.abs(lx) + radius;
                const penZ = halfD - Math.abs(lz) + radius;
                if (penX < penZ) {
                  pushLx = lx >= 0 ? penX : -penX;
                } else {
                  pushLz = lz >= 0 ? penZ : -penZ;
                }
              }
              pos.x += pushLx * cosY + pushLz * sinY;
              pos.z += -pushLx * sinY + pushLz * cosY;
            }
          }
        }
      }
    }
  }

  private isCameraPointObstructed(px: number, py: number, pz: number, targetY: number): boolean {
    if (this.activeLayout.groundedBase && py < 0.78) {
      return true;
    }
    const islandTop = this.getIslandSurfaceHeightAt(px, pz, targetY + 4.0);
    if (islandTop !== null && py < islandTop + 0.45 && targetY >= islandTop - 0.5) {
      return true;
    }

    const cs = this.colliderCellSize;
    const cx = Math.floor(px / cs);
    const cz = Math.floor(pz / cs);
    const checked = this.tmpCamColliderSet;
    checked.clear();

    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const bucket = this.colliderGrid.get(this.colliderCellKey(cx + ox, cz + oz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const col = bucket[i];
          if (checked.has(col)) continue;
          checked.add(col);
          if (col.gateIndex !== undefined) continue;
          if (col.kind === 'circle' && col.r < 1.1) continue;
          if (col.kind === 'box' && (col.halfW ?? 1) < 0.8) continue;
          if (py < col.minY - 0.35 || py > col.maxY + 0.35) continue;

          if (col.kind === 'frustum') {
            const tH = clamp((py - col.minY) / Math.max(0.01, col.maxY - col.minY), 0, 1);
            const rBot = col.rBottom ?? col.r;
            const rTop = col.rTop ?? col.r;
            const effR = rBot + (rTop - rBot) * tH + 0.55;
            const dx = px - col.x;
            const dz = pz - col.z;
            if (dx * dx + dz * dz < effR * effR) return true;
          } else if (col.kind === 'circle') {
            const effR = col.r + 0.5;
            const dx = px - col.x;
            const dz = pz - col.z;
            if (dx * dx + dz * dz < effR * effR) return true;
          } else {
            const halfW = (col.halfW ?? 1) + 0.5;
            const halfD = (col.halfD ?? 1) + 0.5;
            const cosY = col.cosY ?? 1;
            const sinY = col.sinY ?? 0;
            const dx = px - col.x;
            const dz = pz - col.z;
            const lx = dx * cosY - dz * sinY;
            const lz = dx * sinY + dz * cosY;
            if (Math.abs(lx) <= halfW && Math.abs(lz) <= halfD) return true;
          }
        }
      }
    }
    return false;
  }

  public resolveCameraCollision(
    target: THREE.Vector3,
    desiredPos: THREE.Vector3,
    minDist = 2.2,
  ): void {
    if (this.activeLayout.groundedBase && desiredPos.y < 0.85) {
      desiredPos.y = 0.85;
    }
    const dx = desiredPos.x - target.x;
    const dy = desiredPos.y - target.y;
    const dz = desiredPos.z - target.z;
    const totalDist = Math.hypot(dx, dy, dz);
    if (totalDist <= minDist + 0.05) return;

    const minFrac = Math.min(1, minDist / totalDist);
    let prevSafeFrac = minFrac;
    const steps = 10;

    for (let s = 1; s <= steps; s++) {
      const frac = s / steps;
      if (frac <= minFrac) {
        prevSafeFrac = minFrac;
        continue;
      }
      const px = target.x + dx * frac;
      const py = target.y + dy * frac;
      const pz = target.z + dz * frac;
      if (this.isCameraPointObstructed(px, py, pz, target.y)) {
        let lo = prevSafeFrac;
        let hi = frac;
        for (let b = 0; b < 4; b++) {
          const mid = (lo + hi) * 0.5;
          if (
            this.isCameraPointObstructed(
              target.x + dx * mid,
              target.y + dy * mid,
              target.z + dz * mid,
              target.y,
            )
          ) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        const safeDist = Math.max(minDist, totalDist * lo);
        const scale = safeDist / totalDist;
        desiredPos.set(target.x + dx * scale, target.y + dy * scale, target.z + dz * scale);
        if (this.activeLayout.groundedBase && desiredPos.y < 0.85) {
          desiredPos.y = 0.85;
        }
        return;
      }
      prevSafeFrac = frac;
    }
  }

  public getSurfaceTypeAt(x: number, z: number): 'dirt' | 'stone' | 'wood' {
    if (this.getBridgeHeightAt(x, z) !== null) return 'wood';
    for (let i = 0; i < this.activeStages.length; i++) {
      const st = this.activeStages[i];
      const rad = i === 26 ? 10.5 : 6.8;
      if (Math.hypot(x - st.x, z - st.z) <= rad) {
        return 'stone';
      }
    }
    return 'dirt';
  }

  public getRiverProximity(_x: number, _z: number): number {
    return 0;
  }

  public collectRadarData(
    playerPos: THREE.Vector3,
    camYaw: number,
    nextCpIndex: number,
  ): { targetBlip: { relX: number; relY: number }; nearbyBlips: RadarBlip[] } {
    const target =
      nextCpIndex >= 26
        ? this.getSummitPoint()
        : this.getCpPoint(nextCpIndex);
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
      if (Math.hypot(pos.x - playerPos.x, pos.z - playerPos.z) > 480) continue;
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
    skipHazards = false,
  ): {
    hitBy: HazardHitType | null;
    hitIceHail: boolean;
    shakeIntensity: number;
    pushImpulse?: { x: number; z: number };
  } {
    this.currentElapsed = elapsed;
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
    this.envCurrent.hemiSkyColor.lerp(this.envTarget.hemiSkyColor, envAlpha);
    this.envCurrent.hemiGroundColor.lerp(this.envTarget.hemiGroundColor, envAlpha);
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
      if (c.group.position.x > 820) c.group.position.x = -820;
    }

    for (const b of this.birds) {
      b.angle += b.speed * dt;
      b.flapPhase += dt * 7.5;
      const nx = b.centerX + Math.cos(b.angle) * b.radius;
      const nz = b.centerZ + Math.sin(b.angle) * b.radius;
      b.group.position.set(nx, b.baseY + Math.sin(b.angle * 2) * 5.0, nz);
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
      const isBlizzard = this.snowstormTimer > 0 || this.tempWeatherOverride === 'snowstorm';
      const driftX = isBlizzard ? 26 * dt : 0;
      const driftZ = isBlizzard ? 11 * dt : 0;
      const fallY = (isBlizzard ? 24 : 12) * dt;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += Math.sin(elapsed * 1.4 + i) * 2.4 * dt + driftX;
        arr[i + 1] -= fallY;
        arr[i + 2] += driftZ;
        if (arr[i] > 45) arr[i] -= 90;
        if (arr[i] < -45) arr[i] += 90;
        if (arr[i + 2] > 45) arr[i + 2] -= 90;
        if (arr[i + 2] < -45) arr[i + 2] += 90;
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
      if (b.flameGroup && b.flameGroup.visible) {
        const flicker = 0.88 + Math.sin(elapsed * 14 + b.index * 1.9) * 0.16;
        b.flameGroup.scale.set(1, flicker, 1);
        b.flameGroup.rotation.y += dt * 2.5;
      }
    }

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

    const swayMult = this.difficultyLevel >= 4 ? 0.18 + (this.difficultyLevel - 4) * 0.035 : 0.04;
    for (const sp of this.swayPlanks) {
      const tilt = Math.sin(elapsed * 3.2 + sp.phase) * swayMult;
      sp.mesh.rotation.z = tilt;
      sp.mesh.position.y = sp.baseY + Math.sin(elapsed * 4.5 + sp.phase) * (swayMult * 0.35);
    }

    // Moving bridge deck segments (cyber_neon >= 12, all maps Tier 3 >= 17, < 60 units active window)
    for (let i = 0; i < this.bridgeSpans.length; i++) {
      const bs = this.bridgeSpans[i];
      if (bs.movingPlanks.length === 0) continue;
      const midX = (bs.startX + bs.endX) * 0.5;
      const midZ = (bs.startZ + bs.endZ) * 0.5;
      const dxm = playerPos.x - midX;
      const dzm = playerPos.z - midZ;
      if (dxm * dxm + dzm * dzm > 3600) continue;
      for (const mp of bs.movingPlanks) {
        const dy = mp.isLateral ? 0 : Math.sin(elapsed * 2.1 + mp.phase) * mp.ampY;
        const lat = mp.isLateral ? Math.sin(elapsed * 1.85 + mp.phase) * mp.ampLat : 0;
        for (let k = 0; k < mp.meshes.length; k++) {
          mp.meshes[k].position.x = mp.laneX + lat;
          mp.meshes[k].position.y = mp.baseYs[k] + dy;
        }
      }
    }

    for (let i = 0; i < this.obbyMovingPlanks.length; i++) {
      const op = this.obbyMovingPlanks[i];
      if (!op.mesh) continue;
      op.mesh.position.x =
        op.baseLocalX + Math.sin(elapsed * op.moveSpeed + op.phase) * op.moveAmpLat;
    }

    if (isPaused) return { hitBy: null, hitIceHail: false, shakeIntensity: 0 };

    if (this.snowstormTimer > 0) {
      this.snowstormTimer = Math.max(0, this.snowstormTimer - dt);
    }
    if (this.tempWeatherTimer > 0) {
      this.tempWeatherTimer = Math.max(0, this.tempWeatherTimer - dt);
      if (this.tempWeatherTimer === 0 && this.tempWeatherOverride) {
        this.tempWeatherOverride = null;
        this.applyEffectiveEnvironment(this.baseTimeOfDay, this.baseWeather, false);
      }
    }

    if (this.thunderStormTimer > 0) {
      this.thunderStormTimer = Math.max(0, this.thunderStormTimer - dt);
      this.thunderNextStrikeIn -= dt;
      if (this.thunderNextStrikeIn <= 0 && this.thunderStormTimer > 0.8) {
        this.thunderNextStrikeIn = 1.65;
        this.spawnLightningStrikeAhead(playerPos.x, playerPos.z);
      }
      if (this.thunderStormTimer === 0) {
        for (const ls of this.lightningStrikes) {
          this.scene.remove(ls.ring, ls.bolt);
        }
        this.lightningStrikes.length = 0;
      }
    }

    this.earthquakeTimer = Math.max(0, this.earthquakeTimer - dt);
    this.landslideShakeTimer = Math.max(0, this.landslideShakeTimer - dt);
    this.meteorShakeTimer = Math.max(0, this.meteorShakeTimer - dt);
    this.brainrotShakeTimer = Math.max(0, this.brainrotShakeTimer - dt);
    const quakeShake = this.earthquakeTimer > 0 ? Math.min(0.95, 0.35 + this.difficultyLevel * 0.055) : 0;
    const landShake = this.landslideShakeTimer > 0 ? 0.22 : 0;
    const metShake = this.meteorShakeTimer > 0 ? 0.48 : 0;
    const brainShake = this.brainrotShakeTimer > 0 ? 0.18 : 0;
    const shakeIntensity = Math.max(quakeShake, landShake, metShake, brainShake);

    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    let hitBy: HazardHitType | null = null;
    let hitIceHail = false;
    const playerInSafeCP = this.isInsideAnyCheckpointSafeZone(playerPos.x, playerPos.z);

    // Meteor Impacts (5s max age)
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.age += dt;
      m.timer -= dt;
      if (m.age >= m.maxAge) {
        this.scene.remove(m.boulder, m.ring, m.shockwave);
        this.meteors.splice(i, 1);
        continue;
      }
      if (!m.impacted) {
        const frac = clamp(m.timer / 1.35, 0, 1);
        m.boulder.position.set(m.x + frac * 14, m.groundY + frac * 85 + 1.5, m.z + frac * 10);
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
          if (
            !playerInSafeCP &&
            Math.hypot(playerPos.x - m.x, playerPos.z - m.z) < 4.5 &&
            Math.abs(playerPos.y - m.groundY) < 6.0
          ) {
            hitBy = 'meteor';
          }
        }
      } else {
        const expand = 1 + (0.55 - m.timer) * 4.5;
        m.shockwave.scale.setScalar(expand);
        if (m.timer <= 0) {
          this.scene.remove(m.boulder, m.ring, m.shockwave);
          this.meteors.splice(i, 1);
        }
      }
    }

    // Collapsing Stepping Stones
    for (const cs of this.crumbleStones) {
      const dist = Math.hypot(playerPos.x - cs.x, playerPos.z - cs.z);
      const onTop = dist < 2.6 && Math.abs(playerPos.y - cs.baseY) < 1.8;
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
          cs.x + Math.sin(elapsed * 55) * 0.12,
          cs.baseY + Math.cos(elapsed * 48) * 0.07,
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
        if (!g.soundPlayed && distToP < 32) {
          soundEngine.playGeyserBlast();
          g.soundPlayed = true;
        }
        if (!playerInSafeCP && distToP < 1.95 && playerPos.y < g.baseY + 2.8) {
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
          if (
            !playerInSafeCP &&
            Math.hypot(playerPos.x - ls.x, playerPos.z - ls.z) < 2.65 &&
            Math.abs(playerPos.y - ls.y) < 4.5
          ) {
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

    // Tier 1/2/3 Bridge Dynamic Obstacles (< 60 units active radius)
    let pushImpulse: { x: number; z: number } | undefined;
    for (const bb of this.bridgeBoulders) {
      const dx = playerPos.x - bb.x;
      const dz = playerPos.z - bb.z;
      if (dx * dx + dz * dz > 3600) continue;
      if (!skipHazards && !playerInSafeCP) {
        const d = Math.hypot(dx, dz) || 1;
        if (d < bb.r + 0.42 && Math.abs(playerPos.y - bb.y) < 0.72) {
          hitBy = 'bridge_boulder';
          pushImpulse = { x: (dx / d) * 8.5, z: (dz / d) * 8.5 };
        }
      }
    }
    for (const pb of this.bridgePushBeams) {
      const dx = playerPos.x - pb.centerX;
      const dz = playerPos.z - pb.centerZ;
      if (dx * dx + dz * dz > 3600) continue;
      const prevOff = pb.curOffset;
      const nextOff = Math.sin(elapsed * pb.speed + pb.phase) * (pb.halfWidth - 0.55);
      pb.curOffset = nextOff;
      pb.mesh.position.x = pb.laneX + nextOff;
      if (!skipHazards && !playerInSafeCP) {
        const bx = pb.centerX + pb.perpX * nextOff;
        const bz = pb.centerZ + pb.perpZ * nextOff;
        const d = Math.hypot(playerPos.x - bx, playerPos.z - bz);
        if (d < 1.55 && playerPos.y < pb.centerY + 0.55 && playerPos.y + 1.8 > pb.centerY - 0.55) {
          hitBy = 'bridge_push';
          const swingDir = nextOff - prevOff >= 0 ? 1 : -1;
          pushImpulse = {
            x: pb.perpX * swingDir * 15.5,
            z: pb.perpZ * swingDir * 15.5,
          };
        }
      }
    }
    for (const brl of this.bridgeRollingLogs) {
      const dxm = playerPos.x - brl.midX;
      const dzm = playerPos.z - brl.midZ;
      const inRange = dxm * dxm + dzm * dzm <= 3600;
      brl.mesh.visible = inRange;
      if (!inRange) continue;
      brl.u -= brl.speed * dt;
      if (brl.u < 0.06) brl.u = 0.94;
      const bs = brl.bs;
      const len = Math.sqrt(bs.lenSq) || 1;
      const perpX = bs.dz / len;
      const perpZ = -bs.dx / len;
      const lx = bs.startX + bs.dx * brl.u + perpX * brl.latOffset;
      const lz = bs.startZ + bs.dz * brl.u + perpZ * brl.latOffset;
      const sagY = bs.sagAmp > 0 ? bs.sagAmp * Math.sin(brl.u * Math.PI) : 0;
      const ly = bs.startY + (bs.endY - bs.startY) * brl.u - sagY + brl.radius;
      brl.mesh.position.set(lx, ly, lz);
      brl.mesh.rotation.x += 6.5 * dt;
      if (!skipHazards && !playerInSafeCP) {
        const d = Math.hypot(playerPos.x - lx, playerPos.z - lz);
        if (d < 1.75 && Math.abs(playerPos.y + 0.6 - ly) < 1.25) {
          hitBy = 'log';
          pushImpulse = { x: (-bs.dx / len) * 14, z: (-bs.dz / len) * 14 };
        }
      }
    }

    // Rickety bridge planks at high difficulty (>=7)
    if (!skipHazards && !playerInSafeCP && this.difficultyLevel >= 7) {
      for (const sp of this.swayPlanks) {
        if (Math.hypot(playerPos.x - sp.worldX, playerPos.z - sp.worldZ) < 1.1) {
          const gy = this.getGroundHeight(sp.worldX, sp.worldZ);
          if (Math.abs(sp.mesh.rotation.z) > 0.3 && Math.abs(playerPos.y - gy) < 1.0) {
            hitBy = 'bridge_plank';
          }
        }
      }
    }

    // Update Interactive Mountain Wildlife (strictly bounded onto walkable islands/bridges, temporary 5s cleanup)
    for (let wi = this.wildlife.length - 1; wi >= 0; wi--) {
      const w = this.wildlife[wi];
      if (w.maxAge < Infinity) {
        w.age += dt;
        if (w.age >= w.maxAge) {
          this.scene.remove(w.mesh);
          this.wildlife.splice(wi, 1);
          continue;
        }
      }
      w.soundCooldown = Math.max(0, w.soundCooldown - dt);
      const dxToP = playerPos.x - w.mesh.position.x;
      const dzToP = playerPos.z - w.mesh.position.z;
      const distToP = Math.hypot(dxToP, dzToP) || 1;
      const aggroRange = (w.species === 'tiger' ? 16 : w.species === 'bear' ? 14 : 11) + this.difficultyLevel * 0.8;

      if (w.species === 'snake') {
        w.mesh.rotation.y = Math.atan2(dxToP, dzToP) + Math.PI;
        if (w.head) {
          w.head.position.z = -0.32 + Math.sin(elapsed * 5 + w.phase) * 0.12;
        }
        if (distToP < 10 && w.soundCooldown <= 0) {
          soundEngine.playSnakeHiss();
          w.soundCooldown = 5.5;
        }
        if (!playerInSafeCP && distToP < 1.55 && Math.abs(playerPos.y - w.mesh.position.y) < 1.8) {
          hitBy = 'snake';
        }
        continue;
      }

      let moveX = w.dirX * w.patrolSign;
      let moveZ = w.dirZ * w.patrolSign;
      let speed = (w.species === 'tiger' ? 5.2 : w.species === 'boar' ? 4.8 : 3.8) * lvl.speedMult;

      if (!playerInSafeCP && distToP < aggroRange && Math.abs(playerPos.y - w.mesh.position.y) < 4.0) {
        moveX = dxToP / distToP;
        moveZ = dzToP / distToP;
        speed *= 1.25;
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
      const candGy = this.getGroundHeight(nx, nz, w.mesh.position.y + 1.0);
      if (candGy > -100 && !this.isInsideAnyCheckpointSafeZone(nx, nz)) {
        w.mesh.position.x = nx;
        w.mesh.position.z = nz;
        w.mesh.position.y = candGy - 0.04;
      } else {
        w.patrolSign *= -1;
      }

      w.mesh.rotation.y = Math.atan2(moveX, moveZ) + Math.PI;
      const stride = Math.sin(elapsed * 9 * lvl.speedMult + w.phase) * 0.45;
      w.legs.forEach((leg, li) => {
        leg.rotation.x = li % 2 === 0 ? stride : -stride;
      });
      if (w.tail) {
        w.tail.rotation.y = Math.sin(elapsed * 6 + w.phase) * 0.45;
      }

      const hitRad = w.species === 'bear' ? 1.75 : 1.55;
      if (!playerInSafeCP && distToP < hitRad && Math.abs(playerPos.y - w.mesh.position.y) < 2.0) {
        hitBy = w.species;
      }
    }

    // Update Pooled Kuntilanak (smooth floating glide + eerie head-turn, 5s auto-hide)
    for (const k of this.kuntilanaks) {
      if (!k.active) continue;
      k.age += dt;
      if (k.age >= k.maxAge) {
        k.active = false;
        k.mesh.visible = false;
        continue;
      }

      const dx = playerPos.x - k.mesh.position.x;
      const dz = playerPos.z - k.mesh.position.z;
      const dist = Math.hypot(dx, dz) || 1;

      if (!playerInSafeCP && dist < 56) {
        const speed = 5.4 * lvl.speedMult;
        const perpX = -dz / dist;
        const perpZ = dx / dist;
        const zig = Math.sin(elapsed * 3.8 + k.phase) * 2.8;
        const nx = k.mesh.position.x + ((dx / dist) * speed + perpX * zig) * dt;
        const nz = k.mesh.position.z + ((dz / dist) * speed + perpZ * zig) * dt;
        if (!this.isInsideAnyCheckpointSafeZone(nx, nz)) {
          k.mesh.position.x = nx;
          k.mesh.position.z = nz;
        }
        k.mesh.lookAt(playerPos.x, k.mesh.position.y, playerPos.z);
        k.mesh.rotateY(Math.PI);
      }

      let gy = this.getGroundHeight(k.mesh.position.x, k.mesh.position.z);
      if (gy < -100) gy = this.getNearestTrailInfo(k.mesh.position.x, k.mesh.position.z).y;
      k.mesh.position.y = gy + 0.55 + Math.sin(elapsed * 3.2 + k.phase) * 0.25;
      k.head.rotation.y = Math.sin(elapsed * 2.1 + k.phase) * 0.42;
      k.head.rotation.z = Math.cos(elapsed * 1.7 + k.phase) * 0.12;

      if (
        !playerInSafeCP &&
        Math.hypot(playerPos.x - k.mesh.position.x, playerPos.z - k.mesh.position.z) < 1.65 &&
        Math.abs(playerPos.y - k.mesh.position.y) < 2.3
      ) {
        hitBy = 'kuntilanak';
        k.active = false;
        k.mesh.visible = false;
      }
    }

    // Update Pooled Pocong (authentic forward hopping along trail, 5s auto-hide)
    for (const p of this.pocongs) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      const hopSpeed = 4.6 * lvl.speedMult;
      const nx = p.mesh.position.x + p.dirX * p.patrolDir * hopSpeed * dt;
      const nz = p.mesh.position.z + p.dirZ * p.patrolDir * hopSpeed * dt;
      const candGy = this.getGroundHeight(nx, nz, p.mesh.position.y + 1.0);
      if (
        candGy < -100 ||
        Math.hypot(nx - p.originX, nz - p.originZ) > 7.5 ||
        this.isInsideAnyCheckpointSafeZone(nx, nz)
      ) {
        p.patrolDir *= -1;
      } else {
        p.mesh.position.x = nx;
        p.mesh.position.z = nz;
      }

      p.vy -= 26 * dt;
      p.mesh.position.y += p.vy * dt;
      let gy = this.getGroundHeight(p.mesh.position.x, p.mesh.position.z, p.mesh.position.y + 1.0);
      if (gy < -100) gy = this.getNearestTrailInfo(p.mesh.position.x, p.mesh.position.z).y;
      if (p.mesh.position.y <= gy) {
        p.mesh.position.y = gy;
        p.vy = 7.8 + Math.min(3.0, lvl.speedMult * 1.5);
        if (Math.hypot(playerPos.x - p.mesh.position.x, playerPos.z - p.mesh.position.z) < 28) {
          soundEngine.playPocongHop();
        }
      }
      p.mesh.rotation.y = Math.atan2(p.dirX * p.patrolDir, p.dirZ * p.patrolDir) + Math.PI;
      p.mesh.rotation.x = p.vy > 0 ? -0.2 : 0.12;

      if (
        !playerInSafeCP &&
        Math.hypot(playerPos.x - p.mesh.position.x, playerPos.z - p.mesh.position.z) < 1.6 &&
        Math.abs(playerPos.y - p.mesh.position.y) < 2.2
      ) {
        hitBy = 'pocong';
      }
    }

    // Update Pooled Brainrot Actors (Skibidi Toilet + Kepala Sigma / Tung Tung Sahur, 6s auto-hide)
    for (const b of this.brainrots) {
      if (!b.active) continue;
      b.age += dt;
      if (b.age >= b.maxAge) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }

      const strafeSpeed = b.kind === 'skibidi' ? 3.8 : 4.5;
      const nx = b.mesh.position.x + b.dirX * b.patrolDir * strafeSpeed * dt;
      const nz = b.mesh.position.z + b.dirZ * b.patrolDir * strafeSpeed * dt;
      const candGy = this.getGroundHeight(nx, nz, b.mesh.position.y + 1.2);
      if (
        candGy < -100 ||
        Math.hypot(nx - b.originX, nz - b.originZ) > 3.6 ||
        this.isInsideAnyCheckpointSafeZone(nx, nz)
      ) {
        b.patrolDir *= -1;
      } else {
        b.mesh.position.x = nx;
        b.mesh.position.z = nz;
      }

      b.vy -= 24 * dt;
      b.mesh.position.y += b.vy * dt;
      let gy = this.getGroundHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y + 1.2);
      if (gy < -100) gy = this.getNearestTrailInfo(b.mesh.position.x, b.mesh.position.z).y;
      if (b.mesh.position.y <= gy) {
        b.mesh.position.y = gy;
        b.vy = b.kind === 'skibidi' ? 5.2 : 7.6;
      }

      b.mesh.lookAt(playerPos.x, b.mesh.position.y, playerPos.z);
      if (b.kind === 'skibidi') {
        b.headNode.rotation.y = Math.sin(elapsed * 12 + b.phase) * 0.72;
        b.headNode.rotation.z = Math.cos(elapsed * 9 + b.phase) * 0.16;
        b.bodyNode.rotation.z = Math.sin(elapsed * 7 + b.phase) * 0.12;
      } else {
        b.bodyNode.rotation.z = Math.sin(elapsed * 10 + b.phase) * 0.18;
        b.headNode.rotation.y = Math.sin(elapsed * 6 + b.phase) * 0.32;
      }

      if (
        !playerInSafeCP &&
        Math.hypot(playerPos.x - b.mesh.position.x, playerPos.z - b.mesh.position.z) < 1.65 &&
        Math.abs(playerPos.y - b.mesh.position.y) < 2.2
      ) {
        hitBy = 'brainrot';
        b.active = false;
        b.mesh.visible = false;
      }
    }

    // Update Pooled Snow Monsters (Yeti, 7s auto-hide, knockback collision)
    for (const y of this.yetis) {
      if (!y.active) continue;
      y.age += dt;
      if (y.age >= y.maxAge) {
        y.active = false;
        y.mesh.visible = false;
        continue;
      }

      const yetiSpeed = 3.4 * lvl.speedMult;
      const nx = y.mesh.position.x + y.dirX * y.patrolDir * yetiSpeed * dt;
      const nz = y.mesh.position.z + y.dirZ * y.patrolDir * yetiSpeed * dt;
      const candGy = this.getGroundHeight(nx, nz, y.mesh.position.y + 1.4);
      if (
        candGy < -100 ||
        Math.hypot(nx - y.originX, nz - y.originZ) > 3.2 ||
        this.isInsideAnyCheckpointSafeZone(nx, nz)
      ) {
        y.patrolDir *= -1;
      } else {
        y.mesh.position.x = nx;
        y.mesh.position.z = nz;
        y.mesh.position.y = candGy;
      }

      y.mesh.lookAt(playerPos.x, y.mesh.position.y, playerPos.z);
      const stomp = Math.sin(elapsed * 7.5 + y.phase);
      y.armL.rotation.x = stomp * 0.75 - 0.5;
      y.armR.rotation.x = -stomp * 0.75 - 0.5;
      y.legL.rotation.x = -stomp * 0.45;
      y.legR.rotation.x = stomp * 0.45;
      y.head.rotation.z = Math.sin(elapsed * 4.5 + y.phase) * 0.14;

      const dxY = playerPos.x - y.mesh.position.x;
      const dzY = playerPos.z - y.mesh.position.z;
      const distY = Math.hypot(dxY, dzY) || 1;
      if (
        !playerInSafeCP &&
        distY < 2.05 &&
        Math.abs(playerPos.y - y.mesh.position.y) < 2.8
      ) {
        hitBy = 'yeti';
        pushImpulse = { x: (dxY / distY) * 14.5, z: (dzY / distY) * 14.5 };
        y.patrolDir *= -1;
        y.active = false;
        y.mesh.visible = false;
      }
    }

    // Update Pooled Landslide / Magma / Snow Boulders (0 runtime allocations)
    for (const b of this.boulders) {
      if (!b.active) continue;
      b.age += dt;
      if (b.age >= b.maxAge) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }

      b.vy -= 24 * dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.mesh.rotation.x += b.rotSpeed * dt;
      b.mesh.rotation.z += b.rotSpeed * 0.6 * dt;

      const gy = this.getGroundHeight(b.mesh.position.x, b.mesh.position.z, b.mesh.position.y + 1.5);
      if (gy > -100 && b.mesh.position.y < gy + b.radius) {
        b.mesh.position.y = gy + b.radius;
        b.vy = Math.max(2.6, Math.abs(b.vy) * 0.45);
      }

      if (!playerInSafeCP) {
        const dPlayer = Math.hypot(
          playerPos.x - b.mesh.position.x,
          playerPos.y + 1.0 - b.mesh.position.y,
          playerPos.z - b.mesh.position.z,
        );
        if (dPlayer < b.radius + 0.75) {
          hitBy = 'landslide';
        }
      }
    }

    // Update Pooled Rolling Logs (0 runtime allocations)
    for (const rl of this.rollingLogs) {
      if (!rl.active) continue;
      rl.age += dt;
      if (rl.age >= rl.maxAge) {
        rl.active = false;
        rl.mesh.visible = false;
        continue;
      }

      rl.vy -= 22 * dt;
      rl.mesh.position.x += rl.vx * dt;
      rl.mesh.position.y += rl.vy * dt;
      rl.mesh.position.z += rl.vz * dt;
      rl.mesh.rotation.x += 5.5 * dt;

      const gy = this.getGroundHeight(rl.mesh.position.x, rl.mesh.position.z, rl.mesh.position.y + 1.5);
      if (gy > -100 && rl.mesh.position.y < gy + rl.radius) {
        rl.mesh.position.y = gy + rl.radius;
        rl.vy = 0;
      }

      if (!playerInSafeCP) {
        const dxL = playerPos.x - rl.mesh.position.x;
        const dzL = playerPos.z - rl.mesh.position.z;
        const logYaw = rl.mesh.rotation.y;
        const cosL = Math.cos(logYaw);
        const sinL = Math.sin(logYaw);
        const localX = dxL * cosL - dzL * sinL;
        const localZ = dxL * sinL + dzL * cosL;
        if (
          Math.abs(localX) < 2.05 &&
          Math.abs(localZ) < rl.radius + 0.55 &&
          playerPos.y < rl.mesh.position.y + rl.radius + 0.15 &&
          playerPos.y + 2.0 > rl.mesh.position.y - rl.radius
        ) {
          hitBy = 'log';
        }
      }
    }

    // Update Pooled Lava Rain Projectiles
    for (const lr of this.lavaRainPool) {
      if (!lr.active) continue;
      lr.age += dt;
      lr.timer -= dt;
      if (lr.age >= lr.maxAge) {
        lr.active = false;
        lr.boulder.visible = false;
        lr.ring.visible = false;
        lr.shockwave.visible = false;
        continue;
      }
      if (!lr.impacted) {
        const frac = clamp(lr.timer / 1.35, 0, 1);
        lr.boulder.position.set(lr.x + frac * 10, lr.groundY + frac * 72 + 1.2, lr.z + frac * 8);
        lr.boulder.rotation.x += 5 * dt;
        lr.boulder.rotation.z += 4 * dt;
        lr.ring.scale.setScalar(0.75 + Math.sin(elapsed * 20) * 0.2);
        if (lr.timer <= 0) {
          lr.impacted = true;
          lr.boulder.visible = false;
          lr.ring.visible = false;
          lr.shockwave.visible = true;
          lr.timer = 0.5;
          this.meteorShakeTimer = Math.max(this.meteorShakeTimer, 0.25);
          soundEngine.playMeteorImpact();
          if (
            !playerInSafeCP &&
            Math.hypot(playerPos.x - lr.x, playerPos.z - lr.z) < 3.6 &&
            Math.abs(playerPos.y - lr.groundY) < 4.5
          ) {
            hitBy = 'lava_rain';
          }
        }
      } else {
        const expand = 1 + (0.5 - lr.timer) * 4.2;
        lr.shockwave.scale.setScalar(expand);
        if (lr.timer <= 0) {
          lr.active = false;
          lr.shockwave.visible = false;
        }
      }
    }

    // Update Rising Flood Plane (Clear Blue Banjir Bandang & Banjir Lava)
    if (this.floodActive) {
      this.floodTimer = Math.max(0, this.floodTimer - dt);
      const elapsedFlood = this.floodMaxDuration - this.floodTimer;
      const progress = clamp(elapsedFlood / Math.max(1, this.floodMaxDuration), 0, 1);
      // Rise for first 65%, peak hold, then recede cleanly
      const levelNorm =
        progress < 0.65
          ? progress / 0.65
          : 1 - (progress - 0.65) / 0.35;
      this.floodCurrentY = this.floodBaseY + (this.floodPeakY - this.floodBaseY) * clamp(levelNorm, 0, 1);
      this.floodPlaneMesh.position.y = this.floodCurrentY + Math.sin(elapsed * 4.2) * 0.14;
      if (this.floodKind === 'flash_flood') {
        this.floodWaterTex.offset.x += dt * 0.45;
        this.floodWaterTex.offset.y += dt * 0.65;
      }
      if (!playerInSafeCP && progress > 0.28 && progress < 0.85 && playerPos.y + 0.35 < this.floodCurrentY) {
        if (this.floodKind === 'lava_flood') {
          hitBy = 'flood';
        } else {
          pushImpulse = { x: -Math.sin(elapsed * 1.5) * 6.5, z: 6.5 };
          if (playerPos.y + 1.05 < this.floodCurrentY) {
            hitBy = 'flood';
          }
        }
      }
      if (this.floodTimer <= 0) {
        this.floodActive = false;
        this.floodPlaneMesh.visible = false;
        this.floodCurrentY = -50;
      }
    }

    // Update Pooled Hujan Es (Ice Hail Crystals -> max 50, recycle inside 5s window, hide cleanly at 5s)
    for (const h of this.iceHails) {
      if (!h.active) continue;
      h.age += dt;
      if (h.age >= h.maxAge) {
        h.active = false;
        h.mesh.visible = false;
        continue;
      }
      h.mesh.position.x += h.vx * dt;
      h.mesh.position.y += h.vy * dt;
      h.mesh.position.z += h.vz * dt;
      h.mesh.rotation.x += 6.5 * dt;
      h.mesh.rotation.y += 5.2 * dt;

      if (!playerInSafeCP) {
        const dH = Math.hypot(
          playerPos.x - h.mesh.position.x,
          playerPos.y + 1.0 - h.mesh.position.y,
          playerPos.z - h.mesh.position.z,
        );
        if (dH < 1.75) {
          hitIceHail = true;
          h.mesh.position.y += 26;
          continue;
        }
      }

      const gy = this.getGroundHeight(h.mesh.position.x, h.mesh.position.z, h.mesh.position.y + 1.5);
      if (gy > -100 && h.mesh.position.y <= gy + 0.2) {
        if (h.age < h.maxAge - 0.8) {
          h.mesh.position.y = gy + 20 + Math.random() * 14;
        } else {
          h.active = false;
          h.mesh.visible = false;
        }
      }
    }

    // Update Pooled Hujan Api (Falling Fireballs -> spark ring bursts -> hide cleanly at 5s)
    for (const f of this.fireRains) {
      if (!f.active) continue;
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        f.mesh.visible = false;
        f.mesh.geometry = this.fireRainGeo;
        f.mesh.material = this.fireRainMat;
        continue;
      }
      if (!f.impacted) {
        f.mesh.position.x += f.vx * dt;
        f.mesh.position.y += f.vy * dt;
        f.mesh.position.z += f.vz * dt;

        if (!playerInSafeCP) {
          const dF = Math.hypot(
            playerPos.x - f.mesh.position.x,
            playerPos.y + 1.0 - f.mesh.position.y,
            playerPos.z - f.mesh.position.z,
          );
          if (dF < 1.65) {
            hitBy = 'fire_rain';
          }
        }

        const gy = this.getGroundHeight(f.mesh.position.x, f.mesh.position.z, f.mesh.position.y + 1.5);
        const hitFloor = gy > -100 ? gy : f.groundY;
        if (f.mesh.position.y <= hitFloor + 0.35) {
          f.impacted = true;
          f.sparkTimer = 0.42;
          f.mesh.geometry = this.fireSparkGeo;
          f.mesh.material = this.fireSparkMat;
          f.mesh.position.y = hitFloor + 0.18;
          f.mesh.scale.setScalar(1.0);
          if (!playerInSafeCP && Math.hypot(playerPos.x - f.mesh.position.x, playerPos.z - f.mesh.position.z) < 2.25 && Math.abs(playerPos.y - hitFloor) < 2.5) {
            hitBy = 'fire_rain';
          }
        }
      } else {
        f.sparkTimer -= dt;
        const expand = 1.0 + (0.42 - f.sparkTimer) * 5.0;
        f.mesh.scale.setScalar(expand);
        if (f.sparkTimer <= 0) {
          if (f.age < f.maxAge - 0.9) {
            f.impacted = false;
            f.mesh.geometry = this.fireRainGeo;
            f.mesh.material = this.fireRainMat;
            f.mesh.scale.setScalar(0.85 + Math.random() * 0.5);
            f.mesh.position.y = f.groundY + 22 + Math.random() * 14;
          } else {
            f.active = false;
            f.mesh.visible = false;
            f.mesh.geometry = this.fireRainGeo;
            f.mesh.material = this.fireRainMat;
          }
        }
      }
    }

    // Lightweight Pooled Summit Celebration Fireworks (max 24 sparks, zero GC)
    if (this.summitCelebrationActive && !isPaused) {
      this.summitFireworkTimer -= dt;
      if (this.summitFireworkTimer <= 0) {
        this.summitFireworkTimer = 1.55;
        const summitPt = this.getSummitPoint();
        const burstX = summitPt.x + (Math.random() - 0.5) * 14;
        const burstY = summitPt.y + 8.5 + Math.random() * 5.5;
        const burstZ = summitPt.z + (Math.random() - 0.5) * 14;
        let spawned = 0;
        for (let i = 0; i < this.fireworkSparks.length && spawned < 12; i++) {
          const sp = this.fireworkSparks[i];
          if (sp.active) continue;
          const theta = (spawned / 12) * Math.PI * 2 + Math.random() * 0.35;
          const phi = 0.25 + Math.random() * 1.1;
          const speed = 5.5 + Math.random() * 4.5;
          sp.mesh.position.set(burstX, burstY, burstZ);
          sp.vx = Math.cos(theta) * Math.sin(phi) * speed;
          sp.vy = Math.cos(phi) * speed + 2.8;
          sp.vz = Math.sin(theta) * Math.sin(phi) * speed;
          sp.age = 0;
          sp.maxAge = 1.25;
          sp.active = true;
          sp.mesh.scale.setScalar(1);
          sp.mesh.visible = true;
          spawned++;
        }
      }
    }
    for (const sp of this.fireworkSparks) {
      if (!sp.active) continue;
      sp.age += dt;
      if (sp.age >= sp.maxAge) {
        sp.active = false;
        sp.mesh.visible = false;
        continue;
      }
      sp.vy -= 7.2 * dt;
      sp.mesh.position.x += sp.vx * dt;
      sp.mesh.position.y += sp.vy * dt;
      sp.mesh.position.z += sp.vz * dt;
      const s = Math.max(0.15, 1 - sp.age / sp.maxAge);
      sp.mesh.scale.setScalar(s);
    }

    if (skipHazards) {
      return { hitBy: null, hitIceHail: false, shakeIntensity: 0 };
    }
    return { hitBy, hitIceHail, shakeIntensity, pushImpulse };
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public captureScreenshotCanvas(): HTMLCanvasElement | null {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }

  public dispose() {
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredBound);
    this.clearActiveMapGroup();
    this.envMapTexture?.dispose();
    this.blobShadowTexture?.dispose();
    this.blobShadowGeo?.dispose();
    this.sharedBlobShadowMat?.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
    this.snowballGeo.dispose();
    this.snowballMat.dispose();
    this.magmaBoulderMat.dispose();
    this.cyberCoreMat.dispose();
    this.dirtTopMat.dispose();
    this.grassEdgeMat.dispose();
    this.cliffUpperMat.dispose();
    this.cliffLowerMat.dispose();
    this.buttressMat.dispose();
    this.woodMat.dispose();
    this.warnWoodMat.dispose();
    this.beamMat.dispose();
    this.postMat.dispose();
    this.ropeMat.dispose();
    this.lanternMat.dispose();
    this.padMat.dispose();
    this.trimMat.dispose();
    this.cliffRockMat.dispose();
    this.trunkMat.dispose();
    this.leafMat1.dispose();
    this.leafMat2.dispose();
    this.leafMat3.dispose();
    this.cloudMat.dispose();
    this.meteorGeo.dispose();
    this.meteorMat.dispose();
    this.meteorRingGeo.dispose();
    this.meteorRingMat.dispose();
    this.meteorShockGeo.dispose();
    this.meteorShockMat.dispose();
    this.lightningRingGeo.dispose();
    this.lightningRingMat.dispose();
    this.lightningBoltGeo.dispose();
    this.lightningBoltMat.dispose();
    this.logGeo.dispose();
    this.logMat.dispose();
    this.kuntiDressTex.dispose();
    this.kuntiUpperGeo.dispose();
    this.kuntiDressGeo.dispose();
    this.kuntiVeilGeo.dispose();
    this.kuntiHeadGeo.dispose();
    this.kuntiHairCrownGeo.dispose();
    this.kuntiHairBackGeo.dispose();
    this.kuntiHairSideGeo.dispose();
    this.kuntiSocketGeo.dispose();
    this.kuntiEyeGeo.dispose();
    this.kuntiArmGeo.dispose();
    this.kuntiHandGeo.dispose();
    this.kuntiRingGeo.dispose();
    this.kuntiDressMat.dispose();
    this.kuntiVeilMat.dispose();
    this.kuntiHeadMat.dispose();
    this.kuntiHairMat.dispose();
    this.kuntiSocketMat.dispose();
    this.kuntiEyeMat.dispose();
    this.kuntiRingMat.dispose();
    this.pocongShroudTex.dispose();
    this.pocongUpperGeo.dispose();
    this.pocongLowerGeo.dispose();
    this.pocongShoulderGeo.dispose();
    this.pocongHeadGeo.dispose();
    this.pocongKnotGeo.dispose();
    this.pocongTieGeo.dispose();
    this.pocongAnkleTieGeo.dispose();
    this.pocongTabGeo.dispose();
    this.pocongFaceGeo.dispose();
    this.pocongSocketGeo.dispose();
    this.pocongEyeGeo.dispose();
    this.pocongMouthGeo.dispose();
    this.pocongRingGeo.dispose();
    this.pocongShroudMat.dispose();
    this.pocongTieMat.dispose();
    this.pocongFaceMat.dispose();
    this.pocongSocketMat.dispose();
    this.pocongEyeMat.dispose();
    this.pocongRingMat.dispose();
    this.iceHailGeo.dispose();
    this.iceHailMat.dispose();
    this.fireRainGeo.dispose();
    this.fireRainMat.dispose();
    this.fireSparkGeo.dispose();
    this.fireSparkMat.dispose();
    this.fireworkGeo.dispose();
    this.fireworkMats.forEach((m) => m.dispose());
    this.skibidiFaceTex.dispose();
    this.sahurSigmaFaceTex.dispose();
    this.brainrotBaseGeo.dispose();
    this.brainrotBowlGeo.dispose();
    this.brainrotTankGeo.dispose();
    this.brainrotWaterGeo.dispose();
    this.brainrotNeckGeo.dispose();
    this.brainrotHeadGeo.dispose();
    this.brainrotLogBodyGeo.dispose();
    this.brainrotLimbGeo.dispose();
    this.brainrotMalletGeo.dispose();
    this.brainrotRingGeo.dispose();
    this.brainrotPorcelainMat.dispose();
    this.brainrotWaterMat.dispose();
    this.brainrotSkinMat.dispose();
    this.brainrotHairMat.dispose();
    this.brainrotWoodMat.dispose();
    this.brainrotNeonMat.dispose();
    (this.skibidiHeadMats[4] as THREE.Material).dispose();
    (this.sahurHeadMats[4] as THREE.Material).dispose();
    this.floodPlaneMesh?.geometry.dispose();
    this.floodMat?.dispose();
    this.floodWaterTex.dispose();
    this.iceBoulderGeo.dispose();
    this.iceBoulderMat.dispose();
    this.yetiTorsoGeo.dispose();
    this.yetiHeadGeo.dispose();
    this.yetiBrowGeo.dispose();
    this.yetiLimbGeo.dispose();
    this.yetiEyeGeo.dispose();
    this.yetiHornGeo.dispose();
    this.yetiRingGeo.dispose();
    this.yetiFurMat.dispose();
    this.yetiSkinMat.dispose();
    this.yetiEyeMat.dispose();
    this.yetiRingMat.dispose();
    this.obbyGrassTopTex.dispose();
    this.obbyPlankTex.dispose();
    this.obbyGrassTopMat.dispose();
    this.obbyPlankMat.dispose();
    this.obbyRailMat.dispose();
    this.obbyCanopyMat.dispose();
    this.obbyBushMat.dispose();
    this.obbyFruitMat.dispose();
    this.obbyPlankUnitGeo.dispose();
    this.obbyFruitGeo.dispose();
    this.safeDeckTex.dispose();
    this.safeSignTex.dispose();
    this.safeDeckMat.dispose();
    this.safeRailMat.dispose();
    this.safeSignGeo.dispose();
    this.safeSignMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

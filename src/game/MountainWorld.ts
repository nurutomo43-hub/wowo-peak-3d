import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  DIFFICULTY_LEVELS,
  EMOTE_ITEMS,
  type AvatarConfig,
  type DisasterEventType,
  type EmoteType,
  type RadarBlip,
  type Role,
  type TimeOfDay,
  type WeatherType,
} from '../types/game';
import { animateR15AvatarPose, buildR15AvatarMesh, type AvatarPoseState } from './AvatarBuilder';
import type { SoundEngine } from './SoundEngine';

export interface CpPoint {
  index: number;
  x: number;
  y: number;
  z: number;
}

export interface CliffIslandStage extends CpPoint {
  rTop: number;
  cliffHeight: number;
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
  | 'fire_rain';

// 27 Stepped Cliff Islands (CP 0 Basecamp -> CP 25 Peak -> Gapura Ujian Akhir) arranged in a clean ascending spiral
function buildIslandStages(): CliffIslandStage[] {
  const stages: CliffIslandStage[] = [];
  let theta = 0;
  for (let i = 0; i <= 26; i++) {
    const spiralR = 148 - i * 2.5; // 148m at Basecamp spiraling smoothly inward to 83m at Summit
    if (i > 0) {
      const prevR = 148 - (i - 1) * 2.5;
      const avgR = (prevR + spiralR) * 0.5;
      theta += 52.5 / avgR; // ~52.5m center-to-center spacing so every suspension bridge is ~22-26m over open chasm
    }
    const x = Math.round(Math.sin(theta) * spiralR * 100) / 100;
    const z = Math.round(Math.cos(theta) * spiralR * 100) / 100;
    const y = 4.0 + i * 9.5; // Basecamp y=4.0, CP 25 y=241.5, Summit Exam y=251.0 (gentle ~20° bridge incline)
    const rTop =
      i === 0
        ? 18.5
        : i === 26
          ? 17.5
          : i === 25
            ? 15.5
            : 13.8 + (i % 3 === 0 ? 1.0 : 0);
    const cliffHeight = 25 + (i % 4) * 3;
    stages.push({ index: i, x, y, z, rTop, cliffHeight });
  }
  return stages;
}

export const ISLAND_STAGES: CliffIslandStage[] = buildIslandStages();
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

interface BridgeSpan {
  index: number;
  a: CliffIslandStage;
  b: CliffIslandStage;
  tMin: number;
  tMax: number;
  halfWidth: number;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  dx: number;
  dz: number;
  lenSq: number;
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
  kind: 'circle' | 'box';
  x: number;
  z: number;
  r: number;
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

  public readonly remotePlayers = new Map<string, RemotePlayerEntry>();

  private readonly colliderCellSize = 40;
  private readonly colliderGrid = new Map<number, SolidCollider[]>();
  private readonly bridgeSpans: BridgeSpan[] = [];
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

  private readonly walkableBoxes: WalkableBoxSurface[] = [];
  private readonly crumbleStones: CrumbleStone[] = [];
  private readonly geysers: GeyserVent[] = [];
  private readonly windZones: WindZone[] = [];
  private readonly lightningStrikes: LightningStrike[] = [];
  private readonly wildfires: WildfireCluster[] = [];
  private readonly meteors: MeteorStrike[] = [];
  private earthquakeTimer = 0;
  private landslideShakeTimer = 0;
  private meteorShakeTimer = 0;
  private thunderStormTimer = 0;
  private thunderNextStrikeIn = 0;
  private baseTimeOfDay: TimeOfDay = 'pagi';
  private baseWeather: WeatherType = 'cerah';
  private tempWeatherOverride: 'heavy_rain' | 'thick_fog' | null = null;
  private tempWeatherTimer = 0;

  private readonly kuntilanaks: KuntilanakEntity[] = [];
  private readonly pocongs: PocongEntity[] = [];
  private readonly iceHails: IceHailParticle[] = [];
  private readonly fireRains: FireRainParticle[] = [];
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

  private readonly rockGeo = new THREE.DodecahedronGeometry(1.15, 0);
  private readonly rockMat = new THREE.MeshStandardMaterial({
    color: '#57534e',
    roughness: 0.94,
    metalness: 0.05,
  });
  private readonly meteorGeo = new THREE.DodecahedronGeometry(2.4, 1);
  private readonly meteorMat = new THREE.MeshStandardMaterial({
    color: '#292524',
    emissive: '#ea580c',
    emissiveIntensity: 1.15,
    roughness: 0.72,
  });
  private readonly logGeo = new THREE.CylinderGeometry(0.56, 0.64, 4.0, 10);
  private readonly logMat = new THREE.MeshStandardMaterial({
    color: '#5c3a21',
    roughness: 0.92,
  });

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

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.3,
      2400,
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
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

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envMapTexture = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    this.scene.environment = this.envMapTexture;
    this.scene.environmentIntensity = 0.36;
    pmrem.dispose();

    this.initBlobShadowResources();
    this.initBridgeSpans();
    this.initTrailSamples();
    this.initLightsAndSky();

    this.buildCliffIslands();
    this.buildSuspensionBridges();
    this.buildCheckpointsAndLandmarks();
    this.buildIslandObstaclesAndHazards();
    this.buildInstancedFoliageRocksCloudsAndBirds();
    this.buildWeatherSystems();
    this.initDisasterObjectPools();
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
    return 2.85;
  }

  private getFullWaypoints(): CpPoint[] {
    return ISLAND_STAGES;
  }

  private initBridgeSpans() {
    for (let i = 0; i < ISLAND_STAGES.length - 1; i++) {
      const a = ISLAND_STAGES[i];
      const b = ISLAND_STAGES[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const horizDist = Math.hypot(dx, dz) || 1;
      // Overlap 1.5m onto each island's earth top lip so transition is completely seamless
      const startOff = a.rTop - 1.5;
      const endOff = b.rTop - 1.5;
      const tMin = startOff / horizDist;
      const tMax = 1 - endOff / horizDist;
      const startX = a.x + dx * tMin;
      const startZ = a.z + dz * tMin;
      const endX = a.x + dx * tMax;
      const endZ = a.z + dz * tMax;
      const bdx = endX - startX;
      const bdz = endZ - startZ;

      this.bridgeSpans.push({
        index: i,
        a,
        b,
        tMin,
        tMax,
        halfWidth: 2.85,
        startX,
        startY: a.y + 0.08,
        startZ,
        endX,
        endY: b.y + 0.08,
        endZ,
        dx: bdx,
        dz: bdz,
        lenSq: bdx * bdx + bdz * bdz,
      });
    }
  }

  private initTrailSamples() {
    const stepsPerSeg = 20;
    let totalDist = 0;
    for (let i = 0; i < ISLAND_STAGES.length - 1; i++) {
      const a = ISLAND_STAGES[i];
      const b = ISLAND_STAGES[i + 1];
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
    const last = ISLAND_STAGES[ISLAND_STAGES.length - 1];
    const prev = this.trailSamples[this.trailSamples.length - 1];
    totalDist += Math.hypot(last.x - prev.x, last.z - prev.z);
    this.trailSamples.push({
      x: last.x,
      y: last.y,
      z: last.z,
      segIndex: ISLAND_STAGES.length - 2,
      distFromStart: totalDist,
    });
  }

  public getNearestTrailInfo(x: number, z: number): TrailInfo {
    let bestDistSq = Infinity;
    let bestProj: TrailInfo = {
      dist: 0,
      x: ISLAND_STAGES[0].x,
      y: ISLAND_STAGES[0].y,
      z: ISLAND_STAGES[0].z,
      segIndex: 0,
      t: 0,
      tx: 0,
      tz: -1,
    };

    for (let i = 0; i < ISLAND_STAGES.length - 1; i++) {
      const a = ISLAND_STAGES[i];
      const b = ISLAND_STAGES[i + 1];
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
    let bestY: number | null = null;
    for (let i = 0; i < ISLAND_STAGES.length; i++) {
      const st = ISLAND_STAGES[i];
      const dx = x - st.x;
      const dz = z - st.z;
      if (dx * dx + dz * dz <= st.rTop * st.rTop) {
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
      if (u < -0.01 || u > 1.01) continue;
      const uc = clamp(u, 0, 1);
      const px = bs.startX + bs.dx * uc;
      const pz = bs.startZ + bs.dz * uc;
      const perpDist = Math.hypot(x - px, z - pz);
      if (perpDist > bs.halfWidth) continue;
      const deckY = bs.startY + (bs.endY - bs.startY) * uc;
      if (playerY !== undefined && playerY < deckY - 2.4) continue;
      if (bestH === null || deckY > bestH) {
        bestH = deckY;
      }
    }
    return bestH;
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
    let h = -999;
    const iy = this.getIslandSurfaceHeightAt(x, z, playerY);
    if (iy !== null && iy > h) {
      h = iy;
    }

    const bh = this.getBridgeHeightAt(x, z, playerY);
    if (bh !== null && bh > h) {
      h = bh;
    }

    // CP plaza stone pad (+0.34m) & stepped outer stone stair ring (+0.18m)
    for (let i = 0; i < ISLAND_STAGES.length; i++) {
      const st = ISLAND_STAGES[i];
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
    this.blobShadowGeo = new THREE.PlaneGeometry(1.7, 1.7);
    this.blobShadowGeo.rotateX(-Math.PI / 2);
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
    this.scene.fog = new THREE.FogExp2('#bde0fe', 0.00075);

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

  private buildCliffIslands() {
    const dirtTopMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.92 });
    const grassEdgeMat = new THREE.MeshStandardMaterial({ color: '#3b7a2a', roughness: 0.88 });
    const cliffUpperMat = new THREE.MeshStandardMaterial({ color: '#57534e', roughness: 0.95 });
    const cliffLowerMat = new THREE.MeshStandardMaterial({ color: '#44403c', roughness: 0.96 });
    const buttressMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.94 });

    for (let i = 0; i < ISLAND_STAGES.length; i++) {
      const st = ISLAND_STAGES[i];
      const group = new THREE.Group();
      group.position.set(st.x, st.y, st.z);

      const earthR = st.rTop - 1.55;
      // 1) Flat walkable brown earth top surface (exact top y = st.y)
      const earthDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(earthR, earthR, 0.36, 24),
        dirtTopMat,
      );
      earthDisc.position.y = -0.18;
      group.add(earthDisc);

      // 2) Green grass border ring framing the outer cliff rim
      const grassRing = new THREE.Mesh(
        new THREE.RingGeometry(earthR - 0.12, st.rTop, 28),
        grassEdgeMat,
      );
      grassRing.rotation.x = -Math.PI / 2;
      grassRing.position.y = 0.015;
      group.add(grassRing);

      const grassBand = new THREE.Mesh(
        new THREE.CylinderGeometry(st.rTop + 0.05, st.rTop + 0.3, 1.35, 24),
        grassEdgeMat,
      );
      grassBand.position.y = -0.68;
      group.add(grassBand);

      // 3) Multi-tiered rocky cliff body descending cleanly into the open sky abyss (zero ground below bridges)
      const upperH = st.cliffHeight * 0.56;
      const upperCliff = new THREE.Mesh(
        new THREE.CylinderGeometry(st.rTop + 0.22, st.rTop * 0.74, upperH, 14),
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

      const spireCap = new THREE.Mesh(
        new THREE.ConeGeometry(st.rTop * 0.28, 6.5, 8),
        cliffLowerMat,
      );
      spireCap.rotation.x = Math.PI;
      spireCap.position.y = -1.35 - upperH - lowerH - 3.25;
      group.add(spireCap);

      // Faceted rocky side buttresses for natural cliff silhouette
      const buttressCount = 5;
      for (let b = 0; b < buttressCount; b++) {
        const ang = (b / buttressCount) * Math.PI * 2 + i * 0.7;
        const dist = st.rTop * 0.82;
        const bh = 8.5 + (b % 3) * 3.5;
        const buttress = new THREE.Mesh(
          new THREE.CylinderGeometry(st.rTop * 0.16, st.rTop * 0.08, bh, 6),
          buttressMat,
        );
        buttress.position.set(Math.cos(ang) * dist, -3.2 - bh * 0.45, Math.sin(ang) * dist);
        group.add(buttress);
      }

      this.scene.add(group);
    }
  }

  private buildSuspensionBridges() {
    const woodMat = new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.88 });
    const warnWoodMat = new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.85 });
    const beamMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.92 });
    const postMat = new THREE.MeshStandardMaterial({ color: '#5c2d0c', roughness: 0.9 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.82 });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.25,
      roughness: 0.4,
    });

    for (let i = 0; i < this.bridgeSpans.length; i++) {
      const bs = this.bridgeSpans[i];
      const midX = (bs.startX + bs.endX) * 0.5;
      const midY = (bs.startY + bs.endY) * 0.5;
      const midZ = (bs.startZ + bs.endZ) * 0.5;
      const dy = bs.endY - bs.startY;
      const deckLen = Math.hypot(bs.dx, bs.dz);
      const angleY = Math.atan2(bs.dx, bs.dz);
      const pitch = -Math.atan2(dy, deckLen);

      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(midX, midY, midZ);
      bridgeGroup.rotation.order = 'YXZ';
      bridgeGroup.rotation.y = angleY;
      bridgeGroup.rotation.x = pitch;

      // 1) Tightly packed wooden cross-planks (zero walkable gaps)
      const plankCount = Math.max(20, Math.ceil(deckLen / 0.95));
      const plankStep = deckLen / plankCount;
      const plankDepth = plankStep * 0.93;
      const swayBridge = i >= 10 && i % 4 === 2;

      for (let p = 0; p < plankCount; p++) {
        const zOff = -deckLen * 0.5 + (p + 0.5) * plankStep;
        const isRickety = swayBridge && p > 4 && p < plankCount - 5 && p % 5 === 0;
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(bs.halfWidth * 2, 0.34, plankDepth),
          isRickety ? warnWoodMat : woodMat,
        );
        plank.position.set(0, -0.17, zOff);
        bridgeGroup.add(plank);

        if (isRickety) {
          const frac = (p + 0.5) / plankCount;
          this.swayPlanks.push({
            mesh: plank,
            baseY: -0.17,
            phase: i * 0.7 + p * 1.1,
            worldX: bs.startX + bs.dx * frac,
            worldZ: bs.startZ + bs.dz * frac,
          });
        }
      }

      // 2) Two continuous longitudinal timber support beams beneath deck
      [-1.95, 1.95].forEach((bx) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, deckLen + 0.4), beamMat);
        beam.position.set(bx, -0.48, 0);
        bridgeGroup.add(beam);
      });

      // 3) Wooden end portal posts + crossbeam + warm lanterns at BOTH bridge ends
      [-deckLen * 0.5 + 0.35, deckLen * 0.5 - 0.35].forEach((endZ) => {
        [-3.08, 3.08].forEach((px) => {
          const portalPost = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.1, 0.42), postMat);
          portalPost.position.set(px, 1.85, endZ);
          bridgeGroup.add(portalPost);

          const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.32), lanternMat);
          lantern.position.set(px * 0.86, 3.05, endZ);
          bridgeGroup.add(lantern);
        });
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.36, 0.42), postMat);
        lintel.position.set(0, 3.72, endZ);
        bridgeGroup.add(lintel);
      });

      // 4) Cream-white (#f3ead8) left & right rope guardrails + intermediate stanchions + OBB colliders
      const cosBridge = Math.cos(angleY);
      const sinBridge = Math.sin(angleY);
      const railSideX = bs.halfWidth + 0.1;

      [-railSideX, railSideX].forEach((sideX) => {
        const topRope = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, deckLen), ropeMat);
        topRope.position.set(sideX, 1.24, 0);
        const midRope = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, deckLen), ropeMat);
        midRope.position.set(sideX, 0.66, 0);
        bridgeGroup.add(topRope, midRope);

        const stanchionCount = Math.max(5, Math.round(deckLen / 4.2));
        for (let s = 1; s < stanchionCount; s++) {
          const zSt = -deckLen * 0.5 + (s / stanchionCount) * deckLen;
          const stanchion = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.55, 0.24), beamMat);
          stanchion.position.set(sideX, 0.66, zSt);
          bridgeGroup.add(stanchion);
        }

        // Solid OBB railing collider so students stay on bridge unless intentionally jumping over rails
        this.addSolidCollider({
          kind: 'box',
          x: midX + sideX * cosBridge,
          z: midZ - sideX * sinBridge,
          r: deckLen * 0.55,
          halfW: 0.32,
          halfD: deckLen * 0.5,
          cosY: cosBridge,
          sinY: sinBridge,
          minY: Math.min(bs.startY, bs.endY) - 0.5,
          maxY: Math.max(bs.startY, bs.endY) + 1.5,
        });
      });

      this.scene.add(bridgeGroup);
    }
  }

  private getIslandOutwardSideAngle(idx: number): number {
    const st = ISLAND_STAGES[idx];
    const next = idx < ISLAND_STAGES.length - 1 ? ISLAND_STAGES[idx + 1] : null;
    const prev = idx > 0 ? ISLAND_STAGES[idx - 1] : null;
    const outAng = next
      ? Math.atan2(next.z - st.z, next.x - st.x)
      : Math.atan2(st.z - prev!.z, st.x - prev!.x);
    // Perpendicular to bridge axis pointing outward away from spiral center (0,0)
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
    // 1) Basecamp Welcome Wooden Arch at Island 0 bridge mouth pointing toward Island 1
    const bc = ISLAND_STAGES[0];
    const cp1 = ISLAND_STAGES[1];
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

    [-5.6, 5.6].forEach((sideX) => {
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

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.55, 0.72), logMat);
    crossBeam.position.set(0, 8.2, 0);
    gateGroup.add(crossBeam);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.4, 2.2), roofMat);
    roof.position.set(0, 8.72, 0);
    gateGroup.add(roof);

    const signBoard = this.createTextSign(
      'BASE CAMP CLIMBING MOUNT WOWO',
      '#5c2d0c',
      '#fde047',
      11.8,
      2.1,
    );
    signBoard.position.set(0, 6.95, -0.2);
    signBoard.rotation.y = Math.PI;
    gateGroup.add(signBoard);
    this.scene.add(gateGroup);

    // 2) Checkpoint Stone Plazas, Stepped Rings, Tents, Campfires, Signs & Exit Energy Gates
    const padMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.84 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.75 });
    const poleMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.5, roughness: 0.35 });

    CP_POINTS.forEach((cp, idx) => {
      const st = ISLAND_STAGES[idx];
      const padGroup = new THREE.Group();
      padGroup.position.set(cp.x, st.y, cp.z);

      // Two-tier walkable stepped stone pad
      const stepOuter = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.9, 0.34, 16), padMat);
      stepOuter.position.y = 0.0;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.5, 0.36, 16), trimMat);
      pad.position.y = 0.16;
      padGroup.add(stepOuter, pad);

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
        ring.position.y = 0.36;
        padGroup.add(ring);

        // Place flagpole, plaque, tent, and campfire along the outward lateral flank so bridge corridors remain 100% open
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

        // Plaque facing inward toward center of CP plaza
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

        // Hiker Tent on lateral flank
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

        // Campfire pit on opposite lateral edge of plaza
        const fireAng = sideAng + 0.15;
        const fireX = Math.cos(fireAng) * 4.1;
        const fireZ = Math.sin(fireAng) * 4.1;
        const campFireGroup = new THREE.Group();
        campFireGroup.position.set(fireX, 0.34, fireZ);
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

        // Translucent Energy Barrier Gate at the OUTGOING bridge mouth of Island `idx` (CP 1..25)
        const nextStage = ISLAND_STAGES[idx + 1];
        const edx = nextStage.x - cp.x;
        const edz = nextStage.z - cp.z;
        const eLen = Math.hypot(edx, edz) || 1;
        const gDist = st.rTop - 1.0;
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
        [-3.45, 3.45].forEach((px) => {
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

        const topBar = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.34, 0.34), pillarMat);
        topBar.position.set(0, 5.15, 0);
        energyGate.add(topBar);

        const wallMat = new THREE.MeshBasicMaterial({
          color: idx === 25 ? '#fbbf24' : '#38bdf8',
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const forceField = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.8), wallMat);
        forceField.position.set(0, 2.55, 0);
        energyGate.add(forceField);

        const lockSign = this.createTextSign(
          idx === 25 ? 'GERBANG POS UJIAN AKHIR' : `GERBANG CP ${idx}`,
          idx === 25 ? '#78350f' : '#0c4a6e',
          idx === 25 ? '#fde047' : '#7dd3fc',
          5.2,
          0.95,
          idx === 25 ? '#fbbf24' : '#38bdf8',
        );
        lockSign.position.set(0, 5.8, 0);
        lockSign.rotation.y = Math.PI;
        energyGate.add(lockSign);

        this.scene.add(energyGate);
        this.cpGates.push({ index: idx, group: energyGate, wallMat });
      }

      this.scene.add(padGroup);
    });

    // 3) GAPURA PUNCAK MOUNT WOWO — POS UJIAN AKHIR (Island 26, facing incoming bridge from CP 25)
    const se = ISLAND_STAGES[26];
    const cp25 = ISLAND_STAGES[25];
    const inYaw = Math.atan2(cp25.x - se.x, cp25.z - se.z);
    const inCos = Math.cos(inYaw);
    const inSin = Math.sin(inYaw);

    const summitGroup = new THREE.Group();
    summitGroup.position.set(se.x, se.y, se.z);
    summitGroup.rotation.y = inYaw;

    const stepRing = new THREE.Mesh(
      new THREE.CylinderGeometry(10.2, 10.6, 0.34, 18),
      padMat,
    );
    stepRing.position.y = 0.0;
    const plazaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(8.8, 9.1, 0.38, 18),
      trimMat,
    );
    plazaBase.position.y = 0.17;
    summitGroup.add(stepRing, plazaBase);

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
    goldRing.position.y = 0.39;
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
    this.scene.add(summitGroup);
  }

  private buildIslandObstaclesAndHazards() {
    // 1) Walkable Solid Fallen Logs inside selected islands (between CP pad & outgoing bridge mouth)
    const barkMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.94 });
    const cutRingMat = new THREE.MeshStandardMaterial({ color: '#d6a56d', roughness: 0.84 });
    const logIslands = [2, 5, 9, 13, 17, 21];
    logIslands.forEach((islIdx, idx) => {
      const st = ISLAND_STAGES[islIdx];
      const next = ISLAND_STAGES[islIdx + 1];
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
      this.scene.add(logGroup);

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

    // 2) Collapsing Stepping Stones on outer flank/approach of selected islands
    const crumbleIslands = [6, 10, 14, 18, 22, 24];
    const stoneGeo = new THREE.CylinderGeometry(2.3, 2.1, 0.56, 10);
    crumbleIslands.forEach((islIdx) => {
      const st = ISLAND_STAGES[islIdx];
      const prev = ISLAND_STAGES[islIdx - 1];
      const dx = prev.x - st.x;
      const dz = prev.z - st.z;
      const len = Math.hypot(dx, dz) || 1;
      const sx = st.x + (dx / len) * 9.5;
      const sz = st.z + (dz / len) * 9.5;
      const baseY = st.y + 0.06;
      const mat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.78 });
      const mesh = new THREE.Mesh(stoneGeo, mat);
      mesh.position.set(sx, baseY, sz);
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

    // 3) Volcanic Geyser Steam Vents on selected islands (outside safe zone)
    const geyserIslands = [7, 11, 15, 19, 23];
    const ventRingGeo = new THREE.TorusGeometry(1.55, 0.36, 8, 16);
    const ventBaseGeo = new THREE.CylinderGeometry(1.55, 2.05, 0.65, 12);
    const ventBaseMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.94 });
    const plumeGeo = new THREE.CylinderGeometry(0.55, 1.5, 7.2, 12);
    plumeGeo.translate(0, 3.6, 0);
    geyserIslands.forEach((islIdx, idx) => {
      const st = ISLAND_STAGES[islIdx];
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

      this.scene.add(mound, ring, plume);
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

    // 4) Gusting Wind Zones across high-altitude bridges (Bridges 16, 20, 24)
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
          wx + (Math.random() - 0.5) * 10,
          wy + 1.2 + r * 0.75,
          wz + (Math.random() - 0.5) * 10,
        );
        rib.rotation.y = Math.atan2(perpX, perpZ) + Math.PI / 2;
        this.scene.add(rib);
        ribbons.push(rib);
      }
      this.windZones.push({
        x: wx,
        z: wz,
        radius: 13.5,
        dirX: perpX,
        dirZ: perpZ,
        ribbons,
      });
    });
  }

  private buildInstancedFoliageRocksCloudsAndBirds() {
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

    // Place trees & cliff boulders cleanly around each island's grassy border & outer pockets, keeping bridge mouths & CP plazas 100% clear
    for (let i = 0; i < ISLAND_STAGES.length; i++) {
      const st = ISLAND_STAGES[i];
      const next = i < ISLAND_STAGES.length - 1 ? ISLAND_STAGES[i + 1] : null;
      const prev = i > 0 ? ISLAND_STAGES[i - 1] : null;
      const outAngle = next ? Math.atan2(next.z - st.z, next.x - st.x) : null;
      const inAngle = prev ? Math.atan2(prev.z - st.z, prev.x - st.x) : null;

      const slots = i === 0 ? 18 : i === 26 ? 14 : 12;
      for (let k = 0; k < slots; k++) {
        const ang = (k / slots) * Math.PI * 2 + i * 0.37;
        if (outAngle !== null && normalizeAngleDiff(ang, outAngle) < 0.56) continue;
        if (inAngle !== null && normalizeAngleDiff(ang, inAngle) < 0.56) continue;

        const r = st.rTop - (k % 2 === 0 ? 1.85 : 2.95);
        const px = st.x + Math.cos(ang) * r;
        const pz = st.z + Math.sin(ang) * r;
        if (Math.hypot(px - st.x, pz - st.z) < 8.4) continue;

        if (k % 3 === 0) {
          const s = 0.65 + ((i + k) % 3) * 0.25;
          if (!hasMinSpacing(px, pz, 1.9 * s)) continue;
          const ry = st.y - 0.1;
          rockCoords.push({ x: px, y: ry, z: pz, s, i: i * 16 + k });
          placedProps.push({ x: px, z: pz, clearRadius: 1.9 * s });
          this.addSolidCollider({
            kind: 'circle',
            x: px,
            z: pz,
            r: 1.45 * s,
            minY: ry - 0.6,
            maxY: ry + 1.8 * s,
          });
        } else if (i <= 24) {
          const scale = 0.92 + ((i + k) % 5) * 0.14;
          if (!hasMinSpacing(px, pz, 2.2 * scale)) continue;
          const ty = st.y - 0.12;
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
      const cliffRockGeo = new THREE.DodecahedronGeometry(1.75, 0);
      cliffRockGeo.translate(0, 0.72, 0);
      const cliffRockMat = new THREE.MeshStandardMaterial({ color: '#57534e', roughness: 0.95 });
      const cliffInst = new THREE.InstancedMesh(cliffRockGeo, cliffRockMat, rockCoords.length);
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
      this.scene.add(cliffInst);
    }

    if (treePositions.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.32, 0.5, 3.0, 7);
      trunkGeo.translate(0, 1.35, 0);
      const cone1Geo = new THREE.ConeGeometry(2.25, 4.1, 7);
      cone1Geo.translate(0, 3.9, 0);
      const cone2Geo = new THREE.ConeGeometry(1.68, 3.5, 7);
      cone2Geo.translate(0, 5.7, 0);
      const cone3Geo = new THREE.ConeGeometry(1.08, 2.7, 7);
      cone3Geo.translate(0, 7.3, 0);

      const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.95 });
      const leafMat1 = new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.85 });
      const leafMat2 = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.82 });
      const leafMat3 = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 });

      const count = treePositions.length;
      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
      const cone1Inst = new THREE.InstancedMesh(cone1Geo, leafMat1, count);
      const cone2Inst = new THREE.InstancedMesh(cone2Geo, leafMat2, count);
      const cone3Inst = new THREE.InstancedMesh(cone3Geo, leafMat3, count);

      treePositions.forEach((t, i) => {
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.set(0, t.rotY, 0);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);
        cone1Inst.setMatrixAt(i, dummy.matrix);
        cone2Inst.setMatrixAt(i, dummy.matrix);
        cone3Inst.setMatrixAt(i, dummy.matrix);

        tint.setHSL(0.33 + (i % 6) * 0.014, 0.56, 0.27 + (i % 4) * 0.035);
        cone1Inst.setColorAt(i, tint);
        cone2Inst.setColorAt(i, tint);
        cone3Inst.setColorAt(i, tint);
      });

      [trunkInst, cone1Inst, cone2Inst, cone3Inst].forEach((inst) => {
        inst.computeBoundingSphere();
        this.scene.add(inst);
      });
    }

    // Soft atmospheric clouds drifting in the lower chasm & high around the spiral peaks
    const cloudMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.84,
      roughness: 1,
    });
    for (let i = 0; i < 18; i++) {
      const cg = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(18 + p * 5, 8, 6), cloudMat);
        puff.position.set((p - 1) * 16, (p % 2) * 4.5, 0);
        puff.scale.y = 0.42;
        cg.add(puff);
      }
      const lowDeck = i < 8;
      cg.position.set(
        -520 + (i % 6) * 210,
        lowDeck ? -48 - (i % 3) * 18 : 195 + (i % 5) * 28,
        -380 + (i % 5) * 190,
      );
      this.scene.add(cg);
      this.clouds.push({ group: cg, speed: 2.8 + (i % 4) * 1.2 });
    }

    // Mountain bird flocks circling around the spiral sky islands
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
      const cx = ((i % 5) - 2) * 95;
      const cz = -120 + Math.floor(i / 5) * 220;
      const baseY = 65 + (i % 5) * 46;
      bg.position.set(cx, baseY, cz);
      this.scene.add(bg);
      this.birds.push({
        group: bg,
        leftWing: lw,
        rightWing: rw,
        centerX: cx,
        centerZ: cz,
        baseY,
        radius: 50 + (i % 3) * 25,
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

  public applyEnvironment(timeOfDay: TimeOfDay, weather: WeatherType, immediate = false) {
    this.baseTimeOfDay = timeOfDay;
    this.baseWeather = weather;
    const effectiveWeather: WeatherType =
      this.tempWeatherOverride === 'heavy_rain'
        ? 'hujan'
        : this.tempWeatherOverride === 'thick_fog'
          ? 'berkabut'
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
    this.envTarget.fogDensity = 0.00075;

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
      this.envTarget.fogDensity = 0.0015;
      this.envTarget.sky.lerp(new THREE.Color('#dbe4ee'), 0.78);
      this.envTarget.fog.copy(this.envTarget.sky);
      this.envTarget.hemiSkyColor.set('#f1f5f9');
      this.envTarget.hemiGroundColor.set('#64748b');
      this.envTarget.sunColor.set('#f1f5f9');
      this.envTarget.sunIntensity *= 0.75;
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
      const st = ISLAND_STAGES[clamp(islIdx, 1, 24)];
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
    if (type === 'hail' || type === 'landslide' || type === 'all') {
      for (const h of this.iceHails) {
        h.active = false;
        h.mesh.visible = false;
      }
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
    if (type === 'heavy_rain' || type === 'thick_fog' || type === 'all') {
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

  // --- LANDSLIDE BOULDERS & ROLLING LOGS ---
  public spawnLandslideAhead(playerX: number, playerZ: number, forcedCount?: number) {
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const minC = lvl.landslideCountMin;
    const maxC = lvl.landslideCountMax;
    const count =
      forcedCount !== undefined
        ? forcedCount
        : minC + Math.floor(Math.random() * (maxC - minC + 1));

    const maxCap = 48;
    for (let i = 0; i < count && this.boulders.length < maxCap; i++) {
      const ahead = this.getTrailPointAhead(playerX, playerZ, 14 + Math.random() * 14);
      let sx = ahead.x + (Math.random() - 0.5) * 4.5;
      let sz = ahead.z + (Math.random() - 0.5) * 4.5;
      let trailY = this.getGroundHeight(sx, sz);
      if (trailY < -100) {
        sx = ahead.x;
        sz = ahead.z;
        trailY = this.getNearestTrailInfo(sx, sz).y;
      }
      const sy = trailY + 8 + Math.random() * 12 + (i % 4) * 2.0;

      const mesh = new THREE.Mesh(this.rockGeo, this.rockMat);
      const scale = 0.72 + Math.random() * 0.58;
      mesh.scale.setScalar(scale);
      mesh.position.set(sx, sy, sz);
      this.scene.add(mesh);

      const dx = playerX - sx;
      const dz = playerZ - sz;
      const len = Math.hypot(dx, dz) || 1;
      const speed = (10.5 + Math.random() * 4.5) * lvl.speedMult;

      this.boulders.push({
        mesh,
        vx: (dx / len) * speed,
        vy: -1.5 - Math.random() * 3.0,
        vz: (dz / len) * speed,
        rotSpeed: 4.5 * lvl.speedMult,
        radius: 1.15 * scale,
        age: 0,
      });
    }

    this.landslideShakeTimer = Math.max(this.landslideShakeTimer, 1.35);

    const logAhead = this.getTrailPointAhead(playerX, playerZ, 18 + Math.random() * 8);
    const logCount = this.difficultyLevel >= 7 ? 2 : this.difficultyLevel >= 3 ? 1 : 0;
    for (let l = 0; l < logCount; l++) {
      const logMesh = new THREE.Mesh(this.logGeo, this.logMat);
      const baseLogY = this.getGroundHeight(logAhead.x, logAhead.z);
      const sy = (baseLogY > -100 ? baseLogY : logAhead.y) + 2.2 + l * 1.3;
      logMesh.position.set(logAhead.x, sy, logAhead.z);
      logMesh.rotation.y = Math.atan2(-logAhead.tx, -logAhead.tz);
      this.scene.add(logMesh);
      const speed = 10.5 * lvl.speedMult;
      this.rollingLogs.push({
        mesh: logMesh,
        vx: -logAhead.tx * speed,
        vy: 0,
        vz: -logAhead.tz * speed,
        radius: 0.64,
        age: 0,
      });
    }
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
      const ahead = this.getTrailPointAhead(playerX, playerZ, 12 + i * 7 + Math.random() * 5);
      if (this.isInsideAnyCheckpointSafeZone(ahead.x, ahead.z)) continue;
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

  // --- WIND ZONE PUSH (STUDENTS ONLY) ---
  public applyWindPush(pos: THREE.Vector3, dt: number, isPaused: boolean): boolean {
    if (isPaused) return false;
    const lvl = DIFFICULTY_LEVELS[this.difficultyLevel] || DIFFICULTY_LEVELS[3];
    const windStrength = 3.2 + lvl.speedMult * 1.4;
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
    // 1. Sequential CP anti-cheat validation
    for (let c = currentCP + 2; c <= 25; c++) {
      const cp = CP_POINTS[c];
      if (Math.hypot(pos.x - cp.x, pos.z - cp.z) < 9.5 && Math.abs(pos.y - cp.y) < 10) {
        return { blockedByGateCp: null, skippedAheadCp: c };
      }
    }
    if (!completedCPs.includes(25)) {
      if (
        Math.hypot(pos.x - SUMMIT_EXAM_POINT.x, pos.z - SUMMIT_EXAM_POINT.z) < 11.5 &&
        Math.abs(pos.y - SUMMIT_EXAM_POINT.y) < 12
      ) {
        return { blockedByGateCp: null, skippedAheadCp: 26 };
      }
    }

    // 2. CP Energy Barrier Gate positioned cleanly across the outgoing bridge mouth
    let blockedByGateCp: number | null = null;
    const targetCpIdx = currentCP < 25 ? currentCP + 1 : 25;
    if (targetCpIdx <= 25 && !completedCPs.includes(targetCpIdx)) {
      const gateCp = ISLAND_STAGES[targetCpIdx];
      const nextCp = ISLAND_STAGES[targetCpIdx + 1];
      const gdx = nextCp.x - gateCp.x;
      const gdz = nextCp.z - gateCp.z;
      const gLen = Math.hypot(gdx, gdz) || 1;
      const ux = gdx / gLen;
      const uz = gdz / gLen;
      const gateDist = gateCp.rTop - 1.4;
      const dx = pos.x - gateCp.x;
      const dz = pos.z - gateCp.z;
      const projPast = dx * ux + dz * uz;
      const perp = Math.abs(-dx * uz + dz * ux);
      if (perp < 5.5 && Math.abs(pos.y - gateCp.y) < 5.0 && projPast > gateDist && projPast < gateDist + 8.0) {
        const pushBack = projPast - gateDist;
        pos.x -= ux * pushBack;
        pos.z -= uz * pushBack;
        blockedByGateCp = targetCpIdx;
      }
    }

    // Outer bounds clamp (open chasms remain drop-through so cliff falls respawn cleanly)
    pos.x = clamp(pos.x, -460, 460);
    pos.z = clamp(pos.z, -460, 460);

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
    const checked = new Set<SolidCollider>();

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

  public getSurfaceTypeAt(x: number, z: number): 'dirt' | 'stone' | 'wood' {
    if (this.getBridgeHeightAt(x, z) !== null) return 'wood';
    for (let i = 0; i < ISLAND_STAGES.length; i++) {
      const st = ISLAND_STAGES[i];
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
        ? SUMMIT_EXAM_POINT
        : CP_POINTS[Math.min(25, Math.max(0, nextCpIndex))];
    const lookAngle = camYaw + Math.PI;
    const sinA = Math.sin(lookAngle);
    const cosA = Math.cos(lookAngle);
    const range = 180;

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
      if (Math.hypot(pos.x - playerPos.x, pos.z - playerPos.z) > 320) continue;
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
  ): { hitBy: HazardHitType | null; hitIceHail: boolean; shakeIntensity: number } {
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
      if (c.group.position.x > 620) c.group.position.x = -620;
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

    if (isPaused) return { hitBy: null, hitIceHail: false, shakeIntensity: 0 };

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
    const quakeShake = this.earthquakeTimer > 0 ? Math.min(0.95, 0.35 + this.difficultyLevel * 0.055) : 0;
    const landShake = this.landslideShakeTimer > 0 ? 0.22 : 0;
    const metShake = this.meteorShakeTimer > 0 ? 0.48 : 0;
    const shakeIntensity = Math.max(quakeShake, landShake, metShake);

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

    // Rickety bridge planks at high difficulty (>=7)
    if (!playerInSafeCP && this.difficultyLevel >= 7) {
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

    // Update Landslide Boulders (bounce on islands/bridges, drop cleanly through chasms)
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i];
      b.age += dt;
      if (b.age >= 8.0) {
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

    // Update Rolling Logs
    for (let i = this.rollingLogs.length - 1; i >= 0; i--) {
      const rl = this.rollingLogs[i];
      rl.age += dt;
      if (rl.age >= 7.5) {
        this.scene.remove(rl.mesh);
        this.rollingLogs.splice(i, 1);
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

    return { hitBy, hitIceHail, shakeIntensity };
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredBound);
    this.envMapTexture?.dispose();
    this.blobShadowTexture?.dispose();
    this.blobShadowGeo?.dispose();
    this.sharedBlobShadowMat?.dispose();
    this.rockGeo.dispose();
    this.rockMat.dispose();
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
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

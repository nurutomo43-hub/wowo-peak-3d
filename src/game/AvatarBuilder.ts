import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  DEFAULT_STUDENT_AVATAR,
  DEFAULT_TEACHER_AVATAR,
  type AvatarConfig,
  type BackGearType,
  type CharacterCostumeId,
  type EmoteType,
  type EyeStyleType,
  type FaceAgeType,
  type FaceExpressionType,
  type GenderType,
  type HairStyle,
  type HeadAccessoryType,
  type NeckAccessoryType,
  type OutfitType,
  type PantsStyleType,
  type Role,
  type WristAccessoryType,
} from '../types/game';
import {
  canonicalizeCharacterAndForm,
  resolveCharacterSpec,
  type CostumeStyleSpec,
} from './CharacterCatalog';

export type AvatarPoseState = 'idle' | 'walk' | 'jump' | 'climb' | 'slide' | 'hurt';

export interface R15JointRig {
  bodyRig: THREE.Group;
  lowerTorso: THREE.Group;
  upperTorso: THREE.Group;
  headGroup: THREE.Group;
  leftUpperArm: THREE.Group;
  leftLowerArm: THREE.Group;
  leftHand: THREE.Group;
  rightUpperArm: THREE.Group;
  rightLowerArm: THREE.Group;
  rightHand: THREE.Group;
  leftUpperLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  leftFoot: THREE.Group;
  rightUpperLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  rightFoot: THREE.Group;
  capeUpper?: THREE.Object3D;
  capeLower?: THREE.Object3D;
  ponchoHem?: THREE.Object3D;
  ponchoHood?: THREE.Object3D;
  jetFlames?: THREE.Object3D[];
  headlampSpot?: THREE.SpotLight;
  headlampBulbMat?: THREE.MeshStandardMaterial;
  auraRing?: THREE.Mesh;
  auraParticles?: Array<{ mesh: THREE.Object3D; phase: number; radius: number; speed: number; baseY: number }>;
  propPivot?: THREE.Object3D;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

interface CachedFaceEntry {
  texture: THREE.CanvasTexture;
  refs: number;
}
const faceTextureCache = new Map<string, CachedFaceEntry>();
const MAX_FACE_CACHE = 72;

function markShared<T extends THREE.BufferGeometry>(geo: T): T {
  geo.userData.shared = true;
  return geo;
}

const SHARED_GEO = {
  facePlane: markShared(new THREE.PlaneGeometry(0.45, 0.45)),
  headBox: markShared(new RoundedBoxGeometry(0.52, 0.52, 0.5, 3, 0.18)),
  torsoFrontMale: markShared(new THREE.PlaneGeometry(0.67, 0.54)),
  torsoFrontFemale: markShared(new THREE.PlaneGeometry(0.5, 0.54)),
  hairRearShell: markShared(new RoundedBoxGeometry(0.55, 0.48, 0.17, 2, 0.08)),
  hairCrown: markShared(new RoundedBoxGeometry(0.56, 0.23, 0.55, 2, 0.1)),
  hairCapShort: markShared(new RoundedBoxGeometry(0.55, 0.22, 0.54, 2, 0.1)),
  hairSideShort: markShared(new RoundedBoxGeometry(0.08, 0.2, 0.28, 1, 0.03)),
  hairBangCone: markShared(new THREE.ConeGeometry(0.072, 0.15, 5)),
  hairSpikeCone: markShared(new THREE.ConeGeometry(0.078, 0.24, 6)),
  hairGonSpikeCone: markShared(new THREE.ConeGeometry(0.095, 0.4, 6)),
  hairBangSide: markShared(new RoundedBoxGeometry(0.24, 0.13, 0.1, 2, 0.04)),
  hairCurlSphere: markShared(new THREE.SphereGeometry(0.11, 8, 6)),
  mohawkFin: markShared(new THREE.BoxGeometry(0.085, 0.2, 0.48)),
  mohawkSpike: markShared(new THREE.ConeGeometry(0.055, 0.16, 4)),
  braidSeg: markShared(new THREE.SphereGeometry(0.07, 8, 6)),
  braidTip: markShared(new THREE.ConeGeometry(0.052, 0.12, 6)),
  ponytailTail: markShared(new THREE.CylinderGeometry(0.075, 0.048, 0.42, 8)),
  hijabWrap: markShared(new RoundedBoxGeometry(0.58, 0.58, 0.56, 3, 0.18)),
  hijabDrape: markShared(new THREE.CylinderGeometry(0.24, 0.37, 0.32, 12)),
  hijabFold: markShared(new THREE.TorusGeometry(0.265, 0.038, 6, 14, Math.PI * 1.15)),
  hijabSportCap: markShared(new RoundedBoxGeometry(0.56, 0.54, 0.54, 3, 0.17)),
  hijabSportNeck: markShared(new THREE.CylinderGeometry(0.2, 0.26, 0.22, 10)),
  hijabPin: markShared(new THREE.SphereGeometry(0.026, 8, 6)),
  elderBeard: markShared(new THREE.ConeGeometry(0.14, 0.22, 7)),
  watchBand: markShared(new THREE.CylinderGeometry(0.112, 0.112, 0.055, 10)),
  watchDial: markShared(new THREE.BoxGeometry(0.06, 0.045, 0.03)),
  scarfRing: markShared(new THREE.TorusGeometry(0.23, 0.058, 6, 14)),
  scarfTail: markShared(new THREE.BoxGeometry(0.14, 0.36, 0.045)),
  slingStrap: markShared(new THREE.BoxGeometry(0.065, 0.78, 0.38)),
  slingBag: markShared(new RoundedBoxGeometry(0.24, 0.28, 0.16, 2, 0.04)),
  hairpinBar: markShared(new THREE.BoxGeometry(0.09, 0.032, 0.03)),
  hairpinBow: markShared(new THREE.SphereGeometry(0.038, 8, 6)),
};

export function disposeAvatarGroup(root: THREE.Object3D | null | undefined) {
  if (!root) return;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry && !mesh.geometry.userData?.shared) {
      mesh.geometry.dispose();
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      const std = mat as THREE.MeshStandardMaterial;
      if (std.map) {
        const refKey = std.map.userData?.faceCacheKey as string | undefined;
        if (refKey) {
          const entry = faceTextureCache.get(refKey);
          if (entry) {
            entry.refs -= 1;
            if (entry.refs <= 0) {
              entry.texture.dispose();
              faceTextureCache.delete(refKey);
            }
          }
        } else if (!std.map.userData?.sharedTexture) {
          std.map.dispose();
        }
      }
      mat.dispose();
    }
  });
}

function getProceduralTexture(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 512,
  h = 512,
): THREE.CanvasTexture {
  const existing = textureCache.get(key);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.userData.sharedTexture = true;
  textureCache.set(key, tex);
  return tex;
}

export interface AnimeFaceOptions {
  characterId: CharacterCostumeId;
  expression?: FaceExpressionType;
  age?: FaceAgeType;
  eyeStyle?: EyeStyleType;
  isFemale?: boolean;
  hairColor?: string;
  spec?: CostumeStyleSpec;
}

function drawSharinganIris(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(9,9,11,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMangekyouIris(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#09090b';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(a + 0.55) * r * 0.85,
      cy + Math.sin(a + 0.55) * r * 0.85,
      cx + Math.cos(a) * r * 0.88,
      cy + Math.sin(a) * r * 0.88,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawRinneganIris(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.fillStyle = '#d8b4fe';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e1b4b';
  ctx.lineWidth = 1.2;
  [1, 0.72, 0.44].forEach((scale) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * scale, ry * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(rx, ry) * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawImuIris(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

function drawSageIris(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx - r * 0.78, cy - 2.4, r * 1.56, 4.8);
}

function drawAnimeFaceCanvas(ctx: CanvasRenderingContext2D, opts: AnimeFaceOptions) {
  const W = 128;
  const H = 128;
  ctx.clearRect(0, 0, W, H);

  const id = opts.characterId;
  const spec = opts.spec;
  const exp: FaceExpressionType =
    opts.expression && opts.expression !== 'auto'
      ? opts.expression
      : spec?.defaultExpression || 'auto';
  const age = opts.age || 'young';
  const eyeStyle: EyeStyleType =
    opts.eyeStyle && opts.eyeStyle !== 'auto'
      ? opts.eyeStyle
      : spec?.defaultEye || 'auto';
  const isElder = age === 'elder' || exp === 'elder_wise';
  const isFemale = Boolean(opts.isFemale) || Boolean(spec?.isFemale);
  const faceMark = spec?.faceMark || 'none';

  // Imu-sama Abyssal Silhouette: pitch black face with glowing concentric Imu eyes
  if (spec?.imuSilhouette) {
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, W, H);
    const ilx = 40;
    const irx = 88;
    const iey = 54;
    [ilx, irx].forEach((cx) => {
      drawImuIris(ctx, cx, iey, 12);
    });
    return;
  }

  const lx = 40; // Viewer's left = Character's Right (+-side)
  const rx = 88; // Viewer's right = Character's Left (+X)
  const ey = 54;

  // 1. Optional Sage Mode orange eyelid pigmentation
  if (eyeStyle === 'sage') {
    ctx.fillStyle = 'rgba(234, 88, 12, 0.72)';
    [lx, rx].forEach((cx) => {
      ctx.beginPath();
      ctx.ellipse(cx, ey - 1, 18, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 2. Character-specific cheek / under-eye / forehead marks
  if (id === 'naruto' || id === 'boruto' || faceMark === 'naruto_whiskers' || faceMark === 'boruto_whiskers') {
    const lineCount = id === 'boruto' || faceMark === 'boruto_whiskers' ? 2 : 3;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < lineCount; i++) {
      const y = 69 + i * 6;
      ctx.beginPath();
      ctx.moveTo(14, y - 1);
      ctx.lineTo(31, y + 1);
      ctx.moveTo(114, y - 1);
      ctx.lineTo(97, y + 1);
      ctx.stroke();
    }
  } else if (id === 'ace' || faceMark === 'ace_freckles') {
    ctx.fillStyle = '#78350f';
    [
      [25, 70], [31, 74], [27, 77], [35, 71],
      [103, 70], [97, 74], [101, 77], [93, 71],
    ].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (id === 'luffy' || faceMark === 'luffy_scar') {
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(81, 68);
    ctx.quadraticCurveTo(90, 74, 100, 69);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    [85, 91, 96].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx, 67);
      ctx.lineTo(sx, 75);
      ctx.stroke();
    });
  } else if (id === 'itachi' || faceMark === 'itachi_lines') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(41, 68);
    ctx.quadraticCurveTo(36, 78, 30, 84);
    ctx.moveTo(87, 68);
    ctx.quadraticCurveTo(92, 78, 98, 84);
    ctx.stroke();
  } else if (id === 'law' || faceMark === 'law_dark_eyes') {
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 3;
    [lx, rx].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, ey + 3, 12, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    });
  } else if (id === 'hisoka' || faceMark === 'hisoka_marks') {
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rad = i % 2 === 0 ? 7.5 : 3.4;
      const px = 26 + Math.cos(a) * rad;
      const py = 74 + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(102, 66);
    ctx.quadraticCurveTo(109, 77, 102, 82);
    ctx.quadraticCurveTo(95, 77, 102, 66);
    ctx.fill();
  } else if (id === 'zeno' || faceMark === 'zeno_stripes') {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(14, 65, 9, 16);
    ctx.fillRect(105, 65, 9, 16);
  } else if (id === 'ulquiorra' || faceMark === 'ulquiorra_tears') {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(lx - 3, 66, 6, 22);
    ctx.fillRect(rx - 3, 66, 6, 22);
  } else if (id === 'tsunade' || id === 'sakura' || faceMark === 'byakugou') {
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.moveTo(64, 18);
    ctx.lineTo(70, 26);
    ctx.lineTo(64, 34);
    ctx.lineTo(58, 26);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'yamamoto' || faceMark === 'yamamoto_scar') {
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(72, 16);
    ctx.lineTo(94, 34);
    ctx.moveTo(92, 16);
    ctx.lineTo(74, 34);
    ctx.stroke();
  } else if (id === 'krishna' || faceMark === 'krishna_tilak') {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(58, 20);
    ctx.quadraticCurveTo(64, 32, 70, 20);
    ctx.stroke();
  } else if (id === 'siwa' || faceMark === 'shiva_third_eye' || faceMark === 'third_eye') {
    ctx.fillStyle = faceMark === 'shiva_third_eye' ? '#ef4444' : '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(64, 24, 3.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (faceMark === 'sukuna_tattoos' || faceMark === 'sukuna_heian') {
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.8;
    // Nose bridge bar & cheek stripes
    ctx.fillStyle = '#09090b';
    ctx.fillRect(54, 59, 20, 4);
    ctx.beginPath();
    ctx.moveTo(16, 68); ctx.lineTo(31, 66);
    ctx.moveTo(16, 76); ctx.lineTo(31, 74);
    ctx.moveTo(112, 68); ctx.lineTo(97, 66);
    ctx.moveTo(112, 76); ctx.lineTo(97, 74);
    ctx.stroke();
    // Forehead double curved stripes
    ctx.beginPath();
    ctx.moveTo(46, 20); ctx.quadraticCurveTo(64, 27, 82, 20);
    ctx.stroke();
    // Extra lower pair of Sukuna eyes
    [lx - 2, rx + 2].forEach((sx) => {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(sx, 71, 6.5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(sx, 71, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (faceMark === 'karma_boruto' || faceMark === 'karma_kawaki') {
    const kColor = faceMark === 'karma_kawaki' ? '#ef4444' : '#38bdf8';
    ctx.strokeStyle = kColor;
    ctx.fillStyle = kColor;
    ctx.lineWidth = 2.6;
    const kx = faceMark === 'karma_kawaki' ? 22 : 96;
    ctx.beginPath();
    ctx.moveTo(kx, 22);
    ctx.lineTo(kx + 8, 30);
    ctx.lineTo(kx, 38);
    ctx.lineTo(kx - 8, 30);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(kx, 38);
    ctx.lineTo(kx, 76);
    ctx.stroke();
  } else if (faceMark === 'titan_marks') {
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.2;
    [lx, rx].forEach((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx - 5, ey + 13);
      ctx.lineTo(cx - 8, ey + 24);
      ctx.moveTo(cx + 3, ey + 13);
      ctx.lineTo(cx + 6, ey + 25);
      ctx.stroke();
    });
  } else if (faceMark === 'majin_m') {
    ctx.fillStyle = '#09090b';
    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', 64, 30);
  } else if (faceMark === 'kaguya_byakugan') {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(64, 24, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (faceMark === 'garp_scar') {
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(rx - 4, ey - 16);
    ctx.lineTo(rx + 4, ey + 16);
    ctx.stroke();
  } else if ((isFemale && exp === 'auto') || exp === 'shy') {
    ctx.fillStyle = exp === 'shy' ? 'rgba(244, 63, 94, 0.45)' : 'rgba(244, 114, 182, 0.28)';
    ctx.beginPath();
    ctx.ellipse(27, 69, 9, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(101, 69, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (exp === 'shy') {
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 1.6;
      [22, 27, 32, 96, 101, 106].forEach((bx) => {
        ctx.beginPath();
        ctx.moveTo(bx, 66);
        ctx.lineTo(bx - 3, 73);
        ctx.stroke();
      });
    }
  }

  // 3. Determine effective eye appearance & iris color
  let effectiveEye: EyeStyleType = eyeStyle;
  if (effectiveEye === 'auto') {
    if (id === 'sasuke' || id === 'itachi' || id === 'madara' || id === 'kakashi' || id === 'obito') {
      effectiveEye = 'sharingan';
    } else if (id === 'goku_ssj') {
      effectiveEye = 'ssj';
    } else {
      effectiveEye = 'normal';
    }
  }

  let irisColor = spec?.irisColor || '#1e293b';
  if (!spec?.irisColor) {
    if (id === 'naruto' || id === 'boruto' || id === 'boa_hancock' || id === 'killua' || id === 'minato' || id === 'gohan') {
      irisColor = id === 'boa_hancock' || id === 'naruto' || id === 'boruto' || id === 'killua' ? '#0284c7' : '#1e293b';
    } else if (id === 'ichigo' || id === 'gon') {
      irisColor = '#b45309';
    } else if (id === 'zoro' || id === 'ulquiorra') {
      irisColor = '#15803d';
    } else if (id === 'beerus') {
      irisColor = '#f59e0b';
    } else if (id === 'whis') {
      irisColor = '#7e22ce';
    } else if (id === 'hisoka') {
      irisColor = '#eab308';
    } else if (id === 'law') {
      irisColor = '#ca8a04';
    } else if (isFemale) {
      irisColor = '#1e3a8a';
    }
  }

  // 4. Draw Eyes
  const drawSingleEye = (cx: number, isLeftCharacterSide: boolean) => {
    // Kakashi hides character's right eye behind slanted headband unless overridden, or shows dark normal eye + sharingan on left eye
    if (id === 'kakashi' && !isLeftCharacterSide && eyeStyle === 'auto' && exp === 'auto') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 14, ey - 10, 28, 18);
      return;
    }

    // Zoro keeps character's left eye closed with vertical slash scar when auto
    if (id === 'zoro' && isLeftCharacterSide && exp === 'auto' && eyeStyle === 'auto') {
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 11, ey + 1);
      ctx.lineTo(cx + 11, ey - 1);
      ctx.stroke();
      // Vertical scar across eye
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(cx + 2, ey - 16);
      ctx.lineTo(cx - 3, ey + 18);
      ctx.stroke();
      return;
    }

    // Kenpachi wears black eyepatch over character's right eye (viewer left)
    if (id === 'kenpachi' && !isLeftCharacterSide && eyeStyle === 'auto') {
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, 34);
      ctx.lineTo(cx + 14, ey + 12);
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(cx, ey, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Laughing closed happy curved eyes (^ ^)
    if (exp === 'laugh' && eyeStyle === 'auto') {
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, ey + 5, 11, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      return;
    }

    // Shocked huge round white eyes
    if (exp === 'shocked') {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cx, ey, 14.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (effectiveEye === 'sharingan') {
        drawSharinganIris(ctx, cx, ey, 6);
      } else if (effectiveEye === 'rinnegan') {
        drawRinneganIris(ctx, cx, ey, 13, 13);
      } else if (effectiveEye === 'imu') {
        drawImuIris(ctx, cx, ey, 8);
      } else if (effectiveEye === 'sage') {
        drawSageIris(ctx, cx, ey, 7);
      } else {
        ctx.fillStyle = effectiveEye === 'ssj' ? '#14b8a6' : '#09090b';
        ctx.beginPath();
        ctx.arc(cx, ey, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Beerus cat-like yellow slanted eyes
    if (id === 'beerus' && eyeStyle === 'auto') {
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(cx, ey, 12, 7.5, isLeftCharacterSide ? -0.25 : 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(cx, ey, 2.3, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Zeno big wide circular dark eyes
    if (id === 'zeno' && eyeStyle === 'auto' && exp === 'auto') {
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(cx, ey, 11.5, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 3.5, ey - 4, 3.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Standard / Anime Sclera
    const eyeRx = 12.5;
    const eyeRy =
      exp === 'cool' || exp === 'sleepy'
        ? 8.0
        : exp === 'chibi'
          ? 14.5
          : id === 'gon' || id === 'luffy' || id === 'luffy_gear5'
            ? 13
            : 11.5;

    ctx.fillStyle = spec?.scleraColor || (effectiveEye === 'upper_moon' ? '#fef3c7' : '#ffffff');
    ctx.beginPath();
    ctx.ellipse(cx, ey, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris rendering
    const ir = effectiveEye === 'ssj' ? 8 : 8.8;
    if (effectiveEye === 'sharingan') {
      drawSharinganIris(ctx, cx, ey, ir);
    } else if (effectiveEye === 'mangekyou') {
      drawMangekyouIris(ctx, cx, ey, ir);
    } else if (effectiveEye === 'rinnegan') {
      drawRinneganIris(ctx, cx, ey, eyeRx - 0.5, eyeRy - 0.5);
    } else if (effectiveEye === 'imu') {
      drawImuIris(ctx, cx, ey, ir);
    } else if (effectiveEye === 'sage') {
      drawSageIris(ctx, cx, ey, ir);
    } else if (effectiveEye === 'byakugan') {
      ctx.fillStyle = '#e0e7ff';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#c7d2fe';
      ctx.beginPath();
      ctx.arc(cx, ey, ir * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'kyuubi') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(cx, ey, 2.2, ir * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'nika') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(cx, ey, 8.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, ey, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'mihawk') {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, ey, ir * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, ey, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'six_eyes') {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.arc(cx, ey, ir * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 2.8, ey - 3, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'sukuna') {
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, ey, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cx + 2.5, ey - 2.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'ssj') {
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.ellipse(cx, ey, 8.2, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, ey, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 3, ey - 3.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'ui') {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, ey, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 2.5, ey - 2.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (effectiveEye === 'upper_moon') {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.fillRect(cx - 2, ey - 4, 4, 8);
    } else if (effectiveEye === 'geass') {
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(cx, ey, ir, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - 4, ey - 2);
      ctx.lineTo(cx, ey + 4);
      ctx.lineTo(cx + 4, ey - 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = irisColor;
      ctx.beginPath();
      ctx.ellipse(cx, ey + 0.5, 8.4, 9.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(cx, ey + 1, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + 3.2, ey - 3.6, 2.7, 0, Math.PI * 2);
      ctx.fill();
      if (id === 'gon' || isFemale || exp === 'chibi' || exp === 'shy') {
        ctx.beginPath();
        ctx.arc(cx - 2.6, ey + 3.6, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Thick anime upper eyelid
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = isFemale || id === 'gon' ? 3.4 : 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (exp === 'cool' || exp === 'sleepy') {
      ctx.moveTo(cx - eyeRx, ey - 2);
      ctx.lineTo(cx + eyeRx, ey - 2);
    } else {
      ctx.ellipse(cx, ey, eyeRx, eyeRy, 0, Math.PI * 1.08, Math.PI * 1.92);
    }
    ctx.stroke();

    // Feminine curved outer eyelashes
    if (isFemale || id === 'gon') {
      const dir = isLeftCharacterSide ? 1 : -1;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + dir * 11, ey - 5);
      ctx.lineTo(cx + dir * 16, ey - 9);
      ctx.moveTo(cx + dir * 12, ey - 1);
      ctx.lineTo(cx + dir * 17, ey - 3);
      ctx.stroke();
    }

    // Character eye scars
    if (id === 'kakashi' && isLeftCharacterSide) {
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx + 1, ey - 15);
      ctx.lineTo(cx - 2, ey + 15);
      ctx.stroke();
    } else if (id === 'boruto' && !isLeftCharacterSide) {
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - 2, ey - 14);
      ctx.lineTo(cx + 3, ey + 15);
      ctx.stroke();
    } else if ((id === 'shanks' || faceMark === 'shanks_scar') && isLeftCharacterSide) {
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      [-4, 0, 4].forEach((ox) => {
        ctx.beginPath();
        ctx.moveTo(cx + ox - 3, ey - 14);
        ctx.lineTo(cx + ox + 4, ey + 14);
        ctx.stroke();
      });
    } else if ((id === 'kenpachi' || faceMark === 'kenpachi_scar') && isLeftCharacterSide) {
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(74, 34);
      ctx.lineTo(106, 76);
      ctx.stroke();
    }
  };

  drawSingleEye(lx, false);
  drawSingleEye(rx, true);

  // Sanji blonde swept bang covering character's right eye + curly eyebrow on left eye
  if (id === 'sanji' && exp === 'auto' && eyeStyle === 'auto') {
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(16, 22);
    ctx.lineTo(58, 22);
    ctx.lineTo(50, 66);
    ctx.lineTo(20, 58);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Eyebrows
  const browColor = isElder
    ? '#f8fafc'
    : id === 'goku_ssj' || eyeStyle === 'ssj'
      ? '#facc15'
      : id === 'zoro'
        ? '#15803d'
        : id === 'sakura'
          ? '#db2777'
          : opts.hairColor && opts.hairColor !== '#ffffff'
            ? '#09090b'
            : '#1e293b';

  if (id === 'sanji') {
    // Sanji's iconic spiral curly eyebrow
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(rx - 12, 36);
    ctx.quadraticCurveTo(rx, 31, rx + 11, 37);
    ctx.arc(rx + 8, 39, 3.5, 0, Math.PI * 1.6);
    ctx.stroke();
  } else {
    ctx.strokeStyle = browColor;
    ctx.lineWidth = isElder ? 4.4 : id === 'madara' || id === 'vegeta' ? 3.8 : 2.8;
    ctx.lineCap = 'round';
    if (exp === 'angry' || (exp === 'auto' && (id === 'vegeta' || id === 'piccolo' || id === 'zoro' || id === 'madara' || id === 'kenpachi'))) {
      ctx.beginPath();
      ctx.moveTo(lx - 13, 33);
      ctx.lineTo(lx + 12, 41);
      ctx.moveTo(rx + 13, 33);
      ctx.lineTo(rx - 12, 41);
      ctx.stroke();
    } else if (exp === 'sad') {
      ctx.beginPath();
      ctx.moveTo(lx - 12, 40);
      ctx.lineTo(lx + 11, 34);
      ctx.moveTo(rx + 12, 40);
      ctx.lineTo(rx - 11, 34);
      ctx.stroke();
    } else if (exp === 'annoyed') {
      ctx.beginPath();
      ctx.moveTo(lx - 12, 36);
      ctx.lineTo(lx + 11, 39);
      ctx.moveTo(rx - 11, 35);
      ctx.lineTo(rx + 12, 32);
      ctx.stroke();
    } else if (exp === 'shocked') {
      ctx.beginPath();
      ctx.arc(lx, 36, 12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx, 36, 12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (id === 'luffy_gear5' && exp === 'auto') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.2;
      [lx, rx].forEach((bx) => {
        ctx.beginPath();
        ctx.arc(bx, 35, 8, 0, Math.PI * 1.6);
        ctx.stroke();
      });
    } else {
      ctx.beginPath();
      ctx.moveTo(lx - 12, 37);
      ctx.quadraticCurveTo(lx, 33, lx + 11, 36);
      ctx.moveTo(rx - 11, 36);
      ctx.quadraticCurveTo(rx, 33, rx + 12, 37);
      ctx.stroke();
    }
  }

  // Vegeta furrowed V-brow forehead crease
  if (id === 'vegeta') {
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(57, 36);
    ctx.lineTo(62, 43);
    ctx.moveTo(71, 36);
    ctx.lineTo(66, 43);
    ctx.stroke();
  }

  // 6. Elder wrinkles & teardrops
  if (isElder) {
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
    ctx.lineWidth = 1.6;
    [22, 27].forEach((wy) => {
      ctx.beginPath();
      ctx.moveTo(42, wy);
      ctx.quadraticCurveTo(64, wy - 2, 86, wy);
      ctx.stroke();
    });
    // Cheek / under-eye age lines
    ctx.beginPath();
    ctx.moveTo(28, 68);
    ctx.quadraticCurveTo(36, 75, 42, 82);
    ctx.moveTo(100, 68);
    ctx.quadraticCurveTo(92, 75, 86, 82);
    ctx.stroke();
  }

  if (exp === 'sad') {
    // Blue anime teardrops
    ctx.fillStyle = '#38bdf8';
    [lx - 6, rx + 6].forEach((tx) => {
      ctx.beginPath();
      ctx.moveTo(tx, 64);
      ctx.quadraticCurveTo(tx + 5, 74, tx, 79);
      ctx.quadraticCurveTo(tx - 5, 74, tx, 64);
      ctx.fill();
    });
  } else if (exp === 'shocked') {
    // Anime sweat drop on temple
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(110, 28);
    ctx.quadraticCurveTo(116, 39, 110, 44);
    ctx.quadraticCurveTo(104, 39, 110, 28);
    ctx.fill();
  }

  // 7. Otaku Glasses Overlay (when expression === 'otaku_glasses')
  if (exp === 'otaku_glasses') {
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 3.2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    [lx, rx].forEach((gx) => {
      ctx.fillRect(gx - 15, ey - 11, 30, 21);
      ctx.strokeRect(gx - 15, ey - 11, 30, 21);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(gx - 10, ey + 6);
      ctx.lineTo(gx + 8, ey - 8);
      ctx.stroke();
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3.2;
    });
    ctx.beginPath();
    ctx.moveTo(lx + 15, ey - 2);
    ctx.lineTo(rx - 15, ey - 2);
    ctx.stroke();
  }

  // 8. Nose & Mouth (Ninja mask covers lower face)
  if (id === 'kakashi' || exp === 'ninja_mask') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 69, W, H - 69);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 69);
    ctx.lineTo(W, 69);
    ctx.stroke();
    return;
  }

  if (id === 'beerus') {
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(58, 69);
    ctx.lineTo(70, 69);
    ctx.lineTo(64, 75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(14, 70); ctx.lineTo(30, 72);
    ctx.moveTo(14, 77); ctx.lineTo(30, 76);
    ctx.moveTo(114, 70); ctx.lineTo(98, 72);
    ctx.moveTo(114, 77); ctx.lineTo(98, 76);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(62, 71);
    ctx.lineTo(66, 72);
    ctx.stroke();
  }

  // Mouth
  const my = 89;
  if (exp === 'laugh' || (exp === 'auto' && (id === 'luffy' || id === 'luffy_gear5'))) {
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(44, my - 3);
    ctx.lineTo(84, my - 3);
    ctx.quadraticCurveTo(64, my + 20, 44, my - 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(48, my - 3, 32, 6);
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (exp === 'angry') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.rect(49, my - 3, 30, 9);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(57, my - 3); ctx.lineTo(57, my + 6);
    ctx.moveTo(71, my - 3); ctx.lineTo(71, my + 6);
    ctx.stroke();
  } else if (exp === 'annoyed') {
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(52, my + 3);
    ctx.quadraticCurveTo(64, my - 2, 76, my + 4);
    ctx.stroke();
  } else if (exp === 'sad') {
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(51, my + 6);
    ctx.quadraticCurveTo(64, my - 4, 77, my + 6);
    ctx.stroke();
  } else if (exp === 'shocked' || exp === 'sleepy') {
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(64, my + 3, exp === 'sleepy' ? 6 : 9, exp === 'sleepy' ? 7 : 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (exp === 'chibi') {
    // Cute ":3" cat smile
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(58, my, 6, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(70, my, 6, 0, Math.PI);
    ctx.stroke();
  } else if (exp === 'cool' || id === 'killua' || id === 'ace' || id === 'vegeta') {
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(53, my + 1);
    ctx.quadraticCurveTo(66, my + 5, 78, my - 3);
    ctx.stroke();
  } else {
    ctx.strokeStyle = isFemale ? '#be123c' : '#7c2d12';
    ctx.lineWidth = isFemale ? 2.8 : 2.6;
    ctx.beginPath();
    ctx.moveTo(51, my - 1);
    ctx.quadraticCurveTo(64, my + 9, 77, my - 1);
    ctx.stroke();
    if (id === 'piccolo') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(53, my);
      ctx.lineTo(56, my + 5);
      ctx.lineTo(59, my + 1);
      ctx.fill();
    }
  }

  // Trafalgar Law goatee
  if (id === 'law') {
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.moveTo(58, 102);
    ctx.lineTo(70, 102);
    ctx.lineTo(64, 116);
    ctx.closePath();
    ctx.fill();
  }

  // Character-specific Mustaches (Shirohige, Roger)
  if (faceMark === 'shirohige_stache' || faceMark === 'roger_stache') {
    ctx.fillStyle = faceMark === 'shirohige_stache' ? '#f8fafc' : '#09090b';
    ctx.strokeStyle = faceMark === 'shirohige_stache' ? '#94a3b8' : '#09090b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(64, 79);
    ctx.quadraticCurveTo(38, 72, 22, 86);
    ctx.quadraticCurveTo(44, 88, 64, 84);
    ctx.quadraticCurveTo(84, 88, 106, 86);
    ctx.quadraticCurveTo(90, 72, 64, 79);
    ctx.fill();
    ctx.stroke();
  }

  // Elder white mustache & beard
  if (isElder) {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(64, 82);
    ctx.quadraticCurveTo(46, 79, 36, 90);
    ctx.quadraticCurveTo(50, 91, 64, 86);
    ctx.quadraticCurveTo(78, 91, 92, 90);
    ctx.quadraticCurveTo(82, 79, 64, 82);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(46, 98);
    ctx.lineTo(82, 98);
    ctx.quadraticCurveTo(78, 122, 64, 124);
    ctx.quadraticCurveTo(50, 122, 46, 98);
    ctx.fill();
    ctx.stroke();
  }
}

export function getAnimeFaceTexture(opts: AnimeFaceOptions): THREE.CanvasTexture {
  const s = opts.spec;
  const key = [
    opts.characterId,
    opts.expression || 'auto',
    opts.age || 'young',
    opts.eyeStyle || 'auto',
    opts.isFemale || s?.isFemale ? 'F' : 'M',
    opts.hairColor || '',
    s?.faceMark || '',
    s?.defaultEye || '',
    s?.defaultExpression || '',
    s?.irisColor || '',
    s?.scleraColor || '',
    s?.imuSilhouette ? 'imu' : '',
  ].join('|');

  const existing = faceTextureCache.get(key);
  if (existing) {
    existing.refs += 1;
    faceTextureCache.delete(key);
    faceTextureCache.set(key, existing);
    return existing.texture;
  }

  if (faceTextureCache.size >= MAX_FACE_CACHE) {
    for (const [oldKey, oldEntry] of faceTextureCache.entries()) {
      if (oldEntry.refs <= 0) {
        oldEntry.texture.dispose();
        faceTextureCache.delete(oldKey);
        break;
      }
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawAnimeFaceCanvas(ctx, opts);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.userData.faceCacheKey = key;
  faceTextureCache.set(key, { texture: tex, refs: 1 });
  return tex;
}

function getBatikTexture(): THREE.CanvasTexture {
  return getProceduralTexture('batik_blangkon_512', (ctx, w, h) => {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 6;
    for (let y = 0; y < h; y += 64) {
      for (let x = 0; x < w; x += 64) {
        ctx.beginPath();
        ctx.arc(x + 32, y + 32, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x + 32, y + 32, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function getFlannelTexture(baseHex: string): THREE.CanvasTexture {
  return getProceduralTexture(`flannel_512_${baseHex}`, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,23,42,0.48)';
    for (let i = 0; i < w; i += 64) {
      ctx.fillRect(i, 0, 24, h);
      ctx.fillRect(0, i, w, 24);
    }
    ctx.fillStyle = 'rgba(248,250,252,0.34)';
    for (let i = 34; i < w; i += 64) {
      ctx.fillRect(i, 0, 8, h);
      ctx.fillRect(0, i, w, 8);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 2;
    for (let d = -w; d < w * 2; d += 16) {
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + h, h);
      ctx.stroke();
    }
  });
}

function getKebayaTexture(baseHex: string): THREE.CanvasTexture {
  return getProceduralTexture(`kebaya_512_${baseHex}`, (ctx, w, h) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 5;
    for (let y = 32; y < h; y += 64) {
      for (let x = 32; x < w; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Gold vertical embroidery border
    ctx.fillStyle = 'rgba(251, 191, 36, 0.38)';
    ctx.fillRect(w * 0.44, 0, w * 0.12, h);
  });
}

function getDailyOutfitTexture(outfit: OutfitType, baseHex: string): THREE.CanvasTexture | null {
  if (outfit === 'flannel') return getFlannelTexture(baseHex);
  if (outfit === 'kebaya') return getKebayaTexture(baseHex);
  if (outfit === 'poncho') return null;

  return getProceduralTexture(`daily_512_${outfit}_${baseHex}`, (ctx, w, h) => {
    ctx.fillStyle = outfit === 'school' ? '#f8fafc' : baseHex;
    ctx.fillRect(0, 0, w, h);

    // Subtle fabric weave
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let y = 0; y < h; y += 8) {
      ctx.fillRect(0, y, w, 2);
    }

    if (outfit === 'windbreaker' || outfit === 'outdoor_vest') {
      // Two-tone mountain jacket / female outdoor vest panels
      ctx.fillStyle = outfit === 'outdoor_vest' ? 'rgba(255,255,255,0.22)' : 'rgba(15, 23, 42, 0.42)';
      ctx.fillRect(0, 0, w, h * 0.28);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, h * 0.28, w, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(w * 0.485, 0, w * 0.03, h);
      ctx.fillStyle = '#e2e8f0';
      for (let y = 16; y < h - 16; y += 14) {
        ctx.fillRect(w * 0.492, y, w * 0.016, 6);
      }
      ctx.strokeStyle = 'rgba(248,250,252,0.5)';
      ctx.lineWidth = 5;
      ctx.strokeRect(w * 0.14, h * 0.56, w * 0.24, h * 0.28);
      ctx.strokeRect(w * 0.62, h * 0.56, w * 0.24, h * 0.28);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(w * 0.72, h * 0.42);
      ctx.lineTo(w * 0.78, h * 0.33);
      ctx.lineTo(w * 0.84, h * 0.42);
      ctx.closePath();
      ctx.fill();
    } else if (outfit === 'tactical_vest') {
      // Adventure T-shirt base with tactical chest vest straps & pockets
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(w * 0.08, h * 0.12, w * 0.34, h * 0.8);
      ctx.fillRect(w * 0.58, h * 0.12, w * 0.34, h * 0.8);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 6;
      ctx.strokeRect(w * 0.14, h * 0.52, w * 0.22, h * 0.24);
      ctx.strokeRect(w * 0.64, h * 0.52, w * 0.22, h * 0.24);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(w * 0.18, h * 0.3, w * 0.12, 16);
    } else if (outfit === 'tunic') {
      // Modest long tunic front placket & subtle embroidery trim
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(w * 0.46, 0, w * 0.08, h * 0.62);
      ctx.fillStyle = '#fde68a';
      [0.2, 0.34, 0.48].forEach((yp) => {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * yp, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(0, h * 0.88, w, h * 0.06);
    } else if (outfit === 'casual') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(w * 0.5, 0, w * 0.18, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      ctx.beginPath();
      ctx.moveTo(w * 0.34, h * 0.58);
      ctx.lineTo(w * 0.5, h * 0.34);
      ctx.lineTo(w * 0.66, h * 0.58);
      ctx.closePath();
      ctx.fill();
    } else if (outfit === 'formal') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(w * 0.47, h * 0.5, w * 0.06, h * 0.5);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(w * 0.68, h * 0.36, w * 0.14, 16);
      ctx.fillStyle = '#cbd5e1';
      [0.54, 0.7, 0.85].forEach((yp) => {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * yp, 9, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (outfit === 'school') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(w * 0.64, h * 0.38, w * 0.18, h * 0.22);
      ctx.fillStyle = baseHex;
      ctx.fillRect(w * 0.66, h * 0.4, w * 0.14, h * 0.06);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(w * 0.2, h * 0.38, w * 0.12, h * 0.07);
    } else if (outfit === 'koko') {
      ctx.strokeStyle = 'rgba(251,191,36,0.45)';
      ctx.lineWidth = 5;
      ctx.strokeRect(24, 24, w - 48, h - 48);
    }
  });
}

function getSpiderWebTexture(): THREE.CanvasTexture {
  return getProceduralTexture('spiderman_web_512', (ctx, w, h) => {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 6;
    for (let x = 0; x <= w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(w * 0.5, y + 18, w, y);
      ctx.stroke();
    }
    // Spider emblem in center
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, 24, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function getSupermanCrestTexture(): THREE.CanvasTexture {
  return getProceduralTexture('superman_crest_512', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(84, 72);
    ctx.lineTo(w - 84, 72);
    ctx.lineTo(w - 36, 184);
    ctx.lineTo(w / 2, h - 44);
    ctx.lineTo(36, 184);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dc2626';
    ctx.font = '900 260px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', w / 2, h / 2 + 10);
  });
}

function getCostumeChestTexture(
  suit: CharacterCostumeId,
  spec: CostumeStyleSpec,
  formId = 'base',
): THREE.CanvasTexture | null {
  if (suit === 'spiderman' && formId !== 'symbiote') return getSpiderWebTexture();
  if (spec.imuSilhouette) return null;
  return getProceduralTexture(
    `costume_256_${suit}_${formId}`,
    (ctx, w, h) => {
      ctx.fillStyle = spec.torso;
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)');
      grad.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pat = spec.chestPattern;
      if (pat === 'open_vest' || suit === 'luffy' || suit === 'luffy_gear5' || suit === 'ace') {
        ctx.fillStyle = spec.skin || '#f1c27d';
        ctx.fillRect(w * 0.3, 0, w * 0.4, h);
        if (suit === 'luffy' || suit === 'luffy_gear5' || pat === 'open_vest') {
          ctx.strokeStyle = '#b91c1c';
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(w * 0.36, h * 0.28);
          ctx.lineTo(w * 0.64, h * 0.56);
          ctx.moveTo(w * 0.64, h * 0.28);
          ctx.lineTo(w * 0.36, h * 0.56);
          ctx.stroke();
        }
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
      } else if (pat === 'scales_dark' || pat === 'scales_azure') {
        ctx.strokeStyle = pat === 'scales_azure' ? '#38bdf8' : '#7c3aed';
        ctx.lineWidth = 4;
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 5; col++) {
            ctx.beginPath();
            ctx.arc(w * (0.12 + col * 0.19), h * (0.14 + row * 0.16), 18, 0, Math.PI);
            ctx.stroke();
          }
        }
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
      } else if (pat === 'haki_armor') {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 8;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.45, 22 + i * 18, 0, Math.PI * 1.4);
          ctx.stroke();
        }
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.8, w, h * 0.2);
      } else if (pat === 'bandages') {
        ctx.fillStyle = '#e2e8f0';
        for (let y = 12; y < h; y += 34) {
          ctx.save();
          ctx.translate(w / 2, y);
          ctx.rotate((y % 68 === 12 ? 1 : -1) * 0.14);
          ctx.fillRect(-w * 0.52, -9, w * 1.04, 18);
          ctx.restore();
        }
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        for (let y = 26; y < h; y += 34) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      } else if (pat === 'sukuna_marks') {
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 10;
        [0.24, 0.76].forEach((xr) => {
          ctx.beginPath();
          ctx.arc(w * xr, h * 0.35, 34, 0, Math.PI);
          ctx.stroke();
        });
        ctx.fillStyle = '#09090b';
        ctx.fillRect(w * 0.46, h * 0.15, w * 0.08, h * 0.65);
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
      } else if (pat === 'survey_corps') {
        // Survey Corps white harnesses + chest shield pocket
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(w * 0.2, 0, w * 0.1, h);
        ctx.fillRect(w * 0.7, 0, w * 0.1, h);
        ctx.fillRect(0, h * 0.78, w, h * 0.14);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(w * 0.64, h * 0.28, w * 0.18, h * 0.22);
      } else if (pat === 'jjk_uniform') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(w * 0.68, h * 0.32, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.fillRect(w * 0.48, 0, w * 0.04, h);
      } else if (pat === 'kimono') {
        ctx.strokeStyle = spec.accent;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(w * 0.22, 0);
        ctx.lineTo(w * 0.68, h * 0.72);
        ctx.moveTo(w * 0.78, 0);
        ctx.lineTo(w * 0.32, h * 0.72);
        ctx.stroke();
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.74, w, h * 0.22);
      } else if (pat === 'royal_gold') {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 8;
        ctx.strokeRect(w * 0.12, h * 0.08, w * 0.76, h * 0.84);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.42, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(0, h * 0.78, w, h * 0.18);
      } else if (pat === 'doom_armor') {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(w * 0.14, h * 0.12, w * 0.72, h * 0.65);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(w * 0.22, h * 0.2, 16, 0, Math.PI * 2);
        ctx.arc(w * 0.78, h * 0.2, 16, 0, Math.PI * 2);
        ctx.fill();
      } else if (pat === 'strange_amulet') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.38, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.38, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.78, w, h * 0.18);
      } else if (pat === 'shinto_robe') {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(w * 0.25, 0);
        ctx.lineTo(w * 0.5, h * 0.44);
        ctx.lineTo(w * 0.75, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(0, h * 0.74, w, h * 0.26);
      } else if (pat === 'sternritter') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(w * 0.46, 0, w * 0.08, h);
        ctx.fillRect(0, h * 0.78, w, h * 0.18);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(w * 0.65, h * 0.28, 12, 34);
        ctx.fillRect(w * 0.56, h * 0.36, 30, 10);
      } else if (pat === 'spider_web') {
        ctx.fillStyle = spec.accent;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.46, 26, 34, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (suit === 'zoro') {
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(w * 0.25, 0);
        ctx.lineTo(w * 0.65, h * 0.72);
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(0, h * 0.74, w, h * 0.26);
      } else if (suit === 'kaido') {
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 7;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(w * 0.24, h * (0.25 + i * 0.14), 18, 0, Math.PI);
          ctx.stroke();
        }
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
      } else if (suit === 'boa_hancock') {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 5;
        ctx.strokeRect(w * 0.14, h * 0.08, w * 0.72, h * 0.84);
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.48, 36, 0, Math.PI * 1.6);
        ctx.stroke();
      } else if (suit === 'mihawk' || suit === 'shanks' || suit === 'sanji') {
        ctx.fillStyle = suit === 'sanji' ? '#eab308' : suit === 'mihawk' ? '#f1c27d' : '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.34, 0);
        ctx.lineTo(w * 0.5, h * 0.48);
        ctx.lineTo(w * 0.66, 0);
        ctx.closePath();
        ctx.fill();
        if (suit === 'shanks') {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(0, h * 0.78, w, h * 0.22);
        }
      } else if (suit === 'law') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h * 0.22);
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, 21, 0, Math.PI * 2);
        ctx.fill();
      } else if (suit === 'naruto' || suit === 'boruto' || suit === 'jiraiya') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h * 0.24);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(w * 0.48, h * 0.24, w * 0.04, h * 0.76);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(w * 0.72, h * 0.42, 13, 0, Math.PI * 1.7);
        ctx.stroke();
      } else if (pat === 'armor_plates' || suit === 'hashirama' || suit === 'tobirama' || suit === 'madara') {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        for (let y = 36; y < h; y += 36) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        ctx.fillStyle = spec.accent;
        [w * 0.2, w * 0.8].forEach((rx) => {
          for (let y = 18; y < h; y += 36) {
            ctx.beginPath();
            ctx.arc(rx, y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (suit === 'kakashi' || suit === 'minato') {
        ctx.fillStyle = '#14532d';
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 3;
        ctx.fillRect(w * 0.14, h * 0.26, w * 0.28, h * 0.28);
        ctx.strokeRect(w * 0.14, h * 0.26, w * 0.28, h * 0.28);
        ctx.fillRect(w * 0.58, h * 0.26, w * 0.28, h * 0.28);
        ctx.strokeRect(w * 0.58, h * 0.26, w * 0.28, h * 0.28);
      } else if (pat === 'akatsuki' || suit === 'itachi' || suit === 'obito') {
        const drawCloud = (cx: number, cy: number) => {
          ctx.fillStyle = '#dc2626';
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 17, 0, Math.PI * 2);
          ctx.arc(cx - 14, cy + 6, 12, 0, Math.PI * 2);
          ctx.arc(cx + 14, cy + 6, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        };
        drawCloud(w * 0.28, h * 0.36);
        drawCloud(w * 0.72, h * 0.68);
      } else if (
        pat === 'shihakusho' ||
        suit === 'ichigo' ||
        suit === 'gin' ||
        suit === 'ichibe' ||
        suit === 'kenpachi' ||
        suit === 'toshiro' ||
        suit === 'byakuya' ||
        suit === 'rukia' ||
        suit === 'yamamoto'
      ) {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.3, 0);
        ctx.lineTo(w * 0.5, h * 0.42);
        ctx.lineTo(w * 0.7, 0);
        ctx.lineTo(w * 0.62, 0);
        ctx.lineTo(w * 0.5, h * 0.28);
        ctx.lineTo(w * 0.38, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(0, h * 0.76, w, h * 0.14);
      } else if (suit === 'ulquiorra' || suit === 'grimmjow') {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(w * 0.42, 0, w * 0.16, h);
        if (suit === 'ulquiorra') {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.36, 11, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#f1c27d';
          ctx.fillRect(w * 0.34, h * 0.24, w * 0.32, h * 0.56);
        }
      } else if (suit === 'ironman' || suit === 'k_cyber') {
        ctx.strokeStyle = spec.accent;
        ctx.lineWidth = 5;
        ctx.strokeRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
        ctx.beginPath();
        ctx.moveTo(w * 0.12, h * 0.45);
        ctx.lineTo(w * 0.88, h * 0.45);
        ctx.stroke();
      } else if (pat === 'gi_symbol' || suit === 'goku' || suit === 'goku_ssj' || suit === 'gohan') {
        ctx.fillStyle = spec.accent;
        ctx.beginPath();
        ctx.moveTo(w * 0.3, 0);
        ctx.lineTo(w * 0.5, h * 0.42);
        ctx.lineTo(w * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w * 0.7, h * 0.34, 21, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.font = '900 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(suit === 'gohan' ? '魔' : '悟', w * 0.7, h * 0.34);
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.78, w, h * 0.18);
      } else if (pat === 'saiyan_armor' || suit === 'vegeta') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(w * 0.08, h * 0.12, w * 0.84, h * 0.72);
        ctx.fillStyle = '#eab308';
        for (let y = h * 0.28; y <= h * 0.64; y += h * 0.12) {
          ctx.fillRect(w * 0.14, y, w * 0.31, 7);
          ctx.fillRect(w * 0.55, y, w * 0.31, 7);
        }
        ctx.fillRect(w * 0.14, 0, w * 0.14, h * 0.18);
        ctx.fillRect(w * 0.72, 0, w * 0.14, h * 0.18);
      } else if (suit === 'piccolo') {
        ctx.fillStyle = '#3b0764';
        ctx.beginPath();
        ctx.moveTo(w * 0.32, 0);
        ctx.lineTo(w * 0.5, h * 0.4);
        ctx.lineTo(w * 0.68, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, h * 0.78, w, h * 0.18);
      } else if (suit === 'trunks') {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(w * 0.3, 0, w * 0.4, h);
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(w * 0.08, h * 0.14, w * 0.18, h * 0.2);
        ctx.fillRect(w * 0.74, h * 0.14, w * 0.18, h * 0.2);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
      } else if (suit === 'beerus') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h * 0.3);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, h * 0.25, w, h * 0.06);
        for (let sx = w * 0.14; sx <= w * 0.86; sx += w * 0.18) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx - 5, h * 0.04, 10, h * 0.2);
        }
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.18, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(0, h * 0.76, w, h * 0.24);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(w * 0.36, h * 0.78, w * 0.28, h * 0.18);
      } else if (suit === 'whis') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.36, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.36, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.36, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, h * 0.74, w, h * 0.16);
      } else if (suit === 'zeno') {
        ctx.fillStyle = '#db2777';
        ctx.fillRect(0, 0, w, h * 0.24);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(w * 0.34, 0, w * 0.32, h * 0.76);
        ctx.fillRect(0, h * 0.76, w, h * 0.18);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.44, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#09090b';
        ctx.font = '900 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('全', w * 0.5, h * 0.45);
      } else if (suit === 'gon') {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(w * 0.46, 0, w * 0.08, h * 0.88);
        ctx.fillRect(0, 0, w, h * 0.14);
        ctx.fillRect(0, h * 0.86, w, h * 0.14);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.36, 0);
        ctx.lineTo(w * 0.5, h * 0.24);
        ctx.lineTo(w * 0.64, 0);
        ctx.closePath();
        ctx.fill();
      } else if (suit === 'killua') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.32, 0);
        ctx.lineTo(w * 0.5, h * 0.26);
        ctx.lineTo(w * 0.68, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(0, h * 0.84, w, h * 0.16);
      } else if (suit === 'kurapika') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.34, 0);
        ctx.lineTo(w * 0.5, h * 0.36);
        ctx.lineTo(w * 0.66, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.fillRect(0, h * 0.04, w, h * 0.08);
        ctx.fillRect(0, h * 0.78, w, h * 0.16);
      } else if (suit === 'leorio') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.32, 0);
        ctx.lineTo(w * 0.5, h * 0.56);
        ctx.lineTo(w * 0.68, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(w * 0.47, h * 0.04, w * 0.06, h * 0.48);
      } else if (suit === 'hisoka') {
        ctx.fillStyle = '#be185d';
        ctx.fillRect(0, 0, w, h * 0.2);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
        ctx.font = '900 36px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#dc2626';
        ctx.fillText('♦', w * 0.34, h * 0.42);
        ctx.fillText('♥', w * 0.66, h * 0.62);
        ctx.fillStyle = '#09090b';
        ctx.fillText('♠', w * 0.66, h * 0.42);
        ctx.fillText('♣', w * 0.34, h * 0.62);
      } else {
        // Crisp front V-collar & waist sash for remaining catalog costumes
        ctx.fillStyle = spec.accent;
        ctx.beginPath();
        ctx.moveTo(w * 0.36, 0);
        ctx.lineTo(w * 0.5, h * 0.32);
        ctx.lineTo(w * 0.64, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(0, h * 0.8, w, h * 0.16);
      }
    },
    256,
    256,
  );
}

function getCostumeBackTexture(
  suit: CharacterCostumeId,
  spec: CostumeStyleSpec,
  formId = 'base',
): THREE.CanvasTexture | null {
  if (suit === 'spiderman' && formId !== 'symbiote') return getSpiderWebTexture();
  if (spec.imuSilhouette) return null;
  return getProceduralTexture(
    `costume_back_256_${suit}_${formId}`,
    (ctx, w, h) => {
      ctx.fillStyle = spec.torso;
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255,255,255,0.06)');
      grad.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pat = spec.chestPattern;
      if (pat === 'survey_corps') {
        // Survey Corps Wings of Freedom Emblem on back (-Z)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.25);
        ctx.lineTo(w * 0.22, h * 0.38);
        ctx.lineTo(w * 0.34, h * 0.62);
        ctx.lineTo(w * 0.5, h * 0.48);
        ctx.lineTo(w * 0.66, h * 0.62);
        ctx.lineTo(w * 0.78, h * 0.38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2563eb';
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.28);
        ctx.lineTo(w * 0.38, h * 0.56);
        ctx.lineTo(w * 0.5, h * 0.44);
        ctx.lineTo(w * 0.62, h * 0.56);
        ctx.closePath();
        ctx.fill();
      } else if (pat === 'bandages') {
        ctx.fillStyle = '#e2e8f0';
        for (let y = 18; y < h; y += 34) {
          ctx.fillRect(0, y, w, 16);
        }
      } else if (pat === 'scales_dark' || pat === 'scales_azure') {
        ctx.strokeStyle = pat === 'scales_azure' ? '#38bdf8' : '#7c3aed';
        ctx.lineWidth = 4;
        for (let row = 0; row < 5; row++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.16, h * (0.16 + row * 0.16));
          ctx.lineTo(w * 0.84, h * (0.16 + row * 0.16));
          ctx.stroke();
        }
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
      } else if (suit === 'luffy' || suit === 'luffy_gear5' || suit === 'ace' || pat === 'open_vest') {
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
        if (suit === 'ace') {
          ctx.fillStyle = '#7e22ce';
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.4, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f1c27d';
          ctx.fillRect(w * 0.45, h * 0.32, w * 0.1, h * 0.16);
        }
      } else if (suit === 'naruto' || suit === 'boruto' || suit === 'jiraiya') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h * 0.22);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.46, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.46, 22, 0, Math.PI * 1.65);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.46, 8, 0, Math.PI * 1.8);
        ctx.stroke();
      } else if (suit === 'sasuke' || suit === 'itachi' || suit === 'madara' || suit === 'obito') {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.38, 33, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.38, 33, 0, Math.PI);
        ctx.fill();
        ctx.fillRect(w * 0.47, h * 0.5, w * 0.06, 31);
      } else if (
        pat === 'shihakusho' ||
        suit === 'ichigo' ||
        suit === 'gin' ||
        suit === 'ichibe' ||
        suit === 'kenpachi' ||
        suit === 'toshiro' ||
        suit === 'byakuya' ||
        suit === 'rukia' ||
        suit === 'yamamoto'
      ) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, h * 0.76, w, h * 0.14);
      } else if (pat === 'gi_symbol' || suit === 'goku' || suit === 'goku_ssj' || suit === 'gohan') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.38, 43, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = '#09090b';
        ctx.font = '900 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(suit === 'gohan' ? '魔' : '悟', w * 0.5, h * 0.39);
        ctx.fillStyle = spec.accent;
        ctx.fillRect(0, h * 0.78, w, h * 0.18);
      } else if (pat === 'saiyan_armor' || suit === 'vegeta') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(w * 0.1, h * 0.12, w * 0.8, h * 0.7);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(w * 0.14, 0, w * 0.14, h * 0.18);
        ctx.fillRect(w * 0.72, 0, w * 0.14, h * 0.18);
      } else if (suit === 'trunks') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.38, 29, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.font = '900 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CAPSULE', w * 0.5, h * 0.38);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, h * 0.82, w, h * 0.18);
      } else if (suit === 'beerus') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h * 0.14);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(0, h * 0.13, w, h * 0.04);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
      } else if (suit === 'whis') {
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        ctx.fillRect(w * 0.485, h * 0.08, w * 0.03, h * 0.66);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, h * 0.74, w, h * 0.16);
      } else if (suit === 'zeno') {
        ctx.fillStyle = '#db2777';
        ctx.fillRect(0, 0, w, h * 0.16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(0, h * 0.76, w, h * 0.18);
      } else if (suit === 'hisoka') {
        ctx.fillStyle = '#be185d';
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.22);
        ctx.lineTo(w * 0.68, h * 0.48);
        ctx.lineTo(w * 0.5, h * 0.74);
        ctx.lineTo(w * 0.32, h * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(0, h * 0.78, w, h * 0.22);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(w * 0.488, h * 0.08, w * 0.024, h * 0.82);
      }

      // Optional Back Kanji / Crest Emblem (Marine, Justice, Garp, Whitebeard, etc.)
      if (spec.backLogoText) {
        ctx.fillStyle = spec.accent;
        ctx.font = '900 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spec.backLogoText, w * 0.5, h * 0.44);
      }
    },
    256,
    256,
  );
}

function getKokoEmbroideryTexture(baseHex: string): THREE.CanvasTexture {
  return getProceduralTexture(
    `koko_placket_512_${baseHex}`,
    (ctx, w, h) => {
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fde68a';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 6;
      ctx.strokeRect(24, 14, w - 48, h - 28);
      for (let y = 52; y < h - 40; y += 72) {
        ctx.beginPath();
        ctx.moveTo(w / 2, y - 20);
        ctx.lineTo(w / 2 + 40, y);
        ctx.lineTo(w / 2, y + 20);
        ctx.lineTo(w / 2 - 40, y);
        ctx.closePath();
        ctx.fill();
      }
    },
    256,
    512,
  );
}

const VALID_OUTFITS: ReadonlySet<OutfitType> = new Set([
  'windbreaker',
  'casual',
  'flannel',
  'tactical_vest',
  'tunic',
  'outdoor_vest',
  'formal',
  'poncho',
  'koko',
  'kebaya',
  'school',
]);

const VALID_PANTS: ReadonlySet<PantsStyleType> = new Set(['jeans', 'cargo', 'shorts', 'skirt']);

const VALID_HEAD_ACC: ReadonlySet<HeadAccessoryType> = new Set([
  'none',
  'rimba',
  'baseball',
  'beanie',
  'towel_headband',
  'headlamp',
  'bando',
  'hairpin',
  'peci',
  'blangkon',
]);

const VALID_HAIR: ReadonlySet<HairStyle> = new Set([
  'short',
  'mohawk',
  'side_part',
  'spiky',
  'undercut',
  'curly',
  'long_loose',
  'ponytail',
  'twin_braids',
  'single_braid',
  'twintails',
  'hijab',
  'hijab_sport',
  'parted',
  'long_tie',
  'bob',
  'covered',
  'bald',
]);

const VALID_BACK_GEAR: ReadonlySet<BackGearType> = new Set([
  'none',
  'carrier',
  'sling',
  'cape',
  'wings',
  'jetpack',
]);

const VALID_FACE_EXP: ReadonlySet<FaceExpressionType> = new Set([
  'auto',
  'smile',
  'laugh',
  'angry',
  'annoyed',
  'sad',
  'shocked',
  'cool',
  'sleepy',
  'shy',
  'ninja_mask',
  'elder_wise',
  'otaku_glasses',
  'chibi',
]);

const VALID_FACE_AGE: ReadonlySet<FaceAgeType> = new Set(['young', 'elder']);

const VALID_EYE_STYLE: ReadonlySet<EyeStyleType> = new Set([
  'auto',
  'normal',
  'sharingan',
  'mangekyou',
  'rinnegan',
  'byakugan',
  'sage',
  'kyuubi',
  'imu',
  'nika',
  'mihawk',
  'six_eyes',
  'sukuna',
  'ssj',
  'ui',
  'upper_moon',
  'geass',
]);

const VALID_NECK_ACC: ReadonlySet<NeckAccessoryType> = new Set(['none', 'scarf', 'knit_scarf']);
const VALID_WRIST_ACC: ReadonlySet<WristAccessoryType> = new Set(['none', 'watch']);

export const MALE_ONLY_OUTFITS: ReadonlySet<OutfitType> = new Set([
  'tactical_vest',
  'koko',
  'formal',
  'flannel',
  'casual',
]);

export const FEMALE_ONLY_OUTFITS: ReadonlySet<OutfitType> = new Set([
  'tunic',
  'outdoor_vest',
  'kebaya',
]);

export const MALE_ONLY_HAIR: ReadonlySet<HairStyle> = new Set([
  'short',
  'mohawk',
  'side_part',
  'spiky',
  'undercut',
  'curly',
  'parted',
  'bald',
]);

export const FEMALE_ONLY_HAIR: ReadonlySet<HairStyle> = new Set([
  'hijab',
  'hijab_sport',
  'long_loose',
  'twin_braids',
  'single_braid',
  'ponytail',
  'twintails',
  'bob',
  'long_tie',
  'covered',
]);

export const MALE_ONLY_HEAD_ACC: ReadonlySet<HeadAccessoryType> = new Set([
  'peci',
  'blangkon',
  'towel_headband',
]);

export const FEMALE_ONLY_HEAD_ACC: ReadonlySet<HeadAccessoryType> = new Set([
  'bando',
  'hairpin',
]);

export function sanitizeAvatarForGender(cfg: AvatarConfig, gender: GenderType): AvatarConfig {
  const next: AvatarConfig = { ...cfg, gender };
  if (gender === 'male') {
    if (FEMALE_ONLY_OUTFITS.has(next.outfit)) next.outfit = 'windbreaker';
    if (next.pantsStyle === 'skirt') next.pantsStyle = 'cargo';
    if (FEMALE_ONLY_HAIR.has(next.hairStyle)) next.hairStyle = 'short';
    if (FEMALE_ONLY_HEAD_ACC.has(next.headAccessory)) next.headAccessory = 'none';
    if (next.backGear === 'sling') next.backGear = 'carrier';
    if (next.neckAccessory === 'knit_scarf') next.neckAccessory = 'none';
  } else {
    if (MALE_ONLY_OUTFITS.has(next.outfit)) next.outfit = 'tunic';
    if (next.pantsStyle === 'shorts') next.pantsStyle = 'cargo';
    if (MALE_ONLY_HAIR.has(next.hairStyle)) next.hairStyle = 'hijab';
    if (MALE_ONLY_HEAD_ACC.has(next.headAccessory)) next.headAccessory = 'none';
    if (next.wristAccessory === 'watch') next.wristAccessory = 'none';
    if (next.neckAccessory === 'scarf') next.neckAccessory = 'knit_scarf';
  }
  next.hat = next.headAccessory;
  return next;
}

export function normalizeAvatarConfig(
  raw: Partial<AvatarConfig> | undefined,
  role: Role,
): AvatarConfig {
  const base = role === 'teacher' ? DEFAULT_TEACHER_AVATAR : DEFAULT_STUDENT_AVATAR;
  const legacyHat = raw?.headAccessory || (raw?.hat as string | undefined);
  let mappedHead = base.headAccessory;
  if (legacyHat && VALID_HEAD_ACC.has(legacyHat as HeadAccessoryType)) {
    mappedHead = legacyHat as HeadAccessoryType;
  } else if (legacyHat === 'headband') {
    mappedHead = 'towel_headband';
  } else if (legacyHat === 'helmet') {
    mappedHead = 'headlamp';
  } else if (legacyHat === 'crown') {
    mappedHead = 'blangkon';
  }

  const gender: GenderType = raw?.gender === 'female' ? 'female' : 'male';
  const outfit: OutfitType = raw?.outfit && VALID_OUTFITS.has(raw.outfit) ? raw.outfit : base.outfit;
  const pantsStyle: PantsStyleType =
    raw?.pantsStyle && VALID_PANTS.has(raw.pantsStyle) ? raw.pantsStyle : base.pantsStyle;
  const hairStyle: HairStyle =
    raw?.hairStyle && VALID_HAIR.has(raw.hairStyle) ? raw.hairStyle : base.hairStyle;
  const backGear: BackGearType =
    raw?.backGear && VALID_BACK_GEAR.has(raw.backGear) ? raw.backGear : base.backGear;
  const faceExpression: FaceExpressionType =
    raw?.faceExpression && VALID_FACE_EXP.has(raw.faceExpression) ? raw.faceExpression : 'auto';
  const faceAge: FaceAgeType =
    raw?.faceAge && VALID_FACE_AGE.has(raw.faceAge) ? raw.faceAge : 'young';
  const eyeStyle: EyeStyleType =
    raw?.eyeStyle && VALID_EYE_STYLE.has(raw.eyeStyle) ? raw.eyeStyle : 'auto';
  const neckAccessory: NeckAccessoryType =
    raw?.neckAccessory && VALID_NECK_ACC.has(raw.neckAccessory) ? raw.neckAccessory : 'none';
  const wristAccessory: WristAccessoryType =
    raw?.wristAccessory && VALID_WRIST_ACC.has(raw.wristAccessory) ? raw.wristAccessory : 'none';

  const canon = canonicalizeCharacterAndForm(
    (raw?.superheroSuit || 'none') as CharacterCostumeId,
    raw?.characterForm,
  );

  const normalized: AvatarConfig = {
    gender,
    outfit,
    pantsStyle,
    jacket: raw?.jacket || base.jacket,
    pantsColor: raw?.pantsColor || base.pantsColor,
    skinColor: raw?.skinColor || base.skinColor,
    hairStyle,
    hairColor: raw?.hairColor || base.hairColor,
    headAccessory: mappedHead,
    hat: mappedHead,
    glasses: typeof raw?.glasses === 'boolean' ? raw.glasses : base.glasses,
    backGear,
    pack: raw?.pack || base.pack,
    superheroSuit: canon.suit,
    characterForm: canon.formId,
    faceExpression,
    faceAge,
    eyeStyle,
    neckAccessory,
    wristAccessory,
  };

  return sanitizeAvatarForGender(normalized, gender);
}

export function buildR15AvatarMesh(
  rawCfg: Partial<AvatarConfig> | undefined,
  role: Role,
  options: { withSpotLight?: boolean; castShadow?: boolean } = {},
): { group: THREE.Group; rig: R15JointRig } {
  const cfg = normalizeAvatarConfig(rawCfg, role);
  const castShadow = options.castShadow !== false;
  const suit = cfg.superheroSuit || 'none';
  const formId = cfg.characterForm || 'base';
  const spec = suit !== 'none' ? resolveCharacterSpec(suit, formId) : undefined;
  const isFemale = Boolean(spec?.isFemale) || (cfg.gender === 'female' && !spec);

  const group = new THREE.Group();
  const bodyRig = new THREE.Group();
  if (spec?.scaleMult) {
    bodyRig.scale.setScalar(spec.scaleMult);
  }
  group.add(bodyRig);

  const torsoMainColor = spec?.imuSilhouette ? '#050507' : spec ? spec.torso : cfg.jacket;
  const torsoAccentColor = spec ? spec.accent : '#0f172a';
  const armUpperColor = spec?.imuSilhouette ? '#050507' : spec ? spec.armUpper : cfg.jacket;
  const armLowerColor = spec?.imuSilhouette
    ? '#050507'
    : spec
      ? spec.armLower
      : cfg.outfit === 'casual' || cfg.outfit === 'school' || cfg.outfit === 'tactical_vest'
        ? cfg.skinColor
        : cfg.jacket;
  const handColor = spec?.imuSilhouette ? '#050507' : spec ? spec.hand : cfg.skinColor;
  const legUpperColor = spec?.imuSilhouette ? '#050507' : spec ? spec.legUpper : cfg.pantsColor;
  const legLowerColor = spec?.imuSilhouette
    ? '#050507'
    : spec
      ? spec.legLower
      : cfg.pantsStyle === 'shorts' || cfg.pantsStyle === 'skirt'
        ? cfg.skinColor
        : cfg.pantsColor;
  const bootColor = spec?.imuSilhouette ? '#050507' : spec ? spec.boot : '#3b2414';
  const metalness = spec?.metalness ?? 0.06;
  const roughness = spec?.roughness ?? 0.52;
  const skinColor = spec?.imuSilhouette ? '#050507' : spec?.skin || cfg.skinColor;
  const hairColor = spec?.imuSilhouette ? '#050507' : spec?.hairColor || cfg.hairColor;

  let torsoMat: THREE.Material;
  const costumeFrontTex = spec ? getCostumeChestTexture(suit, spec, formId) : null;
  const costumeBackTex = spec ? getCostumeBackTexture(suit, spec, formId) : null;
  const dailyTex = !spec ? getDailyOutfitTexture(cfg.outfit, torsoMainColor) : null;

  if (!spec && cfg.outfit === 'poncho') {
    torsoMat = new THREE.MeshPhysicalMaterial({
      color: torsoMainColor,
      roughness: 0.24,
      metalness: 0.05,
      transparent: true,
      opacity: 0.86,
      clearcoat: 0.65,
    });
  } else if (!spec && cfg.outfit === 'school') {
    torsoMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.58 });
  } else {
    torsoMat = new THREE.MeshStandardMaterial({ color: torsoMainColor, roughness, metalness });
  }

  const accentMat = new THREE.MeshStandardMaterial({
    color: torsoAccentColor,
    roughness: spec ? 0.28 : 0.65,
    metalness: suit === 'ironman' || suit === 'gatotkaca' || suit === 'k_cyber' || suit === 'doctor_doom' ? 0.82 : 0.14,
  });
  const armUpperMat =
    suit === 'spiderman' && formId !== 'symbiote'
      ? new THREE.MeshStandardMaterial({ map: getSpiderWebTexture(), roughness: 0.42 })
      : !spec && cfg.outfit === 'flannel'
        ? new THREE.MeshStandardMaterial({ map: getFlannelTexture(armUpperColor), roughness: 0.72 })
        : !spec && cfg.outfit === 'school'
          ? new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.58 })
          : new THREE.MeshStandardMaterial({ color: armUpperColor, roughness, metalness });
  const armLowerMat = new THREE.MeshStandardMaterial({ color: armLowerColor, roughness: roughness + 0.05, metalness });
  const handMat = new THREE.MeshStandardMaterial({
    color: handColor,
    roughness: 0.55,
    metalness: suit === 'ironman' || suit === 'k_cyber' ? 0.78 : 0.04,
  });
  const legUpperMat = new THREE.MeshStandardMaterial({
    color: legUpperColor,
    roughness: spec ? roughness : cfg.pantsStyle === 'jeans' ? 0.82 : 0.72,
    metalness,
  });
  const legLowerMat = new THREE.MeshStandardMaterial({ color: legLowerColor, roughness: 0.76, metalness });
  const bootMat = new THREE.MeshStandardMaterial({
    color: bootColor,
    roughness: suit === 'ironman' ? 0.25 : 0.82,
    metalness: suit === 'ironman' ? 0.8 : 0.08,
  });
  const soleMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.92 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.62 });
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    emissive: spec?.hairEmissive || '#000000',
    emissiveIntensity: spec?.hairEmissive ? 0.45 : 0,
    roughness: spec?.hairEmissive ? 0.35 : 0.76,
  });

  // 1. LOWER TORSO (Pelvis & Waist pivot at y = 1.02)
  const lowerTorso = new THREE.Group();
  lowerTorso.position.set(0, 1.02, 0);
  bodyRig.add(lowerTorso);

  const pelvisWidth = isFemale ? 0.55 : 0.62;
  const pelvisMesh = new THREE.Mesh(
    new RoundedBoxGeometry(pelvisWidth, 0.24, 0.35, 4, 0.07),
    suit === 'superman' ? accentMat : legUpperMat,
  );
  pelvisMesh.position.y = 0.06;
  pelvisMesh.castShadow = castShadow;
  lowerTorso.add(pelvisMesh);

  // Skirt geometry if pantsStyle === 'skirt' or outfit === 'kebaya', or flared modest hem for tunic
  if (!spec && (cfg.pantsStyle === 'skirt' || cfg.outfit === 'kebaya' || cfg.outfit === 'tunic')) {
    const skirtMat = cfg.outfit === 'tunic' ? torsoMat : legUpperMat;
    const skirtMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, cfg.outfit === 'tunic' ? 0.44 : 0.48, cfg.outfit === 'tunic' ? 0.36 : 0.44, 14),
      skirtMat,
    );
    skirtMesh.position.y = cfg.outfit === 'tunic' ? -0.05 : -0.1;
    skirtMesh.castShadow = castShadow;
    lowerTorso.add(skirtMesh);
  }

  const beltMat =
    suit === 'batman' || suit === 'naruto' || suit === 'wonder_woman'
      ? new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.3, metalness: 0.6 })
      : spec
        ? accentMat
        : new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 });
  const belt = new THREE.Mesh(new RoundedBoxGeometry(pelvisWidth + 0.03, 0.1, 0.38, 3, 0.03), beltMat);
  belt.position.y = 0.16;
  lowerTorso.add(belt);

  // Side belt loops so waist clearly reads front-vs-back
  const beltLoopMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 });
  [-pelvisWidth * 0.34, pelvisWidth * 0.34].forEach((lx) => {
    const loop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.39), beltLoopMat);
    loop.position.set(lx, 0.16, 0);
    lowerTorso.add(loop);
  });

  // 3D Front Belt Buckle (+Z) for ALL characters (customizable & superhero costumes)
  const buckle = new THREE.Mesh(
    new RoundedBoxGeometry(0.15, 0.115, 0.055, 2, 0.02),
    new THREE.MeshStandardMaterial({
      color: suit === 'kamen_rider' ? '#ef4444' : spec ? '#fde047' : '#cbd5e1',
      emissive: suit === 'kamen_rider' ? '#dc2626' : '#000000',
      emissiveIntensity: suit === 'kamen_rider' ? 0.6 : 0,
      metalness: 0.82,
      roughness: 0.22,
    }),
  );
  buckle.position.set(0, 0.16, 0.2);
  const buckleInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.055, 0.062),
    new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.4, roughness: 0.45 }),
  );
  buckleInner.position.set(0, 0.16, 0.2);
  lowerTorso.add(buckle, buckleInner);

  // Tail styles (-Z): Beerus/Cat, Imu Arrow Demon, Nidhogg/Kaido Dragon, Sun Wukong Monkey, Saiyan
  const tailType = spec?.tailType || (spec?.tailColor ? 'beerus' : 'none');
  if (tailType !== 'none' || spec?.tailColor) {
    const tailMat = new THREE.MeshStandardMaterial({
      color: spec?.tailColor || (tailType === 'arrow_demon' ? '#050507' : tailType === 'dragon_dark' ? '#1e1b4b' : '#78350f'),
      roughness: 0.55,
    });
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.06, -0.18);
    if (tailType === 'arrow_demon') {
      const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.46, 7), tailMat);
      seg1.rotation.x = Math.PI * 0.44;
      seg1.position.set(0, -0.02, -0.2);
      const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.48, 7), tailMat);
      seg2.rotation.x = Math.PI * 0.2;
      seg2.position.set(0.06, 0.14, -0.52);
      const arrowHead = new THREE.Mesh(
        new THREE.ConeGeometry(0.095, 0.22, 3),
        new THREE.MeshStandardMaterial({ color: spec?.imuSilhouette ? '#050507' : '#dc2626', roughness: 0.4 }),
      );
      arrowHead.rotation.x = Math.PI * 0.16;
      arrowHead.position.set(0.08, 0.36, -0.64);
      tailGroup.add(seg1, seg2, arrowHead);
    } else if (tailType === 'dragon_dark') {
      const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 0.55, 8), tailMat);
      seg1.rotation.x = Math.PI * 0.46;
      seg1.position.set(0, -0.05, -0.24);
      const seg2 = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.52, 7), tailMat);
      seg2.rotation.x = -Math.PI * 0.42;
      seg2.position.set(0, -0.06, -0.68);
      const spikeMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.4 });
      [-0.22, -0.4, -0.58].forEach((sz) => {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 4), spikeMat);
        sp.position.set(0, 0.02, sz);
        tailGroup.add(sp);
      });
      tailGroup.add(seg1, seg2);
    } else {
      const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.42, 8), tailMat);
      seg1.rotation.x = Math.PI * 0.42;
      seg1.position.set(0, -0.04, -0.19);
      const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.44, 8), tailMat);
      seg2.rotation.x = Math.PI * 0.22;
      seg2.position.set(0.04, 0.08, -0.5);
      const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), tailMat);
      tailTip.position.set(0.06, 0.25, -0.64);
      tailGroup.add(seg1, seg2, tailTip);
    }
    lowerTorso.add(tailGroup);
  }

  // Sea-Prism Stone Chains around waist (Loki Elbaph)
  if (spec?.seaChains) {
    const chainMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.82, roughness: 0.35 });
    for (let c = 0; c < 2; c++) {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.35 + c * 0.015, 0.032, 6, 16), chainMat);
      wrap.rotation.x = Math.PI / 2 + (c === 0 ? 0.18 : -0.18);
      wrap.position.set(0, 0.08 + c * 0.11, 0);
      lowerTorso.add(wrap);
    }
  }

  // 2. UPPER TORSO (Chest & Shoulders pivot at y = 0.20 inside lowerTorso)
  const upperTorso = new THREE.Group();
  upperTorso.position.set(0, 0.2, 0);
  lowerTorso.add(upperTorso);

  const chestW = isFemale ? 0.58 : 0.75;
  const chestD = isFemale ? 0.34 : 0.41;
  const chestMesh = new THREE.Mesh(
    new RoundedBoxGeometry(chestW, 0.62, chestD, 4, 0.09),
    torsoMat,
  );
  chestMesh.position.y = 0.32;
  chestMesh.castShadow = castShadow;
  upperTorso.add(chestMesh);

  // Female slimmer tapered waist silhouette
  if (isFemale) {
    const waistCollar = new THREE.Mesh(
      new RoundedBoxGeometry(0.5, 0.18, 0.33, 3, 0.06),
      torsoMat,
    );
    waistCollar.position.set(0, 0.11, 0);
    upperTorso.add(waistCollar);
  }

  // Dedicated Front (+Z) panel for daily & costume chest textures so front artwork NEVER duplicates onto back (-Z)
  if (dailyTex || costumeFrontTex) {
    const frontMat = new THREE.MeshStandardMaterial({
      map: (costumeFrontTex || dailyTex) as THREE.CanvasTexture,
      roughness: spec ? roughness : 0.62,
      metalness: spec ? metalness : 0.04,
    });
    const frontPanel = new THREE.Mesh(new THREE.PlaneGeometry(chestW - 0.08, 0.54), frontMat);
    frontPanel.position.set(0, 0.32, chestD * 0.5 + 0.004);
    upperTorso.add(frontPanel);
  }

  // Dedicated Back (-Z) panel for costume back graphics (clan crests, kanji, clean vest backs)
  if (spec && costumeBackTex) {
    const backMat = new THREE.MeshStandardMaterial({
      map: costumeBackTex,
      roughness,
      metalness,
    });
    const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(chestW - 0.08, 0.54), backMat);
    backPanel.rotation.y = Math.PI;
    backPanel.position.set(0, 0.32, -chestD * 0.5 - 0.004);
    upperTorso.add(backPanel);
  }

  let ponchoHem: THREE.Object3D | undefined;
  let ponchoHood: THREE.Object3D | undefined;

  if (!spec) {
    // Contoured 3D Rear Jacket/Shirt Panel (-Z) so front chest pockets/zippers/buttons never bleed onto the back
    const backClothColor = cfg.outfit === 'school' ? '#f8fafc' : torsoMainColor;
    const backClothMat = new THREE.MeshStandardMaterial({ color: backClothColor, roughness: 0.72 });
    const backSeamMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.78 });
    const rearPanel = new THREE.Mesh(
      new RoundedBoxGeometry(chestW - 0.05, 0.56, 0.03, 2, 0.012),
      backClothMat,
    );
    rearPanel.position.set(0, 0.32, -chestD * 0.5 - 0.004);
    const rearSeamV = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.52, 0.036), backSeamMat);
    rearSeamV.position.set(0, 0.32, -chestD * 0.5 - 0.006);
    const rearYokeH = new THREE.Mesh(new THREE.BoxGeometry(chestW - 0.08, 0.028, 0.038), backSeamMat);
    rearYokeH.position.set(0, 0.48, -chestD * 0.5 - 0.006);
    const backEmblem = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.095, 3),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.45 }),
    );
    backEmblem.position.set(0, 0.54, -chestD * 0.5 - 0.012);
    upperTorso.add(rearPanel, rearSeamV, rearYokeH, backEmblem);

    const innerShirtMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.52 });
    const buttonMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.45, roughness: 0.35 });

    if (cfg.outfit === 'windbreaker') {
      const yoke = new THREE.Mesh(new RoundedBoxGeometry(chestW + 0.02, 0.2, chestD + 0.02, 3, 0.07), accentMat);
      yoke.position.set(0, 0.54, 0);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.14, 14), accentMat);
      collar.position.set(0, 0.67, 0);
      // Open V-collar front inner shirt + metallic zipper + chest pockets (+Z)
      const innerV = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 3), innerShirtMat);
      innerV.rotation.x = Math.PI;
      innerV.scale.set(1, 1, 0.22);
      innerV.position.set(0, 0.54, chestD * 0.5 + 0.012);
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.04), accentMat);
      zip.position.set(0, 0.25, chestD * 0.5 + 0.008);
      const zipPull = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 0.05), buttonMat);
      zipPull.position.set(0, 0.45, chestD * 0.5 + 0.016);
      upperTorso.add(yoke, collar, innerV, zip, zipPull);
      // 3D Hiker Jacket Chest Pockets & Front Collar Flap (+Z)
      const pocketMat = new THREE.MeshStandardMaterial({ color: torsoMainColor, roughness: 0.72 });
      const flapMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.65 });
      [-0.17, 0.17].forEach((px) => {
        const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.16, 0.035, 2, 0.01), pocketMat);
        pocket.position.set(px, 0.24, chestD * 0.5 + 0.012);
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.045, 0.042), flapMat);
        flap.position.set(px, 0.32, chestD * 0.5 + 0.016);
        upperTorso.add(pocket, flap);
      });
    } else if (cfg.outfit === 'formal') {
      const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.05), innerShirtMat);
      shirt.position.set(0, 0.36, chestD * 0.5 - 0.005);
      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.44, 0.04),
        new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.45 }),
      );
      tie.position.set(0, 0.32, chestD * 0.5 + 0.015);
      upperTorso.add(shirt, tie);
    } else if (cfg.outfit === 'poncho') {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 0.54, 14, 1, true), torsoMat);
      skirt.position.set(0, -0.02, 0);
      upperTorso.add(skirt);
      ponchoHem = skirt;
      const hood = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.24, 0.26, 3, 0.08), torsoMat);
      hood.position.set(0, 0.68, -0.18);
      upperTorso.add(hood);
      ponchoHood = hood;
    } else if (cfg.outfit === 'koko') {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 14), torsoMat);
      collar.position.set(0, 0.66, 0);
      const placket = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.48, 0.04),
        new THREE.MeshStandardMaterial({ map: getKokoEmbroideryTexture(cfg.jacket), roughness: 0.6 }),
      );
      placket.position.set(0, 0.36, chestD * 0.5 + 0.005);
      upperTorso.add(collar, placket);
    } else if (cfg.outfit === 'kebaya') {
      const selendang = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.66, 0.42),
        new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.45 }),
      );
      selendang.rotation.z = 0.42;
      selendang.position.set(0, 0.36, 0);
      upperTorso.add(selendang);
    } else if (cfg.outfit === 'school') {
      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.38, 0.04),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 }),
      );
      tie.position.set(0, 0.42, chestD * 0.5 + 0.015);
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.11, 0.03),
        new THREE.MeshStandardMaterial({ color: cfg.jacket, roughness: 0.55 }),
      );
      pocket.position.set(-0.16, 0.44, chestD * 0.5 + 0.01);
      upperTorso.add(tie, pocket);
    } else if (cfg.outfit === 'flannel') {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.28), torsoMat);
      collar.position.set(0, 0.63, 0);
      const innerTee = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 3), innerShirtMat);
      innerTee.rotation.x = Math.PI;
      innerTee.scale.set(1, 1, 0.22);
      innerTee.position.set(0, 0.53, chestD * 0.5 + 0.014);
      upperTorso.add(collar, innerTee);
      const pocketMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 });
      [-0.16, 0.16].forEach((px) => {
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.03), pocketMat);
        pocket.position.set(px, 0.36, chestD * 0.5 + 0.01);
        upperTorso.add(pocket);
      });
      [0.14, 0.26, 0.38].forEach((by) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 8), buttonMat);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(0, by, chestD * 0.5 + 0.012);
        upperTorso.add(btn);
      });
    } else if (cfg.outfit === 'tactical_vest') {
      const vestMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.72 });
      const strapAccMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.78 });
      const vestBody = new THREE.Mesh(
        new RoundedBoxGeometry(chestW + 0.025, 0.5, chestD + 0.025, 2, 0.05),
        vestMat,
      );
      vestBody.position.set(0, 0.31, 0);
      upperTorso.add(vestBody);
      [-0.18, 0.18].forEach((px) => {
        const pouch = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.16, 0.05, 2, 0.015), strapAccMat);
        pouch.position.set(px, 0.23, chestD * 0.5 + 0.022);
        upperTorso.add(pouch);
      });
    } else if (cfg.outfit === 'tunic') {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 12), torsoMat);
      collar.position.set(0, 0.65, 0);
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.03), innerShirtMat);
      placket.position.set(0, 0.36, chestD * 0.5 + 0.01);
      upperTorso.add(collar, placket);
      [0.24, 0.36, 0.48].forEach((by) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.025, 8), buttonMat);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(0, by, chestD * 0.5 + 0.016);
        upperTorso.add(btn);
      });
    } else if (cfg.outfit === 'outdoor_vest') {
      const vestMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.68 });
      [-0.17, 0.17].forEach((vx) => {
        const vestSide = new THREE.Mesh(
          new RoundedBoxGeometry(0.24, 0.54, chestD + 0.02, 2, 0.04),
          vestMat,
        );
        vestSide.position.set(vx, 0.31, 0);
        upperTorso.add(vestSide);
      });
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 12), vestMat);
      collar.position.set(0, 0.65, 0);
      upperTorso.add(collar);
    } else if (cfg.outfit === 'casual') {
      const collarOpen = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 3), innerShirtMat);
      collarOpen.rotation.x = Math.PI;
      collarOpen.scale.set(1, 1, 0.22);
      collarOpen.position.set(0, 0.54, chestD * 0.5 + 0.009);
      const kacu = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.34, 4),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.68 }),
      );
      kacu.rotation.x = Math.PI;
      kacu.position.set(0, 0.44, chestD * 0.5 + 0.016);
      upperTorso.add(collarOpen, kacu);
    }

    // Neck Scarf / Knit Scarf Accessory
    if (cfg.neckAccessory === 'scarf' || cfg.neckAccessory === 'knit_scarf') {
      const scarfMat = new THREE.MeshStandardMaterial({
        color: cfg.neckAccessory === 'knit_scarf' ? '#f43f5e' : '#0284c7',
        roughness: 0.85,
      });
      const scarfRing = new THREE.Mesh(SHARED_GEO.scarfRing, scarfMat);
      scarfRing.rotation.x = Math.PI / 2;
      scarfRing.position.set(0, 0.65, 0);
      const scarfTail = new THREE.Mesh(SHARED_GEO.scarfTail, scarfMat);
      scarfTail.position.set(0.1, 0.44, chestD * 0.5 + 0.02);
      scarfTail.rotation.z = -0.14;
      upperTorso.add(scarfRing, scarfTail);
    }
  } else {
    // Costume chest emblems & armor details
    if (suit === 'ironman' || suit === 'ultraman' || suit === 'k_cyber') {
      const coreColor = suit === 'k_cyber' ? '#22d3ee' : '#38bdf8';
      const reactorRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.025, 8, 18),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.2 }),
      );
      reactorRing.position.set(0, 0.4, 0.22);
      const reactorCore = new THREE.Mesh(
        new THREE.CircleGeometry(0.095, 16),
        new THREE.MeshBasicMaterial({ color: coreColor }),
      );
      reactorCore.position.set(0, 0.4, 0.232);
      upperTorso.add(reactorRing, reactorCore);
    } else if (suit === 'superman') {
      const shield = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.26),
        new THREE.MeshBasicMaterial({ map: getSupermanCrestTexture(), transparent: true, side: THREE.DoubleSide }),
      );
      shield.position.set(0, 0.4, 0.212);
      upperTorso.add(shield);
    } else if (suit === 'captain_america' || suit === 'gatotkaca') {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11, 0),
        new THREE.MeshStandardMaterial({
          color: suit === 'captain_america' ? '#f8fafc' : '#fef08a',
          emissive: suit === 'gatotkaca' ? '#f59e0b' : '#000000',
          emissiveIntensity: 1.2,
        }),
      );
      star.scale.set(1, 1, 0.35);
      star.position.set(0, 0.4, 0.22);
      upperTorso.add(star);
    } else if (suit === 'batman') {
      const batPlate = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.14, 0.05, 2, 0.02),
        new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.35 }),
      );
      batPlate.position.set(0, 0.42, 0.205);
      const goldRim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.17, 0.03), accentMat);
      goldRim.position.set(0, 0.42, 0.195);
      upperTorso.add(goldRim, batPlate);
    } else if (suit === 'flash' || suit === 'gundala') {
      const bolt = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.26, 4),
        new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#eab308', emissiveIntensity: 0.7 }),
      );
      bolt.rotation.z = 0.4;
      bolt.position.set(0, 0.42, 0.215);
      upperTorso.add(bolt);
    }

    // Long Coat / Mantle / Haori styles
    if (spec?.coat) {
      const coatColor =
        spec.imuSilhouette
          ? '#050507'
          : spec.coat === 'akatsuki' || spec.coat === 'yhwach_cloak'
            ? '#09090b'
            : spec.coat === 'marine' ||
                spec.coat === 'hokage' ||
                spec.coat === 'captain_white' ||
                spec.coat === 'sleeveless_captain' ||
                spec.coat === 'espada' ||
                spec.coat === 'sternritter'
              ? '#f8fafc'
              : spec.coat === 'feather_cape'
                ? '#6b21a8'
                : spec.coat === 'tsunade_haori'
                  ? '#16a34a'
                  : spec.coat === 'survey_cape'
                    ? '#14532d'
                    : spec.coat === 'royal_dark_gold'
                      ? '#1e1b4b'
                      : spec.coat === 'elbaph_fur'
                        ? '#57534e'
                        : spec.coat === 'jiraiya_haori' || spec.coat === 'levitation_cloak'
                          ? '#b91c1c'
                          : spec.coat === 'whis_robe'
                            ? '#7f1d1d'
                            : '#dc2626';
      const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.65, side: THREE.DoubleSide });
      if (spec.coat === 'gundala_scarf') {
        const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 18), coatMat);
        scarf.rotation.x = Math.PI / 2;
        scarf.position.set(0, 0.63, 0);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.04), coatMat);
        tail.rotation.x = -0.35;
        tail.position.set(0.14, 0.42, -0.28);
        upperTorso.add(scarf, tail);
      } else if (spec.coat === 'feather_cape' || spec.coat === 'elbaph_fur') {
        const furCol = spec.coat === 'elbaph_fur' ? '#d6d3d1' : coatColor;
        const fluffMat = new THREE.MeshStandardMaterial({ color: furCol, roughness: 0.85, side: THREE.DoubleSide });
        const fluff = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.13, 8, 16), fluffMat);
        fluff.rotation.x = Math.PI / 2;
        fluff.position.set(0, 0.61, -0.06);
        const backPlume = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.92, 0.1), coatMat);
        backPlume.position.set(0, 0.12, -0.24);
        upperTorso.add(fluff, backPlume);
      } else if (spec.coat === 'survey_cape') {
        const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.66, 0.05), coatMat);
        cloak.position.set(0, 0.28, -0.23);
        const hood = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.16, 0.24, 2, 0.05), coatMat);
        hood.position.set(0, 0.65, -0.14);
        const wingsBadge = new THREE.Mesh(
          new THREE.PlaneGeometry(0.32, 0.32),
          new THREE.MeshBasicMaterial({
            map: getProceduralTexture('aot_wings_back', (ctx, w, h) => {
              ctx.fillStyle = '#14532d';
              ctx.fillRect(0, 0, w, h);
              ctx.fillStyle = '#f8fafc';
              ctx.beginPath();
              ctx.moveTo(w * 0.5, h * 0.25);
              ctx.lineTo(w * 0.14, h * 0.18);
              ctx.lineTo(w * 0.34, h * 0.78);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.moveTo(w * 0.5, h * 0.25);
              ctx.lineTo(w * 0.86, h * 0.18);
              ctx.lineTo(w * 0.66, h * 0.78);
              ctx.closePath();
              ctx.fill();
            }, 128, 128),
          }),
        );
        wingsBadge.rotation.y = Math.PI;
        wingsBadge.position.set(0, 0.34, -0.26);
        upperTorso.add(cloak, hood, wingsBadge);
      } else if (spec.coat === 'whis_robe') {
        const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.54, 0.78, 14, 1, true), coatMat);
        coatSkirt.position.set(0, -0.1, -0.02);
        upperTorso.add(coatSkirt);
        const robeTrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.525, 0.545, 0.09, 14, 1, true),
          new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.45, side: THREE.DoubleSide }),
        );
        robeTrim.position.set(0, -0.45, -0.02);
        upperTorso.add(robeTrim);
      } else {
        // Open-Front 3-Panel Coat / Haori / Cloak (NO closed cylinder skirt around legs):
        // 1) Wide Rear Coat Panel (-Z), 2) Left Front Panel (-X,+Z), 3) Right Front Panel (+X,+Z)
        // Leaves center front (+Z) clearly open to reveal inner shirt, belt, and ninja pants!
        const backPanelW = chestW + 0.16;
        const coatH = 0.94;
        const backCoat = new THREE.Mesh(
          new THREE.BoxGeometry(backPanelW, coatH, 0.045),
          coatMat,
        );
        backCoat.position.set(0, 0.08, -chestD * 0.5 - 0.042);
        backCoat.rotation.x = 0.08;
        upperTorso.add(backCoat);

        // Two side-front lapels wrapping cleanly around left/right edges while keeping center +Z open
        const flapW = isFemale ? 0.17 : 0.21;
        const flapD = chestD * 0.58;
        const flapX = chestW * 0.5 - flapW * 0.24;
        [-1, 1].forEach((side) => {
          const frontFlap = new THREE.Mesh(
            new THREE.BoxGeometry(flapW, coatH - 0.03, flapD),
            coatMat,
          );
          frontFlap.position.set(side * flapX, 0.08, 0.07);
          frontFlap.rotation.y = side * -0.14;
          frontFlap.rotation.z = side * 0.05;
          upperTorso.add(frontFlap);

          if (spec.coat === 'hokage' || spec.coat === 'jiraiya_haori') {
            const hemMat = new THREE.MeshStandardMaterial({
              color: spec.coat === 'hokage' ? '#dc2626' : '#facc15',
              roughness: 0.58,
            });
            const flapHem = new THREE.Mesh(
              new THREE.BoxGeometry(flapW + 0.008, 0.14, flapD + 0.008),
              hemMat,
            );
            flapHem.position.set(side * (flapX + 0.02), -0.32, 0.07);
            flapHem.rotation.y = side * -0.14;
            flapHem.rotation.z = side * 0.05;
            upperTorso.add(flapHem);
          }
        });

        // Open front high collar (gap centered at +Z)
        const collarMat =
          spec.coat === 'royal_dark_gold' || spec.coat === 'levitation_cloak'
            ? new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.75, roughness: 0.25, side: THREE.DoubleSide })
            : coatMat;
        const highCollar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.28, 0.22, 12, 1, true, Math.PI * 0.24, Math.PI * 1.52),
          collarMat,
        );
        highCollar.position.set(0, 0.7, -0.02);
        upperTorso.add(highCollar);

        // Cached procedural rear coat pattern facing -Z (Hokage flame hem + kanji, Akatsuki clouds, Marine Justice, Captain haori)
        if (spec.coat === 'hokage') {
          const kanji = spec.backLogoText || (suit === 'naruto' ? '七代目' : suit === 'hiruzen' ? '三代目' : '四代目');
          const hokageTex = getProceduralTexture(
            `hokage_back_${kanji}`,
            (ctx, w, h) => {
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(0, 0, w, h);
              // Iconic red flame triangles rising along bottom hem
              ctx.fillStyle = '#dc2626';
              ctx.beginPath();
              ctx.moveTo(0, h);
              const peaks = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1.0];
              peaks.forEach((p, idx) => {
                const px = p * w;
                const py = idx % 2 === 1 ? h * 0.66 : h * 0.87;
                ctx.lineTo(px, py);
              });
              ctx.lineTo(w, h);
              ctx.closePath();
              ctx.fill();
              // Vertical Hokage kanji on upper-mid back
              ctx.fillStyle = '#b91c1c';
              ctx.font = '900 40px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const chars = Array.from(`${kanji}火影`);
              const startY = h * 0.14;
              const stepY = (h * 0.46) / Math.max(1, chars.length);
              chars.forEach((ch, idx) => {
                ctx.fillText(ch, w * 0.5, startY + idx * stepY);
              });
            },
            256,
            256,
          );
          const backDecal = new THREE.Mesh(
            new THREE.PlaneGeometry(backPanelW - 0.03, coatH - 0.04),
            new THREE.MeshBasicMaterial({ map: hokageTex }),
          );
          backDecal.rotation.y = Math.PI;
          backDecal.rotation.x = -0.08;
          backDecal.position.set(0, 0.08, -chestD * 0.5 - 0.068);
          upperTorso.add(backDecal);
        } else if (spec.coat === 'akatsuki') {
          // Front lapel cloud accent (+Z)
          const lapelCloud = new THREE.Mesh(
            new THREE.SphereGeometry(0.072, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#dc2626' }),
          );
          lapelCloud.scale.set(1.4, 0.65, 0.3);
          lapelCloud.position.set(flapX + 0.01, 0.34, 0.2);
          upperTorso.add(lapelCloud);

          // Back crimson clouds with crisp white border (-Z)
          const akaTex = getProceduralTexture(
            'akatsuki_coat_back',
            (ctx, w, h) => {
              ctx.fillStyle = '#09090b';
              ctx.fillRect(0, 0, w, h);
              const drawCloud = (cx: number, cy: number, s: number) => {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(s, s);
                ctx.fillStyle = '#dc2626';
                ctx.strokeStyle = '#f8fafc';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(-16, 4, 14, Math.PI * 0.6, Math.PI * 1.9);
                ctx.arc(0, -6, 17, Math.PI, Math.PI * 2);
                ctx.arc(17, 4, 13, Math.PI * 1.1, Math.PI * 0.45);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              };
              drawCloud(w * 0.34, h * 0.28, 0.92);
              drawCloud(w * 0.68, h * 0.54, 0.85);
              drawCloud(w * 0.36, h * 0.78, 0.9);
            },
            256,
            256,
          );
          const akaBack = new THREE.Mesh(
            new THREE.PlaneGeometry(backPanelW - 0.03, coatH - 0.04),
            new THREE.MeshBasicMaterial({ map: akaTex }),
          );
          akaBack.rotation.y = Math.PI;
          akaBack.rotation.x = -0.08;
          akaBack.position.set(0, 0.08, -chestD * 0.5 - 0.068);
          upperTorso.add(akaBack);
        } else if (spec.coat === 'marine') {
          const marineTex = getProceduralTexture(
            'marine_justice_back',
            (ctx, w, h) => {
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(0, 0, w, h);
              ctx.fillStyle = '#1d4ed8';
              ctx.fillRect(0, h * 0.88, w, h * 0.12);
              ctx.fillStyle = '#0f172a';
              ctx.font = '900 72px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('正', w * 0.5, h * 0.34);
              ctx.fillText('義', w * 0.5, h * 0.62);
            },
            256,
            256,
          );
          const marineBack = new THREE.Mesh(
            new THREE.PlaneGeometry(backPanelW - 0.03, coatH - 0.04),
            new THREE.MeshBasicMaterial({ map: marineTex }),
          );
          marineBack.rotation.y = Math.PI;
          marineBack.rotation.x = -0.08;
          marineBack.position.set(0, 0.08, -chestD * 0.5 - 0.068);
          upperTorso.add(marineBack);
        } else if (spec.coat === 'captain_white' || spec.coat === 'sleeveless_captain') {
          if (spec.divisionNo) {
            const crestTex = getProceduralTexture(`gotei_div_${spec.divisionNo}`, (ctx, w, h) => {
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(0, 0, w, h);
              ctx.strokeStyle = '#09090b';
              ctx.lineWidth = 22;
              ctx.beginPath();
              ctx.moveTo(w / 2, 32);
              ctx.lineTo(w - 32, h / 2);
              ctx.lineTo(w / 2, h - 32);
              ctx.lineTo(32, h / 2);
              ctx.closePath();
              ctx.stroke();
              ctx.fillStyle = '#09090b';
              ctx.font = '900 132px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(spec.divisionNo || '', w / 2, h / 2 + 8);
            }, 256, 256);
            const divBadge = new THREE.Mesh(
              new THREE.PlaneGeometry(0.44, 0.44),
              new THREE.MeshBasicMaterial({ map: crestTex }),
            );
            divBadge.rotation.y = Math.PI;
            divBadge.rotation.x = -0.08;
            divBadge.position.set(0, 0.22, -chestD * 0.5 - 0.068);
            upperTorso.add(divBadge);
          }
        }
      }
    }

    // Luffy Straw Hat Cord hanging behind neck (-Z)
    if (spec?.luffyCord) {
      const cordMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75 });
      [-0.1, 0.1].forEach((cx) => {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.34, 6), cordMat);
        cord.position.set(cx, 0.56, -chestD * 0.5 - 0.025);
        cord.rotation.z = cx < 0 ? 0.28 : -0.28;
        upperTorso.add(cord);
      });
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), cordMat);
      knot.position.set(0, 0.42, -chestD * 0.5 - 0.03);
      upperTorso.add(knot);
    }

    // Back-strapped props (-Z)
    if (spec?.backProp === 'trunks_sword' || spec?.backProp === 'mirage_sword') {
      const isMirage = spec.backProp === 'mirage_sword';
      const scabbard = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 1.38, 0.06),
        new THREE.MeshStandardMaterial({
          color: isMirage ? '#38bdf8' : '#1e3a8a',
          emissive: isMirage ? '#0284c7' : '#000000',
          emissiveIntensity: isMirage ? 0.45 : 0,
          roughness: 0.4,
        }),
      );
      scabbard.rotation.z = -0.45;
      scabbard.position.set(0.02, 0.35, -0.26);
      const hilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8),
        new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.7, roughness: 0.25 }),
      );
      hilt.rotation.z = -0.45;
      hilt.position.set(-0.28, 0.92, -0.26);
      upperTorso.add(scabbard, hilt);
    } else if (spec?.backProp === 'ragnir_back') {
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 1.55, 8),
        new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.75 }),
      );
      handle.rotation.z = 0.48;
      handle.position.set(0, 0.35, -0.28);
      const headBlock = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.32, 0.32, 2, 0.04),
        new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.75, roughness: 0.3 }),
      );
      headBlock.rotation.z = 0.48;
      headBlock.position.set(-0.3, 0.95, -0.3);
      const goldBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.07, 0.34),
        new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 }),
      );
      goldBand.rotation.z = 0.48;
      goldBand.position.copy(headBlock.position);
      upperTorso.add(handle, headBlock, goldBand);
    } else if (spec?.backProp === 'killua_skateboard') {
      const deck = new THREE.Mesh(
        new RoundedBoxGeometry(0.28, 0.92, 0.04, 2, 0.015),
        new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.45 }),
      );
      deck.rotation.z = 0.28;
      deck.position.set(0, 0.36, -0.25);
      const wheelMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 });
      [-0.24, 0.24].forEach((wy) => {
        const axle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.08), wheelMat);
        axle.rotation.z = 0.28;
        axle.position.set(-wy * 0.28, 0.36 + wy, -0.29);
        upperTorso.add(axle);
      });
      upperTorso.add(deck);
    }

    // Giant Red Prayer Beads (Ichibe / Ace)
    if (spec?.prayerBeads) {
      const beadMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 });
      for (let b = 0; b < 10; b++) {
        const a = (b / 10) * Math.PI * 2;
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), beadMat);
        bead.position.set(Math.cos(a) * 0.26, 0.58 - Math.abs(Math.cos(a)) * 0.05, Math.sin(a) * 0.24);
        upperTorso.add(bead);
      }
    }

    // Jiraiya / Giant Toad Scroll on back
    if (suit === 'jiraiya' || suit === 'hashirama') {
      const scroll = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.92, 12),
        new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.65 }),
      );
      scroll.rotation.z = Math.PI / 2;
      scroll.position.set(0, 0.42, -0.3);
      upperTorso.add(scroll);
    }
  }

  // Beerus Egyptian God of Destruction 3D Collar
  if (spec?.egyptCollar) {
    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.055, 8, 18),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4 }),
    );
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.set(0, 0.61, 0);
    const goldRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.265, 0.022, 8, 18),
      new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.25 }),
    );
    goldRim.rotation.x = Math.PI / 2;
    goldRim.position.set(0, 0.585, 0);
    upperTorso.add(collarRing, goldRim);
  }

  // Distinct Neck
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.125, 0.16, 12),
    suit === 'ironman' || suit === 'spiderman' || suit === 'ultraman' ? armUpperMat : skinMat,
  );
  neckMesh.position.set(0, 0.68, 0);
  upperTorso.add(neckMesh);

  // Whis Angel Neck Halo (floating cyan/light-blue ring around neck)
  if (spec?.neckHaloColor) {
    const neckHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.028, 10, 26),
      new THREE.MeshBasicMaterial({ color: spec.neckHaloColor, transparent: true, opacity: 0.9 }),
    );
    neckHalo.rotation.x = Math.PI / 2;
    neckHalo.position.set(0, 0.69, 0);
    upperTorso.add(neckHalo);
  }

  // 3. HEAD GROUP
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.96, 0);
  upperTorso.add(headGroup);

  const headMat =
    suit === 'ironman'
      ? new THREE.MeshStandardMaterial({ color: '#991b1b', metalness: 0.85, roughness: 0.22 })
      : suit === 'spiderman'
        ? new THREE.MeshStandardMaterial({ map: getSpiderWebTexture(), roughness: 0.42 })
        : suit === 'batman'
          ? new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45 })
          : suit === 'ultraman'
            ? new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.6, roughness: 0.28 })
            : suit === 'kamen_rider'
              ? new THREE.MeshStandardMaterial({ color: '#059669', metalness: 0.65, roughness: 0.25 })
              : suit === 'k_cyber'
                ? new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.2 })
                : suit === 'flash'
                  ? new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 })
                  : skinMat;

  const headMesh = new THREE.Mesh(SHARED_GEO.headBox, headMat);
  if (spec?.headOval) {
    headMesh.scale.set(1.18, 0.94, 0.94);
  }
  headMesh.castShadow = castShadow;
  headGroup.add(headMesh);

  // Face / Mask (+Z Front)
  const fullMaskType = spec?.fullMask;
  const hidesFacePlane =
    fullMaskType === 'ironman' ||
    fullMaskType === 'ultraman' ||
    fullMaskType === 'k_cyber' ||
    fullMaskType === 'spiderman' ||
    fullMaskType === 'kamen_rider' ||
    fullMaskType === 'batman' ||
    fullMaskType === 'obito_mask' ||
    fullMaskType === 'doom_mask' ||
    fullMaskType === 'black_panther' ||
    fullMaskType === 'deadpool' ||
    fullMaskType === 'wolverine_cowl' ||
    fullMaskType === 'venom' ||
    fullMaskType === 'ghost_rider' ||
    fullMaskType === 'moon_knight' ||
    fullMaskType === 'skull_brook' ||
    fullMaskType === 'titan_colossal' ||
    fullMaskType === 'titan_armored' ||
    fullMaskType === 'titan_warhammer' ||
    fullMaskType === 'jogo_volcano';

  if (fullMaskType === 'ironman' || fullMaskType === 'ultraman' || fullMaskType === 'k_cyber') {
    const facePlate = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.42, 0.08, 2, 0.04), accentMat);
    facePlate.position.set(0, -0.02, 0.23);
    const eyeColor = fullMaskType === 'ultraman' ? '#fef08a' : '#22d3ee';
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    [-0.095, 0.095].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.03), eyeGlowMat);
      eye.position.set(ex, 0.04, 0.27);
      headGroup.add(eye);
    });
    headGroup.add(facePlate);
    if (fullMaskType === 'ultraman') {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.34), headMat);
      fin.position.set(0, 0.32, -0.02);
      headGroup.add(fin);
    }
  } else if (fullMaskType === 'spiderman' || fullMaskType === 'kamen_rider' || fullMaskType === 'deadpool') {
    if (fullMaskType === 'deadpool') {
      const dpMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.48 });
      const dpCap = new THREE.Mesh(new RoundedBoxGeometry(0.535, 0.535, 0.515, 3, 0.18), dpMat);
      headGroup.add(dpCap);
    }
    const rimMat = new THREE.MeshBasicMaterial({ color: '#09090b' });
    const eyeColor = fullMaskType === 'kamen_rider' ? '#ef4444' : '#ffffff';
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    [-0.1, 0.1].forEach((ex, idx) => {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.04), rimMat);
      rim.position.set(ex, 0.04, 0.255);
      rim.rotation.z = idx === 0 ? -0.22 : 0.22;
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.075, 0.045), eyeMat);
      lens.position.set(ex, 0.04, 0.26);
      lens.rotation.z = idx === 0 ? -0.22 : 0.22;
      headGroup.add(rim, lens);
    });
    if (fullMaskType === 'kamen_rider') {
      [-0.1, 0.1].forEach((ax) => {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), accentMat);
        ant.position.set(ax, 0.36, 0.15);
        ant.rotation.z = ax < 0 ? 0.35 : -0.35;
        headGroup.add(ant);
      });
    }
  } else if (fullMaskType === 'doom_mask' || fullMaskType === 'black_panther' || fullMaskType === 'moon_knight') {
    const maskColor =
      fullMaskType === 'doom_mask' ? '#94a3b8' : fullMaskType === 'moon_knight' ? '#f8fafc' : '#09090b';
    const maskMat = new THREE.MeshStandardMaterial({
      color: maskColor,
      metalness: fullMaskType === 'doom_mask' ? 0.88 : 0.35,
      roughness: fullMaskType === 'doom_mask' ? 0.22 : 0.42,
    });
    const shell = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.54, 0.52, 3, 0.17), maskMat);
    headGroup.add(shell);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: fullMaskType === 'black_panther' ? '#c084fc' : fullMaskType === 'doom_mask' ? '#38bdf8' : '#ffffff',
    });
    [-0.1, 0.1].forEach((ex) => {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.04), eyeMat);
      slit.position.set(ex, 0.04, 0.265);
      slit.rotation.z = ex < 0 ? -0.15 : 0.15;
      headGroup.add(slit);
    });
    if (fullMaskType === 'black_panther') {
      [-0.18, 0.18].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), maskMat);
        ear.position.set(ex, 0.3, -0.02);
        headGroup.add(ear);
      });
    }
  } else if (fullMaskType === 'wolverine_cowl') {
    const yellowMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 });
    const blackMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.45 });
    const dome = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.36, 0.52, 3, 0.12), yellowMat);
    dome.position.set(0, 0.1, 0);
    const jaw = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.2, 0.14, 2, 0.05), skinMat);
    jaw.position.set(0, -0.15, 0.21);
    const eyeWhite = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    [-0.15, 0.15].forEach((wx) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.32), blackMat);
      fin.position.set(wx * 1.45, 0.2, 0.04);
      fin.rotation.z = wx < 0 ? 0.35 : -0.35;
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.04), eyeWhite);
      lens.position.set(wx * 0.68, 0.04, 0.265);
      headGroup.add(fin, lens);
    });
    headGroup.add(dome, jaw);
  } else if (fullMaskType === 'venom' || fullMaskType === 'ghost_rider' || fullMaskType === 'skull_brook') {
    const isVenom = fullMaskType === 'venom';
    const isGhost = fullMaskType === 'ghost_rider';
    const headBaseMat = new THREE.MeshStandardMaterial({
      color: isVenom ? '#050507' : '#f1f5f9',
      roughness: isVenom ? 0.25 : 0.65,
    });
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.54, 0.52, 3, 0.16), headBaseMat);
    headGroup.add(cap);
    const eyeMat = new THREE.MeshBasicMaterial({ color: isGhost ? '#fb923c' : isVenom ? '#ffffff' : '#09090b' });
    [-0.11, 0.11].forEach((ex, idx) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.13, isVenom ? 0.09 : 0.11, 0.04), eyeMat);
      eye.position.set(ex, 0.05, 0.26);
      eye.rotation.z = idx === 0 ? -0.25 : 0.25;
      headGroup.add(eye);
    });
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.04),
      new THREE.MeshBasicMaterial({ color: isVenom ? '#dc2626' : '#0f172a' }),
    );
    mouth.position.set(0, -0.13, 0.26);
    headGroup.add(mouth);
    if (isGhost) {
      const fireMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
      [-0.1, 0, 0.1].forEach((fx, fi) => {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38 - Math.abs(fi - 1) * 0.08, 6), fireMat);
        flame.position.set(fx, 0.42, -0.02);
        headGroup.add(flame);
      });
    }
  } else if (
    fullMaskType === 'titan_colossal' ||
    fullMaskType === 'titan_armored' ||
    fullMaskType === 'titan_warhammer' ||
    fullMaskType === 'jogo_volcano'
  ) {
    const tColor =
      fullMaskType === 'titan_colossal'
        ? '#991b1b'
        : fullMaskType === 'titan_armored'
          ? '#d6d3d1'
          : fullMaskType === 'titan_warhammer'
            ? '#e2e8f0'
            : '#334155';
    const tMat = new THREE.MeshStandardMaterial({ color: tColor, roughness: 0.48 });
    const shell = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.55, 0.53, 3, 0.15), tMat);
    headGroup.add(shell);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: fullMaskType === 'titan_warhammer' ? '#bae6fd' : fullMaskType === 'jogo_volcano' ? '#09090b' : '#fde047',
    });
    if (fullMaskType === 'jogo_volcano') {
      const cyclops = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), eyeMat);
      cyclops.position.set(0, 0.04, 0.27);
      const crater = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 10), tMat);
      crater.position.set(0, 0.36, 0);
      const lava = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#f97316' }));
      lava.position.set(0, 0.48, 0);
      headGroup.add(cyclops, crater, lava);
    } else {
      [-0.11, 0.11].forEach((ex) => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.04), eyeMat);
        eye.position.set(ex, 0.05, 0.268);
        headGroup.add(eye);
      });
    }
  } else {
    if (fullMaskType === 'batman' || fullMaskType === 'flash') {
      const jaw = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.19, 0.12, 2, 0.05), skinMat);
      jaw.position.set(0, -0.15, 0.21);
      headGroup.add(jaw);
      if (fullMaskType === 'batman') {
        [-0.17, 0.17].forEach((bx) => {
          const batEar = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 5), headMat);
          batEar.position.set(bx, 0.34, 0);
          headGroup.add(batEar);
        });
        const cowlEyeMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
        [-0.1, 0.1].forEach((ex) => {
          const cowlEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.042, 0.04), cowlEyeMat);
          cowlEye.position.set(ex, 0.04, 0.248);
          cowlEye.rotation.z = ex < 0 ? -0.16 : 0.16;
          headGroup.add(cowlEye);
        });
      } else {
        [-0.27, 0.27].forEach((wx) => {
          const earBolt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.12), accentMat);
          earBolt.position.set(wx, 0.06, 0);
          headGroup.add(earBolt);
        });
      }
    } else if (fullMaskType === 'kakashi') {
      const faceMask = new THREE.Mesh(
        new RoundedBoxGeometry(0.53, 0.24, 0.26, 2, 0.05),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 }),
      );
      faceMask.position.set(0, -0.12, 0.14);
      headGroup.add(faceMask);
    } else if (fullMaskType === 'aizen_eyepatch') {
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.1, 0.05),
        new THREE.MeshBasicMaterial({ color: '#09090b' }),
      );
      patch.position.set(-0.1, 0.03, 0.255);
      headGroup.add(patch);
    } else if (fullMaskType === 'obito_mask') {
      const mask = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.52, 0.12, 3, 0.08),
        new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.4 }),
      );
      mask.position.set(0, 0, 0.24);
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 8),
        new THREE.MeshBasicMaterial({ color: '#09090b' }),
      );
      hole.position.set(0.09, 0.04, 0.305);
      headGroup.add(mask, hole);
    } else if (fullMaskType === 'grimmjow_jaw') {
      const jaw = new THREE.Mesh(
        new RoundedBoxGeometry(0.28, 0.16, 0.22, 2, 0.04),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 }),
      );
      jaw.position.set(0.18, -0.14, 0.12);
      headGroup.add(jaw);
    }

    // Single lightweight 128x128 CanvasTexture facePlane (+Z)
    if (!hidesFacePlane) {
      const faceTex = getAnimeFaceTexture({
        characterId: suit,
        expression: cfg.faceExpression || 'auto',
        age: cfg.faceAge || 'young',
        eyeStyle: cfg.eyeStyle || 'auto',
        isFemale,
        hairColor,
        spec,
      });
      const faceMat = new THREE.MeshBasicMaterial({
        map: faceTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const facePlane = new THREE.Mesh(SHARED_GEO.facePlane, faceMat);
      if (spec?.headOval) {
        facePlane.scale.set(1.12, 0.94, 1);
        facePlane.position.set(0, 0, 0.238);
      } else {
        facePlane.position.set(0, 0, 0.253);
      }
      headGroup.add(facePlane);
    }

    // 3D Chin Beard for elder faceAge or Yamamoto (gives crisp side profile)
    if (
      (spec?.whiteBeard || cfg.faceAge === 'elder') &&
      !hidesFacePlane &&
      fullMaskType !== 'kakashi'
    ) {
      const beard = new THREE.Mesh(
        SHARED_GEO.elderBeard,
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.85 }),
      );
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.25, 0.17);
      headGroup.add(beard);
    }

    if (spec?.snakeEarrings) {
      const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.25 });
      [-0.29, 0.29].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 10), goldMat);
        ear.position.set(ex, -0.08, 0);
        headGroup.add(ear);
      });
    }
  }

  // Eye Blindfold (Gojo Satoru / Prince Loki)
  if (spec?.eyeBandage) {
    const blindfold = new THREE.Mesh(
      new RoundedBoxGeometry(0.55, 0.145, 0.535, 2, 0.025),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85 }),
    );
    blindfold.position.set(0, 0.055, 0.01);
    headGroup.add(blindfold);
  }

  // Mythological Animal Snouts / Trunks
  if (spec?.jackalHead) {
    const snoutMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.25 });
    const snout = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.28, 2, 0.04), snoutMat);
    snout.position.set(0, -0.06, 0.3);
    const nemesL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.36), goldMat);
    nemesL.position.set(-0.27, -0.04, -0.04);
    const nemesR = nemesL.clone();
    nemesR.position.x = 0.27;
    headGroup.add(snout, nemesL, nemesR);
  }
  if (spec?.falconHead) {
    const beakMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.7, roughness: 0.28 });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 5), beakMat);
    beak.rotation.x = Math.PI * 0.56;
    beak.position.set(0, -0.02, 0.33);
    headGroup.add(beak);
  }
  if (spec?.elephantHead) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const earMat = new THREE.MeshStandardMaterial({ color: '#f9a8d4', roughness: 0.65 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.04, 0.34, 8), trunkMat);
    trunk.rotation.x = Math.PI * 0.36;
    trunk.position.set(0, -0.1, 0.33);
    [-0.36, 0.36].forEach((ex) => {
      const ear = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.34, 0.06, 2, 0.03), earMat);
      ear.position.set(ex, 0.02, -0.04);
      ear.rotation.y = ex < 0 ? 0.3 : -0.3;
      headGroup.add(ear);
    });
    headGroup.add(trunk);
  }

  // Imu Tall Crown / Dragon Horns / Ram Horns / Sun Disk / Quetzal Headdress
  if (spec?.imuCrownTall) {
    const crownMat = new THREE.MeshStandardMaterial({ color: '#050507', roughness: 0.65 });
    const tallBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.52, 8), crownMat);
    tallBase.position.set(0, 0.52, -0.01);
    headGroup.add(tallBase);
    [-0.14, 0, 0.14].forEach((sx, si) => {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 5), crownMat);
      sp.position.set(sx, 0.85 - Math.abs(si - 1) * 0.06, 0);
      headGroup.add(sp);
    });
  }
  if (spec?.dragonHorns) {
    const dHornMat = new THREE.MeshStandardMaterial({ color: '#1e1b4b', roughness: 0.38 });
    [-0.22, 0.22].forEach((hx) => {
      const h1 = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.44, 7), dHornMat);
      h1.position.set(hx, 0.34, -0.02);
      h1.rotation.z = hx < 0 ? 0.55 : -0.55;
      h1.rotation.x = -0.25;
      headGroup.add(h1);
    });
  }
  if (spec?.ramHorns) {
    const rHornMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.55 });
    [-0.27, 0.27].forEach((hx) => {
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 6, 12, Math.PI * 1.45), rHornMat);
      curl.position.set(hx, 0.2, -0.02);
      curl.rotation.y = Math.PI / 2;
      headGroup.add(curl);
    });
  }
  if (spec?.sunDisk) {
    const sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#facc15' }),
    );
    sunOrb.position.set(0, 0.44, 0);
    const sunRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.025, 6, 16),
      new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 }),
    );
    sunRing.position.copy(sunOrb.position);
    headGroup.add(sunOrb, sunRing);
  }
  if (spec?.quetzalCrown) {
    const emMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.45 });
    const gldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.25 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), gldMat);
    band.position.set(0, 0.24, 0);
    headGroup.add(band);
    for (let f = -2; f <= 2; f++) {
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.36, 0.03), emMat);
      feather.position.set(f * 0.1, 0.42 - Math.abs(f) * 0.03, -0.1);
      feather.rotation.z = -f * 0.22;
      headGroup.add(feather);
    }
  }

  // Hair & Hijab rendering (uses SHARED_GEO for 60 FPS potato-PC safety)
  const effectiveHair = spec
    ? spec.hairMode || 'none'
    : cfg.hairStyle;

  if (effectiveHair !== 'none' && effectiveHair !== 'covered' && effectiveHair !== 'bald') {
    const isHijabStyle = effectiveHair === 'hijab' || effectiveHair === 'hijab_sport';
    if (!isHijabStyle && effectiveHair !== 'mohawk') {
      const fullRearShell = new THREE.Mesh(SHARED_GEO.hairRearShell, hairMat);
      fullRearShell.position.set(0, 0.03, -0.2);
      headGroup.add(fullRearShell);
    }

    if (effectiveHair === 'mohawk') {
      const fin = new THREE.Mesh(SHARED_GEO.mohawkFin, hairMat);
      fin.position.set(0, 0.3, -0.01);
      headGroup.add(fin);
      [-0.14, 0, 0.14].forEach((mz) => {
        const spike = new THREE.Mesh(SHARED_GEO.mohawkSpike, hairMat);
        spike.position.set(0, 0.43, mz);
        spike.rotation.x = mz * 0.8;
        headGroup.add(spike);
      });
    } else if (
      effectiveHair === 'short' ||
      effectiveHair === 'spiky' ||
      effectiveHair === 'gon_spiky' ||
      effectiveHair === 'undercut' ||
      effectiveHair === 'slick'
    ) {
      const cap = new THREE.Mesh(SHARED_GEO.hairCapShort, hairMat);
      cap.position.set(0, 0.19, -0.01);
      headGroup.add(cap);
      if (effectiveHair !== 'slick') {
        [-0.14, 0, 0.14].forEach((bx, bi) => {
          const bang = new THREE.Mesh(SHARED_GEO.hairBangCone, hairMat);
          bang.rotation.x = Math.PI - 0.18;
          bang.position.set(bx, 0.145 - (bi === 1 ? 0.015 : 0), 0.242);
          headGroup.add(bang);
        });
      }
      if (effectiveHair !== 'undercut') {
        const sideL = new THREE.Mesh(SHARED_GEO.hairSideShort, hairMat);
        sideL.position.set(-0.25, 0.05, -0.05);
        const sideR = new THREE.Mesh(SHARED_GEO.hairSideShort, hairMat);
        sideR.position.set(0.25, 0.05, -0.05);
        headGroup.add(sideL, sideR);
      }
      if (effectiveHair === 'spiky') {
        for (let s = -2; s <= 2; s++) {
          const spike = new THREE.Mesh(SHARED_GEO.hairSpikeCone, hairMat);
          spike.position.set(s * 0.088, 0.35, 0.04);
          spike.rotation.x = 0.25;
          headGroup.add(spike);
        }
      } else if (effectiveHair === 'gon_spiky') {
        for (let s = -2; s <= 2; s++) {
          const spike = new THREE.Mesh(SHARED_GEO.hairGonSpikeCone, hairMat);
          spike.scale.set(1, 1 - Math.abs(s) * 0.12, 1);
          spike.position.set(s * 0.085, 0.42 - Math.abs(s) * 0.04, -0.01);
          headGroup.add(spike);
        }
      } else if (effectiveHair === 'slick') {
        const crest = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.12, 0.45, 2, 0.05), hairMat);
        crest.position.set(0, 0.28, 0.02);
        headGroup.add(crest);
      }
    } else if (effectiveHair === 'curly') {
      const cap = new THREE.Mesh(SHARED_GEO.hairCapShort, hairMat);
      cap.position.set(0, 0.19, -0.02);
      headGroup.add(cap);
      const curlCoords: Array<[number, number, number]> = [
        [-0.18, 0.26, 0.14],
        [0, 0.28, 0.17],
        [0.18, 0.26, 0.14],
        [-0.24, 0.22, -0.02],
        [0.24, 0.22, -0.02],
        [-0.16, 0.26, -0.18],
        [0, 0.27, -0.21],
        [0.16, 0.26, -0.18],
      ];
      curlCoords.forEach(([cx, cy, cz]) => {
        const curl = new THREE.Mesh(SHARED_GEO.hairCurlSphere, hairMat);
        curl.position.set(cx, cy, cz);
        headGroup.add(curl);
      });
    } else if (effectiveHair === 'side_part' || effectiveHair === 'parted') {
      const crown = new THREE.Mesh(SHARED_GEO.hairCrown, hairMat);
      crown.position.set(0, 0.19, -0.02);
      const bangL = new THREE.Mesh(SHARED_GEO.hairBangSide, hairMat);
      bangL.position.set(-0.13, 0.15, 0.22);
      bangL.rotation.z = 0.24;
      const bangR = new THREE.Mesh(SHARED_GEO.hairBangSide, hairMat);
      bangR.position.set(0.13, 0.15, 0.22);
      bangR.rotation.z = -0.24;
      headGroup.add(crown, bangL, bangR);
    } else if (
      effectiveHair === 'long' ||
      effectiveHair === 'long_loose' ||
      effectiveHair === 'long_tie' ||
      effectiveHair === 'ponytail' ||
      effectiveHair === 'bob' ||
      effectiveHair === 'single_braid'
    ) {
      const crown = new THREE.Mesh(SHARED_GEO.hairCrown, hairMat);
      crown.position.set(0, 0.18, -0.02);
      const backHair = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, effectiveHair === 'bob' ? 0.32 : 0.52, 0.22, 2, 0.08),
        hairMat,
      );
      backHair.position.set(0, -0.06, -0.2);
      const fBangL = new THREE.Mesh(SHARED_GEO.hairBangSide, hairMat);
      fBangL.position.set(-0.12, 0.16, 0.225);
      fBangL.rotation.z = 0.2;
      const fBangR = new THREE.Mesh(SHARED_GEO.hairBangSide, hairMat);
      fBangR.position.set(0.12, 0.16, 0.225);
      fBangR.rotation.z = -0.2;
      headGroup.add(crown, backHair, fBangL, fBangR);
      if (effectiveHair === 'ponytail' || effectiveHair === 'long_tie') {
        const tieBand = new THREE.Mesh(
          new THREE.TorusGeometry(0.095, 0.025, 6, 10),
          new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.6 }),
        );
        tieBand.position.set(0, 0.08, -0.29);
        const tail = new THREE.Mesh(SHARED_GEO.ponytailTail, hairMat);
        tail.position.set(0, -0.08, -0.35);
        tail.rotation.x = -0.38;
        headGroup.add(tieBand, tail);
      } else if (effectiveHair === 'single_braid') {
        const tieBand = new THREE.Mesh(
          new THREE.TorusGeometry(0.08, 0.02, 6, 10),
          new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.6 }),
        );
        tieBand.position.set(0, 0.04, -0.3);
        headGroup.add(tieBand);
        for (let b = 0; b < 4; b++) {
          const seg = new THREE.Mesh(SHARED_GEO.braidSeg, hairMat);
          seg.scale.setScalar(1 - b * 0.1);
          seg.position.set(0, -0.04 - b * 0.11, -0.32 - b * 0.02);
          headGroup.add(seg);
        }
        const tip = new THREE.Mesh(SHARED_GEO.braidTip, hairMat);
        tip.rotation.x = Math.PI;
        tip.position.set(0, -0.46, -0.39);
        headGroup.add(tip);
      }
    } else if (effectiveHair === 'twin_braids' || effectiveHair === 'twin_tails' || effectiveHair === 'twintails') {
      const crown = new THREE.Mesh(SHARED_GEO.hairCrown, hairMat);
      crown.position.set(0, 0.18, -0.02);
      const fBangL = new THREE.Mesh(SHARED_GEO.hairBangSide, hairMat);
      fBangL.position.set(-0.12, 0.16, 0.225);
      fBangL.rotation.z = 0.2;
      const fBangR = new THREE.Mesh(SHARED_GEO.hairBangSide, hairMat);
      fBangR.position.set(0.12, 0.16, 0.225);
      fBangR.rotation.z = -0.2;
      headGroup.add(crown, fBangL, fBangR);
      const tieMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.55 });
      [-0.28, 0.28].forEach((bx) => {
        const tie = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.02, 6, 10), tieMat);
        tie.position.set(bx, 0.08, -0.08);
        headGroup.add(tie);
        if (effectiveHair === 'twin_braids') {
          for (let b = 0; b < 4; b++) {
            const seg = new THREE.Mesh(SHARED_GEO.braidSeg, hairMat);
            seg.scale.setScalar(0.92 - b * 0.09);
            seg.position.set(bx + (bx < 0 ? -b * 0.015 : b * 0.015), -0.02 - b * 0.1, -0.12);
            headGroup.add(seg);
          }
        } else {
          const tail = new THREE.Mesh(SHARED_GEO.ponytailTail, hairMat);
          tail.position.set(bx + (bx < 0 ? -0.04 : 0.04), -0.12, -0.12);
          tail.rotation.z = bx < 0 ? 0.22 : -0.22;
          headGroup.add(tail);
        }
      });
    } else if (effectiveHair === 'whis_tall') {
      const cap = new THREE.Mesh(SHARED_GEO.hairCapShort, hairMat);
      cap.position.set(0, 0.2, -0.01);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.44, 10), hairMat);
      tower.position.set(0, 0.44, -0.01);
      const peak = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.26, 10), hairMat);
      peak.position.set(0, 0.76, -0.02);
      peak.rotation.x = -0.15;
      const sideL = new THREE.Mesh(SHARED_GEO.hairSideShort, hairMat);
      sideL.position.set(-0.25, 0.06, -0.04);
      const sideR = new THREE.Mesh(SHARED_GEO.hairSideShort, hairMat);
      sideR.position.set(0.25, 0.06, -0.04);
      headGroup.add(cap, tower, peak, sideL, sideR);
    } else if (effectiveHair === 'ushnisha') {
      const cap = new THREE.Mesh(SHARED_GEO.hairCapShort, hairMat);
      cap.position.set(0, 0.2, -0.01);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), hairMat);
      bun.position.set(0, 0.36, -0.02);
      headGroup.add(cap, bun);
    } else if (effectiveHair === 'afro') {
      const afro = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), hairMat);
      afro.position.set(0, 0.26, -0.04);
      headGroup.add(afro);
    } else if (effectiveHair === 'hijab') {
      // Hijab Segi Empat / Pashmina Rapi: wraps skull, chin fold, and drapes over shoulders/chest
      const wrap = new THREE.Mesh(SHARED_GEO.hijabWrap, hairMat);
      wrap.position.set(0, 0.02, -0.03);
      const drape = new THREE.Mesh(SHARED_GEO.hijabDrape, hairMat);
      drape.position.set(0, -0.3, -0.02);
      const fold = new THREE.Mesh(SHARED_GEO.hijabFold, hairMat);
      fold.position.set(0, 0.01, 0.05);
      const pin = new THREE.Mesh(
        SHARED_GEO.hijabPin,
        new THREE.MeshStandardMaterial({ color: '#fde047', metalness: 0.85, roughness: 0.2 }),
      );
      pin.position.set(0, -0.24, 0.23);
      headGroup.add(wrap, drape, fold, pin);
    } else if (effectiveHair === 'hijab_sport') {
      // Hijab Sport Pendaki: fitted athletic cap + snug neck cover + contrasting sport band
      const cap = new THREE.Mesh(SHARED_GEO.hijabSportCap, hairMat);
      cap.position.set(0, 0.02, -0.02);
      const neck = new THREE.Mesh(SHARED_GEO.hijabSportNeck, hairMat);
      neck.position.set(0, -0.26, -0.01);
      const sportBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.024, 6, 14, Math.PI * 1.15),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.55 }),
      );
      sportBand.position.set(0, 0.06, 0.04);
      headGroup.add(cap, neck, sportBand);
    }
  }

  // Costume-specific Headgear
  if (spec?.headGear) {
    const hg = spec.headGear;
    if (
      hg === 'straw_hat' ||
      hg === 'straw_hat_white' ||
      hg === 'ace_hat' ||
      hg === 'mihawk_hat' ||
      hg === 'urahara_hat'
    ) {
      const hColor =
        hg === 'ace_hat'
          ? '#f97316'
          : hg === 'mihawk_hat'
            ? '#09090b'
            : hg === 'straw_hat_white'
              ? '#f8fafc'
              : hg === 'urahara_hat'
                ? '#15803d'
                : '#facc15';
      const hatMat = new THREE.MeshStandardMaterial({ color: hColor, roughness: 0.78 });
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(hg === 'mihawk_hat' ? 0.62 : 0.52, hg === 'mihawk_hat' ? 0.66 : 0.56, 0.04, 18),
        hatMat,
      );
      brim.position.y = 0.22;
      const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.22, 16), hatMat);
      dome.position.y = 0.33;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.315, 0.315, 0.06, 16),
        new THREE.MeshStandardMaterial({
          color: hg === 'ace_hat' ? '#1e293b' : hg === 'urahara_hat' ? '#f8fafc' : '#dc2626',
          roughness: 0.7,
        }),
      );
      band.position.y = 0.25;
      headGroup.add(brim, dome, band);
      if (hg === 'mihawk_hat') {
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.42, 6),
          new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7 }),
        );
        plume.position.set(0.26, 0.42, -0.08);
        plume.rotation.z = -0.7;
        headGroup.add(plume);
      }
    } else if (hg === 'sabo_hat') {
      const topHatMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.65 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 14), topHatMat);
      brim.position.y = 0.22;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.34, 14), topHatMat);
      crown.position.y = 0.39;
      const goggleMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.55, roughness: 0.2 });
      [-0.09, 0.09].forEach((gx) => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), goggleMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(gx, 0.29, 0.27);
        headGroup.add(lens);
      });
      headGroup.add(brim, crown);
    } else if (hg === 'chopper_hat') {
      const pinkMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.85 });
      const blueMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.8 });
      const dome = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.26, 0.54, 3, 0.1), pinkMat);
      dome.position.set(0, 0.24, 0);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.08, 12), blueMat);
      brim.position.set(0, 0.16, 0);
      const antlerMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
      [-0.28, 0.28].forEach((ax) => {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.24, 6), antlerMat);
        ant.position.set(ax, 0.3, 0);
        ant.rotation.z = ax < 0 ? 0.65 : -0.65;
        headGroup.add(ant);
      });
      headGroup.add(dome, brim);
    } else if (hg === 'trafalgar_hat') {
      const fuzzMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.92 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.28, 16), fuzzMat);
      cap.position.y = 0.25;
      headGroup.add(cap);
    } else if (hg === 'horns' || hg === 'broken_horn') {
      const hornMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4 });
      if (hg === 'horns') {
        [-0.24, 0.24].forEach((hx) => {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 8), hornMat);
          horn.position.set(hx, 0.32, 0.02);
          horn.rotation.z = hx < 0 ? 0.65 : -0.65;
          headGroup.add(horn);
        });
      } else {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), hornMat);
        horn.position.set(-0.22, 0.28, 0.02);
        horn.rotation.z = 0.45;
        headGroup.add(horn);
      }
    } else if (hg === 'mahkota_wayang' || hg === 'crown_gold' || hg === 'brook_crown') {
      const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.25 });
      const baseCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.2, 8), goldMat);
      baseCrown.position.y = hg === 'brook_crown' ? 0.66 : 0.31;
      headGroup.add(baseCrown);
      if (hg === 'mahkota_wayang') {
        const peak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 6), goldMat);
        peak.position.set(0, 0.5, 0);
        headGroup.add(peak);
      }
    } else if (hg === 'scarlet_tiara') {
      const scarletMat = new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.5, roughness: 0.3 });
      const front = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.04), scarletMat);
      front.position.set(0, 0.16, 0.255);
      [-0.14, 0.14].forEach((px) => {
        const point = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 4), scarletMat);
        point.position.set(px, 0.27, 0.245);
        point.rotation.z = px < 0 ? 0.2 : -0.2;
        headGroup.add(point);
      });
      headGroup.add(front);
    } else if (hg === 'shiki_wheel') {
      const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.72 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.032, 6, 14), woodMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.32;
      headGroup.add(ring);
    } else if (hg === 'wukong_band') {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.03, 6, 18),
        new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 }),
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0.14, 0);
      headGroup.add(band);
    } else if (hg === 'doom_hood' || hg === 'akatsuki_hat' || hg === 'yhwach_helm') {
      const hMat = new THREE.MeshStandardMaterial({
        color: hg === 'doom_hood' ? '#15803d' : hg === 'akatsuki_hat' ? '#eab308' : '#09090b',
        roughness: 0.75,
      });
      if (hg === 'akatsuki_hat') {
        const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.28, 14), hMat);
        kasa.position.set(0, 0.28, 0);
        headGroup.add(kasa);
      } else {
        const hood = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.56, 0.56, 3, 0.16), hMat);
        hood.position.set(0, 0.04, -0.05);
        headGroup.add(hood);
      }
    } else if (hg === 'leaf_band' || hg === 'oil_band' || (hg as string) === 'towel_headband') {
      const isBardockBand = (hg as string) === 'towel_headband';
      const bandMat = new THREE.MeshStandardMaterial({
        color: isBardockBand ? '#dc2626' : hg === 'oil_band' ? '#7f1d1d' : '#1e3a8a',
        roughness: 0.65,
      });
      const cloth = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.09, 0.53, 3, 0.03), bandMat);
      cloth.position.y = 0.16;
      headGroup.add(cloth);
      if (!isBardockBand) {
        const plate = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.07, 0.03),
          new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 }),
        );
        plate.position.set(0, 0.16, 0.265);
        headGroup.add(plate);
      }
    } else if (hg === 'wing_helm') {
      const wingMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.5, roughness: 0.3 });
      [-0.28, 0.28].forEach((wx) => {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 4), wingMat);
        wing.position.set(wx, 0.16, -0.02);
        wing.rotation.z = wx < 0 ? 0.55 : -0.55;
        headGroup.add(wing);
      });
    } else if (hg === 'ice_crown') {
      const iceMat = new THREE.MeshStandardMaterial({
        color: '#67e8f9',
        emissive: '#06b6d4',
        emissiveIntensity: 0.45,
        roughness: 0.2,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.03, 6, 16), iceMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.26;
      headGroup.add(ring);
    } else if (hg === 'aokiji_glasses' || hg === 'usopp_goggles' || hg === 'visor') {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.08, 0.05),
        new THREE.MeshStandardMaterial({
          color: hg === 'aokiji_glasses' ? '#10b981' : hg === 'usopp_goggles' ? '#fbbf24' : '#0ea5e9',
          metalness: 0.65,
          roughness: 0.2,
        }),
      );
      frame.position.set(0, hg === 'visor' ? 0.05 : 0.19, 0.265);
      headGroup.add(frame);
    } else if (hg === 'eyepatch_odin') {
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.1, 0.05),
        new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.75, roughness: 0.25 }),
      );
      patch.position.set(0.1, 0.04, 0.258);
      headGroup.add(patch);
    } else if (hg === 'kenseikan') {
      const kMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });
      [-0.08, 0.08].forEach((kx) => {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.04), kMat);
        pin.position.set(kx, 0.34, 0.02);
        headGroup.add(pin);
      });
    } else if (hg === 'piccolo_turban') {
      const turbanMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 });
      const dome = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.26, 0.56, 4, 0.12), turbanMat);
      dome.position.set(0, 0.24, -0.01);
      const jewel = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 6),
        new THREE.MeshStandardMaterial({ color: '#7e22ce', roughness: 0.3 }),
      );
      jewel.position.set(0, 0.22, 0.28);
      headGroup.add(dome, jewel);
    } else if (hg === 'leorio_glasses') {
      const shadeMat = new THREE.MeshStandardMaterial({ color: '#09090b', metalness: 0.85, roughness: 0.15 });
      [-0.1, 0.1].forEach((gx) => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 12), shadeMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(gx, 0.03, 0.265);
        headGroup.add(lens);
      });
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.03), shadeMat);
      bridge.position.set(0, 0.035, 0.265);
      headGroup.add(bridge);
    } else if (hg === 'beerus_ears' || hg === 'anubis_ears') {
      const earHex = hg === 'anubis_ears' ? '#09090b' : '#a855f7';
      const innerHex = hg === 'anubis_ears' ? '#fbbf24' : '#f472b6';
      const outerEarMat = new THREE.MeshStandardMaterial({ color: earHex, roughness: 0.5 });
      const innerEarMat = new THREE.MeshStandardMaterial({ color: innerHex, roughness: 0.45 });
      [-0.19, 0.19].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.44, 6), outerEarMat);
        ear.position.set(ex, 0.4, 0.01);
        ear.rotation.z = ex < 0 ? 0.24 : -0.24;
        const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 4), innerEarMat);
        innerEar.position.set(ex * 1.02, 0.38, 0.068);
        innerEar.rotation.z = ex < 0 ? 0.24 : -0.24;
        headGroup.add(ear, innerEar);
      });
    } else if (hg === 'zeno_ears') {
      const yellowEarMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.42 });
      const stripeMat = new THREE.MeshStandardMaterial({ color: '#6b21a8', roughness: 0.5 });
      [-0.32, 0.32].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), yellowEarMat);
        ear.scale.set(0.62, 1.05, 0.88);
        ear.position.set(ex, 0.01, 0);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.36, 0.18), stripeMat);
        stripe.position.set(ex * 0.82, 0.03, 0.02);
        headGroup.add(ear, stripe);
      });
    }
  }

  // Luffy Gear 5 / God Halo behind shoulders (-Z)
  if (spec?.haloColor) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.055, 10, 24),
      new THREE.MeshStandardMaterial({
        color: spec.haloColor,
        emissive: spec.haloColor,
        emissiveIntensity: 0.5,
        roughness: 0.6,
      }),
    );
    halo.position.set(0, 0.6, -0.28);
    upperTorso.add(halo);
  }

  // Mythological Shoulder Ravens (Odin), Dharma Lotus Halo (Buddha), Wind-Fire Wheels (Nezha)
  if (spec?.shoulderRavens) {
    const ravenMat = new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.5 });
    [-0.44, 0.44].forEach((rx) => {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), ravenMat);
      body.scale.set(0.9, 1.15, 1.25);
      body.position.set(rx, 0.72, -0.02);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), new THREE.MeshStandardMaterial({ color: '#fbbf24' }));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(rx, 0.76, 0.1);
      upperTorso.add(body, beak);
    });
  }
  if (spec?.lotusHalo) {
    const dharmaMat = new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.82 });
    const outerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.04, 8, 24), dharmaMat);
    outerWheel.position.set(0, 0.68, -0.32);
    const innerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.025, 6, 18), dharmaMat);
    innerWheel.position.set(0, 0.68, -0.32);
    upperTorso.add(outerWheel, innerWheel);
  }
  if (spec?.fireWheels) {
    const wheelMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
    [-0.28, 0.28].forEach((wx) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.032, 6, 14), wheelMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(wx, -0.82, 0.04);
      lowerTorso.add(wheel);
    });
  }

  // Eyeglasses (when open face & enabled, +Z front — round wire for female, sporty angular for male)
  if (cfg.glasses && (!fullMaskType || fullMaskType === 'kakashi')) {
    const frameMat = new THREE.MeshStandardMaterial({
      color: isFemale ? '#d97706' : '#09090b',
      metalness: 0.75,
      roughness: 0.2,
    });
    const lensMat = new THREE.MeshStandardMaterial({
      color: isFemale ? '#bae6fd' : '#111827',
      transparent: isFemale,
      opacity: isFemale ? 0.55 : 1,
      metalness: isFemale ? 0.35 : 0.9,
      roughness: 0.12,
    });
    [-0.1, 0.1].forEach((gx) => {
      if (isFemale) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.012, 6, 14), frameMat);
        rim.position.set(gx, 0.03, 0.266);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), lensMat);
        lens.position.set(gx, 0.03, 0.264);
        headGroup.add(rim, lens);
      } else {
        const lens = new THREE.Mesh(new RoundedBoxGeometry(0.145, 0.085, 0.038, 2, 0.015), lensMat);
        lens.position.set(gx, 0.03, 0.265);
        headGroup.add(lens);
      }
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.022, 0.028), frameMat);
    bridge.position.set(0, 0.04, 0.265);
    headGroup.add(bridge);
  }

  // Standard Head Accessories (applied when no full costume head override)
  let headlampSpot: THREE.SpotLight | undefined;
  let headlampBulbMat: THREE.MeshStandardMaterial | undefined;
  const hat = spec ? 'none' : cfg.headAccessory;

  if (hat === 'rimba') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.54, 0.055, 14),
      new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.85 }),
    );
    brim.position.y = 0.21;
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.33, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: '#3f6212', roughness: 0.85 }),
    );
    crown.position.y = 0.32;
    headGroup.add(brim, crown);
  } else if (hat === 'baseball') {
    const capMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.65 });
    const dome = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.22, 0.52, 3, 0.12), capMat);
    dome.position.set(0, 0.22, -0.01);
    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.045, 0.3, 2, 0.02), capMat);
    visor.position.set(0, 0.14, 0.32);
    visor.rotation.x = -0.1;
    headGroup.add(dome, visor);
  } else if (hat === 'beanie') {
    const knitMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.92 });
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.12, 12), knitMat);
    cuff.position.y = 0.16;
    const dome = new THREE.Mesh(new SphereBeanieCapGeo(), knitMat);
    dome.position.y = 0.19;
    const pom = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.95 }),
    );
    pom.position.y = 0.48;
    headGroup.add(cuff, dome, pom);
  } else if (hat === 'towel_headband') {
    const towelMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.95 });
    const band = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.1, 0.54, 2, 0.04), towelMat);
    band.position.y = 0.15;
    headGroup.add(band);
    const neckTowel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.065, 6, 14), towelMat);
    neckTowel.rotation.x = Math.PI / 2;
    neckTowel.position.set(0, 0.64, -0.02);
    upperTorso.add(neckTowel);
  } else if (hat === 'bando') {
    const bandoMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.55 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.032, 6, 16, Math.PI * 1.1), bandoMat);
    band.position.set(0, 0.13, 0.02);
    const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 4), bandoMat);
    bowL.rotation.z = Math.PI / 2;
    bowL.position.set(-0.07, 0.34, 0.04);
    const bowR = bowL.clone();
    bowR.rotation.z = -Math.PI / 2;
    bowR.position.x = 0.07;
    headGroup.add(band, bowL, bowR);
  } else if (hat === 'hairpin') {
    const pinMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.35 });
    const clipMat = new THREE.MeshStandardMaterial({ color: '#fde047', metalness: 0.75, roughness: 0.25 });
    [-0.17, 0.17].forEach((px) => {
      const bar = new THREE.Mesh(SHARED_GEO.hairpinBar, clipMat);
      bar.position.set(px, 0.17, 0.255);
      bar.rotation.z = px < 0 ? 0.25 : -0.25;
      const bow = new THREE.Mesh(SHARED_GEO.hairpinBow, pinMat);
      bow.position.set(px + (px < 0 ? -0.04 : 0.04), 0.18, 0.268);
      headGroup.add(bar, bow);
    });
  } else if (hat === 'headlamp' || cfg.headAccessory === 'headlamp') {
    const strap = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 0.075, 0.54, 2, 0.03),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 }),
    );
    strap.position.y = 0.16;
    const housing = new THREE.Mesh(
      new RoundedBoxGeometry(0.17, 0.11, 0.1, 2, 0.02),
      new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.4, roughness: 0.4 }),
    );
    housing.position.set(0, 0.16, 0.28);
    headlampBulbMat = new THREE.MeshStandardMaterial({
      color: '#fef9c3',
      emissive: '#fde047',
      emissiveIntensity: 1.5,
    });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), headlampBulbMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.16, 0.33);
    headGroup.add(strap, housing, lens);

    if (options.withSpotLight) {
      headlampSpot = new THREE.SpotLight('#fef08a', 0, 58, Math.PI / 4.2, 0.45, 1.1);
      headlampSpot.position.set(0, 0.16, 0.36);
      const spotTarget = new THREE.Object3D();
      spotTarget.position.set(0, -1.8, 16);
      headGroup.add(headlampSpot, spotTarget);
      headlampSpot.target = spotTarget;
    }
  } else if (hat === 'peci') {
    const peciMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.94 });
    const peci = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.24, 0.52, 2, 0.05), peciMat);
    peci.position.set(0, 0.26, 0);
    headGroup.add(peci);
  } else if (hat === 'blangkon') {
    const batikMat = new THREE.MeshStandardMaterial({ map: getBatikTexture(), roughness: 0.72 });
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.22, 0.54, 3, 0.1), batikMat);
    cap.position.set(0, 0.22, -0.01);
    const mondolan = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), batikMat);
    mondolan.position.set(0, 0.13, -0.29);
    headGroup.add(cap, mondolan);
  }

  // 4-9. ARMS
  const shoulderX = isFemale ? 0.405 : 0.51;
  const buildR15Arm = (side: -1 | 1) => {
    const upper = new THREE.Group();
    upper.position.set(side * shoulderX, 0.56, 0);
    const armW = isFemale ? 0.175 : 0.225;
    const upperMesh = new THREE.Mesh(new RoundedBoxGeometry(armW, 0.34, armW, 3, 0.065), armUpperMat);
    upperMesh.position.y = -0.14;
    upperMesh.castShadow = castShadow;
    upper.add(upperMesh);

    const lower = new THREE.Group();
    lower.position.set(0, -0.32, 0);
    const lowerMesh = new THREE.Mesh(new RoundedBoxGeometry(armW - 0.02, 0.32, armW - 0.02, 3, 0.06), armLowerMat);
    lowerMesh.position.y = -0.13;
    lowerMesh.castShadow = castShadow;
    lower.add(lowerMesh);
    upper.add(lower);

    const hand = new THREE.Group();
    hand.position.set(0, -0.3, 0);
    const palmMesh = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.16, 0.17, 3, 0.05), handMat);
    palmMesh.position.y = -0.06;
    if (spec?.giantHands) {
      palmMesh.scale.set(1.65, 1.45, 1.65);
    }
    palmMesh.castShadow = castShadow;
    hand.add(palmMesh);

    if (spec?.wolverineClaws) {
      const clawMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.92, roughness: 0.15 });
      [-0.045, 0, 0.045].forEach((cx) => {
        const claw = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.34), clawMat);
        claw.position.set(cx, -0.08, 0.2);
        hand.add(claw);
      });
    }

    if (suit === 'ironman') {
      const repulsor = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 10),
        new THREE.MeshBasicMaterial({ color: '#22d3ee', side: THREE.DoubleSide }),
      );
      repulsor.rotation.x = Math.PI / 2;
      repulsor.position.set(0, -0.142, 0);
      hand.add(repulsor);
    }

    lower.add(hand);
    upperTorso.add(upper);
    return { upper, lower, hand };
  };

  const leftArmSet = buildR15Arm(-1);
  const rightArmSet = buildR15Arm(1);
  if (spec?.missingLeftArm) {
    leftArmSet.lower.visible = false;
    leftArmSet.hand.visible = false;
  }

  // Extra 4-Arm Mythological / Sukuna Heian Pair
  if (spec?.extraArms) {
    [-1, 1].forEach((side) => {
      const exArm = new THREE.Group();
      exArm.position.set(side * (shoulderX + 0.04), 0.3, -0.12);
      exArm.rotation.z = side * 0.48;
      exArm.rotation.x = -0.35;
      const exMesh = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.54, 0.18, 2, 0.05), skinMat);
      exMesh.position.y = -0.22;
      const exHand = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.15, 0.16, 2, 0.04), handMat);
      exHand.position.y = -0.52;
      exArm.add(exMesh, exHand);
      upperTorso.add(exArm);
    });
  }

  // Sport Smartwatch on left wrist (Male accessory)
  if (!spec && cfg.wristAccessory === 'watch') {
    const watchBand = new THREE.Mesh(
      SHARED_GEO.watchBand,
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6 }),
    );
    watchBand.position.set(0, -0.24, 0);
    const watchDial = new THREE.Mesh(
      SHARED_GEO.watchDial,
      new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.35 }),
    );
    watchDial.position.set(0, -0.24, 0.11);
    leftArmSet.lower.add(watchBand, watchDial);
  }

  // Costume Weapons attached to Hands / Back
  if (spec?.weapon) {
    const wp = spec.weapon;
    const metalBladeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.85, roughness: 0.2 });
    const darkGripMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.65 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.22 });

    if (wp === 'shield') {
      const shieldColor = suit === 'wonder_woman' ? '#b45309' : '#dc2626';
      const shield = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.05, 18),
        new THREE.MeshStandardMaterial({ color: shieldColor, metalness: 0.7, roughness: 0.28 }),
      );
      shield.rotation.z = Math.PI / 2;
      shield.position.set(-0.14, -0.04, 0.06);
      if (suit === 'captain_america') {
        const inner = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.058, 18),
          new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.6 }),
        );
        inner.rotation.z = Math.PI / 2;
        inner.position.copy(shield.position);
        leftArmSet.hand.add(inner);
      }
      leftArmSet.hand.add(shield);
    } else if (wp === 'mjolnir' || wp === 'stormbreaker' || wp === 'ragnir_hammer' || wp === 'nobara_hammer') {
      const len = wp === 'ragnir_hammer' ? 0.95 : wp === 'stormbreaker' ? 0.68 : 0.38;
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, len, 8),
        new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.75 }),
      );
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0, -0.06, len * 0.45);
      const headSize = wp === 'ragnir_hammer' ? [0.34, 0.28, 0.44] : wp === 'nobara_hammer' ? [0.16, 0.14, 0.24] : [0.24, 0.22, 0.36];
      const head = new THREE.Mesh(
        new RoundedBoxGeometry(headSize[0], headSize[1], headSize[2], 2, 0.03),
        wp === 'nobara_hammer' ? new THREE.MeshStandardMaterial({ color: '#a16207', roughness: 0.65 }) : metalBladeMat,
      );
      head.position.set(0, -0.06, len * 0.9);
      rightArmSet.hand.add(handle, head);
    } else if (
      wp === 'trident' ||
      wp === 'bident' ||
      wp === 'spear' ||
      wp === 'gungnir' ||
      wp === 'three_point_spear' ||
      wp === 'staff' ||
      wp === 'clima_tact' ||
      wp === 'ruyi_staff'
    ) {
      const staffColor =
        wp === 'trident' || wp === 'gungnir' || wp === 'three_point_spear'
          ? goldMat
          : wp === 'clima_tact'
            ? new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.45 })
            : wp === 'ruyi_staff'
              ? new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45 })
              : wp === 'bident'
                ? darkGripMat
                : new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.88, 8), staffColor);
      shaft.position.set(0, 0.25, 0.12);
      rightArmSet.hand.add(shaft);
      if (wp === 'trident' || wp === 'three_point_spear') {
        [-0.1, 0, 0.1].forEach((tx) => {
          const prong = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.24, 6), goldMat);
          prong.position.set(tx, 1.26, 0.12);
          rightArmSet.hand.add(prong);
        });
      } else if (wp === 'bident') {
        [-0.08, 0.08].forEach((tx) => {
          const prong = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.26, 6), darkGripMat);
          prong.position.set(tx, 1.26, 0.12);
          rightArmSet.hand.add(prong);
        });
      } else if (wp === 'gungnir') {
        const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.34, 4), goldMat);
        spearHead.position.set(0, 1.28, 0.12);
        rightArmSet.hand.add(spearHead);
      } else if (wp === 'ruyi_staff') {
        [-0.65, 1.15].forEach((ry) => {
          const band = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.18, 8), goldMat);
          band.position.set(0, ry, 0.12);
          rightArmSet.hand.add(band);
        });
      }
    } else if (wp === 'ankh') {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 14), goldMat);
      loop.position.set(0, 0.2, 0.14);
      const crossV = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), goldMat);
      crossV.position.set(0, -0.05, 0.14);
      const crossH = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 8), goldMat);
      crossH.rotation.z = Math.PI / 2;
      crossH.position.set(0, 0.06, 0.14);
      rightArmSet.hand.add(loop, crossV, crossH);
    } else if (
      wp === 'sword' ||
      wp === 'dual_swords' ||
      wp === 'katana_3' ||
      wp === 'sode_shirayuki' ||
      wp === 'ryujin_jakka'
    ) {
      const bladeMat =
        wp === 'sode_shirayuki'
          ? new THREE.MeshStandardMaterial({ color: '#f8fafc', emissive: '#bae6fd', emissiveIntensity: 0.45 })
          : wp === 'ryujin_jakka'
            ? new THREE.MeshStandardMaterial({ color: '#fb923c', emissive: '#ea580c', emissiveIntensity: 0.8 })
            : suit === 'ichigo'
              ? darkGripMat
              : metalBladeMat;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.07, suit === 'kenpachi' ? 1.35 : 1.05),
        bladeMat,
      );
      blade.position.set(0, -0.06, 0.55);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.03), goldMat);
      guard.position.set(0, -0.06, 0.12);
      rightArmSet.hand.add(blade, guard);
      if (wp === 'katana_3' || wp === 'dual_swords') {
        const blade2 = blade.clone();
        const guard2 = guard.clone();
        leftArmSet.hand.add(blade2, guard2);
        if (wp === 'katana_3') {
          const hipSword = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), darkGripMat);
          hipSword.rotation.x = Math.PI / 2;
          hipSword.position.set(-0.36, 0.14, -0.12);
          lowerTorso.add(hipSword);
        }
      }
    } else if (wp === 'scythe') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.8, 8), darkGripMat);
      shaft.position.set(0, 0.25, 0.14);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.03), metalBladeMat);
      blade.position.set(-0.24, 1.08, 0.14);
      blade.rotation.z = 0.28;
      rightArmSet.hand.add(shaft, blade);
    } else if (wp === 'slingshot') {
      const slMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), slMat);
      stem.position.set(0, 0.08, 0.14);
      [-0.14, 0.14].forEach((fx) => {
        const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), slMat);
        fork.position.set(fx, 0.38, 0.14);
        fork.rotation.z = fx < 0 ? 0.35 : -0.35;
        rightArmSet.hand.add(fork);
      });
      rightArmSet.hand.add(stem);
    } else if (wp === 'yoru') {
      // Mihawk giant black greatsword strapped across back (-Z)
      const yoruBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 0.04), darkGripMat);
      yoruBlade.rotation.z = 0.42;
      yoruBlade.position.set(0, 0.35, -0.25);
      const crossGuard = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 0.06), goldMat);
      crossGuard.rotation.z = 0.42;
      crossGuard.position.set(-0.26, 0.94, -0.25);
      upperTorso.add(yoruBlade, crossGuard);
    } else if (wp === 'gunbai') {
      const fanDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.26, 0.05, 14),
        new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.5 }),
      );
      fanDisk.rotation.x = Math.PI / 2;
      fanDisk.position.set(0, -0.04, 0.45);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), darkGripMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, -0.04, 0.18);
      rightArmSet.hand.add(fanDisk, shaft);
    } else if (wp === 'kanabo') {
      const club = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.04, 1.4, 8), darkGripMat);
      club.rotation.x = Math.PI / 2;
      club.position.set(0, -0.06, 0.6);
      rightArmSet.hand.add(club);
    } else if (wp === 'lightning_bolt') {
      const bolt = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshBasicMaterial({ color: '#fde047' }),
      );
      bolt.scale.set(0.45, 2.2, 0.45);
      bolt.position.set(0, 0.05, 0.14);
      rightArmSet.hand.add(bolt);
    } else if (wp === 'fire_orb' || wp === 'rasengan' || wp === 'chaos_orbs') {
      const orbColor = wp === 'chaos_orbs' ? '#ef4444' : wp === 'fire_orb' ? '#f97316' : '#38bdf8';
      const orbMat = new THREE.MeshBasicMaterial({ color: orbColor, transparent: true, opacity: 0.85 });
      const orbR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), orbMat);
      orbR.position.set(0, -0.16, 0.12);
      rightArmSet.hand.add(orbR);
      if (wp === 'chaos_orbs') {
        const orbL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), orbMat);
        orbL.position.set(0, -0.16, 0.12);
        leftArmSet.hand.add(orbL);
      }
    } else if (wp === 'magic_mandala') {
      const mandMat = new THREE.MeshBasicMaterial({ color: '#fbbf24', wireframe: true });
      const disk = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.28, 12), mandMat);
      disk.position.set(0, -0.06, 0.24);
      rightArmSet.hand.add(disk);
    } else if (wp === 'kurta_chains') {
      const chainMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.25 });
      for (let c = 0; c < 4; c++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 6, 10), chainMat);
        link.rotation.x = Math.PI / 2;
        link.position.set(0, -0.02 - c * 0.045, 0);
        rightArmSet.hand.add(link);
      }
      const dowsingBall = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), chainMat);
      dowsingBall.rotation.x = Math.PI;
      dowsingBall.position.set(0, -0.24, 0.08);
      rightArmSet.hand.add(dowsingBall);
    } else if (wp === 'playing_card') {
      const card = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.16, 0.015),
        new THREE.MeshBasicMaterial({ color: '#f8fafc' }),
      );
      card.position.set(0, -0.06, 0.16);
      card.rotation.z = 0.25;
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.02),
        new THREE.MeshBasicMaterial({ color: '#dc2626' }),
      );
      mark.position.copy(card.position);
      rightArmSet.hand.add(card, mark);
    } else if (wp === 'whis_staff') {
      const staffShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.028, 1.58, 10),
        new THREE.MeshStandardMaterial({ color: '#451a03', metalness: 0.35, roughness: 0.45 }),
      );
      staffShaft.position.set(0, 0.22, 0.14);
      const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 18), goldMat);
      collarRing.rotation.x = Math.PI / 2;
      collarRing.position.set(0, 1.06, 0.14);
      const crystalOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
      );
      crystalOrb.position.set(0, 1.06, 0.14);
      const staffTopTip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 8), goldMat);
      staffTopTip.position.set(0, 1.24, 0.14);
      rightArmSet.hand.add(staffShaft, collarRing, crystalOrb, staffTopTip);
    }
  }

  // 10-15. LEGS (Boot toes point +Z forward)
  const hipX = isFemale ? 0.165 : 0.195;
  const buildR15Leg = (side: -1 | 1) => {
    const upper = new THREE.Group();
    upper.position.set(side * hipX, -0.02, 0);
    const legW = isFemale ? 0.23 : 0.275;
    const thigh = new THREE.Mesh(new RoundedBoxGeometry(legW, 0.46, 0.27, 3, 0.08), legUpperMat);
    thigh.position.y = -0.21;
    thigh.castShadow = castShadow;
    upper.add(thigh);

    const lower = new THREE.Group();
    lower.position.set(0, -0.44, 0);
    const shin = new THREE.Mesh(new RoundedBoxGeometry(legW - 0.02, 0.42, 0.25, 3, 0.075), legLowerMat);
    shin.position.y = -0.19;
    shin.castShadow = castShadow;
    lower.add(shin);
    upper.add(lower);

    const foot = new THREE.Group();
    foot.position.set(0, -0.4, 0);
    const bootUpper = new THREE.Mesh(new RoundedBoxGeometry(legW, 0.2, 0.39, 3, 0.06), bootMat);
    bootUpper.position.set(0, -0.04, 0.06);
    bootUpper.castShadow = castShadow;
    const toeCap = new THREE.Mesh(new RoundedBoxGeometry(legW - 0.02, 0.11, 0.12, 3, 0.04), bootMat);
    toeCap.position.set(0, -0.07, 0.24);
    const heelTab = new THREE.Mesh(new THREE.BoxGeometry(legW - 0.04, 0.13, 0.045), soleMat);
    heelTab.position.set(0, -0.03, -0.14);
    const sole = new THREE.Mesh(new RoundedBoxGeometry(legW + 0.015, 0.065, 0.43, 2, 0.02), soleMat);
    sole.position.set(0, -0.128, 0.06);
    foot.add(bootUpper, toeCap, heelTab, sole);
    lower.add(foot);

    lowerTorso.add(upper);
    return { upper, lower, foot };
  };

  const leftLegSet = buildR15Leg(-1);
  const rightLegSet = buildR15Leg(1);

  // Back Gear (-Z Back)
  let capeUpper: THREE.Object3D | undefined;
  let capeLower: THREE.Object3D | undefined;
  let jetFlames: THREE.Object3D[] | undefined;

  const effectiveBackGear = spec?.capeColor ? 'cape' : spec ? 'none' : cfg.backGear;

  if (effectiveBackGear === 'carrier') {
    const packMat = new THREE.MeshStandardMaterial({ color: cfg.pack, roughness: 0.78 });
    const strapMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.55 });
    const mainPack = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.64, 0.34, 4, 0.08), packMat);
    mainPack.position.set(0, 0.34, -0.35);
    mainPack.castShadow = castShadow;
    const lid = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.16, 0.36, 3, 0.06), strapMat);
    lid.position.set(0, 0.68, -0.35);
    const backPouch = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.32, 0.08, 3, 0.03), strapMat);
    backPouch.position.set(0, 0.28, -0.52);
    const safetyStrip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.02), trimMat);
    safetyStrip.position.set(0, 0.36, -0.56);
    const matRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.8 }),
    );
    matRoll.rotation.z = Math.PI / 2;
    matRoll.position.set(0, 0.82, -0.35);
    upperTorso.add(mainPack, lid, backPouch, safetyStrip, matRoll);

    // 3D Shoulder Straps wrapping over shoulders from front chest (+Z) to rear backpack (-Z)
    [-0.19, 0.19].forEach((sx) => {
      const frontStrap = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.56, 0.035), strapMat);
      frontStrap.position.set(sx, 0.35, chestD * 0.5 + 0.016);
      const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.04, chestD + 0.12), strapMat);
      topStrap.position.set(sx, 0.635, -0.04);
      upperTorso.add(frontStrap, topStrap);
    });
  } else if (effectiveBackGear === 'sling') {
    const strapMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 });
    const slingMat = new THREE.MeshStandardMaterial({ color: cfg.pack, roughness: 0.65 });
    const strap = new THREE.Mesh(SHARED_GEO.slingStrap, strapMat);
    strap.rotation.z = -0.62;
    strap.position.set(0, 0.34, 0);
    const bag = new THREE.Mesh(SHARED_GEO.slingBag, slingMat);
    bag.position.set(0.14, 0.24, -0.26);
    bag.rotation.z = -0.22;
    bag.castShadow = castShadow;
    upperTorso.add(strap, bag);
  } else if (effectiveBackGear === 'cape') {
    const capeColor = spec?.capeColor || '#dc2626';
    const capeMat = new THREE.MeshStandardMaterial({
      color: capeColor,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const capeRoot = new THREE.Group();
    capeRoot.position.set(0, 0.6, -0.22);
    const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.045), capeMat);
    upperPanel.position.set(0, -0.31, -0.05);
    upperPanel.rotation.x = -0.14;
    capeRoot.add(upperPanel);

    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, -0.6, -0.09);
    const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.65, 0.045), capeMat);
    lowerPanel.position.set(0, -0.32, -0.04);
    lowerPivot.add(lowerPanel);
    capeRoot.add(lowerPivot);

    upperTorso.add(capeRoot);
    capeUpper = capeRoot;
    capeLower = lowerPivot;
  } else if (effectiveBackGear === 'wings') {
    const wingMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#e2e8f0',
      emissiveIntensity: 0.18,
      roughness: 0.45,
    });
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.14, 0.48, -0.22);
      wing.rotation.y = side * 0.4;
      for (let f = 0; f < 3; f++) {
        const feather = new THREE.Mesh(
          new RoundedBoxGeometry(0.72 - f * 0.14, 0.18, 0.06, 2, 0.03),
          wingMat,
        );
        feather.position.set(side * (0.42 - f * 0.06), 0.18 - f * 0.2, -0.06);
        feather.rotation.z = side * (0.28 - f * 0.2);
        wing.add(feather);
      }
      upperTorso.add(wing);
    });
  } else if (effectiveBackGear === 'jetpack') {
    const metalMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.78, roughness: 0.26 });
    const tankMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.65, roughness: 0.32 });
    const nozzleMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.3 });
    const flameMat = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    jetFlames = [];
    [-0.17, 0.17].forEach((jx) => {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.56, 12), metalMat);
      tank.position.set(jx, 0.36, -0.34);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), tankMat);
      cap.position.set(jx, 0.64, -0.34);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.14, 10), nozzleMat);
      nozzle.position.set(jx, 0.04, -0.34);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 8), flameMat);
      flame.rotation.x = Math.PI;
      flame.position.set(jx, -0.14, -0.34);
      upperTorso.add(tank, cap, nozzle, flame);
      jetFlames?.push(flame);
    });
  }

  // Spec Back Wings (Dragon Nidhogg / Devil Imu / Angel / Iron Spider / Butterflies)
  if (spec?.backWings && spec.backWings !== 'none') {
    const bw = spec.backWings;
    if (bw === 'dragon_dark' || bw === 'demon_dark') {
      const wMat = new THREE.MeshStandardMaterial({
        color: bw === 'dragon_dark' ? '#1e1b4b' : '#450a0a',
        emissive: bw === 'dragon_dark' ? '#312e81' : '#7f1d1d',
        emissiveIntensity: 0.3,
        roughness: 0.5,
      });
      [-1, 1].forEach((side) => {
        const wing = new THREE.Group();
        wing.position.set(side * 0.18, 0.5, -0.24);
        wing.rotation.y = side * 0.45;
        const mainSpan = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.52, 0.04), wMat);
        mainSpan.position.set(side * 0.48, 0.18, -0.05);
        mainSpan.rotation.z = side * 0.32;
        const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 4), wMat);
        hornTip.position.set(side * 0.96, 0.44, -0.05);
        hornTip.rotation.z = side * -0.4;
        wing.add(mainSpan, hornTip);
        upperTorso.add(wing);
      });
    } else if (bw === 'angel_white') {
      const wingMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        emissive: '#e2e8f0',
        emissiveIntensity: 0.22,
        roughness: 0.45,
      });
      [-1, 1].forEach((side) => {
        const wing = new THREE.Group();
        wing.position.set(side * 0.14, 0.48, -0.22);
        wing.rotation.y = side * 0.4;
        for (let f = 0; f < 3; f++) {
          const feather = new THREE.Mesh(
            new RoundedBoxGeometry(0.76 - f * 0.14, 0.18, 0.06, 2, 0.03),
            wingMat,
          );
          feather.position.set(side * (0.44 - f * 0.06), 0.18 - f * 0.2, -0.06);
          feather.rotation.z = side * (0.28 - f * 0.2);
          wing.add(feather);
        }
        upperTorso.add(wing);
      });
    } else if (bw === 'iron_spider') {
      const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 });
      const redMat = new THREE.MeshStandardMaterial({ color: '#dc2626', metalness: 0.7, roughness: 0.25 });
      [
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ].forEach(([sx, sy]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.92, 6), sx > 0 ? goldMat : redMat);
        leg.position.set(sx * 0.42, 0.52 + sy * 0.26, -0.28);
        leg.rotation.z = sx * (sy > 0 ? -0.65 : -1.1);
        upperTorso.add(leg);
      });
    } else if (bw === 'butterflies') {
      const bfMat = new THREE.MeshBasicMaterial({ color: '#a855f7', transparent: true, opacity: 0.78 });
      [-1, 1].forEach((side) => {
        const topW = new THREE.Mesh(new THREE.CircleGeometry(0.32, 10), bfMat);
        topW.position.set(side * 0.34, 0.52, -0.26);
        const botW = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), bfMat);
        botW.position.set(side * 0.28, 0.16, -0.26);
        upperTorso.add(topW, botW);
      });
    }
  }

  // Orbiting Elemental Aura Particles (for Mythological Gods, Flash, Thor, Anime characters)
  let auraParticles: R15JointRig['auraParticles'];
  if (spec?.auraColor) {
    auraParticles = [];
    const pMat = new THREE.MeshBasicMaterial({
      color: spec.auraColor,
      transparent: true,
      opacity: 0.82,
    });
    for (let i = 0; i < 6; i++) {
      const pMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), pMat);
      group.add(pMesh);
      auraParticles.push({
        mesh: pMesh,
        phase: (i / 6) * Math.PI * 2,
        radius: 0.68 + (i % 2) * 0.14,
        speed: 2.2 + (i % 3) * 0.45,
        baseY: 0.65 + (i % 3) * 0.42,
      });
    }
  }

  // Golden Observer Aura for Teacher
  let auraRing: THREE.Mesh | undefined;
  if (role === 'teacher') {
    auraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.96, 28),
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.05;
    group.add(auraRing);
  }

  const rig: R15JointRig = {
    bodyRig,
    lowerTorso,
    upperTorso,
    headGroup,
    leftUpperArm: leftArmSet.upper,
    leftLowerArm: leftArmSet.lower,
    leftHand: leftArmSet.hand,
    rightUpperArm: rightArmSet.upper,
    rightLowerArm: rightArmSet.lower,
    rightHand: rightArmSet.hand,
    leftUpperLeg: leftLegSet.upper,
    leftLowerLeg: leftLegSet.lower,
    leftFoot: leftLegSet.foot,
    rightUpperLeg: rightLegSet.upper,
    rightLowerLeg: rightLegSet.lower,
    rightFoot: rightLegSet.foot,
    capeUpper,
    capeLower,
    ponchoHem,
    ponchoHood,
    jetFlames,
    headlampSpot,
    headlampBulbMat,
    auraRing,
    auraParticles,
  };

  group.userData.r15 = rig;
  return { group, rig };
}

class SphereBeanieCapGeo extends THREE.SphereGeometry {
  constructor() {
    super(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
  }
}

export function animateR15AvatarPose(
  mesh: THREE.Group,
  isMoving: boolean,
  onGround: boolean,
  walkPhase: number,
  activeEmote: EmoteType | null,
  elapsed: number,
  isHurtOrState: boolean | AvatarPoseState = false,
) {
  const rig = mesh.userData.r15 as R15JointRig | undefined;
  if (!rig) return;

  const poseState: AvatarPoseState =
    typeof isHurtOrState === 'string'
      ? isHurtOrState
      : isHurtOrState
        ? 'hurt'
        : !onGround
          ? 'jump'
          : isMoving
            ? 'walk'
            : 'idle';

  if (rig.auraRing) {
    rig.auraRing.rotation.z = elapsed * 1.25;
  }

  if (rig.auraParticles) {
    for (const p of rig.auraParticles) {
      const ang = p.phase + elapsed * p.speed;
      p.mesh.position.set(
        Math.cos(ang) * p.radius,
        p.baseY + Math.sin(ang * 1.6) * 0.25,
        Math.sin(ang) * p.radius,
      );
      p.mesh.rotation.y = elapsed * 2.5;
    }
  }

  // Reset all 15 joints cleanly
  rig.bodyRig.position.set(0, 0, 0);
  rig.bodyRig.rotation.set(0, 0, 0);
  rig.lowerTorso.position.set(0, 1.02, 0);
  rig.lowerTorso.rotation.set(0, 0, 0);
  rig.upperTorso.position.set(0, 0.2, 0);
  rig.upperTorso.rotation.set(0, 0, 0);
  rig.headGroup.rotation.set(0, 0, 0);

  rig.leftUpperArm.rotation.set(0, 0, 0);
  rig.leftLowerArm.rotation.set(0, 0, 0);
  rig.rightUpperArm.rotation.set(0, 0, 0);
  rig.rightLowerArm.rotation.set(0, 0, 0);

  rig.leftUpperLeg.rotation.set(0, 0, 0);
  rig.leftLowerLeg.rotation.set(0, 0, 0);
  rig.leftFoot.rotation.set(0, 0, 0);
  rig.rightUpperLeg.rotation.set(0, 0, 0);
  rig.rightLowerLeg.rotation.set(0, 0, 0);
  rig.rightFoot.rotation.set(0, 0, 0);

  const speedFlutter = poseState === 'jump' || poseState === 'slide' ? 14 : isMoving ? 10 : 2.6;
  const flutterAmp = poseState === 'jump' || poseState === 'slide' ? 0.48 : isMoving ? 0.34 : 0.07;
  if (rig.capeUpper) {
    rig.capeUpper.rotation.x =
      (isMoving || poseState !== 'idle' ? 0.42 : 0.1) + Math.sin(elapsed * speedFlutter) * (flutterAmp * 0.5);
  }
  if (rig.capeLower) {
    rig.capeLower.rotation.x =
      (isMoving || poseState !== 'idle' ? 0.32 : 0.08) + Math.cos(elapsed * speedFlutter + 0.8) * flutterAmp;
  }
  if (rig.ponchoHem) {
    rig.ponchoHem.rotation.x = (isMoving ? 0.12 : 0.02) + Math.sin(elapsed * speedFlutter) * (flutterAmp * 0.22);
  }
  if (rig.ponchoHood) {
    rig.ponchoHood.rotation.x = Math.sin(elapsed * 4.5) * 0.05;
  }
  if (rig.jetFlames) {
    const fScale =
      poseState === 'jump' || poseState === 'slide'
        ? 1.55 + Math.sin(elapsed * 28) * 0.35
        : isMoving
          ? 0.95 + Math.sin(elapsed * 22) * 0.2
          : 0.3;
    rig.jetFlames.forEach((fl) => fl.scale.set(1, fScale, 1));
  }

  // Hurt / Knockback
  if (poseState === 'hurt') {
    rig.lowerTorso.rotation.x = -0.38;
    rig.upperTorso.rotation.x = -0.22;
    rig.leftUpperArm.rotation.z = -1.3;
    rig.rightUpperArm.rotation.z = 1.3;
    rig.leftLowerArm.rotation.x = -0.6;
    rig.rightLowerArm.rotation.x = -0.6;
    rig.leftUpperLeg.rotation.x = -0.45;
    rig.rightUpperLeg.rotation.x = 0.35;
    rig.leftLowerLeg.rotation.x = 0.7;
    return;
  }

  // Ladder Climbing Pose
  if (poseState === 'climb') {
    const c = Math.sin(walkPhase * 1.15);
    rig.upperTorso.rotation.x = 0.08;
    rig.leftUpperArm.rotation.x = -2.1 + c * 0.55;
    rig.leftLowerArm.rotation.x = -0.65;
    rig.rightUpperArm.rotation.x = -2.1 - c * 0.55;
    rig.rightLowerArm.rotation.x = -0.65;
    rig.leftUpperLeg.rotation.x = -0.45 - c * 0.45;
    rig.leftLowerLeg.rotation.x = 0.85;
    rig.rightUpperLeg.rotation.x = -0.45 + c * 0.45;
    rig.rightLowerLeg.rotation.x = 0.85;
    return;
  }

  // Mountain Slide Pose (Crouched surf stance)
  if (poseState === 'slide') {
    rig.lowerTorso.position.y = 0.66;
    rig.lowerTorso.rotation.x = -0.22;
    rig.upperTorso.rotation.x = 0.16;
    rig.leftUpperLeg.rotation.x = -1.1;
    rig.leftLowerLeg.rotation.x = 0.95;
    rig.rightUpperLeg.rotation.x = -0.9;
    rig.rightLowerLeg.rotation.x = 0.85;
    rig.leftUpperArm.rotation.z = -0.95;
    rig.rightUpperArm.rotation.z = 0.95;
    rig.leftUpperArm.rotation.x = 0.25;
    rig.rightUpperArm.rotation.x = 0.25;
    return;
  }

  // Mid-air Jump Pose
  if (poseState === 'jump' || !onGround) {
    rig.upperTorso.rotation.x = 0.1;
    rig.leftUpperLeg.rotation.x = -0.58;
    rig.leftLowerLeg.rotation.x = 0.82;
    rig.rightUpperLeg.rotation.x = -0.22;
    rig.rightLowerLeg.rotation.x = 0.48;
    rig.leftUpperArm.rotation.z = -0.65;
    rig.leftUpperArm.rotation.x = -0.35;
    rig.leftLowerArm.rotation.x = -0.45;
    rig.rightUpperArm.rotation.z = 0.65;
    rig.rightUpperArm.rotation.x = -0.35;
    rig.rightLowerArm.rotation.x = -0.45;
    return;
  }

  // Articulated Walking / Uphill Running Cycle (+Z forward) — grounded Roblox Expedition cadence
  if (poseState === 'walk' || isMoving) {
    const s = Math.sin(walkPhase);
    const c = Math.cos(walkPhase);
    rig.lowerTorso.position.y = 1.02 + Math.abs(c) * 0.04;
    rig.lowerTorso.rotation.y = s * 0.075;
    rig.upperTorso.rotation.x = 0.08;
    rig.upperTorso.rotation.y = -s * 0.085;
    rig.leftUpperLeg.rotation.x = s * 0.54;
    rig.leftLowerLeg.rotation.x = Math.max(0.06, -s * 0.58 + 0.2);
    rig.rightUpperLeg.rotation.x = -s * 0.54;
    rig.rightLowerLeg.rotation.x = Math.max(0.06, s * 0.58 + 0.2);
    rig.leftUpperArm.rotation.x = -s * 0.48;
    rig.leftLowerArm.rotation.x = -0.36 - Math.max(0, s) * 0.28;
    rig.rightUpperArm.rotation.x = s * 0.48;
    rig.rightLowerArm.rotation.x = -0.36 - Math.max(0, -s) * 0.28;
    return;
  }

  // Emotes while standing
  if (activeEmote === 'wave') {
    rig.rightUpperArm.rotation.z = 2.45 + Math.sin(elapsed * 9.5) * 0.28;
    rig.rightLowerArm.rotation.z = 0.35 + Math.sin(elapsed * 9.5 + 0.5) * 0.25;
    rig.headGroup.rotation.z = -0.08;
  } else if (activeEmote === 'celebrate') {
    rig.leftUpperArm.rotation.z = -2.55 + Math.sin(elapsed * 8) * 0.18;
    rig.rightUpperArm.rotation.z = 2.55 - Math.sin(elapsed * 8) * 0.18;
    rig.leftLowerArm.rotation.x = -0.35;
    rig.rightLowerArm.rotation.x = -0.35;
    rig.bodyRig.position.y = Math.abs(Math.sin(elapsed * 6.5)) * 0.22;
  } else if (activeEmote === 'cheer') {
    rig.leftUpperArm.rotation.x = -1.65 + Math.sin(elapsed * 11) * 0.25;
    rig.leftLowerArm.rotation.x = -0.7;
    rig.rightUpperArm.rotation.x = -1.65 + Math.sin(elapsed * 11) * 0.25;
    rig.rightLowerArm.rotation.x = -0.7;
  } else if (activeEmote === 'scared') {
    rig.leftUpperArm.rotation.x = -1.8;
    rig.leftLowerArm.rotation.x = -0.85;
    rig.rightUpperArm.rotation.x = -1.8;
    rig.rightLowerArm.rotation.x = -0.85;
    rig.upperTorso.rotation.z = Math.sin(elapsed * 26) * 0.08;
    rig.headGroup.rotation.y = Math.sin(elapsed * 18) * 0.15;
  } else if (activeEmote === 'laugh') {
    rig.upperTorso.rotation.x = 0.2 + Math.sin(elapsed * 15) * 0.1;
    rig.leftLowerArm.rotation.x = -1.0;
    rig.rightLowerArm.rotation.x = -1.0;
    rig.bodyRig.position.y = Math.abs(Math.sin(elapsed * 15)) * 0.06;
  } else if (activeEmote === 'sit') {
    rig.lowerTorso.position.y = 0.52;
    rig.leftUpperLeg.rotation.x = -1.42;
    rig.leftLowerLeg.rotation.x = 1.25;
    rig.rightUpperLeg.rotation.x = -1.42;
    rig.rightLowerLeg.rotation.x = 1.25;
    rig.leftUpperArm.rotation.x = -0.35;
    rig.leftLowerArm.rotation.x = -0.45;
    rig.rightUpperArm.rotation.x = -0.35;
    rig.rightLowerArm.rotation.x = -0.45;
  } else {
    const breath = Math.sin(elapsed * 2.1);
    rig.upperTorso.position.y = 0.2 + breath * 0.012;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.85) * 0.05;
    rig.leftUpperArm.rotation.z = -0.06 - breath * 0.02;
    rig.rightUpperArm.rotation.z = 0.06 + breath * 0.02;
    rig.leftLowerArm.rotation.x = -0.14;
    rig.rightLowerArm.rotation.x = -0.14;
  }
}

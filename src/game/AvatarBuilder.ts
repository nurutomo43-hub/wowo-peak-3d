import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  DEFAULT_STUDENT_AVATAR,
  DEFAULT_TEACHER_AVATAR,
  type AvatarConfig,
  type CharacterCostumeId,
  type EmoteType,
  type GenderType,
  type HairStyle,
  type HeadAccessoryType,
  type OutfitType,
  type PantsStyleType,
  type Role,
} from '../types/game';

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
  textureCache.set(key, tex);
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

    if (outfit === 'windbreaker') {
      // Two-tone mountain jacket panels, seam piping, zipper teeth & chest pockets
      ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
      ctx.fillRect(0, 0, w, h * 0.28);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, h * 0.28, w, 6);
      // Center zipper track
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(w * 0.485, 0, w * 0.03, h);
      ctx.fillStyle = '#e2e8f0';
      for (let y = 16; y < h - 16; y += 14) {
        ctx.fillRect(w * 0.492, y, w * 0.016, 6);
      }
      // Side pockets & reflective tape
      ctx.strokeStyle = 'rgba(248,250,252,0.5)';
      ctx.lineWidth = 5;
      ctx.strokeRect(w * 0.14, h * 0.56, w * 0.24, h * 0.28);
      ctx.strokeRect(w * 0.62, h * 0.56, w * 0.24, h * 0.28);
      // Expedition mountain crest on left chest
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(w * 0.72, h * 0.42);
      ctx.lineTo(w * 0.78, h * 0.33);
      ctx.lineTo(w * 0.84, h * 0.42);
      ctx.closePath();
      ctx.fill();
    } else if (outfit === 'casual') {
      // Adventure T-shirt ribbed neckline & subtle mountain chest print
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
      // Tailored suit lapels, buttons & pocket square
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
      // Crisp Indonesian school shirt seam, pocket & badge
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

function getCostumeChestTexture(suit: CharacterCostumeId, spec: CostumeStyleSpec): THREE.CanvasTexture | null {
  if (suit === 'spiderman') return getSpiderWebTexture();
  return getProceduralTexture(`costume_512_${suit}`, (ctx, w, h) => {
    ctx.fillStyle = spec.torso;
    ctx.fillRect(0, 0, w, h);

    // Subtle shading folds
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (suit === 'luffy' || suit === 'luffy_gear5' || suit === 'ace') {
      // Open vest showing chest skin + Luffy X-scar
      ctx.fillStyle = spec.skin || '#f1c27d';
      ctx.fillRect(w * 0.3, 0, w * 0.4, h);
      if (suit === 'luffy' || suit === 'luffy_gear5') {
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(w * 0.36, h * 0.28);
        ctx.lineTo(w * 0.64, h * 0.56);
        ctx.moveTo(w * 0.64, h * 0.28);
        ctx.lineTo(w * 0.36, h * 0.56);
        ctx.stroke();
      }
      // Yellow/purple waist sash
      ctx.fillStyle = spec.accent;
      ctx.fillRect(0, h * 0.82, w, h * 0.18);
    } else if (suit === 'zoro') {
      // Green kimono folds + red haramaki sash
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 0);
      ctx.lineTo(w * 0.65, h * 0.72);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, h * 0.74, w, h * 0.26);
    } else if (suit === 'kaido') {
      // Bare chest with red dragon-scale tattoo + purple belt
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 14;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(w * 0.24, h * (0.25 + i * 0.14), 36, 0, Math.PI);
        ctx.stroke();
      }
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(0, h * 0.78, w, h * 0.22);
    } else if (suit === 'boa_hancock') {
      // Crimson-purple cheongsam with golden snake/dragon motif
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 10;
      ctx.strokeRect(w * 0.14, h * 0.08, w * 0.72, h * 0.84);
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.48, 72, 0, Math.PI * 1.6);
      ctx.stroke();
    } else if (suit === 'mihawk' || suit === 'shanks' || suit === 'sanji') {
      // V-neck collar / vest & shirt layers
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
      // Yellow/black hoodie + Heart Pirates emblem
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h * 0.22);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 42, 0, Math.PI * 2);
      ctx.fill();
    } else if (suit === 'naruto' || suit === 'boruto' || suit === 'jiraiya') {
      // Orange/dark tracksuit zipper + Konoha/Uzumaki spiral crest
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h * 0.24);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(w * 0.48, h * 0.24, w * 0.04, h * 0.76);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.42, 26, 0, Math.PI * 1.7);
      ctx.stroke();
    } else if (suit === 'hashirama' || suit === 'tobirama' || suit === 'madara') {
      // Sengoku segmented lamellar armor plates & rivets
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      for (let y = 72; y < h; y += 72) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#facc15';
      [w * 0.2, w * 0.8].forEach((rx) => {
        for (let y = 36; y < h; y += 72) {
          ctx.beginPath();
          ctx.arc(rx, y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } else if (suit === 'kakashi' || suit === 'minato') {
      // Chunin/Jonin flak vest pockets & scroll pouches
      ctx.fillStyle = '#14532d';
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 6;
      ctx.fillRect(w * 0.14, h * 0.26, w * 0.28, h * 0.28);
      ctx.strokeRect(w * 0.14, h * 0.26, w * 0.28, h * 0.28);
      ctx.fillRect(w * 0.58, h * 0.26, w * 0.28, h * 0.28);
      ctx.strokeRect(w * 0.58, h * 0.26, w * 0.28, h * 0.28);
    } else if (suit === 'itachi' || suit === 'obito') {
      // Akatsuki red cloud motifs on black cloak
      const drawCloud = (cx: number, cy: number) => {
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
        ctx.arc(cx - 28, cy + 12, 24, 0, Math.PI * 2);
        ctx.arc(cx + 28, cy + 12, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };
      drawCloud(w * 0.28, h * 0.36);
      drawCloud(w * 0.72, h * 0.68);
    } else if (
      suit === 'ichigo' ||
      suit === 'gin' ||
      suit === 'ichibe' ||
      suit === 'kenpachi' ||
      suit === 'toshiro' ||
      suit === 'byakuya' ||
      suit === 'rukia' ||
      suit === 'yamamoto'
    ) {
      // Shinigami Shihakusho white V-undercollar & white waist obi sash
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
      // Espada white jacket with black collar trim & hollow hole / abs reveal
      ctx.fillStyle = '#09090b';
      ctx.fillRect(w * 0.42, 0, w * 0.16, h);
      if (suit === 'ulquiorra') {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.36, 22, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#f1c27d';
        ctx.fillRect(w * 0.34, h * 0.24, w * 0.32, h * 0.56);
      }
    } else if (suit === 'ironman' || suit === 'k_cyber') {
      // Segmented chest armor lines
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = 10;
      ctx.strokeRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
      ctx.beginPath();
      ctx.moveTo(w * 0.12, h * 0.45);
      ctx.lineTo(w * 0.88, h * 0.45);
      ctx.stroke();
    }
  });
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
  'peci',
  'blangkon',
]);

const VALID_HAIR: ReadonlySet<HairStyle> = new Set([
  'short',
  'side_part',
  'spiky',
  'undercut',
  'long_loose',
  'ponytail',
  'twin_braids',
  'hijab',
  'parted',
  'long_tie',
  'bob',
  'covered',
  'bald',
]);

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

  return {
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
    backGear: raw?.backGear || base.backGear,
    pack: raw?.pack || base.pack,
    superheroSuit: (raw?.superheroSuit || 'none') as CharacterCostumeId,
  };
}

interface CostumeStyleSpec {
  torso: string;
  accent: string;
  armUpper: string;
  armLower: string;
  hand: string;
  legUpper: string;
  legLower: string;
  boot: string;
  skin?: string;
  hairColor?: string;
  hairMode?: 'none' | 'spiky' | 'long' | 'bob' | 'bald' | 'ponytail' | 'slick' | 'twin_tails' | 'parted';
  capeColor?: string;
  haloColor?: string;
  auraColor?: string;
  fullMask?:
    | 'ironman'
    | 'spiderman'
    | 'batman'
    | 'ultraman'
    | 'kamen_rider'
    | 'flash'
    | 'k_cyber'
    | 'kakashi'
    | 'aizen_eyepatch'
    | 'obito_mask'
    | 'grimmjow_jaw';
  scaleMult?: number;
  metalness?: number;
  roughness?: number;
  weapon?:
    | 'shield'
    | 'mjolnir'
    | 'trident'
    | 'spear'
    | 'katana_3'
    | 'sword'
    | 'yoru'
    | 'kanabo'
    | 'staff'
    | 'lightning_bolt'
    | 'fire_orb'
    | 'rasengan'
    | 'clima_tact'
    | 'sode_shirayuki'
    | 'ryujin_jakka'
    | 'gunbai';
  headGear?:
    | 'straw_hat'
    | 'straw_hat_white'
    | 'trafalgar_hat'
    | 'horns'
    | 'broken_horn'
    | 'crown_gold'
    | 'mahkota_wayang'
    | 'leaf_band'
    | 'oil_band'
    | 'akatsuki_hat'
    | 'yhwach_helm'
    | 'ice_crown'
    | 'wing_helm'
    | 'ace_hat'
    | 'mihawk_hat'
    | 'aokiji_glasses'
    | 'kenseikan'
    | 'visor';
  coat?: 'akatsuki' | 'marine' | 'hokage' | 'captain_white' | 'sleeveless_captain' | 'espada' | 'yhwach_cloak' | 'gundala_scarf' | 'feather_cape' | 'tsunade_haori' | 'jiraiya_haori';
  missingLeftArm?: boolean;
  prayerBeads?: boolean;
  byakugouSeal?: boolean;
  whiteBeard?: boolean;
  ulquiorraTears?: boolean;
  snakeEarrings?: boolean;
}

const COSTUME_SPECS: Partial<Record<CharacterCostumeId, CostumeStyleSpec>> = {
  // 1. Universal Superheroes (Marvel & DC)
  ironman: {
    torso: '#991b1b', accent: '#fbbf24', armUpper: '#991b1b', armLower: '#fbbf24',
    hand: '#991b1b', legUpper: '#991b1b', legLower: '#fbbf24', boot: '#991b1b',
    fullMask: 'ironman', metalness: 0.86, roughness: 0.22, auraColor: '#22d3ee',
  },
  spiderman: {
    torso: '#dc2626', accent: '#1d4ed8', armUpper: '#dc2626', armLower: '#1d4ed8',
    hand: '#dc2626', legUpper: '#1d4ed8', legLower: '#dc2626', boot: '#dc2626',
    fullMask: 'spiderman', metalness: 0.14, roughness: 0.42,
  },
  captain_america: {
    torso: '#1d4ed8', accent: '#dc2626', armUpper: '#1d4ed8', armLower: '#f8fafc',
    hand: '#991b1b', legUpper: '#1e3a8a', legLower: '#1e3a8a', boot: '#7c2d12',
    weapon: 'shield', headGear: 'wing_helm', metalness: 0.28,
  },
  thor: {
    torso: '#1e293b', accent: '#cbd5e1', armUpper: '#334155', armLower: '#94a3b8',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#1e293b', boot: '#451a03',
    capeColor: '#dc2626', hairColor: '#facc15', hairMode: 'long', weapon: 'mjolnir',
    headGear: 'wing_helm', auraColor: '#38bdf8', metalness: 0.65,
  },
  hulk: {
    torso: '#16a34a', accent: '#7e22ce', armUpper: '#16a34a', armLower: '#15803d',
    hand: '#16a34a', legUpper: '#6b21a8', legLower: '#16a34a', boot: '#15803d',
    skin: '#22c55e', hairColor: '#09090b', hairMode: 'spiky', scaleMult: 1.22,
  },
  superman: {
    torso: '#1d4ed8', accent: '#dc2626', armUpper: '#1d4ed8', armLower: '#1d4ed8',
    hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#1d4ed8', boot: '#dc2626',
    capeColor: '#dc2626', hairColor: '#0f172a', hairMode: 'slick',
  },
  batman: {
    torso: '#1e293b', accent: '#facc15', armUpper: '#1e293b', armLower: '#0f172a',
    hand: '#0f172a', legUpper: '#1e293b', legLower: '#0f172a', boot: '#09090b',
    capeColor: '#0f172a', fullMask: 'batman', metalness: 0.35,
  },
  wonder_woman: {
    torso: '#b91c1c', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#cbd5e1',
    hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#f1c27d', boot: '#dc2626',
    hairColor: '#09090b', hairMode: 'long', headGear: 'crown_gold', weapon: 'shield',
  },
  flash: {
    torso: '#dc2626', accent: '#facc15', armUpper: '#dc2626', armLower: '#dc2626',
    hand: '#dc2626', legUpper: '#dc2626', legLower: '#dc2626', boot: '#facc15',
    fullMask: 'flash', auraColor: '#facc15',
  },

  // 2. Asian & Indonesian Superheroes
  k_cyber: {
    torso: '#0f172a', accent: '#22d3ee', armUpper: '#1e293b', armLower: '#06b6d4',
    hand: '#0f172a', legUpper: '#0f172a', legLower: '#1e293b', boot: '#06b6d4',
    fullMask: 'k_cyber', auraColor: '#22d3ee', metalness: 0.78,
  },
  taekwondo_hero: {
    torso: '#f8fafc', accent: '#0f172a', armUpper: '#f8fafc', armLower: '#f8fafc',
    hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#0f172a',
    hairColor: '#1c1917', hairMode: 'spiky', headGear: 'leaf_band',
  },
  ultraman: {
    torso: '#e2e8f0', accent: '#dc2626', armUpper: '#dc2626', armLower: '#e2e8f0',
    hand: '#e2e8f0', legUpper: '#dc2626', legLower: '#e2e8f0', boot: '#dc2626',
    fullMask: 'ultraman', metalness: 0.55, auraColor: '#38bdf8',
  },
  kamen_rider: {
    torso: '#059669', accent: '#dc2626', armUpper: '#0f172a', armLower: '#059669',
    hand: '#0f172a', legUpper: '#0f172a', legLower: '#059669', boot: '#1e293b',
    fullMask: 'kamen_rider', capeColor: '#dc2626', metalness: 0.65,
  },
  shinobi: {
    torso: '#0f172a', accent: '#475569', armUpper: '#0f172a', armLower: '#1e293b',
    hand: '#09090b', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    coat: 'gundala_scarf', fullMask: 'kakashi', hairMode: 'spiky', weapon: 'katana_3',
  },
  gatotkaca: {
    torso: '#111827', accent: '#f59e0b', armUpper: '#111827', armLower: '#f59e0b',
    hand: '#f1c27d', legUpper: '#111827', legLower: '#111827', boot: '#d97706',
    capeColor: '#78350f', headGear: 'mahkota_wayang', metalness: 0.62,
  },
  gundala: {
    torso: '#991b1b', accent: '#facc15', armUpper: '#0f172a', armLower: '#991b1b',
    hand: '#0f172a', legUpper: '#0f172a', legLower: '#0f172a', boot: '#991b1b',
    headGear: 'wing_helm', coat: 'gundala_scarf', auraColor: '#38bdf8',
  },
  sri_asih: {
    torso: '#b91c1c', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#fbbf24',
    hand: '#f1c27d', legUpper: '#7f1d1d', legLower: '#f1c27d', boot: '#fbbf24',
    hairColor: '#1c1917', hairMode: 'long', headGear: 'mahkota_wayang', coat: 'gundala_scarf',
  },

  // 3. Mythology Gods (Greek, Hindu, Nusantara)
  zeus: {
    torso: '#f8fafc', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#fbbf24',
    hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#e2e8f0', boot: '#b45309',
    hairColor: '#f8fafc', hairMode: 'spiky', capeColor: '#f8fafc', headGear: 'crown_gold',
    weapon: 'lightning_bolt', auraColor: '#fde047',
  },
  prometheus: {
    torso: '#7c2d12', accent: '#fb923c', armUpper: '#f1c27d', armLower: '#f97316',
    hand: '#fb923c', legUpper: '#431407', legLower: '#7c2d12', boot: '#b45309',
    hairColor: '#ea580c', hairMode: 'spiky', weapon: 'fire_orb', auraColor: '#f97316',
  },
  poseidon: {
    torso: '#0e7490', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#0891b2',
    hand: '#f1c27d', legUpper: '#0f766e', legLower: '#155e75', boot: '#b45309',
    hairColor: '#cbd5e1', hairMode: 'long', headGear: 'crown_gold', weapon: 'trident', auraColor: '#22d3ee',
  },
  athena: {
    torso: '#f8fafc', accent: '#f59e0b', armUpper: '#f1c27d', armLower: '#fbbf24',
    hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f1c27d', boot: '#d97706',
    hairColor: '#451a03', hairMode: 'long', headGear: 'crown_gold', weapon: 'spear', capeColor: '#f8fafc',
  },
  krishna: {
    torso: '#facc15', accent: '#0284c7', armUpper: '#38bdf8', armLower: '#38bdf8',
    hand: '#38bdf8', legUpper: '#facc15', legLower: '#eab308', boot: '#d97706',
    skin: '#38bdf8', hairColor: '#0f172a', hairMode: 'slick', headGear: 'crown_gold', auraColor: '#fde047',
  },
  siwa: {
    torso: '#f1f5f9', accent: '#f97316', armUpper: '#cbd5e1', armLower: '#cbd5e1',
    hand: '#cbd5e1', legUpper: '#ea580c', legLower: '#cbd5e1', boot: '#78350f',
    skin: '#e2e8f0', hairColor: '#0f172a', hairMode: 'ponytail', weapon: 'trident', auraColor: '#67e8f9',
  },
  wisnu: {
    torso: '#1d4ed8', accent: '#fbbf24', armUpper: '#1d4ed8', armLower: '#fbbf24',
    hand: '#60a5fa', legUpper: '#facc15', legLower: '#d97706', boot: '#fbbf24',
    skin: '#60a5fa', hairColor: '#0f172a', hairMode: 'slick', headGear: 'mahkota_wayang', auraColor: '#fbbf24',
  },
  hanoman: {
    torso: '#f8fafc', accent: '#dc2626', armUpper: '#f8fafc', armLower: '#f8fafc',
    hand: '#f8fafc', legUpper: '#dc2626', legLower: '#f8fafc', boot: '#b45309',
    skin: '#f8fafc', hairColor: '#f8fafc', hairMode: 'spiky', headGear: 'crown_gold', weapon: 'staff',
  },

  // 4. Anime: One Piece (13)
  luffy: {
    torso: '#dc2626', accent: '#facc15', armUpper: '#dc2626', armLower: '#f1c27d',
    hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#f1c27d', boot: '#b45309',
    hairColor: '#09090b', hairMode: 'spiky', headGear: 'straw_hat',
  },
  luffy_gear5: {
    torso: '#f8fafc', accent: '#a855f7', armUpper: '#f8fafc', armLower: '#f8fafc',
    hand: '#f8fafc', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#f8fafc',
    skin: '#f8fafc', hairColor: '#ffffff', hairMode: 'spiky', haloColor: '#ffffff', auraColor: '#e9d5ff',
  },
  boa_hancock: {
    torso: '#be123c', accent: '#fbbf24', armUpper: '#be123c', armLower: '#f1c27d',
    hand: '#f1c27d', legUpper: '#9f1239', legLower: '#f1c27d', boot: '#be123c',
    hairColor: '#09090b', hairMode: 'long', capeColor: '#f8fafc', snakeEarrings: true, auraColor: '#f472b6',
  },
  zoro: {
    torso: '#15803d', accent: '#dc2626', armUpper: '#166534', armLower: '#15803d',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#22c55e', hairMode: 'spiky', weapon: 'katana_3',
  },
  kaido: {
    torso: '#d97706', accent: '#7e22ce', armUpper: '#c2410c', armLower: '#9a3412',
    hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#09090b',
    hairColor: '#0f172a', hairMode: 'long', headGear: 'horns', coat: 'feather_cape', weapon: 'kanabo',
    scaleMult: 1.24, auraColor: '#a855f7',
  },
  aokiji: {
    torso: '#f8fafc', accent: '#0284c7', armUpper: '#f8fafc', armLower: '#f8fafc',
    hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#0f172a',
    hairColor: '#0f172a', hairMode: 'spiky', headGear: 'aokiji_glasses', coat: 'marine', auraColor: '#67e8f9',
  },
  shanks: {
    torso: '#f8fafc', accent: '#dc2626', armUpper: '#f8fafc', armLower: '#f1c27d',
    hand: '#f1c27d', legUpper: '#451a03', legLower: '#451a03', boot: '#1e293b',
    hairColor: '#b91c1c', hairMode: 'parted', capeColor: '#09090b', weapon: 'sword', missingLeftArm: true, auraColor: '#ef4444',
  },
  mihawk: {
    torso: '#7f1d1d', accent: '#fbbf24', armUpper: '#7f1d1d', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#1e293b',
    hairColor: '#09090b', hairMode: 'slick', headGear: 'mihawk_hat', weapon: 'yoru',
  },
  sanji: {
    torso: '#0f172a', accent: '#eab308', armUpper: '#0f172a', armLower: '#0f172a',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#facc15', hairMode: 'slick', auraColor: '#fb923c',
  },
  ace: {
    torso: '#f1c27d', accent: '#f97316', armUpper: '#f1c27d', armLower: '#f1c27d',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#1e293b',
    hairColor: '#09090b', hairMode: 'spiky', headGear: 'ace_hat', prayerBeads: true, weapon: 'fire_orb', auraColor: '#f97316',
  },
  law: {
    torso: '#facc15', accent: '#0f172a', armUpper: '#0f172a', armLower: '#facc15',
    hand: '#f1c27d', legUpper: '#1e3a8a', legLower: '#1e3a8a', boot: '#09090b',
    hairColor: '#0f172a', hairMode: 'spiky', headGear: 'trafalgar_hat', weapon: 'sword',
  },
  nami: {
    torso: '#0ea5e9', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#f1c27d',
    hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#f1c27d', boot: '#92400e',
    hairColor: '#f97316', hairMode: 'long', weapon: 'clima_tact', auraColor: '#38bdf8',
  },
  nico_robin: {
    torso: '#4c1d95', accent: '#f472b6', armUpper: '#4c1d95', armLower: '#f1c27d',
    hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#f1c27d', boot: '#312e81',
    hairColor: '#0f172a', hairMode: 'parted', headGear: 'aokiji_glasses', auraColor: '#f472b6',
  },

  // 5. Anime: Naruto & Boruto (14)
  naruto: {
    torso: '#f97316', accent: '#0f172a', armUpper: '#f97316', armLower: '#0f172a',
    hand: '#f1c27d', legUpper: '#f97316', legLower: '#f97316', boot: '#1e293b',
    hairColor: '#facc15', hairMode: 'spiky', headGear: 'leaf_band', weapon: 'rasengan', auraColor: '#38bdf8',
  },
  sasuke: {
    torso: '#e2e8f0', accent: '#7e22ce', armUpper: '#e2e8f0', armLower: '#1e293b',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#0f172a', hairMode: 'spiky', weapon: 'sword', auraColor: '#a855f7',
  },
  kakashi: {
    torso: '#15803d', accent: '#1e293b', armUpper: '#1e293b', armLower: '#1e293b',
    hand: '#1e293b', legUpper: '#1e293b', legLower: '#1e293b', boot: '#0f172a',
    hairColor: '#cbd5e1', hairMode: 'spiky', fullMask: 'kakashi', headGear: 'leaf_band',
  },
  sakura: {
    torso: '#dc2626', accent: '#f8fafc', armUpper: '#dc2626', armLower: '#f1c27d',
    hand: '#1e293b', legUpper: '#be123c', legLower: '#f1c27d', boot: '#0f172a',
    hairColor: '#f472b6', hairMode: 'bob', headGear: 'leaf_band', byakugouSeal: true,
  },
  hashirama: {
    torso: '#991b1b', accent: '#fbbf24', armUpper: '#991b1b', armLower: '#0f172a',
    hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
    hairColor: '#09090b', hairMode: 'long', headGear: 'leaf_band', auraColor: '#22c55e',
  },
  tobirama: {
    torso: '#1d4ed8', accent: '#f8fafc', armUpper: '#1d4ed8', armLower: '#0f172a',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#e2e8f0', hairMode: 'spiky', headGear: 'leaf_band', auraColor: '#38bdf8',
  },
  hiruzen: {
    torso: '#1e293b', accent: '#b91c1c', armUpper: '#1e293b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#cbd5e1', hairMode: 'short' as 'slick', coat: 'hokage', weapon: 'staff',
  },
  minato: {
    torso: '#15803d', accent: '#f8fafc', armUpper: '#f8fafc', armLower: '#f8fafc',
    hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#0f172a',
    hairColor: '#facc15', hairMode: 'spiky', headGear: 'leaf_band', coat: 'hokage', auraColor: '#facc15',
  },
  tsunade: {
    torso: '#15803d', accent: '#94a3b8', armUpper: '#15803d', armLower: '#f1c27d',
    hand: '#f1c27d', legUpper: '#1e293b', legLower: '#f1c27d', boot: '#09090b',
    hairColor: '#fde047', hairMode: 'twin_tails', coat: 'tsunade_haori', byakugouSeal: true, auraColor: '#4ade80',
  },
  jiraiya: {
    torso: '#b91c1c', accent: '#fbbf24', armUpper: '#b91c1c', armLower: '#1e293b',
    hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#78350f',
    hairColor: '#f8fafc', hairMode: 'spiky', headGear: 'oil_band', coat: 'jiraiya_haori', weapon: 'rasengan',
  },
  boruto: {
    torso: '#0f172a', accent: '#ec4899', armUpper: '#0f172a', armLower: '#ec4899',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#facc15', hairMode: 'spiky', headGear: 'leaf_band',
  },
  itachi: {
    torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#09090b', hairMode: 'ponytail', coat: 'akatsuki', auraColor: '#ef4444',
  },
  obito: {
    torso: '#09090b', accent: '#f97316', armUpper: '#09090b', armLower: '#09090b',
    hand: '#1e293b', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#09090b', hairMode: 'spiky', fullMask: 'obito_mask', coat: 'akatsuki', weapon: 'gunbai', auraColor: '#f97316',
  },
  madara: {
    torso: '#7f1d1d', accent: '#0f172a', armUpper: '#7f1d1d', armLower: '#450a0a',
    hand: '#1e293b', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#09090b', hairMode: 'long', weapon: 'gunbai', auraColor: '#dc2626',
  },

  // 6. Anime: Bleach TYBW (12)
  ichigo: {
    torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
    hairColor: '#f97316', hairMode: 'spiky', weapon: 'sword', auraColor: '#38bdf8',
  },
  gin: {
    torso: '#09090b', accent: '#cbd5e1', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#f8fafc',
    hairColor: '#cbd5e1', hairMode: 'bob', coat: 'sleeveless_captain', weapon: 'sword',
  },
  aizen: {
    torso: '#0f172a', accent: '#9333ea', armUpper: '#0f172a', armLower: '#0f172a',
    hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
    hairColor: '#451a03', hairMode: 'slick', fullMask: 'aizen_eyepatch', auraColor: '#a855f7',
  },
  ichibe: {
    torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#f8fafc',
    hairColor: '#09090b', hairMode: 'bald', coat: 'captain_white', prayerBeads: true, weapon: 'kanabo', scaleMult: 1.16,
  },
  yhwach: {
    torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
    hairColor: '#09090b', hairMode: 'long', coat: 'yhwach_cloak', weapon: 'sword', auraColor: '#38bdf8', scaleMult: 1.12,
  },
  ulquiorra: {
    torso: '#f8fafc', accent: '#10b981', armUpper: '#f8fafc', armLower: '#f8fafc',
    hand: '#f8fafc', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#09090b',
    skin: '#f1f5f9', hairColor: '#09090b', hairMode: 'spiky', headGear: 'broken_horn', coat: 'espada', ulquiorraTears: true, auraColor: '#10b981',
  },
  grimmjow: {
    torso: '#f8fafc', accent: '#38bdf8', armUpper: '#f8fafc', armLower: '#f8fafc',
    hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#09090b',
    hairColor: '#38bdf8', hairMode: 'spiky', fullMask: 'grimmjow_jaw', coat: 'espada', weapon: 'sword', auraColor: '#38bdf8',
  },
  kenpachi: {
    torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
    hairColor: '#09090b', hairMode: 'spiky', coat: 'sleeveless_captain', weapon: 'sword', auraColor: '#facc15',
  },
  toshiro: {
    torso: '#09090b', accent: '#22d3ee', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
    hairColor: '#f8fafc', hairMode: 'spiky', coat: 'captain_white', headGear: 'ice_crown', weapon: 'sword', auraColor: '#67e8f9',
  },
  byakuya: {
    torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
    hairColor: '#0f172a', hairMode: 'long', headGear: 'kenseikan', coat: 'captain_white', weapon: 'sword', auraColor: '#f472b6',
  },
  rukia: {
    torso: '#09090b', accent: '#e0f2fe', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
    hairColor: '#0f172a', hairMode: 'bob', weapon: 'sode_shirayuki', auraColor: '#7dd3fc',
  },
  yamamoto: {
    torso: '#09090b', accent: '#f97316', armUpper: '#09090b', armLower: '#09090b',
    hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
    hairColor: '#f8fafc', hairMode: 'bald', coat: 'captain_white', whiteBeard: true, weapon: 'ryujin_jakka', auraColor: '#f97316', scaleMult: 1.1,
  },
};

export function buildR15AvatarMesh(
  rawCfg: Partial<AvatarConfig> | undefined,
  role: Role,
  options: { withSpotLight?: boolean; castShadow?: boolean } = {},
): { group: THREE.Group; rig: R15JointRig } {
  const cfg = normalizeAvatarConfig(rawCfg, role);
  const castShadow = options.castShadow !== false;
  const suit = cfg.superheroSuit || 'none';
  const spec = suit !== 'none' ? COSTUME_SPECS[suit] : undefined;
  const isFemale = cfg.gender === 'female' && !spec;

  const group = new THREE.Group();
  const bodyRig = new THREE.Group();
  if (spec?.scaleMult) {
    bodyRig.scale.setScalar(spec.scaleMult);
  }
  group.add(bodyRig);

  const torsoMainColor = spec ? spec.torso : cfg.jacket;
  const torsoAccentColor = spec ? spec.accent : '#0f172a';
  const armUpperColor = spec ? spec.armUpper : cfg.jacket;
  const armLowerColor = spec
    ? spec.armLower
    : cfg.outfit === 'casual' || cfg.outfit === 'school'
      ? cfg.skinColor
      : cfg.jacket;
  const handColor = spec ? spec.hand : cfg.skinColor;
  const legUpperColor = spec ? spec.legUpper : cfg.pantsColor;
  const legLowerColor =
    spec ? spec.legLower : cfg.pantsStyle === 'shorts' || cfg.pantsStyle === 'skirt' ? cfg.skinColor : cfg.pantsColor;
  const bootColor = spec ? spec.boot : '#3b2414';
  const metalness = spec?.metalness ?? 0.06;
  const roughness = spec?.roughness ?? 0.52;
  const skinColor = spec?.skin || cfg.skinColor;
  const hairColor = spec?.hairColor || cfg.hairColor;

  let torsoMat: THREE.Material;
  const costumeTex = spec ? getCostumeChestTexture(suit, spec) : null;
  const dailyTex = !spec ? getDailyOutfitTexture(cfg.outfit, torsoMainColor) : null;

  if (costumeTex) {
    torsoMat = new THREE.MeshStandardMaterial({ map: costumeTex, roughness, metalness });
  } else if (!spec && cfg.outfit === 'poncho') {
    torsoMat = new THREE.MeshPhysicalMaterial({
      color: torsoMainColor,
      roughness: 0.24,
      metalness: 0.05,
      transparent: true,
      opacity: 0.86,
      clearcoat: 0.65,
    });
  } else if (dailyTex) {
    torsoMat = new THREE.MeshStandardMaterial({ map: dailyTex, roughness: 0.62, metalness: 0.04 });
  } else if (!spec && cfg.outfit === 'school') {
    torsoMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.58 });
  } else {
    torsoMat = new THREE.MeshStandardMaterial({ color: torsoMainColor, roughness, metalness });
  }

  const accentMat = new THREE.MeshStandardMaterial({
    color: torsoAccentColor,
    roughness: spec ? 0.28 : 0.65,
    metalness: suit === 'ironman' || suit === 'gatotkaca' || suit === 'k_cyber' ? 0.82 : 0.14,
  });
  const armUpperMat =
    suit === 'spiderman'
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
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.76 });

  // 1. LOWER TORSO (Pelvis & Waist pivot at y = 1.02)
  const lowerTorso = new THREE.Group();
  lowerTorso.position.set(0, 1.02, 0);
  bodyRig.add(lowerTorso);

  const pelvisWidth = isFemale ? 0.56 : 0.62;
  const pelvisMesh = new THREE.Mesh(
    new RoundedBoxGeometry(pelvisWidth, 0.24, 0.35, 4, 0.07),
    suit === 'superman' ? accentMat : legUpperMat,
  );
  pelvisMesh.position.y = 0.06;
  pelvisMesh.castShadow = castShadow;
  lowerTorso.add(pelvisMesh);

  // Skirt geometry if pantsStyle === 'skirt' or outfit === 'kebaya'
  if (!spec && (cfg.pantsStyle === 'skirt' || cfg.outfit === 'kebaya')) {
    const skirtMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.48, 0.44, 16),
      legUpperMat,
    );
    skirtMesh.position.y = -0.1;
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
  if (suit === 'batman' || suit === 'superman' || suit === 'gatotkaca' || suit === 'kamen_rider') {
    const buckle = new THREE.Mesh(
      new RoundedBoxGeometry(0.16, 0.12, 0.06, 2, 0.02),
      new THREE.MeshStandardMaterial({
        color: suit === 'kamen_rider' ? '#ef4444' : '#fde047',
        emissive: suit === 'kamen_rider' ? '#dc2626' : '#000000',
        emissiveIntensity: 0.6,
        metalness: 0.75,
        roughness: 0.25,
      }),
    );
    buckle.position.set(0, 0.16, -0.2);
    lowerTorso.add(buckle);
  }

  // 2. UPPER TORSO (Chest & Shoulders pivot at y = 0.20 inside lowerTorso)
  const upperTorso = new THREE.Group();
  upperTorso.position.set(0, 0.2, 0);
  lowerTorso.add(upperTorso);

  const chestW = isFemale ? 0.62 : 0.72;
  const chestD = isFemale ? 0.36 : 0.4;
  const chestMesh = new THREE.Mesh(
    new RoundedBoxGeometry(chestW, 0.62, chestD, 4, 0.09),
    torsoMat,
  );
  chestMesh.position.y = 0.32;
  chestMesh.castShadow = castShadow;
  upperTorso.add(chestMesh);

  let ponchoHem: THREE.Object3D | undefined;
  let ponchoHood: THREE.Object3D | undefined;

  if (!spec) {
    if (cfg.outfit === 'windbreaker') {
      const yoke = new THREE.Mesh(new RoundedBoxGeometry(chestW + 0.02, 0.2, chestD + 0.02, 3, 0.07), accentMat);
      yoke.position.set(0, 0.54, 0);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.14, 14), accentMat);
      collar.position.set(0, 0.67, 0);
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.58, 0.04), accentMat);
      zip.position.set(0, 0.32, -(chestD * 0.5 + 0.006));
      upperTorso.add(yoke, collar, zip);
    } else if (cfg.outfit === 'formal') {
      const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.52, 0.05),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 }),
      );
      shirt.position.set(0, 0.36, -(chestD * 0.5 - 0.005));
      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.44, 0.04),
        new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.45 }),
      );
      tie.position.set(0, 0.32, -(chestD * 0.5 + 0.015));
      upperTorso.add(shirt, tie);
    } else if (cfg.outfit === 'poncho') {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 0.54, 14, 1, true), torsoMat);
      skirt.position.set(0, -0.02, 0);
      upperTorso.add(skirt);
      ponchoHem = skirt;
      const hood = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.24, 0.26, 3, 0.08), torsoMat);
      hood.position.set(0, 0.68, 0.18);
      upperTorso.add(hood);
      ponchoHood = hood;
    } else if (cfg.outfit === 'koko') {
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.12, 14), torsoMat);
      collar.position.set(0, 0.66, 0);
      const placket = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.48, 0.04),
        new THREE.MeshStandardMaterial({ map: getKokoEmbroideryTexture(cfg.jacket), roughness: 0.6 }),
      );
      placket.position.set(0, 0.36, -(chestD * 0.5 + 0.005));
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
        new THREE.BoxGeometry(0.1, 0.36, 0.04),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 }),
      );
      tie.position.set(0, 0.42, -(chestD * 0.5 + 0.015));
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.11, 0.03),
        new THREE.MeshStandardMaterial({ color: cfg.jacket, roughness: 0.55 }),
      );
      pocket.position.set(0.16, 0.44, -(chestD * 0.5 + 0.01));
      upperTorso.add(tie, pocket);
    } else if (cfg.outfit === 'flannel') {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.28), torsoMat);
      collar.position.set(0, 0.63, 0);
      upperTorso.add(collar);
    } else if (cfg.outfit === 'casual') {
      const kacu = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.34, 4),
        new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.68 }),
      );
      kacu.rotation.x = Math.PI;
      kacu.position.set(0, 0.46, -(chestD * 0.5 + 0.01));
      upperTorso.add(kacu);
    }
  } else {
    // Costume chest emblems & armor details
    if (suit === 'ironman' || suit === 'ultraman' || suit === 'k_cyber') {
      const coreColor = suit === 'k_cyber' ? '#22d3ee' : '#38bdf8';
      const reactorRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.025, 8, 18),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.2 }),
      );
      reactorRing.position.set(0, 0.4, -0.22);
      const reactorCore = new THREE.Mesh(
        new THREE.CircleGeometry(0.095, 16),
        new THREE.MeshBasicMaterial({ color: coreColor }),
      );
      reactorCore.rotation.y = Math.PI;
      reactorCore.position.set(0, 0.4, -0.232);
      upperTorso.add(reactorRing, reactorCore);
    } else if (suit === 'superman') {
      const shield = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.26),
        new THREE.MeshBasicMaterial({ map: getSupermanCrestTexture(), transparent: true, side: THREE.DoubleSide }),
      );
      shield.rotation.y = Math.PI;
      shield.position.set(0, 0.4, -0.212);
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
      star.position.set(0, 0.4, -0.22);
      upperTorso.add(star);
    } else if (suit === 'batman') {
      const batPlate = new THREE.Mesh(
        new RoundedBoxGeometry(0.32, 0.14, 0.05, 2, 0.02),
        new THREE.MeshStandardMaterial({ color: '#09090b', roughness: 0.35 }),
      );
      batPlate.position.set(0, 0.42, -0.205);
      const goldRim = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.17, 0.03), accentMat);
      goldRim.position.set(0, 0.42, -0.195);
      upperTorso.add(goldRim, batPlate);
    } else if (suit === 'flash' || suit === 'gundala') {
      const bolt = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.26, 4),
        new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#eab308', emissiveIntensity: 0.7 }),
      );
      bolt.rotation.z = 0.4;
      bolt.position.set(0, 0.42, -0.215);
      upperTorso.add(bolt);
    }

    // Long Coat / Mantle / Haori styles
    if (spec?.coat) {
      const coatColor =
        spec.coat === 'akatsuki' || spec.coat === 'yhwach_cloak'
          ? '#09090b'
          : spec.coat === 'marine' ||
              spec.coat === 'hokage' ||
              spec.coat === 'captain_white' ||
              spec.coat === 'sleeveless_captain' ||
              spec.coat === 'espada'
            ? '#f8fafc'
            : spec.coat === 'feather_cape'
              ? '#6b21a8'
              : spec.coat === 'tsunade_haori'
                ? '#16a34a'
                : spec.coat === 'jiraiya_haori'
                  ? '#b91c1c'
                  : '#dc2626';
      const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.65, side: THREE.DoubleSide });
      if (spec.coat === 'gundala_scarf') {
        const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 8, 18), coatMat);
        scarf.rotation.x = Math.PI / 2;
        scarf.position.set(0, 0.63, 0);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.04), coatMat);
        tail.rotation.x = 0.35;
        tail.position.set(0.14, 0.42, 0.28);
        upperTorso.add(scarf, tail);
      } else if (spec.coat === 'feather_cape') {
        const fluff = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.14, 10, 18), coatMat);
        fluff.rotation.x = Math.PI / 2;
        fluff.position.set(0, 0.62, 0.08);
        const backPlume = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.9, 0.12), coatMat);
        backPlume.position.set(0, 0.14, 0.24);
        upperTorso.add(fluff, backPlume);
      } else {
        const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.54, 0.78, 14, 1, true), coatMat);
        coatSkirt.position.set(0, -0.1, 0.02);
        upperTorso.add(coatSkirt);
        const highCollar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.28, 0.22, 12, 1, true, Math.PI * 0.2, Math.PI * 1.6),
          coatMat,
        );
        highCollar.rotation.y = Math.PI;
        highCollar.position.set(0, 0.7, 0.02);
        upperTorso.add(highCollar);
        if (spec.coat === 'akatsuki') {
          const cloud = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 8, 6),
            new THREE.MeshBasicMaterial({ color: '#dc2626' }),
          );
          cloud.scale.set(1.5, 0.7, 0.3);
          cloud.position.set(0.15, 0.35, -0.21);
          upperTorso.add(cloud);
        }
        if (spec.coat === 'captain_white' || spec.coat === 'sleeveless_captain') {
          const haoriBack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.85, 0.06), coatMat);
          haoriBack.position.set(0, 0.12, 0.23);
          upperTorso.add(haoriBack);
        }
      }
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
      scroll.position.set(0, 0.42, 0.3);
      upperTorso.add(scroll);
    }
  }

  // Distinct Neck
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.125, 0.16, 12),
    suit === 'ironman' || suit === 'spiderman' || suit === 'ultraman' ? armUpperMat : skinMat,
  );
  neckMesh.position.set(0, 0.68, 0);
  upperTorso.add(neckMesh);

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

  const headMesh = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.52, 0.5, 5, 0.18), headMat);
  headMesh.castShadow = castShadow;
  headGroup.add(headMesh);

  // Face / Mask
  const fullMaskType = spec?.fullMask;
  if (fullMaskType === 'ironman' || fullMaskType === 'ultraman' || fullMaskType === 'k_cyber') {
    const facePlate = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.42, 0.08, 3, 0.04), accentMat);
    facePlate.position.set(0, -0.02, -0.23);
    const eyeColor = fullMaskType === 'ultraman' ? '#fef08a' : '#22d3ee';
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    [-0.095, 0.095].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.03), eyeGlowMat);
      eye.position.set(ex, 0.04, -0.27);
      headGroup.add(eye);
    });
    headGroup.add(facePlate);
    if (fullMaskType === 'ultraman') {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.34), headMat);
      fin.position.set(0, 0.32, 0.02);
      headGroup.add(fin);
    }
  } else if (fullMaskType === 'spiderman' || fullMaskType === 'kamen_rider') {
    const rimMat = new THREE.MeshBasicMaterial({ color: '#09090b' });
    const eyeColor = fullMaskType === 'kamen_rider' ? '#ef4444' : '#ffffff';
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    [-0.1, 0.1].forEach((ex, idx) => {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.04), rimMat);
      rim.position.set(ex, 0.04, -0.245);
      rim.rotation.z = idx === 0 ? -0.22 : 0.22;
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.085, 0.045), eyeMat);
      lens.position.set(ex, 0.04, -0.25);
      lens.rotation.z = idx === 0 ? -0.22 : 0.22;
      headGroup.add(rim, lens);
    });
    if (fullMaskType === 'kamen_rider') {
      [-0.1, 0.1].forEach((ax) => {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), accentMat);
        ant.position.set(ax, 0.36, -0.15);
        ant.rotation.z = ax < 0 ? 0.35 : -0.35;
        headGroup.add(ant);
      });
    }
  } else {
    if (fullMaskType === 'batman' || fullMaskType === 'flash') {
      const jaw = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.19, 0.12, 3, 0.05), skinMat);
      jaw.position.set(0, -0.15, -0.21);
      headGroup.add(jaw);
      if (fullMaskType === 'batman') {
        [-0.17, 0.17].forEach((bx) => {
          const batEar = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.24, 5), headMat);
          batEar.position.set(bx, 0.34, 0);
          headGroup.add(batEar);
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
        new RoundedBoxGeometry(0.53, 0.24, 0.26, 3, 0.05),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 }),
      );
      faceMask.position.set(0, -0.12, -0.14);
      headGroup.add(faceMask);
    } else if (fullMaskType === 'aizen_eyepatch') {
      const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.1, 0.05),
        new THREE.MeshBasicMaterial({ color: '#09090b' }),
      );
      patch.position.set(0.1, 0.03, -0.255);
      headGroup.add(patch);
    } else if (fullMaskType === 'obito_mask') {
      const mask = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.52, 0.12, 4, 0.08),
        new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.4 }),
      );
      mask.position.set(0, 0, -0.24);
      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.05, 10),
        new THREE.MeshBasicMaterial({ color: '#09090b' }),
      );
      hole.rotation.y = Math.PI;
      hole.position.set(-0.09, 0.04, -0.305);
      headGroup.add(mask, hole);
    } else if (fullMaskType === 'grimmjow_jaw') {
      const jaw = new THREE.Mesh(
        new RoundedBoxGeometry(0.28, 0.16, 0.22, 3, 0.04),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 }),
      );
      jaw.position.set(-0.18, -0.14, -0.12);
      headGroup.add(jaw);
    }

    const scleraMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const irisMat = new THREE.MeshBasicMaterial({
      color:
        fullMaskType === 'batman'
          ? '#f8fafc'
          : suit === 'itachi' || suit === 'madara' || suit === 'obito'
            ? '#dc2626'
            : suit === 'ulquiorra'
              ? '#10b981'
              : '#1e293b',
    });
    const catchlightMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    if (fullMaskType !== 'obito_mask') {
      [-0.1, 0.1].forEach((ex) => {
        if (fullMaskType === 'batman') {
          const cowlEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.042, 0.04), scleraMat);
          cowlEye.position.set(ex, 0.04, -0.248);
          cowlEye.rotation.z = ex < 0 ? -0.16 : 0.16;
          headGroup.add(cowlEye);
        } else {
          const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), scleraMat);
          sclera.scale.set(0.95, 1.15, 0.55);
          sclera.position.set(ex, 0.03, -0.235);
          const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), irisMat);
          pupil.scale.set(0.9, 1.05, 0.6);
          pupil.position.set(ex, 0.03, -0.252);
          const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), catchlightMat);
          catchlight.position.set(ex - 0.015, 0.052, -0.266);
          const brow = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.022, 0.025, 2, 0.01), hairMat);
          brow.position.set(ex, 0.115, -0.245);
          brow.rotation.z = ex < 0 ? 0.08 : -0.08;
          headGroup.add(sclera, pupil, catchlight, brow);
          if (isFemale || suit === 'boa_hancock' || suit === 'nami' || suit === 'nico_robin' || suit === 'rukia' || suit === 'tsunade') {
            const lash = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.016, 0.02), new THREE.MeshBasicMaterial({ color: '#09090b' }));
            lash.position.set(ex + (ex < 0 ? -0.04 : 0.04), 0.068, -0.254);
            headGroup.add(lash);
          }
        }
      });

      if (fullMaskType !== 'kakashi') {
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), skinMat);
        nose.position.set(0, -0.025, -0.26);
        const smile = new THREE.Mesh(
          new THREE.TorusGeometry(0.065, 0.014, 6, 12, Math.PI),
          new THREE.MeshBasicMaterial({ color: isFemale ? '#be123c' : '#9a3412' }),
        );
        smile.rotation.z = Math.PI;
        smile.position.set(0, -0.09, -0.248);
        headGroup.add(nose, smile);
      }
    }

    // Character facial extras
    if (spec?.byakugouSeal) {
      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.035, 0),
        new THREE.MeshBasicMaterial({ color: '#6366f1' }),
      );
      diamond.scale.set(0.8, 1.3, 0.3);
      diamond.position.set(0, 0.14, -0.256);
      headGroup.add(diamond);
    }
    if (spec?.ulquiorraTears) {
      const tearMat = new THREE.MeshBasicMaterial({ color: '#10b981' });
      [-0.1, 0.1].forEach((tx) => {
        const tear = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.14, 0.02), tearMat);
        tear.position.set(tx, -0.06, -0.254);
        headGroup.add(tear);
      });
    }
    if (spec?.whiteBeard) {
      const beard = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.42, 8),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.85 }),
      );
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.26, -0.18);
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.02), new THREE.MeshBasicMaterial({ color: '#991b1b' }));
      cross1.position.set(-0.08, 0.14, -0.256);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.14, 0.02), new THREE.MeshBasicMaterial({ color: '#991b1b' }));
      cross2.position.set(-0.08, 0.14, -0.256);
      headGroup.add(beard, cross1, cross2);
    }
    if (spec?.snakeEarrings) {
      const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.25 });
      [-0.29, 0.29].forEach((ex) => {
        const ear = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 12), goldMat);
        ear.position.set(ex, -0.08, 0);
        headGroup.add(ear);
      });
    }
  }

  // Hair rendering (both customized and costume override)
  const effectiveHair = spec
    ? spec.hairMode || 'none'
    : cfg.hairStyle;

  if (effectiveHair !== 'none' && effectiveHair !== 'covered' && effectiveHair !== 'bald') {
    if (effectiveHair === 'short' || effectiveHair === 'spiky' || effectiveHair === 'undercut' || effectiveHair === 'slick') {
      const cap = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.22, 0.54, 4, 0.1), hairMat);
      cap.position.set(0, 0.19, 0.01);
      headGroup.add(cap);
      if (effectiveHair !== 'undercut') {
        const sideL = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.18, 0.28, 2, 0.03), hairMat);
        sideL.position.set(-0.25, 0.06, 0.05);
        const sideR = sideL.clone();
        sideR.position.x = 0.25;
        headGroup.add(sideL, sideR);
      }
      if (effectiveHair === 'spiky') {
        for (let s = -2; s <= 2; s++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.22, 6), hairMat);
          spike.position.set(s * 0.088, 0.34, -0.04);
          spike.rotation.x = -0.25;
          headGroup.add(spike);
        }
      } else if (effectiveHair === 'slick') {
        const crest = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.12, 0.45, 3, 0.05), hairMat);
        crest.position.set(0, 0.28, -0.02);
        headGroup.add(crest);
      }
    } else if (effectiveHair === 'side_part' || effectiveHair === 'parted') {
      const crown = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.22, 0.55, 4, 0.1), hairMat);
      crown.position.set(0, 0.19, 0.02);
      const bangL = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.15, 0.12, 3, 0.05), hairMat);
      bangL.position.set(-0.13, 0.15, -0.22);
      bangL.rotation.z = 0.24;
      const bangR = bangL.clone();
      bangR.position.x = 0.13;
      bangR.rotation.z = -0.24;
      headGroup.add(crown, bangL, bangR);
    } else if (
      effectiveHair === 'long' ||
      effectiveHair === 'long_loose' ||
      effectiveHair === 'long_tie' ||
      effectiveHair === 'ponytail' ||
      effectiveHair === 'bob'
    ) {
      const crown = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.24, 0.55, 4, 0.1), hairMat);
      crown.position.set(0, 0.18, 0.02);
      const backHair = new THREE.Mesh(
        new RoundedBoxGeometry(0.52, effectiveHair === 'bob' ? 0.28 : 0.46, 0.22, 4, 0.08),
        hairMat,
      );
      backHair.position.set(0, -0.04, 0.2);
      headGroup.add(crown, backHair);
      if (effectiveHair === 'ponytail' || effectiveHair === 'long_tie') {
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 6, 8), hairMat);
        tail.position.set(0, -0.06, 0.33);
        tail.rotation.x = 0.38;
        headGroup.add(tail);
      }
    } else if (effectiveHair === 'twin_braids' || effectiveHair === 'twin_tails') {
      const crown = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.24, 0.55, 4, 0.1), hairMat);
      crown.position.set(0, 0.18, 0.02);
      headGroup.add(crown);
      [-0.28, 0.28].forEach((bx) => {
        const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.42, 6, 8), hairMat);
        braid.position.set(bx, -0.08, 0.14);
        braid.rotation.z = bx < 0 ? 0.18 : -0.18;
        headGroup.add(braid);
      });
    } else if (effectiveHair === 'hijab') {
      const wrap = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.58, 0.56, 5, 0.18), hairMat);
      wrap.position.set(0, 0.02, 0.03);
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.36, 0.28, 14), hairMat);
      drape.position.set(0, -0.28, 0.02);
      headGroup.add(wrap, drape);
    }
  }

  // Costume-specific Headgear
  if (spec?.headGear) {
    const hg = spec.headGear;
    if (hg === 'straw_hat' || hg === 'ace_hat' || hg === 'mihawk_hat') {
      const hColor = hg === 'ace_hat' ? '#f97316' : hg === 'mihawk_hat' ? '#09090b' : '#facc15';
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
        new THREE.MeshStandardMaterial({ color: hg === 'ace_hat' ? '#1e293b' : '#dc2626', roughness: 0.7 }),
      );
      band.position.y = 0.25;
      headGroup.add(brim, dome, band);
      if (hg === 'mihawk_hat') {
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.42, 6),
          new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7 }),
        );
        plume.position.set(0.26, 0.42, 0.08);
        plume.rotation.z = -0.7;
        headGroup.add(plume);
      }
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
          horn.position.set(hx, 0.32, -0.02);
          horn.rotation.z = hx < 0 ? 0.65 : -0.65;
          headGroup.add(horn);
        });
      } else {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 8), hornMat);
        horn.position.set(-0.22, 0.28, -0.02);
        horn.rotation.z = 0.45;
        headGroup.add(horn);
      }
    } else if (hg === 'mahkota_wayang' || hg === 'crown_gold') {
      const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.25 });
      const baseCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.24, 0.22, 8), goldMat);
      baseCrown.position.y = 0.31;
      headGroup.add(baseCrown);
      if (hg === 'mahkota_wayang') {
        const peak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 6), goldMat);
        peak.position.set(0, 0.5, 0);
        headGroup.add(peak);
      }
    } else if (hg === 'leaf_band' || hg === 'oil_band') {
      const bandMat = new THREE.MeshStandardMaterial({ color: hg === 'oil_band' ? '#7f1d1d' : '#1e3a8a', roughness: 0.65 });
      const cloth = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.09, 0.53, 3, 0.03), bandMat);
      cloth.position.y = 0.16;
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.07, 0.03),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 }),
      );
      plate.position.set(0, 0.16, -0.265);
      headGroup.add(cloth, plate);
    } else if (hg === 'wing_helm') {
      const wingMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', metalness: 0.5, roughness: 0.3 });
      [-0.28, 0.28].forEach((wx) => {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 4), wingMat);
        wing.position.set(wx, 0.16, 0.02);
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
    } else if (hg === 'aokiji_glasses') {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.07, 0.05),
        new THREE.MeshStandardMaterial({ color: '#10b981', metalness: 0.6, roughness: 0.2 }),
      );
      frame.position.set(0, 0.19, -0.26);
      headGroup.add(frame);
    } else if (hg === 'kenseikan') {
      const kMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });
      [-0.08, 0.08].forEach((kx) => {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.04), kMat);
        pin.position.set(kx, 0.34, -0.02);
        headGroup.add(pin);
      });
    }
  }

  // Luffy Gear 5 / God Halo behind shoulders
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
    halo.position.set(0, 0.6, 0.28);
    upperTorso.add(halo);
  }

  // Eyeglasses (when open face & enabled)
  if (cfg.glasses && (!fullMaskType || fullMaskType === 'kakashi')) {
    const frameMat = new THREE.MeshStandardMaterial({ color: '#09090b', metalness: 0.72, roughness: 0.2 });
    const lensMat = new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.9, roughness: 0.12 });
    [-0.1, 0.1].forEach((gx) => {
      const lens = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.09, 0.04, 2, 0.015), lensMat);
      lens.position.set(gx, 0.03, -0.265);
      headGroup.add(lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.03), frameMat);
    bridge.position.set(0, 0.04, -0.265);
    headGroup.add(bridge);
  }

  // Standard Head Accessories (applied when no full costume head override)
  let headlampSpot: THREE.SpotLight | undefined;
  let headlampBulbMat: THREE.MeshStandardMaterial | undefined;
  const hat = spec ? 'none' : cfg.headAccessory;

  if (hat === 'rimba') {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.54, 0.055, 18),
      new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.85 }),
    );
    brim.position.y = 0.21;
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.33, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: '#3f6212', roughness: 0.85 }),
    );
    crown.position.y = 0.32;
    headGroup.add(brim, crown);
  } else if (hat === 'baseball') {
    const capMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.65 });
    const dome = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.22, 0.52, 4, 0.12), capMat);
    dome.position.set(0, 0.22, 0.01);
    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.045, 0.3, 3, 0.02), capMat);
    visor.position.set(0, 0.14, -0.32);
    visor.rotation.x = 0.12;
    headGroup.add(dome, visor);
  } else if (hat === 'beanie') {
    const knitMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.92 });
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.12, 16), knitMat);
    cuff.position.y = 0.16;
    const dome = new THREE.Mesh(new SphereBeanieCapGeo(), knitMat);
    dome.position.y = 0.19;
    const pom = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.95 }),
    );
    pom.position.y = 0.48;
    headGroup.add(cuff, dome, pom);
  } else if (hat === 'towel_headband') {
    const towelMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.95 });
    const band = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.1, 0.54, 3, 0.04), towelMat);
    band.position.y = 0.15;
    headGroup.add(band);
    const neckTowel = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.065, 8, 18), towelMat);
    neckTowel.rotation.x = Math.PI / 2;
    neckTowel.position.set(0, 0.64, 0.02);
    upperTorso.add(neckTowel);
  } else if (hat === 'bando') {
    const bandoMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.55 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.032, 8, 20, Math.PI * 1.1), bandoMat);
    band.position.set(0, 0.13, -0.02);
    const bowL = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 4), bandoMat);
    bowL.rotation.z = Math.PI / 2;
    bowL.position.set(-0.07, 0.34, -0.04);
    const bowR = bowL.clone();
    bowR.rotation.z = -Math.PI / 2;
    bowR.position.x = 0.07;
    headGroup.add(band, bowL, bowR);
  } else if (hat === 'headlamp' || cfg.headAccessory === 'headlamp') {
    const strap = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 0.075, 0.54, 3, 0.03),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 }),
    );
    strap.position.y = 0.16;
    const housing = new THREE.Mesh(
      new RoundedBoxGeometry(0.17, 0.11, 0.1, 2, 0.02),
      new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.4, roughness: 0.4 }),
    );
    housing.position.set(0, 0.16, -0.28);
    headlampBulbMat = new THREE.MeshStandardMaterial({
      color: '#fef9c3',
      emissive: '#fde047',
      emissiveIntensity: 1.5,
    });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), headlampBulbMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.16, -0.33);
    headGroup.add(strap, housing, lens);

    if (options.withSpotLight) {
      headlampSpot = new THREE.SpotLight('#fef08a', 0, 58, Math.PI / 4.2, 0.45, 1.1);
      headlampSpot.position.set(0, 0.16, -0.36);
      const spotTarget = new THREE.Object3D();
      spotTarget.position.set(0, -1.8, -16);
      headGroup.add(headlampSpot, spotTarget);
      headlampSpot.target = spotTarget;
    }
  } else if (hat === 'peci') {
    const peciMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.94 });
    const peci = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.24, 0.52, 3, 0.05), peciMat);
    peci.position.set(0, 0.26, 0);
    headGroup.add(peci);
  } else if (hat === 'blangkon') {
    const batikMat = new THREE.MeshStandardMaterial({ map: getBatikTexture(), roughness: 0.72 });
    const cap = new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.22, 0.54, 4, 0.1), batikMat);
    cap.position.set(0, 0.22, 0.01);
    const mondolan = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), batikMat);
    mondolan.position.set(0, 0.13, 0.29);
    headGroup.add(cap, mondolan);
  }

  // 4-9. ARMS
  const shoulderX = isFemale ? 0.44 : 0.49;
  const buildR15Arm = (side: -1 | 1) => {
    const upper = new THREE.Group();
    upper.position.set(side * shoulderX, 0.56, 0);
    const armW = isFemale ? 0.19 : 0.22;
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
    palmMesh.castShadow = castShadow;
    hand.add(palmMesh);

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
      shield.position.set(-0.14, -0.04, -0.06);
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
    } else if (wp === 'mjolnir') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 8), darkGripMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0, -0.06, -0.14);
      const head = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.2, 0.34, 2, 0.03), metalBladeMat);
      head.position.set(0, -0.06, -0.32);
      rightArmSet.hand.add(handle, head);
    } else if (wp === 'trident' || wp === 'spear' || wp === 'staff' || wp === 'clima_tact') {
      const staffColor =
        wp === 'trident' ? goldMat : wp === 'clima_tact' ? new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.45 }) : new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.85, 8), staffColor);
      shaft.position.set(0, 0.25, -0.12);
      rightArmSet.hand.add(shaft);
      if (wp === 'trident') {
        [-0.1, 0, 0.1].forEach((tx) => {
          const prong = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.22, 6), goldMat);
          prong.position.set(tx, 1.24, -0.12);
          rightArmSet.hand.add(prong);
        });
      }
    } else if (wp === 'sword' || wp === 'katana_3' || wp === 'sode_shirayuki' || wp === 'ryujin_jakka') {
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
      blade.position.set(0, -0.06, -0.55);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.03), goldMat);
      guard.position.set(0, -0.06, -0.12);
      rightArmSet.hand.add(blade, guard);
      if (wp === 'katana_3') {
        const blade2 = blade.clone();
        leftArmSet.hand.add(blade2);
        const hipSword = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), darkGripMat);
        hipSword.rotation.x = Math.PI / 2;
        hipSword.position.set(-0.36, 0.14, 0.12);
        lowerTorso.add(hipSword);
      }
    } else if (wp === 'yoru') {
      // Mihawk giant black greatsword strapped across back
      const yoruBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 0.04), darkGripMat);
      yoruBlade.rotation.z = 0.42;
      yoruBlade.position.set(0, 0.35, 0.25);
      const crossGuard = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 0.06), goldMat);
      crossGuard.rotation.z = 0.42;
      crossGuard.position.set(-0.26, 0.94, 0.25);
      upperTorso.add(yoruBlade, crossGuard);
    } else if (wp === 'gunbai') {
      // Madara / Obito war fan
      const fanDisk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.26, 0.05, 14),
        new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.5 }),
      );
      fanDisk.rotation.x = Math.PI / 2;
      fanDisk.position.set(0, -0.04, -0.45);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), darkGripMat);
      shaft.rotation.x = Math.PI / 2;
      shaft.position.set(0, -0.04, -0.18);
      rightArmSet.hand.add(fanDisk, shaft);
    } else if (wp === 'kanabo') {
      const club = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.04, 1.4, 8), darkGripMat);
      club.rotation.x = Math.PI / 2;
      club.position.set(0, -0.06, -0.6);
      rightArmSet.hand.add(club);
    } else if (wp === 'lightning_bolt') {
      const bolt = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshBasicMaterial({ color: '#fde047' }),
      );
      bolt.scale.set(0.45, 2.2, 0.45);
      bolt.position.set(0, 0.05, -0.14);
      rightArmSet.hand.add(bolt);
    } else if (wp === 'fire_orb' || wp === 'rasengan') {
      const orbColor = wp === 'fire_orb' ? '#f97316' : '#38bdf8';
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 10),
        new THREE.MeshBasicMaterial({ color: orbColor, transparent: true, opacity: 0.85 }),
      );
      orb.position.set(0, -0.16, -0.12);
      rightArmSet.hand.add(orb);
    }
  }

  // 10-15. LEGS
  const hipX = isFemale ? 0.17 : 0.19;
  const buildR15Leg = (side: -1 | 1) => {
    const upper = new THREE.Group();
    upper.position.set(side * hipX, -0.02, 0);
    const legW = isFemale ? 0.24 : 0.27;
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
    const bootUpper = new THREE.Mesh(new RoundedBoxGeometry(legW, 0.2, 0.37, 3, 0.06), bootMat);
    bootUpper.position.set(0, -0.04, -0.05);
    bootUpper.castShadow = castShadow;
    const sole = new THREE.Mesh(new RoundedBoxGeometry(legW + 0.015, 0.065, 0.4, 2, 0.02), soleMat);
    sole.position.set(0, -0.128, -0.05);
    foot.add(bootUpper, sole);
    lower.add(foot);

    lowerTorso.add(upper);
    return { upper, lower, foot };
  };

  const leftLegSet = buildR15Leg(-1);
  const rightLegSet = buildR15Leg(1);

  // Back Gear
  let capeUpper: THREE.Object3D | undefined;
  let capeLower: THREE.Object3D | undefined;
  let jetFlames: THREE.Object3D[] | undefined;

  const effectiveBackGear = spec?.capeColor ? 'cape' : spec ? 'none' : cfg.backGear;

  if (effectiveBackGear === 'carrier') {
    const packMat = new THREE.MeshStandardMaterial({ color: cfg.pack, roughness: 0.78 });
    const strapMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85 });
    const mainPack = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.64, 0.34, 4, 0.08), packMat);
    mainPack.position.set(0, 0.34, 0.36);
    mainPack.castShadow = castShadow;
    const lid = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.16, 0.36, 3, 0.06), strapMat);
    lid.position.set(0, 0.68, 0.36);
    const matRoll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.8 }),
    );
    matRoll.rotation.z = Math.PI / 2;
    matRoll.position.set(0, 0.82, 0.36);
    upperTorso.add(mainPack, lid, matRoll);
  } else if (effectiveBackGear === 'cape') {
    const capeColor = spec?.capeColor || '#dc2626';
    const capeMat = new THREE.MeshStandardMaterial({
      color: capeColor,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const capeRoot = new THREE.Group();
    capeRoot.position.set(0, 0.6, 0.22);
    const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.62, 0.045), capeMat);
    upperPanel.position.set(0, -0.31, 0.05);
    upperPanel.rotation.x = 0.14;
    capeRoot.add(upperPanel);

    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, -0.6, 0.09);
    const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.65, 0.045), capeMat);
    lowerPanel.position.set(0, -0.32, 0.04);
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
      wing.position.set(side * 0.14, 0.48, 0.22);
      wing.rotation.y = side * -0.4;
      for (let f = 0; f < 3; f++) {
        const feather = new THREE.Mesh(
          new RoundedBoxGeometry(0.72 - f * 0.14, 0.18, 0.06, 2, 0.03),
          wingMat,
        );
        feather.position.set(side * (0.42 - f * 0.06), 0.18 - f * 0.2, 0.06);
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
      tank.position.set(jx, 0.36, 0.34);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), tankMat);
      cap.position.set(jx, 0.64, 0.34);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.14, 10), nozzleMat);
      nozzle.position.set(jx, 0.04, 0.34);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 8), flameMat);
      flame.rotation.x = Math.PI;
      flame.position.set(jx, -0.14, 0.34);
      upperTorso.add(tank, cap, nozzle, flame);
      jetFlames?.push(flame);
    });
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
    rig.lowerTorso.rotation.x = 0.42;
    rig.upperTorso.rotation.x = 0.25;
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
    rig.upperTorso.rotation.x = -0.08;
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
    rig.lowerTorso.rotation.x = 0.28;
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
    rig.upperTorso.rotation.x = -0.1;
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

  // Articulated Walking / Uphill Running Cycle
  if (poseState === 'walk' || isMoving) {
    const s = Math.sin(walkPhase);
    const c = Math.cos(walkPhase);
    rig.lowerTorso.position.y = 1.02 + Math.abs(c) * 0.055;
    rig.lowerTorso.rotation.y = s * 0.09;
    rig.upperTorso.rotation.x = -0.1;
    rig.upperTorso.rotation.y = -s * 0.1;
    rig.leftUpperLeg.rotation.x = s * 0.62;
    rig.leftLowerLeg.rotation.x = Math.max(0.08, -s * 0.68 + 0.24);
    rig.rightUpperLeg.rotation.x = -s * 0.62;
    rig.rightLowerLeg.rotation.x = Math.max(0.08, s * 0.68 + 0.24);
    rig.leftUpperArm.rotation.x = -s * 0.56;
    rig.leftLowerArm.rotation.x = -0.42 - Math.max(0, s) * 0.35;
    rig.rightUpperArm.rotation.x = s * 0.56;
    rig.rightLowerArm.rotation.x = -0.42 - Math.max(0, -s) * 0.35;
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
    rig.upperTorso.rotation.x = -0.2 + Math.sin(elapsed * 15) * 0.1;
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

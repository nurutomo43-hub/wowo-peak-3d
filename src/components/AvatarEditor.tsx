import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  RotateCcw,
  Shield,
  Backpack,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Flame,
  User,
  Smile,
  Shirt,
  Scissors,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  AvatarConfig,
  BackGearType,
  EyeStyleType,
  FaceAgeType,
  FaceExpressionType,
  GenderType,
  HairStyle,
  HeadAccessoryType,
  NeckAccessoryType,
  OutfitType,
  PantsStyleType,
  Role,
  WristAccessoryType,
} from '../types/game';
import {
  animateR15AvatarPose,
  buildR15AvatarMesh,
  disposeAvatarGroup,
  normalizeAvatarConfig,
  sanitizeAvatarForGender,
} from '../game/AvatarBuilder';
import {
  AOT_CATALOG,
  BLEACH_CATALOG,
  CharacterCatalogEntry,
  DRAGON_BALL_CATALOG,
  GOD_CATALOG,
  HERO_CATALOG,
  HXH_CATALOG,
  JJK_CATALOG,
  NARUTO_CATALOG,
  ONE_PIECE_CATALOG,
  getCatalogEntry,
} from '../game/CharacterCatalog';

const SKIN_TONES = [
  { hex: '#fde2c4', label: 'Kuning Langsat Cerah' },
  { hex: '#f1c27d', label: 'Sawo Cerah' },
  { hex: '#e0ac69', label: 'Sawo Matang' },
  { hex: '#c68642', label: 'Cokelat Hangat' },
  { hex: '#8d5524', label: 'Cokelat Gelap' },
  { hex: '#ffdbac', label: 'Pucat Natural' },
];

const MALE_JACKET_COLORS = [
  { hex: '#ef4444', label: 'Merah Expedition' },
  { hex: '#2563eb', label: 'Biru Alpine' },
  { hex: '#16a34a', label: 'Hijau Rimba' },
  { hex: '#d97706', label: 'Emas Pemimpin' },
  { hex: '#0284c7', label: 'Biru Laut' },
  { hex: '#475569', label: 'Abu Taktis' },
  { hex: '#f8fafc', label: 'Putih Bersih' },
  { hex: '#0f172a', label: 'Hitam Elegan' },
];

const FEMALE_JACKET_COLORS = [
  { hex: '#f472b6', label: 'Pink Pastel' },
  { hex: '#ec4899', label: 'Magenta Cerah' },
  { hex: '#a855f7', label: 'Ungu Lavender' },
  { hex: '#38bdf8', label: 'Biru Langit' },
  { hex: '#34d399', label: 'Mint Segar' },
  { hex: '#fbbf24', label: 'Kuning Cerah' },
  { hex: '#f8fafc', label: 'Putih Mutiara' },
  { hex: '#be123c', label: 'Merah Mawar' },
];

const PANTS_COLORS = [
  { hex: '#1e293b', label: 'Abu Slate' },
  { hex: '#292524', label: 'Cokelat Tua' },
  { hex: '#3f6212', label: 'Hijau Army' },
  { hex: '#1e3a8a', label: 'Biru Denim' },
  { hex: '#78350f', label: 'Khaki Gunung' },
  { hex: '#be185d', label: 'Maroon' },
  { hex: '#09090b', label: 'Hitam Formal' },
];

const HAIR_COLORS = [
  { hex: '#1c1917', label: 'Hitam Pekat' },
  { hex: '#451a03', label: 'Cokelat Gelap' },
  { hex: '#92400e', label: 'Cokelat Terang' },
  { hex: '#d97706', label: 'Pirang Emas' },
  { hex: '#cbd5e1', label: 'Perak / Abu' },
  { hex: '#ec4899', label: 'Pink Pastel' },
  { hex: '#f8fafc', label: 'Putih Bersih' },
  { hex: '#7f1d1d', label: 'Merah Maroon' },
];

const PACK_COLORS = [
  { hex: '#78350f', label: 'Cokelat Kulit' },
  { hex: '#1f2937', label: 'Hitam Taktis' },
  { hex: '#0f766e', label: 'Tosca Gunung' },
  { hex: '#b91c1c', label: 'Merah Terang' },
  { hex: '#2563eb', label: 'Biru Cerah' },
  { hex: '#ec4899', label: 'Pink Selempang' },
];

const MALE_OUTFIT_OPTIONS: ReadonlyArray<{ id: OutfitType; label: string; desc: string }> = [
  { id: 'windbreaker', label: 'Jaket Gunung', desc: 'Windbreaker dua warna & ritsleting' },
  { id: 'tactical_vest', label: 'Rompi Taktis', desc: 'Kaos petualang + rompi saku 3D' },
  { id: 'flannel', label: 'Kemeja Flanel', desc: 'Kemeja kotak pendaki lengan panjang' },
  { id: 'casual', label: 'Kaos Petualang', desc: 'Kaos santai & syal kacu pramuka' },
  { id: 'koko', label: 'Baju Koko', desc: 'Kerah sanghai & bordir Nusantara' },
  { id: 'formal', label: 'Jas Formal', desc: 'Jas rapi berkerah dengan dasi' },
  { id: 'school', label: 'Seragam Sekolah', desc: 'Kemeja sekolah rapi & dasi' },
  { id: 'poncho', label: 'Ponco Hujan', desc: 'Jas hujan gunung transparan' },
];

const FEMALE_OUTFIT_OPTIONS: ReadonlyArray<{ id: OutfitType; label: string; desc: string }> = [
  { id: 'tunic', label: 'Tunik Lengan Panjang', desc: 'Atasan longgar & sopan, cocok untuk Hijab' },
  { id: 'outdoor_vest', label: 'Rompi Pendaki', desc: 'Kemeja lengan panjang + rompi outdoor' },
  { id: 'windbreaker', label: 'Jaket Gunung', desc: 'Windbreaker cerah / pastel pendaki' },
  { id: 'kebaya', label: 'Kebaya / Batik', desc: 'Kebaya & selendang Nusantara' },
  { id: 'school', label: 'Seragam Sekolah', desc: 'Seragam rapi & dasi sekolah' },
  { id: 'poncho', label: 'Ponco Hujan', desc: 'Jas hujan gunung dengan tudung' },
];

const MALE_PANTS_OPTIONS: ReadonlyArray<{ id: PantsStyleType; label: string }> = [
  { id: 'cargo', label: 'Celana Kargo' },
  { id: 'jeans', label: 'Celana Jeans' },
  { id: 'shorts', label: 'Celana Pendek' },
];

const FEMALE_PANTS_OPTIONS: ReadonlyArray<{ id: PantsStyleType; label: string }> = [
  { id: 'cargo', label: 'Celana Kargo' },
  { id: 'jeans', label: 'Celana Jeans' },
  { id: 'skirt', label: 'Rok / Kulot Panjang' },
];

const MALE_HAIR_OPTIONS: ReadonlyArray<{ id: HairStyle; label: string }> = [
  { id: 'short', label: 'Pendek Rapi' },
  { id: 'mohawk', label: 'Mohawk Keren' },
  { id: 'undercut', label: 'Undercut Modern' },
  { id: 'spiky', label: 'Spiky Anime' },
  { id: 'side_part', label: 'Belah Samping' },
  { id: 'parted', label: 'Belah Tengah' },
  { id: 'curly', label: 'Keriting Pendek' },
  { id: 'bald', label: 'Botak Licin' },
];

const FEMALE_HAIR_OPTIONS: ReadonlyArray<{ id: HairStyle; label: string }> = [
  { id: 'hijab', label: 'Hijab Pashmina Rapi' },
  { id: 'hijab_sport', label: 'Hijab Sport Pendaki' },
  { id: 'long_loose', label: 'Panjang Terurai' },
  { id: 'twin_braids', label: 'Kepang Dua' },
  { id: 'single_braid', label: 'Kepang Satu Belakang' },
  { id: 'ponytail', label: 'Kuncir Kuda (Ponytail)' },
  { id: 'twintails', label: 'Kuncir Dua (Twintails)' },
  { id: 'bob', label: 'Rambut Bob Rapi' },
];

const MALE_HEAD_ACC_OPTIONS: ReadonlyArray<{ id: HeadAccessoryType; label: string }> = [
  { id: 'none', label: 'Tanpa Topi' },
  { id: 'rimba', label: 'Topi Rimba' },
  { id: 'baseball', label: 'Topi Baseball' },
  { id: 'beanie', label: 'Kupluk Beanie' },
  { id: 'towel_headband', label: 'Ikat Kepala Bandana' },
  { id: 'headlamp', label: 'Senter Kepala' },
  { id: 'peci', label: 'Peci Hitam' },
  { id: 'blangkon', label: 'Blangkon Batik' },
];

const FEMALE_HEAD_ACC_OPTIONS: ReadonlyArray<{ id: HeadAccessoryType; label: string }> = [
  { id: 'none', label: 'Tanpa Aksesoris' },
  { id: 'hairpin', label: 'Jepit Rambut / Pita' },
  { id: 'bando', label: 'Bando Pita Cantik' },
  { id: 'rimba', label: 'Topi Rimba' },
  { id: 'baseball', label: 'Topi Baseball' },
  { id: 'beanie', label: 'Kupluk Beanie' },
  { id: 'headlamp', label: 'Senter Kepala' },
];

const BACK_GEAR_OPTIONS: ReadonlyArray<{
  id: BackGearType;
  label: string;
  desc: string;
  gender?: GenderType;
}> = [
  { id: 'none', label: 'Kosong', desc: 'Tanpa tas punggung' },
  { id: 'carrier', label: 'Tas Carrier', desc: 'Ransel gunung & matras gulung' },
  { id: 'sling', label: 'Tas Selempang Mungil', desc: 'Tas selempang ringan pendaki putri', gender: 'female' },
  { id: 'cape', label: 'Jubah Pahlawan', desc: 'Jubah kain berkibar di angin' },
  { id: 'wings', label: 'Sayap Malaikat', desc: 'Sayap putih megah' },
  { id: 'jetpack', label: 'Jetpack Turbo', desc: 'Tabung roket & api pendorong' },
];

const FACE_EXPRESSION_OPTIONS: ReadonlyArray<{
  id: FaceExpressionType;
  label: string;
  desc: string;
}> = [
  { id: 'auto', label: 'Bawaan Karakter', desc: 'Wajah asli karakter terpilih' },
  { id: 'smile', label: 'Senyum Ceria', desc: 'Senyuman hangat penuh semangat' },
  { id: 'laugh', label: 'Tertawa Lepas', desc: 'Mulut terbuka & mata melengkung senang' },
  { id: 'angry', label: 'Marah', desc: 'Alis menukik tajam & mulut menggeram' },
  { id: 'annoyed', label: 'Kesal / Cemberut', desc: 'Alis berkerut & bibir cemberut' },
  { id: 'sad', label: 'Sedih / Menangis', desc: 'Alis turun & tetesan air mata biru' },
  { id: 'shocked', label: 'Kaget / Panik', desc: 'Mata melotot bulat & keringat dingin' },
  { id: 'cool', label: 'Santai / Cool', desc: 'Tatapan tenang & senyum tipis' },
  { id: 'sleepy', label: 'Ngantuk / Malas', desc: 'Kelopak mata setengah terpejam santai' },
  { id: 'shy', label: 'Malu-Malu / Blush', desc: 'Rona pipi merah muda & senyum manis' },
  { id: 'ninja_mask', label: 'Masker Ninja', desc: 'Penutup wajah bawah misterius' },
  { id: 'elder_wise', label: 'Bijak / Sepuh', desc: 'Tatapan tenang berwibawa penuh pengalaman' },
  { id: 'otaku_glasses', label: 'Kacamata Kilau', desc: 'Lensa kacamata memantulkan cahaya putih' },
  { id: 'chibi', label: 'Chibi Lucu', desc: 'Mata bulat menggemaskan & pipi merona' },
];

const FACE_AGE_OPTIONS: ReadonlyArray<{ id: FaceAgeType; label: string; desc: string }> = [
  { id: 'young', label: 'Wajah Muda / Polos', desc: 'Kulit cerah halus penuh energi' },
  { id: 'elder', label: 'Wajah Kakek Tua / Sepuh', desc: 'Kerutan dahi/pipi, alis, kumis & janggut putih' },
];

const EYE_STYLE_OPTIONS: ReadonlyArray<{
  id: EyeStyleType;
  label: string;
  desc: string;
  color: string;
}> = [
  { id: 'auto', label: 'Otomatis Karakter', desc: 'Mengikuti mata asli karakter', color: '#38bdf8' },
  { id: 'normal', label: 'Mata Anime Standar', desc: 'Mata anime jernih berkilau', color: '#1e293b' },
  { id: 'sharingan', label: 'Sharingan (3 Tomoe)', desc: 'Iris merah menyala dengan 3 tomoe hitam', color: '#dc2626' },
  { id: 'mangekyou', label: 'Mangekyou Sharingan', desc: 'Pola kincir hitam-merah tajam Klan Uchiha', color: '#991b1b' },
  { id: 'rinnegan', label: 'Mata Rinnegan', desc: 'Iris ungu dengan lingkaran konsentris', color: '#c084fc' },
  { id: 'byakugan', label: 'Mata Byakugan', desc: 'Iris putih pucat lavender & urat pelipis', color: '#e2e8f0' },
  { id: 'sage', label: 'Mata Sage Mode', desc: 'Iris kuning pupil horizontal & pigmen oranye', color: '#f97316' },
  { id: 'kyuubi', label: 'Mata Kyuubi / Kurama', desc: 'Iris merah menyala dengan pupil celah vertikal', color: '#ef4444' },
  { id: 'imu', label: 'Mata Imu-sama', desc: 'Lingkaran cincin kuning-merah berlapis', color: '#facc15' },
  { id: 'nika', label: 'Mata Nika (Gear 5)', desc: 'Cincin merah menyala khas Dewa Matahari', color: '#fb7185' },
  { id: 'mihawk', label: 'Mata Elang Mihawk', desc: 'Iris kuning emas dengan dua cincin hitam', color: '#eab308' },
  { id: 'six_eyes', label: 'Six Eyes (Rikugan)', desc: 'Iris biru langit bercahaya kristal Gojo', color: '#38bdf8' },
  { id: 'sukuna', label: 'Mata Raja Kutukan', desc: 'Sclera hitam gelap & iris merah menyala', color: '#b91c1c' },
  { id: 'ssj', label: 'Mata Super Saiyan', desc: 'Iris biru kehijauan tajam menyala', color: '#14b8a6' },
  { id: 'ui', label: 'Ultra Instinct (Perak)', desc: 'Iris perak bercahaya tenang luar biasa', color: '#cbd5e1' },
  { id: 'upper_moon', label: 'Mata Iblis Bulan Atas', desc: 'Pupil vertikal gelap & aura merah iblis', color: '#e11d48' },
  { id: 'geass', label: 'Mata Geass (Sigil)', desc: 'Iris ungu dengan lambang burung merah', color: '#a855f7' },
];

type EditorTab = 'cowo' | 'cewe' | 'hero' | 'god' | 'anime';
type GenderSubTab = 'outfit' | 'hair' | 'face' | 'back';
type AnimeSeriesTab = 'onepiece' | 'jjk' | 'aot' | 'naruto' | 'bleach' | 'dragonball' | 'hxh';

function detectSoftwarePreviewGl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|Software Rasterizer|Apple Paravirtual/i.test(r);
  } catch {
    return false;
  }
}

export const AvatarPreview3D: React.FC<{ avatar: AvatarConfig; role?: Role }> = ({
  avatar,
  role = 'student',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const rootSpinRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const yawRef = useRef(0.28);
  const pitchRef = useRef(0.08);
  const camDistRef = useRef(4.15);
  const autoSpinRef = useRef(true);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoft = detectSoftwarePreviewGl();
    const width = container.clientWidth || 240;
    const height = container.clientHeight || 280;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoft,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoft ? 1 : 1.25));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0, 1.56, -camDistRef.current);
    camera.lookAt(0, 1.32, 0);
    cameraRef.current = camera;

    const hemi = new THREE.HemisphereLight('#e0f2fe', '#334155', 0.72);
    const key = new THREE.DirectionalLight('#fffbeb', 1.45);
    key.position.set(-2.5, 4.5, -3.5);
    const rim = new THREE.DirectionalLight('#38bdf8', 0.7);
    rim.position.set(2.8, 3.0, 2.8);
    scene.add(hemi, key, rim);

    const podiumGeo = new THREE.CylinderGeometry(1.05, 1.18, 0.22, 24);
    const podiumMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.75, metalness: 0.2 });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.11;
    const ringGeo = new THREE.RingGeometry(0.95, 1.05, 28);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide });
    const trimRing = new THREE.Mesh(ringGeo, ringMat);
    trimRing.rotation.x = -Math.PI / 2;
    trimRing.position.y = 0.01;
    scene.add(podium, trimRing);

    const spinGroup = new THREE.Group();
    scene.add(spinGroup);
    rootSpinRef.current = spinGroup;

    const onLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onLost);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 240;
      const h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    let rafId = 0;
    let disposed = false;
    const startMs = performance.now();

    const loop = () => {
      if (disposed) return;
      const elapsed = (performance.now() - startMs) / 1000;
      if (autoSpinRef.current) {
        yawRef.current += 0.0055;
      }
      if (rootSpinRef.current) {
        rootSpinRef.current.rotation.y = yawRef.current;
        rootSpinRef.current.rotation.x = pitchRef.current;
      }
      if (cameraRef.current) {
        cameraRef.current.position.z = camDistRef.current;
        cameraRef.current.lookAt(0, 1.28, 0);
      }
      if (avatarGroupRef.current) {
        animateR15AvatarPose(avatarGroupRef.current, false, true, 0, null, elapsed, false);
      }
      renderer.render(scene, camera);
      if (isSoft) {
        rafId = window.setTimeout(loop, 80);
      } else {
        rafId = requestAnimationFrame(loop);
      }
    };
    loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.clearTimeout(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onLost);
      if (avatarGroupRef.current) {
        spinGroup.remove(avatarGroupRef.current);
        disposeAvatarGroup(avatarGroupRef.current);
        avatarGroupRef.current = null;
      }
      podiumGeo.dispose();
      podiumMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      rootSpinRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    const spinGroup = rootSpinRef.current;
    if (!spinGroup) return;
    if (avatarGroupRef.current) {
      spinGroup.remove(avatarGroupRef.current);
      disposeAvatarGroup(avatarGroupRef.current);
      avatarGroupRef.current = null;
    }
    const normalized = normalizeAvatarConfig(avatar, role);
    const { group, rig } = buildR15AvatarMesh(normalized, role, {
      withSpotLight: true,
      castShadow: false,
    });
    if (rig.headlampSpot) {
      rig.headlampSpot.intensity = normalized.headAccessory === 'headlamp' ? 2.6 : 0;
    }
    spinGroup.add(group);
    avatarGroupRef.current = group;
  }, [avatar, role]);

  const dragRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    autoSpinRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;
    yawRef.current += dx * 0.012;
    pitchRef.current = Math.max(-0.28, Math.min(0.35, pitchRef.current + dy * 0.006));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    camDistRef.current = Math.max(2.3, Math.min(6.2, camDistRef.current + e.deltaY * 0.003));
  };

  return (
    <div className="relative flex flex-col items-center justify-between w-full lg:w-64 shrink-0 rounded-xl bg-slate-900 border border-white/15 overflow-hidden select-none">
      <div className="w-full px-3 pt-2.5 flex items-center justify-between gap-1 text-[11px] text-slate-300">
        <span className="font-semibold text-white">Pratinjau 3D (360°)</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              camDistRef.current = Math.max(2.3, camDistRef.current - 0.45);
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 cursor-pointer"
            title="Perbesar (Zoom In)"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              camDistRef.current = Math.min(6.2, camDistRef.current + 0.45);
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 cursor-pointer"
            title="Perkecil (Zoom Out)"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              yawRef.current = 0;
              pitchRef.current = 0.08;
              camDistRef.current = 4.15;
              autoSpinRef.current = !autoSpinRef.current;
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-semibold text-sky-300 cursor-pointer"
            title="Reset sudut & putar otomatis"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {contextLost ? (
        <div className="w-full h-64 flex items-center justify-center p-4 text-center text-xs text-slate-400">
          Pratinjau 3D sementara tidak tersedia pada perangkat ini. Pilihan avatar tetap diterapkan di dunia gunung.
        </div>
      ) : (
        <div
          ref={mountRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          className="w-full h-64 sm:h-72 cursor-grab active:cursor-grabbing touch-none"
          title="Seret untuk putar 360°, gulir mouse untuk zoom"
        />
      )}

      <div className="w-full px-3 pb-2.5 text-center space-y-0.5">
        <div className="text-[10px] text-slate-400">Seret putar 360° · Scroll untuk Zoom</div>
        <div className="text-[11px] font-semibold text-amber-300">
          {role === 'teacher'
            ? 'Pemimpin Ekspedisi (Aura Emas)'
            : avatar.gender === 'female'
              ? 'Pendaki Putri R15'
              : 'Pendaki Putra R15'}
        </div>
      </div>
    </div>
  );
};

interface AvatarEditorProps {
  avatar: AvatarConfig;
  role?: Role;
  onChange: (next: AvatarConfig) => void;
}

export const AvatarEditor: React.FC<AvatarEditorProps> = ({
  avatar: rawAvatar,
  role = 'student',
  onChange,
}) => {
  const avatar = normalizeAvatarConfig(rawAvatar, role);
  const initialTab = (): EditorTab => {
    if (avatar.superheroSuit === 'none') {
      return avatar.gender === 'female' ? 'cewe' : 'cowo';
    }
    if (GOD_CATALOG.some((g) => g.id === avatar.superheroSuit)) return 'god';
    if (
      ONE_PIECE_CATALOG.some((a) => a.id === avatar.superheroSuit) ||
      JJK_CATALOG.some((a) => a.id === avatar.superheroSuit) ||
      AOT_CATALOG.some((a) => a.id === avatar.superheroSuit) ||
      NARUTO_CATALOG.some((a) => a.id === avatar.superheroSuit) ||
      BLEACH_CATALOG.some((a) => a.id === avatar.superheroSuit) ||
      DRAGON_BALL_CATALOG.some((a) => a.id === avatar.superheroSuit) ||
      HXH_CATALOG.some((a) => a.id === avatar.superheroSuit)
    ) {
      return 'anime';
    }
    return 'hero';
  };

  const initialAnimeSeries = (): AnimeSeriesTab => {
    if (JJK_CATALOG.some((a) => a.id === avatar.superheroSuit)) return 'jjk';
    if (AOT_CATALOG.some((a) => a.id === avatar.superheroSuit)) return 'aot';
    if (NARUTO_CATALOG.some((a) => a.id === avatar.superheroSuit)) return 'naruto';
    if (BLEACH_CATALOG.some((a) => a.id === avatar.superheroSuit)) return 'bleach';
    if (DRAGON_BALL_CATALOG.some((a) => a.id === avatar.superheroSuit)) return 'dragonball';
    if (HXH_CATALOG.some((a) => a.id === avatar.superheroSuit)) return 'hxh';
    return 'onepiece';
  };

  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [genderSubTab, setGenderSubTab] = useState<GenderSubTab>('outfit');
  const [animeSeries, setAnimeSeries] = useState<AnimeSeriesTab>(initialAnimeSeries);
  const [showAnimeEyeMod, setShowAnimeEyeMod] = useState(false);

  const patch = (partial: Partial<AvatarConfig>) => {
    const merged: AvatarConfig = { ...avatar, ...partial };
    if (partial.headAccessory) {
      merged.hat = partial.headAccessory;
    }
    onChange(sanitizeAvatarForGender(merged, merged.gender));
  };

  const selectGenderTab = (g: GenderType) => {
    const sanitized = sanitizeAvatarForGender(
      { ...avatar, gender: g, superheroSuit: 'none', characterForm: 'base' },
      g,
    );
    onChange(sanitized);
    setActiveTab(g === 'male' ? 'cowo' : 'cewe');
  };

  const activeCatalogEntry =
    avatar.superheroSuit !== 'none' ? getCatalogEntry(avatar.superheroSuit) : undefined;
  const activeForms = activeCatalogEntry?.forms;
  const activeFormObj = activeForms?.find((f) => f.id === (avatar.characterForm || 'base')) || activeForms?.[0];

  const renderCostumeGrid = (items: ReadonlyArray<CharacterCatalogEntry>, activeColor: string) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() =>
            patch({
              superheroSuit: item.id,
              characterForm: item.forms?.[0]?.id || 'base',
            })
          }
          className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
            avatar.superheroSuit === item.id
              ? activeColor
              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/25"
                style={{ backgroundColor: item.accent }}
              />
              <span className="text-xs font-bold truncate">{item.label}</span>
            </div>
            {item.forms && item.forms.length > 1 && (
              <span className="px-1 py-0.5 rounded bg-black/35 text-[9px] font-bold text-amber-300 shrink-0">
                {item.forms.length} Form
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-200/80 leading-tight mt-0.5 line-clamp-2">
            {item.desc}
          </div>
        </button>
      ))}
    </div>
  );

  const renderFaceAndEyePanel = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-white/10">
        <div>
          <div className="text-xs font-bold text-white">Kustomisasi Wajah &amp; Mata Anime</div>
          <div className="text-[10px] text-slate-400">
            14 ekspresi wajah, 2 usia, dan 17 mata anime ikonik.
          </div>
        </div>
        <button
          type="button"
          onClick={() => patch({ faceExpression: 'auto', faceAge: 'young', eyeStyle: 'auto' })}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-[11px] font-semibold text-white shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-emerald-300 mb-1.5">
          Ekspresi Wajah (14 Pilihan)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {FACE_EXPRESSION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ faceExpression: opt.id })}
              className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                (avatar.faceExpression || 'auto') === opt.id
                  ? 'bg-emerald-700/85 border-emerald-400 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="text-[11px] font-semibold leading-tight">{opt.label}</div>
              <div className="text-[9.5px] text-slate-300/75 leading-tight mt-0.5 line-clamp-1">
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Usia Wajah (Muda vs Kakek Sepuh)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FACE_AGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ faceAge: opt.id })}
              className={`px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                (avatar.faceAge || 'young') === opt.id
                  ? 'bg-amber-700/80 border-amber-400 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="text-xs font-bold">{opt.label}</div>
              <div className="text-[10px] text-slate-200/80 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-rose-300 mb-1.5">
          Gaya Mata Anime Ikonik (17 Pilihan)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {EYE_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ eyeStyle: opt.id })}
              className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                (avatar.eyeStyle || 'auto') === opt.id
                  ? 'bg-rose-700/80 border-rose-400 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                  style={{ backgroundColor: opt.color }}
                />
                <span className="text-[11px] font-bold truncate">{opt.label}</span>
              </div>
              <div className="text-[9.5px] text-slate-300/80 leading-tight mt-0.5 line-clamp-1">
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBackGearSection = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">
          Perlengkapan Punggung
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BACK_GEAR_OPTIONS.filter(
            (opt) => !opt.gender || opt.gender === avatar.gender,
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ backGear: opt.id })}
              className={`px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                avatar.backGear === opt.id
                  ? 'bg-sky-700/80 border-sky-400 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-[10px] text-slate-300/80 leading-tight mt-0.5">
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">
          Warna Ransel / Tas Selempang
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {PACK_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              aria-label={c.label}
              onClick={() => patch({ pack: c.hex })}
              className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                avatar.pack.toLowerCase() === c.hex.toLowerCase()
                  ? 'border-white scale-110 ring-2 ring-sky-400'
                  : 'border-white/20'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-white/15 text-[11px] text-slate-200 cursor-pointer">
            <input
              type="color"
              value={avatar.pack}
              onChange={(e) => patch({ pack: e.target.value })}
              className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
            />
            <span>Bebas</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderColorPickers = (isFemaleTab: boolean) => {
    const jacketSwatches = isFemaleTab ? FEMALE_JACKET_COLORS : MALE_JACKET_COLORS;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            {isFemaleTab ? 'Warna Baju / Atasan (Cerah & Pastel)' : 'Warna Baju / Atasan'}
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {jacketSwatches.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                aria-label={c.label}
                onClick={() => patch({ jacket: c.hex, superheroSuit: 'none' })}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                  avatar.jacket.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-white scale-110 ring-2 ring-sky-400'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <label
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-white/15 text-[11px] text-slate-200 cursor-pointer"
              title="Pilih warna bebas"
            >
              <input
                type="color"
                value={avatar.jacket}
                onChange={(e) => patch({ jacket: e.target.value, superheroSuit: 'none' })}
                className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
              />
              <span>Bebas</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            {isFemaleTab ? 'Warna Celana / Rok' : 'Warna Celana'}
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {PANTS_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                aria-label={c.label}
                onClick={() => patch({ pantsColor: c.hex, superheroSuit: 'none' })}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                  avatar.pantsColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-white scale-110 ring-2 ring-sky-400'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <label
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-white/15 text-[11px] text-slate-200 cursor-pointer"
              title="Pilih warna bebas"
            >
              <input
                type="color"
                value={avatar.pantsColor}
                onChange={(e) => patch({ pantsColor: e.target.value, superheroSuit: 'none' })}
                className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
              />
              <span>Bebas</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Warna Kulit Natural</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SKIN_TONES.map((s) => (
              <button
                key={s.hex}
                type="button"
                title={s.label}
                aria-label={s.label}
                onClick={() => patch({ skinColor: s.hex })}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                  avatar.skinColor.toLowerCase() === s.hex.toLowerCase()
                    ? 'border-white scale-110 ring-2 ring-sky-400'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: s.hex }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            {isFemaleTab && (avatar.hairStyle === 'hijab' || avatar.hairStyle === 'hijab_sport')
              ? 'Warna Kain Hijab'
              : 'Warna Rambut'}
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {HAIR_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                aria-label={c.label}
                onClick={() => patch({ hairColor: c.hex })}
                className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                  avatar.hairColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-white scale-110 ring-2 ring-sky-400'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <label
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-white/15 text-[11px] text-slate-200 cursor-pointer"
              title="Pilih warna bebas"
            >
              <input
                type="color"
                value={avatar.hairColor}
                onChange={(e) => patch({ hairColor: e.target.value })}
                className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
              />
              <span>Bebas</span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 rounded-xl bg-slate-950/85 border border-white/10">
      {/* Left: 360-degree Interactive 3D R15 Preview + Zoom */}
      <AvatarPreview3D avatar={avatar} role={role} />

      {/* Right: 5 Clean Main Tabs */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="grid grid-cols-5 gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
          <button
            type="button"
            onClick={() => selectGenderTab('male')}
            className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'cowo'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Cowo</span>
          </button>

          <button
            type="button"
            onClick={() => selectGenderTab('female')}
            className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'cewe'
                ? 'bg-pink-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Cewe</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hero')}
            className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'hero'
                ? 'bg-amber-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Hero</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('god')}
            className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'god'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Dewa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('anime')}
            className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'anime'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Anime</span>
          </button>
        </div>

        {/* Active Costume Banner + Multi-Form Transformasi */}
        {avatar.superheroSuit !== 'none' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
              <span className="truncate">
                Kostum Aktif:{' '}
                <strong className="uppercase">
                  {activeCatalogEntry?.label || avatar.superheroSuit.replace(/_/g, ' ')}
                </strong>
                {activeFormObj ? (
                  <span className="ml-1.5 text-amber-300 font-semibold">
                    ({activeFormObj.label})
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => patch({ superheroSuit: 'none', characterForm: 'base' })}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                Lepas Kostum
              </button>
            </div>

            {activeForms && activeForms.length > 0 && (
              <div className="px-2.5 py-2 rounded-lg bg-slate-900/90 border border-amber-400/30">
                <div className="text-[11px] font-bold text-amber-300 mb-1.5">
                  Pilih Form / Mode Transformasi:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeForms.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => patch({ characterForm: f.id })}
                      className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer ${
                        (avatar.characterForm || activeForms[0].id) === f.id
                          ? 'bg-amber-600 border-amber-300 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: KARAKTER COWO (4 Sub-Tab Bersih) */}
        {activeTab === 'cowo' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-slate-900 border border-white/10">
              <button
                type="button"
                onClick={() => setGenderSubTab('outfit')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'outfit' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Shirt className="w-3 h-3 shrink-0" />
                <span>Baju</span>
              </button>
              <button
                type="button"
                onClick={() => setGenderSubTab('hair')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'hair' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Scissors className="w-3 h-3 shrink-0" />
                <span>Rambut &amp; Topi</span>
              </button>
              <button
                type="button"
                onClick={() => setGenderSubTab('face')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'face' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smile className="w-3 h-3 shrink-0" />
                <span>Wajah &amp; Mata</span>
              </button>
              <button
                type="button"
                onClick={() => setGenderSubTab('back')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'back' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Backpack className="w-3 h-3 shrink-0" />
                <span>Punggung &amp; Aksesoris</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1">
              {genderSubTab === 'outfit' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-sky-300 mb-1.5">
                      Pakaian Pendaki Cowo
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {MALE_OUTFIT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => patch({ gender: 'male', outfit: opt.id, superheroSuit: 'none' })}
                          className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            avatar.outfit === opt.id && avatar.superheroSuit === 'none'
                              ? 'bg-sky-700/80 border-sky-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <div className="text-[11px] font-semibold leading-tight">{opt.label}</div>
                          <div className="text-[9.5px] text-slate-300/75 leading-tight mt-0.5 line-clamp-1">
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Celana Cowo</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {MALE_PANTS_OPTIONS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => patch({ gender: 'male', pantsStyle: p.id, superheroSuit: 'none' })}
                          className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            avatar.pantsStyle === p.id && avatar.superheroSuit === 'none'
                              ? 'bg-sky-700/80 border-sky-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {renderColorPickers(false)}
                </>
              )}

              {genderSubTab === 'hair' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Gaya Rambut Cowo</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {MALE_HAIR_OPTIONS.map((hs) => (
                        <button
                          key={hs.id}
                          type="button"
                          onClick={() => patch({ gender: 'male', hairStyle: hs.id, superheroSuit: 'none' })}
                          className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            avatar.hairStyle === hs.id
                              ? 'bg-sky-700/80 border-sky-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {hs.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Topi &amp; Aksesoris Kepala Cowo</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {MALE_HEAD_ACC_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            patch({ gender: 'male', headAccessory: opt.id, superheroSuit: 'none' })
                          }
                          className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            avatar.headAccessory === opt.id
                              ? 'bg-sky-700/80 border-sky-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {renderColorPickers(false)}
                </>
              )}

              {genderSubTab === 'face' && renderFaceAndEyePanel()}

              {genderSubTab === 'back' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Aksesoris Pendaki Cowo</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => patch({ gender: 'male', glasses: !avatar.glasses })}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          avatar.glasses
                            ? 'bg-amber-600/85 border-amber-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300'
                        }`}
                      >
                        {avatar.glasses ? 'Kacamata Sport: ON' : 'Kacamata Sport'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            gender: 'male',
                            wristAccessory:
                              (avatar.wristAccessory || 'none') === 'watch'
                                ? 'none'
                                : ('watch' as WristAccessoryType),
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          avatar.wristAccessory === 'watch'
                            ? 'bg-sky-600/85 border-sky-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300'
                        }`}
                      >
                        {avatar.wristAccessory === 'watch' ? 'Jam Tangan: ON' : 'Jam Tangan Sport'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            gender: 'male',
                            neckAccessory:
                              (avatar.neckAccessory || 'none') === 'scarf'
                                ? 'none'
                                : ('scarf' as NeckAccessoryType),
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          avatar.neckAccessory === 'scarf'
                            ? 'bg-sky-600/85 border-sky-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300'
                        }`}
                      >
                        {avatar.neckAccessory === 'scarf' ? 'Syal Leher: ON' : 'Syal Leher'}
                      </button>
                    </div>
                  </div>
                  {renderBackGearSection()}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: KARAKTER CEWE (4 Sub-Tab Bersih) */}
        {activeTab === 'cewe' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-slate-900 border border-white/10">
              <button
                type="button"
                onClick={() => setGenderSubTab('outfit')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'outfit' ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Shirt className="w-3 h-3 shrink-0" />
                <span>Baju</span>
              </button>
              <button
                type="button"
                onClick={() => setGenderSubTab('hair')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'hair' ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Scissors className="w-3 h-3 shrink-0" />
                <span>Rambut &amp; Hijab</span>
              </button>
              <button
                type="button"
                onClick={() => setGenderSubTab('face')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'face' ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smile className="w-3 h-3 shrink-0" />
                <span>Wajah &amp; Mata</span>
              </button>
              <button
                type="button"
                onClick={() => setGenderSubTab('back')}
                className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  genderSubTab === 'back' ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Backpack className="w-3 h-3 shrink-0" />
                <span>Punggung &amp; Aksesoris</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1">
              {genderSubTab === 'outfit' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-pink-300 mb-1.5">
                      Pakaian Pendaki Cewe (Tunik, Rompi &amp; Jaket Cerah)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {FEMALE_OUTFIT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => patch({ gender: 'female', outfit: opt.id, superheroSuit: 'none' })}
                          className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            avatar.outfit === opt.id && avatar.superheroSuit === 'none'
                              ? 'bg-pink-700/80 border-pink-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <div className="text-[11px] font-semibold leading-tight">{opt.label}</div>
                          <div className="text-[9.5px] text-slate-300/75 leading-tight mt-0.5 line-clamp-1">
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bawahan Cewe (Celana / Rok)</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {FEMALE_PANTS_OPTIONS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            patch({ gender: 'female', pantsStyle: p.id, superheroSuit: 'none' })
                          }
                          className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            avatar.pantsStyle === p.id && avatar.superheroSuit === 'none'
                              ? 'bg-pink-700/80 border-pink-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {renderColorPickers(true)}
                </>
              )}

              {genderSubTab === 'hair' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hijab &amp; Gaya Rambut Cewe</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {FEMALE_HAIR_OPTIONS.map((hs) => (
                        <button
                          key={hs.id}
                          type="button"
                          onClick={() => patch({ gender: 'female', hairStyle: hs.id, superheroSuit: 'none' })}
                          className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            avatar.hairStyle === hs.id
                              ? 'bg-pink-700/80 border-pink-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {hs.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Aksesoris Kepala Cewe</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {FEMALE_HEAD_ACC_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            patch({ gender: 'female', headAccessory: opt.id, superheroSuit: 'none' })
                          }
                          className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            avatar.headAccessory === opt.id
                              ? 'bg-pink-700/80 border-pink-400 text-white'
                              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {renderColorPickers(true)}
                </>
              )}

              {genderSubTab === 'face' && renderFaceAndEyePanel()}

              {genderSubTab === 'back' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Aksesoris Pendaki Cewe</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => patch({ gender: 'female', glasses: !avatar.glasses })}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          avatar.glasses
                            ? 'bg-amber-600/85 border-amber-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300'
                        }`}
                      >
                        {avatar.glasses ? 'Kacamata Bulat: ON' : 'Kacamata Bulat'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            gender: 'female',
                            neckAccessory:
                              (avatar.neckAccessory || 'none') === 'knit_scarf'
                                ? 'none'
                                : ('knit_scarf' as NeckAccessoryType),
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          avatar.neckAccessory === 'knit_scarf'
                            ? 'bg-pink-600/85 border-pink-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300'
                        }`}
                      >
                        {avatar.neckAccessory === 'knit_scarf' ? 'Syal Rajut: ON' : 'Syal Rajut'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            gender: 'female',
                            backGear: avatar.backGear === 'sling' ? 'carrier' : 'sling',
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          avatar.backGear === 'sling'
                            ? 'bg-pink-600/85 border-pink-400 text-white'
                            : 'bg-slate-900 border-white/10 text-slate-300'
                        }`}
                      >
                        {avatar.backGear === 'sling' ? 'Tas Selempang: ON' : 'Tas Selempang'}
                      </button>
                    </div>
                  </div>
                  {renderBackGearSection()}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SUPERHERO MARVEL, DC, ASIA & NUSANTARA (20) */}
        {activeTab === 'hero' && (
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-amber-300">
              Superhero Marvel, DC &amp; Nusantara ({HERO_CATALOG.length} Karakter + Multi-Form)
            </label>
            {renderCostumeGrid(HERO_CATALOG, 'bg-amber-600/85 border-amber-300 text-white')}
          </div>
        )}

        {/* TAB 4: DEWA MITOLOGI DUNIA & NUSANTARA (20) */}
        {activeTab === 'god' && (
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-purple-300">
              Dewa Mitologi Yunani, Nordik, Mesir, Tiongkok, Hindu &amp; Nusantara ({GOD_CATALOG.length} Karakter)
            </label>
            {renderCostumeGrid(GOD_CATALOG, 'bg-purple-600/85 border-purple-300 text-white')}
          </div>
        )}

        {/* TAB 5: ANIME (145 KARAKTER + MULTI-FORM + MODIFIKASI MATA) */}
        {activeTab === 'anime' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-slate-900 border border-white/10">
              <button
                type="button"
                onClick={() => setAnimeSeries('onepiece')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'onepiece' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                One Piece ({ONE_PIECE_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('jjk')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'jjk' ? 'bg-fuchsia-700 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Jujutsu Kaisen ({JJK_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('aot')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'aot' ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Attack on Titan ({AOT_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('naruto')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'naruto' ? 'bg-orange-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Naruto ({NARUTO_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('bleach')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'bleach' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Bleach TYBW ({BLEACH_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('dragonball')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'dragonball' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Dragon Ball ({DRAGON_BALL_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('hxh')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer col-span-2 sm:col-span-2 ${
                  animeSeries === 'hxh' ? 'bg-teal-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Hunter x Hunter ({HXH_CATALOG.length})
              </button>
            </div>

            {animeSeries === 'onepiece' &&
              renderCostumeGrid(ONE_PIECE_CATALOG, 'bg-rose-600/85 border-rose-300 text-white')}
            {animeSeries === 'jjk' &&
              renderCostumeGrid(JJK_CATALOG, 'bg-fuchsia-700/85 border-fuchsia-300 text-white')}
            {animeSeries === 'aot' &&
              renderCostumeGrid(AOT_CATALOG, 'bg-emerald-700/85 border-emerald-300 text-white')}
            {animeSeries === 'naruto' &&
              renderCostumeGrid(NARUTO_CATALOG, 'bg-orange-600/85 border-orange-300 text-white')}
            {animeSeries === 'bleach' &&
              renderCostumeGrid(BLEACH_CATALOG, 'bg-indigo-600/85 border-indigo-300 text-white')}
            {animeSeries === 'dragonball' &&
              renderCostumeGrid(DRAGON_BALL_CATALOG, 'bg-amber-600/85 border-amber-300 text-white')}
            {animeSeries === 'hxh' &&
              renderCostumeGrid(HXH_CATALOG, 'bg-teal-600/85 border-teal-300 text-white')}

            {/* Modifikasi Mata Anime (Opsional) */}
            <div className="rounded-lg border border-white/10 bg-slate-900/90 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAnimeEyeMod((v) => !v)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-rose-200 hover:bg-slate-800/70 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  <span>Modifikasi Mata Anime (Opsional)</span>
                  {(avatar.eyeStyle || 'auto') !== 'auto' && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-700 text-[10px] text-white">
                      Aktif: {EYE_STYLE_OPTIONS.find((e) => e.id === avatar.eyeStyle)?.label || avatar.eyeStyle}
                    </span>
                  )}
                </span>
                {showAnimeEyeMod ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showAnimeEyeMod && (
                <div className="p-2.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                  {EYE_STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ eyeStyle: opt.id })}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        (avatar.eyeStyle || 'auto') === opt.id
                          ? 'bg-rose-700/80 border-rose-400 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="text-[11px] font-bold truncate">{opt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


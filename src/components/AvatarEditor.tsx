import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  RotateCcw,
  Shield,
  Shirt,
  Backpack,
  Crown,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Flame,
} from 'lucide-react';
import type {
  AvatarConfig,
  BackGearType,
  CharacterCostumeId,
  GenderType,
  HairStyle,
  HeadAccessoryType,
  OutfitType,
  PantsStyleType,
  Role,
} from '../types/game';
import {
  animateR15AvatarPose,
  buildR15AvatarMesh,
  normalizeAvatarConfig,
} from '../game/AvatarBuilder';

const SKIN_TONES = [
  { hex: '#fde2c4', label: 'Kuning Langsat Cerah' },
  { hex: '#f1c27d', label: 'Sawo Cerah' },
  { hex: '#e0ac69', label: 'Sawo Matang' },
  { hex: '#c68642', label: 'Cokelat Hangat' },
  { hex: '#8d5524', label: 'Cokelat Gelap' },
  { hex: '#ffdbac', label: 'Pucat Natural' },
];

const JACKET_COLORS = [
  { hex: '#ef4444', label: 'Merah Expedition' },
  { hex: '#2563eb', label: 'Biru Alpine' },
  { hex: '#16a34a', label: 'Hijau Rimba' },
  { hex: '#d97706', label: 'Emas Pemimpin' },
  { hex: '#ec4899', label: 'Pink Ceria' },
  { hex: '#9333ea', label: 'Ungu Mistis' },
  { hex: '#f8fafc', label: 'Putih Bersih' },
  { hex: '#0f172a', label: 'Hitam Elegan' },
];

const PANTS_COLORS = [
  { hex: '#1e293b', label: 'Abu Slate' },
  { hex: '#292524', label: 'Cokelat Tua' },
  { hex: '#3f6212', label: 'Hijau Army' },
  { hex: '#1e3a8a', label: 'Biru Denim' },
  { hex: '#78350f', label: 'Khaki Gunung' },
  { hex: '#be185d', label: 'Maroon Rok' },
  { hex: '#09090b', label: 'Hitam Formal' },
];

const HAIR_COLORS = [
  { hex: '#1c1917', label: 'Hitam Pekat' },
  { hex: '#451a03', label: 'Cokelat Gelap' },
  { hex: '#92400e', label: 'Cokelat Terang' },
  { hex: '#d97706', label: 'Pirang Emas' },
  { hex: '#cbd5e1', label: 'Perak Salju' },
  { hex: '#ec4899', label: 'Pink Anime' },
  { hex: '#7f1d1d', label: 'Merah Maroon' },
];

const PACK_COLORS = [
  { hex: '#78350f', label: 'Cokelat Kulit' },
  { hex: '#1f2937', label: 'Hitam Taktis' },
  { hex: '#0f766e', label: 'Tosca Gunung' },
  { hex: '#b91c1c', label: 'Merah Terang' },
  { hex: '#2563eb', label: 'Biru Cerah' },
];

const OUTFIT_OPTIONS: ReadonlyArray<{ id: OutfitType; label: string; desc: string }> = [
  { id: 'windbreaker', label: 'Jaket Gunung', desc: 'Windbreaker dua warna & ritsleting' },
  { id: 'casual', label: 'Kaos Santai', desc: 'Kaos petualang & kacu leher' },
  { id: 'flannel', label: 'Kemeja Flanel', desc: 'Kemeja outdoor lengan bergulung' },
  { id: 'formal', label: 'Jas Formal', desc: 'Jas rapi berkerah dengan dasi' },
  { id: 'poncho', label: 'Jas Hujan Ponco', desc: 'Ponco transparan dengan tudung' },
  { id: 'koko', label: 'Baju Koko', desc: 'Kerah sanghai & bordir Nusantara' },
  { id: 'kebaya', label: 'Kebaya / Batik', desc: 'Kebaya & selendang Nusantara' },
  { id: 'school', label: 'Seragam Sekolah', desc: 'Kemeja sekolah rapi & dasi' },
];

const PANTS_STYLE_OPTIONS: ReadonlyArray<{ id: PantsStyleType; label: string }> = [
  { id: 'cargo', label: 'Celana Kargo' },
  { id: 'jeans', label: 'Celana Jeans' },
  { id: 'shorts', label: 'Celana Pendek' },
  { id: 'skirt', label: 'Rok / Kulot' },
];

const HAIR_STYLE_OPTIONS: ReadonlyArray<{ id: HairStyle; label: string }> = [
  { id: 'short', label: 'Pendek Rapi' },
  { id: 'side_part', label: 'Belah Samping' },
  { id: 'parted', label: 'Belah Tengah' },
  { id: 'spiky', label: 'Spiky Anime' },
  { id: 'undercut', label: 'Undercut Modern' },
  { id: 'curly', label: 'Keriting Pendek' },
  { id: 'bob', label: 'Bob Rapi' },
  { id: 'long_loose', label: 'Panjang Terurai' },
  { id: 'ponytail', label: 'Kuncir Ekor Kuda' },
  { id: 'twin_braids', label: 'Kepang Dua / Twintails' },
  { id: 'long_tie', label: 'Ikat Samping' },
  { id: 'hijab', label: 'Hijab Gunung' },
  { id: 'covered', label: 'Tertutup / Polos' },
  { id: 'bald', label: 'Botak Licin' },
];

const HEAD_ACCESSORY_OPTIONS: ReadonlyArray<{ id: HeadAccessoryType; label: string }> = [
  { id: 'none', label: 'Tanpa Aksesoris' },
  { id: 'rimba', label: 'Topi Rimba' },
  { id: 'baseball', label: 'Topi Baseball' },
  { id: 'beanie', label: 'Beanie Kupluk' },
  { id: 'bando', label: 'Bando Pita' },
  { id: 'towel_headband', label: 'Handuk & Ikat Kepala' },
  { id: 'headlamp', label: 'Senter Kepala' },
  { id: 'peci', label: 'Peci Hitam' },
  { id: 'blangkon', label: 'Blangkon Batik' },
];

const BACK_GEAR_OPTIONS: ReadonlyArray<{ id: BackGearType; label: string; desc: string }> = [
  { id: 'none', label: 'Kosong', desc: 'Tanpa aksesoris punggung' },
  { id: 'carrier', label: 'Tas Carrier', desc: 'Ransel gunung & matras gulung' },
  { id: 'cape', label: 'Jubah Pahlawan', desc: 'Jubah kain berkibar di angin' },
  { id: 'wings', label: 'Sayap Malaikat', desc: 'Sayap putih megah' },
  { id: 'jetpack', label: 'Jetpack Turbo', desc: 'Tabung roket & api pendorong' },
];

interface CostumeCatalogItem {
  id: CharacterCostumeId;
  label: string;
  desc: string;
  accent: string;
}

const SUPERHERO_ITEMS: ReadonlyArray<CostumeCatalogItem> = [
  { id: 'ironman', label: 'Iron Man', desc: 'Armor merah-emas & Arc Reactor', accent: '#dc2626' },
  { id: 'spiderman', label: 'Spider-Man', desc: 'Setelan jaring laba-laba merah-biru', accent: '#ef4444' },
  { id: 'captain_america', label: 'Captain America', desc: 'Perisai vibranium bintang punggung', accent: '#2563eb' },
  { id: 'thor', label: 'Thor', desc: 'Mjolnir petir & jubah Asgard', accent: '#38bdf8' },
  { id: 'hulk', label: 'Hulk', desc: 'Raksasa hijau celana robek', accent: '#22c55e' },
  { id: 'superman', label: 'Superman', desc: 'Lambang S & jubah merah ikonik', accent: '#3b82f6' },
  { id: 'batman', label: 'Batman', desc: 'Topeng kelelawar & jubah gelap', accent: '#334155' },
  { id: 'wonder_woman', label: 'Wonder Woman', desc: 'Tiara emas & gelang perak', accent: '#eab308' },
  { id: 'flash', label: 'The Flash', desc: 'Sayap petir & aura kilat', accent: '#f59e0b' },
  { id: 'k_cyber', label: 'K-Cyber Guardian', desc: 'Pelindung siber visor neon biru', accent: '#06b6d4' },
  { id: 'taekwondo_hero', label: 'Taekwondo Hero', desc: 'Dobok putih sabuk hitam bela diri', accent: '#f8fafc' },
  { id: 'ultraman', label: 'Ultraman', desc: 'Color Timer biru & sirip perak', accent: '#e11d48' },
  { id: 'kamen_rider', label: 'Kamen Rider', desc: 'Helm serangga & sabuk Typhoon', accent: '#10b981' },
  { id: 'shinobi', label: 'Shinobi Kage', desc: 'Ikat dahi pelindung & syal ninja', accent: '#475569' },
  { id: 'gatotkaca', label: 'Gatotkaca', desc: 'Zirah Nusantara & bintang dada emas', accent: '#d97706' },
  { id: 'gundala', label: 'Gundala', desc: 'Topeng sayap petir putra petir', accent: '#991b1b' },
  { id: 'sri_asih', label: 'Sri Asih', desc: 'Mahkota Srikandi & selendang sakti', accent: '#b91c1c' },
];

const GOD_ITEMS: ReadonlyArray<CostumeCatalogItem> = [
  { id: 'zeus', label: 'Zeus', desc: 'Raja Olympus, tongkat petir & jubah awan', accent: '#facc15' },
  { id: 'prometheus', label: 'Prometheus', desc: 'Titan pembawa obor api abadi', accent: '#f97316' },
  { id: 'poseidon', label: 'Poseidon', desc: 'Dewa Samudra & Trisula emas', accent: '#0ea5e9' },
  { id: 'athena', label: 'Athena', desc: 'Dewi Kebijaksanaan, tombak & perisai Aegis', accent: '#fde047' },
  { id: 'krishna', label: 'Bathara Krishna', desc: 'Kulit biru langit, mahkota merak & seruling', accent: '#2563eb' },
  { id: 'siwa', label: 'Dewa Siwa', desc: 'Bulan sabit, kalung tasbih & Trisula', accent: '#818cf8' },
  { id: 'wisnu', label: 'Dewa Wisnu', desc: 'Cakra Sudarshana & busana emas', accent: '#38bdf8' },
  { id: 'hanoman', label: 'Hanoman', desc: 'Ksatria kera putih sakti & gada', accent: '#f1f5f9' },
];

const ONE_PIECE_ITEMS: ReadonlyArray<CostumeCatalogItem> = [
  { id: 'luffy', label: 'Monkey D. Luffy', desc: 'Topi jerami, rompi merah & bekas luka dada', accent: '#ef4444' },
  { id: 'luffy_gear5', label: 'Luffy Gear 5', desc: 'Rambut awan putih & aura Nika bersinar', accent: '#f8fafc' },
  { id: 'zoro', label: 'Roronoa Zoro', desc: 'Rambut hijau & tiga katana Santoryu', accent: '#16a34a' },
  { id: 'kaido', label: 'Kaido', desc: 'Tanduk raksasa, mantel bulu & kanabo', accent: '#7c3aed' },
  { id: 'aokiji', label: 'Aokiji Kuzan', desc: 'Mantel Admiral & aura kristal es', accent: '#38bdf8' },
  { id: 'sanji', label: 'Vinsmoke Sanji', desc: 'Jas hitam & kaki api Diable Jambe', accent: '#f97316' },
  { id: 'ace', label: 'Portgas D. Ace', desc: 'Topi koboi oranye & aura api Mera-Mera', accent: '#ea580c' },
  { id: 'law', label: 'Trafalgar Law', desc: 'Topi berbintik & pedang panjang Kikoku', accent: '#eab308' },
  { id: 'boa_hancock', label: 'Boa Hancock', desc: 'Ratu Bajak Laut Kuja & aura Mero Mero', accent: '#db2777' },
  { id: 'shanks', label: 'Akagami no Shanks', desc: 'Rambut merah Yonko, pedang Gryphon & lengan kiri hilang', accent: '#dc2626' },
  { id: 'mihawk', label: 'Dracule Mihawk', desc: 'Pendekar pedang terhebat & pedang hitam Yoru', accent: '#eab308' },
  { id: 'nami', label: 'Nami', desc: 'Navigator Topi Jerami & tongkat cuaca Clima-Tact', accent: '#f97316' },
  { id: 'nico_robin', label: 'Nico Robin', desc: 'Arkeolog Topi Jerami & busana ungu elegan', accent: '#7e22ce' },
];

const NARUTO_ITEMS: ReadonlyArray<CostumeCatalogItem> = [
  { id: 'naruto', label: 'Naruto (Sage/Kurama)', desc: 'Jaket oranye-hitam & aura emas chakra', accent: '#f97316' },
  { id: 'sasuke', label: 'Sasuke Uchiha', desc: 'Jubah gelap, Sharingan & pedang Kusanagi', accent: '#6366f1' },
  { id: 'kakashi', label: 'Kakashi Hatake', desc: 'Masker Konoha, rambut perak & Sharingan', accent: '#64748b' },
  { id: 'sakura', label: 'Sakura Haruno', desc: 'Rambut pink, busana merah & segel Byakugo', accent: '#ec4899' },
  { id: 'minato', label: 'Minato Namikaze', desc: 'Jubah Hokage Keempat & kunai kilat', accent: '#facc15' },
  { id: 'boruto', label: 'Boruto Uzumaki', desc: 'Jaket hitam-pink, ikat kepala & tanda Karma', accent: '#3b82f6' },
  { id: 'itachi', label: 'Itachi Uchiha', desc: 'Mantel awan merah Akatsuki & aura gagak', accent: '#dc2626' },
  { id: 'madara', label: 'Madara Uchiha', desc: 'Zirah merah samurai & kipas perang Gunbai', accent: '#991b1b' },
  { id: 'hashirama', label: 'Hashirama Senju', desc: 'Hokage Pertama, zirah merah & Mokuton', accent: '#b91c1c' },
  { id: 'tobirama', label: 'Tobirama Senju', desc: 'Hokage Kedua, zirah biru & kerah bulu putih', accent: '#2563eb' },
  { id: 'hiruzen', label: 'Hiruzen Sarutobi', desc: 'Hokage Ketiga, pelindung kepala & tongkat Enma', accent: '#475569' },
  { id: 'tsunade', label: 'Tsunade Senju', desc: 'Hokage Kelima, haori hijau & segel Byakugo', accent: '#16a34a' },
  { id: 'jiraiya', label: 'Jiraiya (Sannin)', desc: 'Rambut putih panjang, ikat kepala Minyak & gulungan katak', accent: '#dc2626' },
  { id: 'obito', label: 'Obito Uchiha', desc: 'Topeng putih spiral Rinnegan & kipas perang', accent: '#64748b' },
];

const BLEACH_ITEMS: ReadonlyArray<CostumeCatalogItem> = [
  { id: 'ichigo', label: 'Ichigo Kurosaki', desc: 'Shihakusho hitam & pedang Zangetsu besar', accent: '#f97316' },
  { id: 'aizen', label: 'Sosuke Aizen', desc: 'Jubah putih Hueco Mundo / segel Muken', accent: '#a855f7' },
  { id: 'ichibe', label: 'Ichibe Hyosube', desc: 'Divisi Nol & kuas raksasa Ichimonji', accent: '#475569' },
  { id: 'yhwach', label: 'Yhwach', desc: 'Mantel Wandenreich hitam-merah & The Almighty', accent: '#dc2626' },
  { id: 'kenpachi', label: 'Kenpachi Zaraki', desc: 'Rambut lonceng, penutup mata & Nozarashi', accent: '#eab308' },
  { id: 'toshiro', label: 'Toshiro Hitsugaya', desc: 'Rambut putih, haori Kapten & sayap es', accent: '#38bdf8' },
  { id: 'byakuya', label: 'Byakuya Kuchiki', desc: 'Syal perak Kenseikan & kelopak Senbonzakura', accent: '#f472b6' },
  { id: 'gin', label: 'Gin Ichimaru', desc: 'Haori Kapten Divisi 3 & zanpakuto Shinso', accent: '#94a3b8' },
  { id: 'ulquiorra', label: 'Ulquiorra Cifer', desc: 'Espada 4 Arrancar putih, tanduk patah & sayap hitam', accent: '#10b981' },
  { id: 'grimmjow', label: 'Grimmjow Jaegerjaquez', desc: 'Espada 6 rambut biru & topeng rahang Pantera', accent: '#0ea5e9' },
  { id: 'rukia', label: 'Rukia Kuchiki', desc: 'Shihakusho hitam & pedang salju Sode no Shirayuki', accent: '#bae6fd' },
  { id: 'yamamoto', label: 'Genryusai Yamamoto', desc: 'Komandan Kapten Gotei 13, janggut putih & api Ryujin Jakka', accent: '#ea580c' },
];

const DRAGON_BALL_ITEMS: ReadonlyArray<CostumeCatalogItem> = [
  { id: 'goku', label: 'Son Goku', desc: 'Gi oranye Kamesennin & rambut tajam hitam', accent: '#f97316' },
  { id: 'goku_ssj', label: 'Goku Super Saiyan', desc: 'Rambut emas menyala & aura ki emas', accent: '#facc15' },
  { id: 'vegeta', label: 'Vegeta', desc: 'Armor tempur Saiyan biru-putih khas Pangeran', accent: '#2563eb' },
  { id: 'gohan', label: 'Son Gohan', desc: 'Gi ungu Piccolo & sabuk merah ksatria', accent: '#9333ea' },
  { id: 'piccolo', label: 'Piccolo', desc: 'Kulit hijau Namekian, sorban & jubah putih', accent: '#22c55e' },
  { id: 'trunks', label: 'Future Trunks', desc: 'Jaket Capsule Corp, rambut ungu & pedang punggung', accent: '#c084fc' },
  { id: 'beerus', label: 'Beerus (Dewa Kehancuran)', desc: 'Kulit ungu, telinga kucing tinggi, kerah Mesir & ekor panjang', accent: '#a855f7' },
  { id: 'whis', label: 'Whis (Malaikat Pembimbing)', desc: 'Rambut putih menjulang, halo leher biru & tongkat malaikat', accent: '#38bdf8' },
  { id: 'zeno', label: 'Zeno (Raja Segala Alam)', desc: 'Tubuh chibi, kepala oval telinga kuning & kanji 全 di dada', accent: '#facc15' },
];

const HXH_ITEMS: ReadonlyArray<CostumeCatalogItem> = [
  { id: 'gon', label: 'Gon Freecss', desc: 'Jaket hijau petualang & rambut spiky tinggi', accent: '#16a34a' },
  { id: 'killua', label: 'Killua Zoldyck', desc: 'Rambut perak, aura listrik & skateboard punggung', accent: '#38bdf8' },
  { id: 'kurapika', label: 'Kurapika', desc: 'Tabard suku Kurta & rantai Nen bersinar', accent: '#eab308' },
  { id: 'leorio', label: 'Leorio Paradinight', desc: 'Jas rapi biru gelap & kacamata hitam bundar', accent: '#475569' },
  { id: 'hisoka', label: 'Hisoka Morow', desc: 'Simbol kartu punggung, bintang pipi & kartu', accent: '#ec4899' },
];

type EditorTab = 'outfit' | 'head' | 'back' | 'hero' | 'god' | 'anime';
type AnimeSeriesTab = 'onepiece' | 'naruto' | 'bleach' | 'dragonball' | 'hxh';

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoft ? 1 : 2));
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

    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.18, 0.22, 28),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.75, metalness: 0.2 }),
    );
    podium.position.y = -0.11;
    const trimRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.05, 32),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide }),
    );
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
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      rootSpinRef.current = null;
      avatarGroupRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    const spinGroup = rootSpinRef.current;
    if (!spinGroup) return;
    if (avatarGroupRef.current) {
      spinGroup.remove(avatarGroupRef.current);
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
    if (avatar.superheroSuit === 'none') return 'outfit';
    if (GOD_ITEMS.some((g) => g.id === avatar.superheroSuit)) return 'god';
    if (
      ONE_PIECE_ITEMS.some((a) => a.id === avatar.superheroSuit) ||
      NARUTO_ITEMS.some((a) => a.id === avatar.superheroSuit) ||
      BLEACH_ITEMS.some((a) => a.id === avatar.superheroSuit) ||
      DRAGON_BALL_ITEMS.some((a) => a.id === avatar.superheroSuit) ||
      HXH_ITEMS.some((a) => a.id === avatar.superheroSuit)
    ) {
      return 'anime';
    }
    return 'hero';
  };

  const initialAnimeSeries = (): AnimeSeriesTab => {
    if (NARUTO_ITEMS.some((a) => a.id === avatar.superheroSuit)) return 'naruto';
    if (BLEACH_ITEMS.some((a) => a.id === avatar.superheroSuit)) return 'bleach';
    if (DRAGON_BALL_ITEMS.some((a) => a.id === avatar.superheroSuit)) return 'dragonball';
    if (HXH_ITEMS.some((a) => a.id === avatar.superheroSuit)) return 'hxh';
    return 'onepiece';
  };

  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [animeSeries, setAnimeSeries] = useState<AnimeSeriesTab>(initialAnimeSeries);

  const patch = (partial: Partial<AvatarConfig>) => {
    const next = { ...avatar, ...partial };
    if (partial.headAccessory) {
      next.hat = partial.headAccessory;
    }
    onChange(next);
  };

  const renderCostumeGrid = (items: ReadonlyArray<CostumeCatalogItem>, activeColor: string) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => patch({ superheroSuit: item.id })}
          className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
            avatar.superheroSuit === item.id
              ? activeColor
              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/25"
              style={{ backgroundColor: item.accent }}
            />
            <span className="text-xs font-bold truncate">{item.label}</span>
          </div>
          <div className="text-[10px] text-slate-200/80 leading-tight mt-0.5 line-clamp-2">
            {item.desc}
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 rounded-xl bg-slate-950/85 border border-white/10">
      {/* Left: 360-degree Interactive 3D R15 Preview + Zoom */}
      <AvatarPreview3D avatar={avatar} role={role} />

      {/* Right: 6 Category Tabs */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('outfit')}
            className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'outfit'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shirt className="w-3.5 h-3.5 shrink-0" />
            <span>Baju</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('head')}
            className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'head'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span>Kepala</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('back')}
            className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'back'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Backpack className="w-3.5 h-3.5 shrink-0" />
            <span>Punggung</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hero')}
            className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'hero'
                ? 'bg-amber-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Superhero</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('god')}
            className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
            className={`inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'anime'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Anime</span>
          </button>
        </div>

        {/* Active Costume Banner */}
        {avatar.superheroSuit !== 'none' && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
            <span>
              Kostum Karakter Aktif: <strong className="uppercase">{avatar.superheroSuit.replace(/_/g, ' ')}</strong>
            </span>
            <button
              type="button"
              onClick={() => patch({ superheroSuit: 'none' })}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
            >
              Lepas Kostum
            </button>
          </div>
        )}

        {/* TAB 1: GENDER, BAJU HARIAN, MODEL CELANA/ROK, KULIT & RAMBUT */}
        {activeTab === 'outfit' && (
          <div className="space-y-3">
            {/* Gender Selector */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-white/10">
              <span className="text-xs font-medium text-slate-300">Gender &amp; Proporsi Tubuh</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['male', 'female'] as GenderType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      patch({
                        gender: g,
                        hairStyle:
                          g === 'female' && avatar.hairStyle === 'short'
                            ? 'ponytail'
                            : g === 'male' &&
                                (avatar.hairStyle === 'ponytail' ||
                                  avatar.hairStyle === 'twin_braids' ||
                                  avatar.hairStyle === 'long_loose')
                              ? 'short'
                              : avatar.hairStyle,
                        pantsStyle:
                          g === 'male' && avatar.pantsStyle === 'skirt'
                            ? 'cargo'
                            : avatar.pantsStyle,
                      })
                    }
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      avatar.gender === g
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {g === 'male' ? 'Cowo' : 'Cewe'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Model Pakaian Harian &amp; Nusantara
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {OUTFIT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ outfit: opt.id, superheroSuit: 'none' })}
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

            {/* Pants Style */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Model Bawahan / Celana</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {PANTS_STYLE_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => patch({ pantsStyle: p.id, superheroSuit: 'none' })}
                    className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Shirt / Jacket Color */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Warna Baju / Atasan
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {JACKET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.label}
                      aria-label={c.label}
                      onClick={() => patch({ jacket: c.hex })}
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
                      onChange={(e) => patch({ jacket: e.target.value })}
                      className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
                    />
                    <span>Bebas</span>
                  </label>
                </div>
              </div>

              {/* Pants Color */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Warna Celana / Rok
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PANTS_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.label}
                      aria-label={c.label}
                      onClick={() => patch({ pantsColor: c.hex })}
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
                      onChange={(e) => patch({ pantsColor: e.target.value })}
                      className="w-4 h-4 bg-transparent border-0 p-0 cursor-pointer"
                    />
                    <span>Bebas</span>
                  </label>
                </div>
              </div>

              {/* Skin Tone */}
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

              {/* Hair Style & Hair Color */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gaya &amp; Warna Rambut</label>
                <select
                  value={avatar.hairStyle}
                  onChange={(e) => patch({ hairStyle: e.target.value as HairStyle })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  {HAIR_STYLE_OPTIONS.map((hs) => (
                    <option key={hs.id} value={hs.id}>
                      {hs.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {HAIR_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.label}
                      aria-label={c.label}
                      onClick={() => patch({ hairColor: c.hex })}
                      className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                        avatar.hairColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-white scale-110 ring-2 ring-sky-400'
                          : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GENDER, RAMBUT, AKSESORIS KEPALA & KACAMATA */}
        {activeTab === 'head' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-lg bg-slate-900 border border-white/10">
              <div>
                <span className="block text-[11px] font-medium text-slate-300 mb-1">
                  Gender (Cowo / Cewe)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['male', 'female'] as GenderType[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        patch({
                          gender: g,
                          hairStyle:
                            g === 'female' && avatar.hairStyle === 'short'
                              ? 'ponytail'
                              : g === 'male' &&
                                  (avatar.hairStyle === 'ponytail' ||
                                    avatar.hairStyle === 'twin_braids' ||
                                    avatar.hairStyle === 'long_loose')
                                ? 'short'
                                : avatar.hairStyle,
                          pantsStyle:
                            g === 'male' && avatar.pantsStyle === 'skirt'
                              ? 'cargo'
                              : avatar.pantsStyle,
                        })
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        avatar.gender === g
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {g === 'male' ? 'Cowo' : 'Cewe'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Model Rambut
                </label>
                <select
                  value={avatar.hairStyle}
                  onChange={(e) => patch({ hairStyle: e.target.value as HairStyle })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/15 text-xs text-white focus:outline-none focus:border-sky-400"
                >
                  {HAIR_STYLE_OPTIONS.map((hs) => (
                    <option key={hs.id} value={hs.id}>
                      {hs.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Pilih Aksesoris Kepala
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HEAD_ACCESSORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ headAccessory: opt.id })}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-semibold text-center transition-colors cursor-pointer ${
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

            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-900 border border-white/10">
              <div>
                <div className="text-xs font-semibold text-white">Kacamata Hitam / Pendaki</div>
                <div className="text-[11px] text-slate-400">
                  Melindungi mata dari silau puncak gunung
                </div>
              </div>
              <button
                type="button"
                onClick={() => patch({ glasses: !avatar.glasses })}
                className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  avatar.glasses
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-slate-800 border-white/15 text-slate-300 hover:text-white'
                }`}
              >
                {avatar.glasses ? 'Kacamata AKTIF' : 'Kacamata NONAKTIF'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: AKSESORIS PUNGGUNG */}
        {activeTab === 'back' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Perlengkapan Punggung
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BACK_GEAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ backGear: opt.id })}
                    className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
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
                Warna Ransel / Aksen Punggung
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
        )}

        {/* TAB 4: SUPERHERO DUNIA & INDONESIA (17) */}
        {activeTab === 'hero' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Kostum Superhero Dunia, Asia &amp; Indonesia (17 Karakter)
              </label>
            </div>
            {renderCostumeGrid(SUPERHERO_ITEMS, 'bg-amber-600/85 border-amber-300 text-white')}
          </div>
        )}

        {/* TAB 5: DEWA MITOLOGI YUNANI & NUSANTARA (8) */}
        {activeTab === 'god' && (
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-slate-300">
              Dewa Mitologi Yunani, Hindu &amp; Nusantara (8 Karakter)
            </label>
            {renderCostumeGrid(GOD_ITEMS, 'bg-purple-600/85 border-purple-300 text-white')}
          </div>
        )}

        {/* TAB 6: ANIME (ONE PIECE, NARUTO, BLEACH TYBW, DRAGON BALL, HUNTER X HUNTER) (50) */}
        {activeTab === 'anime' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 rounded-lg bg-slate-900 border border-white/10">
              <button
                type="button"
                onClick={() => setAnimeSeries('onepiece')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'onepiece'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                One Piece (13)
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('naruto')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'naruto'
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Naruto (14)
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('bleach')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'bleach'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Bleach (12)
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('dragonball')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'dragonball'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Dragon Ball (9)
              </button>
              <button
                type="button"
                onClick={() => setAnimeSeries('hxh')}
                className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                  animeSeries === 'hxh'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Hunter x Hunter (5)
              </button>
            </div>

            {animeSeries === 'onepiece' &&
              renderCostumeGrid(ONE_PIECE_ITEMS, 'bg-rose-600/85 border-rose-300 text-white')}
            {animeSeries === 'naruto' &&
              renderCostumeGrid(NARUTO_ITEMS, 'bg-orange-600/85 border-orange-300 text-white')}
            {animeSeries === 'bleach' &&
              renderCostumeGrid(BLEACH_ITEMS, 'bg-indigo-600/85 border-indigo-300 text-white')}
            {animeSeries === 'dragonball' &&
              renderCostumeGrid(DRAGON_BALL_ITEMS, 'bg-amber-600/85 border-amber-300 text-white')}
            {animeSeries === 'hxh' &&
              renderCostumeGrid(HXH_ITEMS, 'bg-emerald-600/85 border-emerald-300 text-white')}
          </div>
        )}
      </div>
    </div>
  );
};

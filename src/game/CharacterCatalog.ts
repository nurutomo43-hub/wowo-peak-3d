import type { CharacterCostumeId, EyeStyleType, FaceExpressionType } from '../types/game';

export interface CharacterFormOption {
  id: string;
  label: string;
}

export interface CharacterCatalogEntry {
  id: CharacterCostumeId;
  label: string;
  desc: string;
  accent: string;
  forms?: ReadonlyArray<CharacterFormOption>;
}

export interface CostumeStyleSpec {
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
  hairEmissive?: string;
  hairMode?:
    | 'none'
    | 'short'
    | 'side_part'
    | 'covered'
    | 'spiky'
    | 'gon_spiky'
    | 'long'
    | 'bob'
    | 'bald'
    | 'ponytail'
    | 'slick'
    | 'twin_tails'
    | 'parted'
    | 'curly'
    | 'whis_tall'
    | 'ushnisha'
    | 'afro';
  capeColor?: string;
  haloColor?: string;
  neckHaloColor?: string;
  tailColor?: string;
  tailType?: 'none' | 'beerus' | 'arrow_demon' | 'dragon_dark' | 'monkey' | 'saiyan';
  headOval?: boolean;
  egyptCollar?: boolean;
  auraColor?: string;
  backWings?: 'none' | 'dragon_dark' | 'demon_dark' | 'angel_white' | 'iron_spider' | 'butterflies';
  extraArms?: boolean;
  shoulderRavens?: boolean;
  lotusHalo?: boolean;
  fireWheels?: boolean;
  wolverineClaws?: boolean;
  eyeBandage?: boolean;
  imuSilhouette?: boolean;
  imuCrownTall?: boolean;
  dragonHorns?: boolean;
  ramHorns?: boolean;
  jackalHead?: boolean;
  falconHead?: boolean;
  elephantHead?: boolean;
  sunDisk?: boolean;
  quetzalCrown?: boolean;
  seaChains?: boolean;
  isFemale?: boolean;
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
    | 'grimmjow_jaw'
    | 'doom_mask'
    | 'black_panther'
    | 'deadpool'
    | 'wolverine_cowl'
    | 'venom'
    | 'ghost_rider'
    | 'moon_knight'
    | 'skull_brook'
    | 'titan_colossal'
    | 'titan_armored'
    | 'titan_warhammer'
    | 'jogo_volcano';
  scaleMult?: number;
  metalness?: number;
  roughness?: number;
  weapon?:
    | 'shield'
    | 'mjolnir'
    | 'stormbreaker'
    | 'trident'
    | 'spear'
    | 'gungnir'
    | 'ankh'
    | 'ruyi_staff'
    | 'three_point_spear'
    | 'katana_3'
    | 'sword'
    | 'dual_swords'
    | 'yoru'
    | 'kanabo'
    | 'ragnir_hammer'
    | 'nobara_hammer'
    | 'staff'
    | 'whis_staff'
    | 'lightning_bolt'
    | 'fire_orb'
    | 'rasengan'
    | 'clima_tact'
    | 'sode_shirayuki'
    | 'ryujin_jakka'
    | 'gunbai'
    | 'kurta_chains'
    | 'playing_card'
    | 'slingshot'
    | 'scythe'
    | 'chaos_orbs'
    | 'magic_mandala'
    | 'bident';
  headGear?:
    | 'straw_hat'
    | 'straw_hat_white'
    | 'trafalgar_hat'
    | 'horns'
    | 'broken_horn'
    | 'crown_gold'
    | 'scarlet_tiara'
    | 'mahkota_wayang'
    | 'leaf_band'
    | 'oil_band'
    | 'akatsuki_hat'
    | 'yhwach_helm'
    | 'ice_crown'
    | 'wing_helm'
    | 'ace_hat'
    | 'sabo_hat'
    | 'usopp_goggles'
    | 'chopper_hat'
    | 'brook_crown'
    | 'mihawk_hat'
    | 'aokiji_glasses'
    | 'kenseikan'
    | 'visor'
    | 'piccolo_turban'
    | 'leorio_glasses'
    | 'beerus_ears'
    | 'zeno_ears'
    | 'shiki_wheel'
    | 'urahara_hat'
    | 'anubis_ears'
    | 'wukong_band'
    | 'doom_hood'
    | 'eyepatch_odin';
  coat?:
    | 'akatsuki'
    | 'marine'
    | 'hokage'
    | 'captain_white'
    | 'sleeveless_captain'
    | 'espada'
    | 'yhwach_cloak'
    | 'gundala_scarf'
    | 'feather_cape'
    | 'tsunade_haori'
    | 'jiraiya_haori'
    | 'whis_robe'
    | 'survey_cape'
    | 'royal_dark_gold'
    | 'elbaph_fur'
    | 'levitation_cloak'
    | 'sternritter';
  backProp?: 'trunks_sword' | 'killua_skateboard' | 'ragnir_back' | 'mirage_sword';
  divisionNo?: string;
  luffyCord?: boolean;
  hisokaMarks?: boolean;
  missingLeftArm?: boolean;
  prayerBeads?: boolean;
  byakugouSeal?: boolean;
  whiteBeard?: boolean;
  ulquiorraTears?: boolean;
  snakeEarrings?: boolean;
  chestPattern?:
    | 'scales_dark'
    | 'scales_azure'
    | 'haki_armor'
    | 'bandages'
    | 'sukuna_marks'
    | 'open_vest'
    | 'armor_plates'
    | 'royal_gold'
    | 'survey_corps'
    | 'akatsuki'
    | 'shihakusho'
    | 'sternritter'
    | 'saiyan_armor'
    | 'gi_symbol'
    | 'spider_web'
    | 'doom_armor'
    | 'strange_amulet'
    | 'shinto_robe'
    | 'jjk_uniform'
    | 'kimono';
  faceMark?:
    | 'none'
    | 'luffy_scar'
    | 'naruto_whiskers'
    | 'boruto_whiskers'
    | 'ace_freckles'
    | 'itachi_lines'
    | 'law_dark_eyes'
    | 'hisoka_marks'
    | 'zeno_stripes'
    | 'ulquiorra_tears'
    | 'byakugou'
    | 'yamamoto_scar'
    | 'sukuna_tattoos'
    | 'sukuna_heian'
    | 'karma_boruto'
    | 'karma_kawaki'
    | 'third_eye'
    | 'shiva_third_eye'
    | 'zoro_scar'
    | 'shanks_scar'
    | 'kenpachi_scar'
    | 'titan_marks'
    | 'ssj_brows'
    | 'majin_m'
    | 'garp_scar'
    | 'shirohige_stache'
    | 'roger_stache'
    | 'sanji_brow'
    | 'krishna_tilak'
    | 'kaguya_byakugan';
  defaultEye?: EyeStyleType;
  defaultExpression?: FaceExpressionType;
  irisColor?: string;
  scleraColor?: string;
  giantHands?: boolean;
  backLogoText?: string;
}

// =====================================================================
// LIGHTWEIGHT CATALOG METADATA (FOR UI CARDS & MULTI-FORM BUTTONS)
// =====================================================================

export const HERO_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'doctor_doom',
    label: 'Doctor Doom',
    desc: 'Zirah baja Latveria & jubah megah',
    accent: '#16a34a',
    forms: [
      { id: 'classic', label: 'Armor Klasik' },
      { id: 'god_emperor', label: 'God Emperor Doom' },
    ],
  },
  {
    id: 'scarlet_witch',
    label: 'Scarlet Witch',
    desc: 'Sihir Chaos merah & mahkota Darkhold',
    accent: '#dc2626',
    forms: [
      { id: 'wanda', label: 'Wanda' },
      { id: 'darkhold', label: 'Darkhold Scarlet Witch' },
    ],
  },
  {
    id: 'doctor_strange',
    label: 'Doctor Strange',
    desc: 'Jubah Levitasi & Eye of Agamotto',
    accent: '#ef4444',
    forms: [
      { id: 'supreme', label: 'Sorcerer Supreme' },
      { id: 'sinister', label: 'Sinister Strange' },
    ],
  },
  {
    id: 'ironman',
    label: 'Iron Man',
    desc: 'Armor merah-emas & Arc Reactor',
    accent: '#dc2626',
    forms: [
      { id: 'mark85', label: 'Mark 85' },
      { id: 'hulkbuster', label: 'Hulkbuster' },
    ],
  },
  {
    id: 'spiderman',
    label: 'Spider-Man',
    desc: 'Penjelajah jaring kota & pelindung nano',
    accent: '#ef4444',
    forms: [
      { id: 'classic', label: 'Klasik' },
      { id: 'iron_spider', label: 'Iron Spider' },
      { id: 'symbiote', label: 'Symbiote Hitam' },
    ],
  },
  {
    id: 'captain_america',
    label: 'Captain America',
    desc: 'Perisai Vibranium & komandan Avengers',
    accent: '#2563eb',
    forms: [
      { id: 'shield', label: 'Perisai Vibranium' },
      { id: 'worthy', label: 'Worthy Mjolnir' },
    ],
  },
  {
    id: 'thor',
    label: 'Thor Odinson',
    desc: 'Dewa Petir Asgard bersenjata sakti',
    accent: '#38bdf8',
    forms: [
      { id: 'stormbreaker', label: 'Stormbreaker' },
      { id: 'rune_king', label: 'Rune King Thor' },
    ],
  },
  {
    id: 'hulk',
    label: 'Hulk',
    desc: 'Raksasa gamma tak terhentikan',
    accent: '#22c55e',
    forms: [
      { id: 'savage', label: 'Savage Hulk' },
      { id: 'professor', label: 'Professor Hulk' },
    ],
  },
  { id: 'black_panther', label: 'Black Panther', desc: 'Setelan Vibranium ungu Wakanda', accent: '#9333ea' },
  { id: 'wolverine', label: 'Wolverine', desc: 'Kostum kuning-biru & cakar Adamantium', accent: '#facc15' },
  { id: 'deadpool', label: 'Deadpool', desc: 'Kostum merah-hitam & dua katana', accent: '#dc2626' },
  {
    id: 'batman',
    label: 'Batman',
    desc: 'Ksatria Kegelapan Kota Gotham',
    accent: '#334155',
    forms: [
      { id: 'classic', label: 'Klasik' },
      { id: 'hellbat', label: 'Hellbat Armor' },
    ],
  },
  { id: 'superman', label: 'Superman', desc: 'Lambang S Krypton & jubah merah', accent: '#3b82f6' },
  { id: 'wonder_woman', label: 'Wonder Woman', desc: 'Tiara emas Amazon & perisai', accent: '#eab308' },
  { id: 'flash', label: 'The Flash', desc: 'Speed Force petir emas tercepat', accent: '#f59e0b' },
  { id: 'aquaman', label: 'Aquaman', desc: 'Zirah sisik emas Atlantis & trisula', accent: '#ea580c' },
  { id: 'green_lantern', label: 'Green Lantern', desc: 'Cincin energi hijau kosmik', accent: '#22c55e' },
  {
    id: 'moon_knight',
    label: 'Moon Knight',
    desc: 'Avatar Khonshu berselubung putih',
    accent: '#e2e8f0',
    forms: [
      { id: 'moon_knight', label: 'Moon Knight' },
      { id: 'mr_knight', label: 'Mr. Knight' },
    ],
  },
  { id: 'ghost_rider', label: 'Ghost Rider', desc: 'Tengkorak api neraka & rantai membara', accent: '#f97316' },
  { id: 'venom', label: 'Venom', desc: 'Simbiot hitam raksasa berlogo laba-laba', accent: '#09090b' },
];

export const GOD_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  { id: 'buddha', label: 'Buddha / Siddhartha', desc: 'Jubah emas agung, ushnisha & halo teratai', accent: '#fbbf24' },
  { id: 'odin', label: 'Odin', desc: 'Penutup mata, tombak Gungnir & 2 gagak', accent: '#1d4ed8' },
  { id: 'zeus', label: 'Zeus', desc: 'Jubah putih-emas Olympus & petir emas', accent: '#facc15' },
  { id: 'poseidon', label: 'Poseidon', desc: 'Trisula emas & aura ombak samudra', accent: '#0ea5e9' },
  { id: 'hades', label: 'Hades', desc: 'Jubah hitam-ungu & helm kegelapan', accent: '#7e22ce' },
  { id: 'athena', label: 'Athena', desc: 'Helm perang emas, tombak & perisai Aegis', accent: '#fde047' },
  { id: 'anubis', label: 'Anubis', desc: 'Kepala serigala hitam Mesir & tongkat Ankh', accent: '#d97706' },
  { id: 'ra', label: 'Ra (Dewa Matahari)', desc: 'Kepala elang & cakram matahari emas', accent: '#f59e0b' },
  { id: 'horus', label: 'Horus', desc: 'Zirah elang emas & mata Horus', accent: '#eab308' },
  { id: 'osiris', label: 'Osiris', desc: 'Mahkota Atef & jubah penguasa abadi', accent: '#10b981' },
  { id: 'amaterasu', label: 'Amaterasu', desc: 'Jubah suci Shinto putih-merah & cermin', accent: '#ef4444' },
  { id: 'susanoo', label: 'Susanoo', desc: 'Zirah samurai badai & pedang Kusanagi', accent: '#2563eb' },
  { id: 'tsukuyomi', label: 'Tsukuyomi', desc: 'Jubah malam perak-ungu & bulan sabit', accent: '#818cf8' },
  { id: 'sun_wukong', label: 'Sun Wukong', desc: 'Mahkota bulu emas & tongkat Ruyi', accent: '#dc2626' },
  { id: 'nezha', label: 'Nezha', desc: 'Roda api di kaki & pita sakti merah', accent: '#f97316' },
  { id: 'erlang_shen', label: 'Erlang Shen', desc: 'Mata ketiga di dahi & tombak tiga mata', accent: '#0284c7' },
  { id: 'siwa', label: 'Shiva (Siwa)', desc: 'Kulit biru, mata ketiga, bulan sabit & Trishula', accent: '#38bdf8' },
  { id: 'wisnu', label: 'Vishnu (Wisnu)', desc: 'Kulit biru langit, mahkota & cakra', accent: '#60a5fa' },
  { id: 'ganesha', label: 'Ganesha', desc: 'Kepala gajah agung bermahkota emas', accent: '#fb923c' },
  { id: 'quetzalcoatl', label: 'Quetzalcoatl', desc: 'Mahkota bulu quetzal hijau-emas Aztec', accent: '#16a34a' },
];

export const ONE_PIECE_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'luffy',
    label: 'Monkey D. Luffy',
    desc: 'Kapten Topi Jerami dengan 5 wujud Gear',
    accent: '#ef4444',
    forms: [
      { id: 'base', label: 'Base Mode' },
      { id: 'gear2', label: 'Gear 2' },
      { id: 'gear3', label: 'Gear 3' },
      { id: 'gear4', label: 'Gear 4 Bound/Snake' },
      { id: 'gear5', label: 'Gear 5 Nika' },
    ],
  },
  {
    id: 'loki',
    label: 'Pangeran Loki (Elbaph)',
    desc: 'Pangeran raksasa Elbaph & Zoan Nidhogg',
    accent: '#7c3aed',
    forms: [
      { id: 'cursed', label: '1. Pangeran Terkutuk' },
      { id: 'ragnir', label: '2. Wujud Bebas & Ragnir' },
      { id: 'nidhogg', label: '3. Mythical Zoan Nidhogg' },
    ],
  },
  {
    id: 'imu',
    label: 'Imu-sama',
    desc: 'Penguasa Takhta Kosong & Wujud Iblis',
    accent: '#dc2626',
    forms: [
      { id: 'demon_silhouette', label: '1. Wujud Setan' },
      { id: 'devil_beast', label: '2. Wujud Iblis' },
      { id: 'demon_king', label: '3. Wujud Raja Iblis' },
    ],
  },
  {
    id: 'kaido',
    label: 'Kaido',
    desc: 'Makhluk Terkuat dengan kekuatan Naga Azure',
    accent: '#7e22ce',
    forms: [
      { id: 'base', label: 'Wujud Manusia' },
      { id: 'hybrid', label: 'Hybrid Manusia-Naga' },
      { id: 'dragon', label: 'Naga Azure / Flaming Drum' },
    ],
  },
  {
    id: 'garp',
    label: 'Monkey D. Garp',
    desc: 'Pahlawan Angkatan Laut Galaxy Impact',
    accent: '#1d4ed8',
    forms: [
      { id: 'prime', label: 'Garp Prime / God Valley' },
      { id: 'elder', label: 'Garp Sepuh / Hachinosu' },
    ],
  },
  {
    id: 'sengoku',
    label: 'Sengoku',
    desc: 'Mantan Fleet Admiral & Buddha Emas',
    accent: '#facc15',
    forms: [
      { id: 'base', label: 'Fleet Admiral' },
      { id: 'daibutsu', label: 'Daibutsu / Buddha Emas' },
    ],
  },
  {
    id: 'shirohige',
    label: 'Edward Newgate (Shirohige)',
    desc: 'Manusia Terkuat Pemakan Gura-Gura',
    accent: '#f8fafc',
    forms: [
      { id: 'prime', label: 'Shirohige Prime' },
      { id: 'marineford', label: 'Shirohige Marineford' },
    ],
  },
  {
    id: 'roger',
    label: 'Gol D. Roger',
    desc: 'Raja Bajak Laut dengan Haoshoku Kamusari',
    accent: '#dc2626',
    forms: [
      { id: 'base', label: 'Raja Bajak Laut' },
      { id: 'kamusari', label: 'Divine Departure / Kamusari' },
    ],
  },
  {
    id: 'shiki',
    label: 'Shiki the Golden Lion',
    desc: 'Rival Roger pemakan Fuwa Fuwa no Mi',
    accent: '#eab308',
    forms: [
      { id: 'prime', label: 'Shiki Prime' },
      { id: 'impel_down', label: 'Shiki Impel Down' },
    ],
  },
  {
    id: 'zoro',
    label: 'Roronoa Zoro',
    desc: 'Pendekar 3 Pedang & Raja Neraka',
    accent: '#16a34a',
    forms: [
      { id: 'base', label: 'Base Mode' },
      { id: 'ashura', label: 'King of Hell Ashura' },
    ],
  },
  {
    id: 'sanji',
    label: 'Vinsmoke Sanji',
    desc: 'Kaki Hitam dengan api biru Ifrit Jambe',
    accent: '#f59e0b',
    forms: [
      { id: 'base', label: 'Base Mode' },
      { id: 'ifrit', label: 'Ifrit Jambe' },
    ],
  },
  {
    id: 'nami',
    label: 'Nami',
    desc: 'Navigator Topi Jerami & awan petir Zeus',
    accent: '#f97316',
    forms: [
      { id: 'base', label: 'Base Mode' },
      { id: 'zeus', label: 'Zeus Mode' },
    ],
  },
  { id: 'usopp', label: 'Usopp', desc: 'Penembak jitu God Usopp & Kabuto', accent: '#854d0e' },
  {
    id: 'chopper',
    label: 'Tony Tony Chopper',
    desc: 'Dokter rusa kutub & Monster Point',
    accent: '#ec4899',
    forms: [
      { id: 'brain', label: 'Brain Point' },
      { id: 'monster', label: 'Monster Point' },
    ],
  },
  {
    id: 'nico_robin',
    label: 'Nico Robin',
    desc: 'Arkeolog Ohara & wujud Demonio Fleur',
    accent: '#7e22ce',
    forms: [
      { id: 'base', label: 'Base Mode' },
      { id: 'demonio', label: 'Demonio Fleur' },
    ],
  },
  { id: 'franky', label: 'Franky', desc: 'Cyborg pembuat kapal Sunny-Go', accent: '#38bdf8' },
  { id: 'brook', label: 'Brook', desc: 'Soul King tengkorak afro & pedang es', accent: '#eab308' },
  { id: 'jinbe', label: 'Jinbe', desc: 'Kesatria Lautan Karate Manusia Ikan', accent: '#0284c7' },
  { id: 'ace', label: 'Portgas D. Ace', desc: 'Tinju Api Mera-Mera & topi oranye', accent: '#ea580c' },
  {
    id: 'sabo',
    label: 'Sabo',
    desc: 'Kepala Staf Revolusioner pewaris Mera-Mera',
    accent: '#2563eb',
    forms: [
      { id: 'base', label: 'Base Mode' },
      { id: 'mera', label: 'Mera-Mera' },
    ],
  },
  {
    id: 'law',
    label: 'Trafalgar Law',
    desc: 'Dokter Kematian Ope Ope & Kikoku',
    accent: '#eab308',
    forms: [
      { id: 'base', label: 'Base Mode' },
      { id: 'awakening', label: 'Awakening K-ROOM' },
    ],
  },
  { id: 'kid', label: 'Eustass Kid', desc: 'Kapten Magnetik dengan lengan mekanik', accent: '#dc2626' },
  { id: 'shanks', label: 'Shanks', desc: 'Yonko Rambut Merah & pedang Gryphon', accent: '#b91c1c' },
  { id: 'mihawk', label: 'Dracule Mihawk', desc: 'Pendekar pedang terhebat & pedang Yoru', accent: '#ca8a04' },
  { id: 'boa_hancock', label: 'Boa Hancock', desc: 'Ratu Bajak Laut Kuja & Mero-Mero', accent: '#db2777' },
];

export const JJK_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'gojo',
    label: 'Gojo Satoru',
    desc: 'Penyihir Terkuat pemegang Limitless & Six Eyes',
    accent: '#38bdf8',
    forms: [
      { id: 'blindfold', label: 'Penutup Mata Hitam' },
      { id: 'six_eyes', label: 'Six Eyes / Hollow Purple' },
      { id: 'shinjuku', label: 'Mode Shinjuku' },
    ],
  },
  {
    id: 'sukuna',
    label: 'Ryomen Sukuna',
    desc: 'Raja Kutukan Era Heian',
    accent: '#dc2626',
    forms: [
      { id: 'yuji', label: 'Wujud Yuji 4 Mata' },
      { id: 'meguna', label: 'Meguna' },
      { id: 'heian', label: 'Heian True Form 4 Lengan' },
    ],
  },
  {
    id: 'yuji',
    label: 'Yuji Itadori',
    desc: 'Wadah Sukuna ahli Black Flash',
    accent: '#f43f5e',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'black_flash', label: 'Black Flash / Awakening' },
    ],
  },
  {
    id: 'megumi',
    label: 'Megumi Fushiguro',
    desc: 'Pewaris Ten Shadows & Mahoraga',
    accent: '#1e293b',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'mahoraga', label: 'Mahoraga Ritual' },
    ],
  },
  { id: 'nobara', label: 'Nobara Kugisaki', desc: 'Palu kutukan & boneka jerami', accent: '#b45309' },
  {
    id: 'yuta',
    label: 'Yuta Okkotsu',
    desc: 'Penyihir Kelas Khusus bersama Rika',
    accent: '#f8fafc',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'rika', label: 'Rika Manifestation' },
    ],
  },
  {
    id: 'maki',
    label: 'Maki Zenin',
    desc: 'Pembebasan Surgawi penuh energi fisik',
    accent: '#15803d',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'heavenly', label: 'Heavenly Restriction' },
    ],
  },
  {
    id: 'toji',
    label: 'Toji Fushiguro',
    desc: 'Pembunuh Penyihir & Tombak Terbalik Surga',
    accent: '#09090b',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'isoh', label: 'Inverted Spear of Heaven' },
    ],
  },
  { id: 'nanami', label: 'Kento Nanami', desc: 'Jas krem rapi, kacamata & rasio 7:3', accent: '#d97706' },
  {
    id: 'hakari',
    label: 'Kinji Hakari',
    desc: 'Domain Idle Death Gamble tak terkalahkan',
    accent: '#22c55e',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'jackpot', label: 'Jackpot Fever Aura' },
    ],
  },
  {
    id: 'kashimo',
    label: 'Hajime Kashimo',
    desc: 'Dewa Petir era kuno & Mythical Beast Amber',
    accent: '#22d3ee',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'mba', label: 'Mythical Beast Amber' },
    ],
  },
  { id: 'higuruma', label: 'Hiromi Higuruma', desc: 'Pengacara berjas & palu eksekutor', accent: '#64748b' },
  { id: 'choso', label: 'Choso', desc: 'Manipulasi Darah & tanda melintang hidung', accent: '#991b1b' },
  { id: 'geto', label: 'Suguru Geto', desc: 'Jubah biksu & Manipulasi Roh Kutukan', accent: '#eab308' },
  { id: 'kenjaku', label: 'Kenjaku', desc: 'Bekas jahitan dahi & ribuan kutukan', accent: '#7c3aed' },
  {
    id: 'mahito',
    label: 'Mahito',
    desc: 'Roh kutukan Idle Transfiguration',
    accent: '#6366f1',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'isbodk', label: 'Instant Spirit Body' },
    ],
  },
  { id: 'jogo', label: 'Jogo', desc: 'Kutukan gunung berapi & satu mata', accent: '#f97316' },
  { id: 'hanami', label: 'Hanami', desc: 'Kutukan hutan & ranting di kepala', accent: '#16a34a' },
  { id: 'inumaki', label: 'Toge Inumaki', desc: 'Kerah tinggi & segel Cursed Speech', accent: '#a855f7' },
  { id: 'todo', label: 'Aoi Todo', desc: 'Boogie Woogie & otot raksasa Kyoto', accent: '#dc2626' },
];

export const AOT_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'eren',
    label: 'Eren Yeager',
    desc: 'Prajurit Pembebasan & Founding Titan',
    accent: '#16a34a',
    forms: [
      { id: 'survey', label: 'Survey Corps' },
      { id: 'attack', label: 'Attack Titan' },
      { id: 'founding', label: 'Founding Titan' },
    ],
  },
  {
    id: 'mikasa',
    label: 'Mikasa Ackerman',
    desc: 'Petarung terhebat & syal merah ikonik',
    accent: '#dc2626',
    forms: [
      { id: 'survey', label: 'Survey Corps' },
      { id: 'scarf', label: 'Final Season Scarf' },
    ],
  },
  {
    id: 'armin',
    label: 'Armin Arlert',
    desc: 'Ahli strategi & pewaris Colossal Titan',
    accent: '#facc15',
    forms: [
      { id: 'survey', label: 'Survey Corps' },
      { id: 'colossal', label: 'Colossal Titan' },
    ],
  },
  {
    id: 'levi',
    label: 'Levi Ackerman',
    desc: 'Kapten terkuat umat manusia',
    accent: '#0f766e',
    forms: [
      { id: 'survey', label: 'Survey Corps' },
      { id: 'bandaged', label: 'Bandaged Captain' },
    ],
  },
  { id: 'erwin', label: 'Erwin Smith', desc: 'Komandan Survey Corps (Shinzou wo Sasageyo)', accent: '#eab308' },
  { id: 'hange', label: 'Hange Zoe', desc: 'Komandan peneliti Titan berkacamata', accent: '#92400e' },
  {
    id: 'reiner',
    label: 'Reiner Braun',
    desc: 'Prajurit Marley & Armored Titan',
    accent: '#d97706',
    forms: [
      { id: 'warrior', label: 'Warrior' },
      { id: 'armored', label: 'Armored Titan' },
    ],
  },
  {
    id: 'bertholdt',
    label: 'Bertholdt Hoover',
    desc: 'Colossal Titan penghancur tembok',
    accent: '#ef4444',
    forms: [
      { id: 'warrior', label: 'Warrior' },
      { id: 'colossal', label: 'Colossal Titan' },
    ],
  },
  {
    id: 'annie',
    label: 'Annie Leonhart',
    desc: 'Prajurit ahli bela diri & Female Titan',
    accent: '#38bdf8',
    forms: [
      { id: 'warrior', label: 'Warrior' },
      { id: 'female', label: 'Female Titan' },
    ],
  },
  {
    id: 'zeke',
    label: 'Zeke Yeager',
    desc: 'Pemimpin prajurit & Beast Titan',
    accent: '#78350f',
    forms: [
      { id: 'warrior', label: 'Warrior' },
      { id: 'beast', label: 'Beast Titan' },
    ],
  },
  {
    id: 'pieck',
    label: 'Pieck Finger',
    desc: 'Unit penyangga Marley & Cart Titan',
    accent: '#64748b',
    forms: [
      { id: 'warrior', label: 'Warrior' },
      { id: 'cart', label: 'Cart Titan' },
    ],
  },
  {
    id: 'porco',
    label: 'Porco Galliard',
    desc: 'Prajurit pemberani & Jaw Titan',
    accent: '#f59e0b',
    forms: [
      { id: 'warrior', label: 'Warrior' },
      { id: 'jaw', label: 'Jaw Titan' },
    ],
  },
  {
    id: 'lara_tybur',
    label: 'Lara Tybur',
    desc: 'Keluarga Tybur & War Hammer Titan',
    accent: '#e2e8f0',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'warhammer', label: 'War Hammer Titan' },
    ],
  },
  { id: 'jean', label: 'Jean Kirstein', desc: 'Komandan lapangan Survey Corps', accent: '#a16207' },
  { id: 'connie', label: 'Connie Springer', desc: 'Anggota pasukan elit ke-104', accent: '#475569' },
  { id: 'sasha', label: 'Sasha Braus', desc: 'Penembak jitu pemburu sejati', accent: '#b45309' },
  { id: 'historia', label: 'Historia Reiss', desc: 'Ratu Tembok berambut pirang emas', accent: '#facc15' },
  { id: 'ymir_aot', label: 'Ymir', desc: 'Pelindung Historia & pengguna Jaw awal', accent: '#57534e' },
  { id: 'kenny', label: 'Kenny Ackerman', desc: 'Topi koboi hitam & senjata Anti-Personel', accent: '#1e293b' },
  {
    id: 'falco',
    label: 'Falco Grice',
    desc: 'Penerus Jaw-Falcon Titan bersayap',
    accent: '#38bdf8',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'jaw_falcon', label: 'Jaw-Falcon Titan' },
    ],
  },
];

export const NARUTO_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'naruto',
    label: 'Naruto Uzumaki',
    desc: 'Hokage Ketujuh Jinchuriki Kurama',
    accent: '#f97316',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'sage', label: 'Sage Mode' },
      { id: 'kcm', label: 'KCM' },
      { id: 'baryon', label: 'Baryon Mode' },
    ],
  },
  {
    id: 'sasuke',
    label: 'Sasuke Uchiha',
    desc: 'Bayangan Hokage pemilik Sharingan/Rinnegan',
    accent: '#6366f1',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'rinnegan', label: 'Sharingan/Rinnegan' },
      { id: 'curse_mark', label: 'Curse Mark' },
    ],
  },
  {
    id: 'boruto',
    label: 'Boruto Uzumaki',
    desc: 'Shinobi generasi baru pemegang segel Karma',
    accent: '#3b82f6',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'karma', label: 'Karma' },
    ],
  },
  {
    id: 'kakashi',
    label: 'Kakashi Hatake',
    desc: 'Hokage Keenam & Double Mangekyou',
    accent: '#64748b',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'dms', label: 'Double Mangekyou' },
    ],
  },
  { id: 'itachi', label: 'Itachi Uchiha', desc: 'Jubah Akatsuki & tatapan Mangekyou', accent: '#dc2626' },
  {
    id: 'madara',
    label: 'Madara Uchiha',
    desc: 'Legenda Uchiha & Six Paths',
    accent: '#991b1b',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'six_paths', label: 'Six Paths' },
    ],
  },
  {
    id: 'obito',
    label: 'Obito Uchiha',
    desc: 'Pemakai topeng Tobi hingga Jinchuriki Juubi',
    accent: '#ea580c',
    forms: [
      { id: 'tobi', label: 'Tobi' },
      { id: 'juubi', label: 'Juubi' },
    ],
  },
  {
    id: 'minato',
    label: 'Minato Namikaze',
    desc: 'Kilat Kuning Konoha Hokage Keempat',
    accent: '#facc15',
    forms: [
      { id: 'hokage', label: 'Hokage' },
      { id: 'kcm', label: 'KCM' },
    ],
  },
  { id: 'sakura', label: 'Sakura Haruno', desc: 'Kunoichi medis & segel Byakugo', accent: '#ec4899' },
  { id: 'hinata', label: 'Hinata Hyuga', desc: 'Pewaris Byakugan & Putri Byakugan', accent: '#a855f7' },
  { id: 'shikamaru', label: 'Shikamaru Nara', desc: 'Ahli strategi Konoha pengendali bayangan', accent: '#15803d' },
  {
    id: 'rock_lee',
    label: 'Rock Lee',
    desc: 'Ahli Taijutsu pembuka Delapan Gerbang',
    accent: '#22c55e',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'eight_gates', label: 'Eight Gates' },
    ],
  },
  { id: 'gaara', label: 'Gaara', desc: 'Kazekage Kelima pengendali pasir', accent: '#b91c1c' },
  {
    id: 'jiraiya',
    label: 'Jiraiya',
    desc: 'Pertapa Katak Sannin & Mode Petapa',
    accent: '#dc2626',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'sage', label: 'Sage Mode' },
    ],
  },
  { id: 'tsunade', label: 'Tsunade Senju', desc: 'Hokage Kelima haori hijau & Byakugo', accent: '#16a34a' },
  { id: 'orochimaru', label: 'Orochimaru', desc: 'Sannin Ular berambut hitam panjang', accent: '#7e22ce' },
  { id: 'pain', label: 'Pain (Nagato)', desc: 'Pemimpin Akatsuki & enam jalan Rinnegan', accent: '#c084fc' },
  { id: 'killer_bee', label: 'Killer Bee', desc: 'Jinchuriki Gyuki & 7 pedang Kumogakure', accent: '#eab308' },
  {
    id: 'kawaki',
    label: 'Kawaki',
    desc: 'Wadah Isshiki dengan kekuatan Karma',
    accent: '#ef4444',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'karma', label: 'Karma' },
    ],
  },
  {
    id: 'mitsuki',
    label: 'Mitsuki',
    desc: 'Putra Orochimaru dengan Sage Mode naga',
    accent: '#38bdf8',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'sage', label: 'Sage Mode' },
    ],
  },
];

export const BLEACH_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'ichigo',
    label: 'Ichigo Kurosaki',
    desc: 'Shinigami Pengganti & Horn of Salvation',
    accent: '#f97316',
    forms: [
      { id: 'shikai', label: 'Shikai' },
      { id: 'bankai', label: 'Bankai' },
      { id: 'hos', label: 'Horn of Salvation' },
    ],
  },
  {
    id: 'rukia',
    label: 'Rukia Kuchiki',
    desc: 'Kapten Divisi 13 & Bankai Hakka no Togame',
    accent: '#bae6fd',
    forms: [
      { id: 'shikai', label: 'Shikai' },
      { id: 'bankai', label: 'Bankai' },
    ],
  },
  { id: 'renji', label: 'Renji Abarai', desc: 'Letnan Divisi 6 rambut merah & Zabimaru', accent: '#dc2626' },
  {
    id: 'uryu',
    label: 'Uryu Ishida',
    desc: 'Quincy Sternritter A & Vollstandig',
    accent: '#38bdf8',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'vollstandig', label: 'Vollstandig' },
    ],
  },
  { id: 'orihime', label: 'Orihime Inoue', desc: 'Rambut jingga panjang & jepit Shun Shun Rikka', accent: '#fb923c' },
  { id: 'chad', label: 'Yasutora Sado (Chad)', desc: 'Lengan Kanan Raksasa & Lengan Kiri Iblis', accent: '#78350f' },
  { id: 'byakuya', label: 'Byakuya Kuchiki', desc: 'Kapten Divisi 6, Kenseikan & Senbonzakura', accent: '#f472b6' },
  {
    id: 'toshiro',
    label: 'Toshiro Hitsugaya',
    desc: 'Kapten Divisi 10 & Daiguren Hyorinmaru',
    accent: '#38bdf8',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'adult', label: 'Adult Form' },
    ],
  },
  {
    id: 'kenpachi',
    label: 'Kenpachi Zaraki',
    desc: 'Kapten Divisi 11 terkuat & Bankai iblis',
    accent: '#eab308',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'bankai', label: 'Bankai' },
    ],
  },
  { id: 'shunsui', label: 'Shunsui Kyoraku', desc: 'Komandan Kapten baru berhaori pink bunga', accent: '#ec4899' },
  { id: 'urahara', label: 'Kisuke Urahara', desc: 'Topi garis hijau-putih & haori gelap', accent: '#16a34a' },
  {
    id: 'yoruichi',
    label: 'Yoruichi Shihouin',
    desc: 'Dewi Kilat Shunko Raiju Senkei',
    accent: '#a855f7',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'thundergod', label: 'Thundergod' },
    ],
  },
  {
    id: 'aizen',
    label: 'Sosuke Aizen',
    desc: 'Mantan Kapten & evolusi Hogyoku Muken',
    accent: '#9333ea',
    forms: [
      { id: 'captain', label: 'Captain' },
      { id: 'hogyoku', label: 'Hogyoku' },
    ],
  },
  {
    id: 'ulquiorra',
    label: 'Ulquiorra Cifer',
    desc: 'Espada 4 & Segunda Etapa',
    accent: '#10b981',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'segunda', label: 'Segunda Etapa' },
    ],
  },
  { id: 'grimmjow', label: 'Grimmjow Jaegerjaquez', desc: 'Espada 6 rambut biru & topeng rahang', accent: '#0ea5e9' },
  {
    id: 'yhwach',
    label: 'Yhwach',
    desc: 'Raja Quincy & kekuatan The Almighty',
    accent: '#dc2626',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'almighty', label: 'The Almighty' },
    ],
  },
  { id: 'jugram', label: 'Jugram Haschwalth', desc: 'Grandmaster Sternritter berambut pirang panjang', accent: '#facc15' },
  { id: 'bambietta', label: 'Bambietta Basterbine', desc: 'Sternritter E The Explode', accent: '#ef4444' },
  {
    id: 'yamamoto',
    label: 'Genryusai Yamamoto',
    desc: 'Komandan Gotei 13 & Zanka no Tachi',
    accent: '#ea580c',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'zanka', label: 'Zanka no Tachi' },
    ],
  },
  { id: 'unohana', label: 'Retsu Unohana', desc: 'Kenpachi Pertama pemilik Minazuki', accent: '#991b1b' },
];

export const DRAGON_BALL_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'goku',
    label: 'Son Goku',
    desc: 'Ksatria Saiyan dengan 4 tingkatan wujud',
    accent: '#f97316',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'ssj', label: 'SSJ' },
      { id: 'ssj_blue', label: 'SSJ Blue' },
      { id: 'ui', label: 'Ultra Instinct' },
    ],
  },
  {
    id: 'vegeta',
    label: 'Vegeta',
    desc: 'Pangeran Saiyan dengan wujud Ultra Ego',
    accent: '#2563eb',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'ssj', label: 'SSJ' },
      { id: 'ssj_blue', label: 'SSJ Blue' },
      { id: 'ultra_ego', label: 'Ultra Ego' },
    ],
  },
  {
    id: 'gohan',
    label: 'Son Gohan',
    desc: 'Putra Goku dengan wujud Gohan Beast',
    accent: '#9333ea',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'ultimate', label: 'Ultimate' },
      { id: 'beast', label: 'Beast' },
    ],
  },
  {
    id: 'piccolo',
    label: 'Piccolo',
    desc: 'Petarung Namekian & wujud Orange Piccolo',
    accent: '#22c55e',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'orange', label: 'Orange Piccolo' },
    ],
  },
  { id: 'trunks', label: 'Future Trunks', desc: 'Jaket Capsule Corp & pedang di punggung', accent: '#c084fc' },
  {
    id: 'frieza',
    label: 'Frieza',
    desc: 'Kaisar Alam Semesta hingga Black Frieza',
    accent: '#a855f7',
    forms: [
      { id: 'final', label: 'Final Form' },
      { id: 'golden', label: 'Golden Frieza' },
      { id: 'black', label: 'Black Frieza' },
    ],
  },
  { id: 'cell', label: 'Perfect Cell', desc: 'Bio-Android sempurna hijau berbintik', accent: '#16a34a' },
  { id: 'majin_buu', label: 'Majin Buu', desc: 'Iblis merah muda bertanda M di sabuk', accent: '#f472b6' },
  {
    id: 'broly',
    label: 'Broly',
    desc: 'Legendary Super Saiyan kekuatan tak terbatas',
    accent: '#22c55e',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'lssj', label: 'LSSJ' },
    ],
  },
  {
    id: 'gogeta',
    label: 'Gogeta',
    desc: 'Fusi Metamoran Goku & Vegeta',
    accent: '#38bdf8',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'ssj_blue', label: 'SSJ Blue' },
    ],
  },
  {
    id: 'vegito',
    label: 'Vegito',
    desc: 'Fusi Potara Goku & Vegeta',
    accent: '#2563eb',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'ssj_blue', label: 'SSJ Blue' },
    ],
  },
  { id: 'beerus', label: 'Beerus', desc: 'Dewa Kehancuran Semesta 7 & ekor panjang', accent: '#a855f7' },
  { id: 'whis', label: 'Whis', desc: 'Malaikat Pembimbing dengan halo & tongkat', accent: '#38bdf8' },
  { id: 'zeno', label: 'Zeno', desc: 'Raja Segala Alam dengan tubuh chibi', accent: '#facc15' },
  { id: 'krillin', label: 'Krillin', desc: 'Petarung bumi gi oranye & titik dahi', accent: '#f97316' },
  { id: 'android_17', label: 'Android 17', desc: 'Syal oranye & seragam Ranger Hutan', accent: '#10b981' },
  { id: 'android_18', label: 'Android 18', desc: 'Rambut pirang sebahu & jaket denim biru', accent: '#3b82f6' },
  { id: 'tien', label: 'Tien Shinhan', desc: 'Mata ketiga di dahi & gi hijau', accent: '#15803d' },
  { id: 'bardock', label: 'Bardock', desc: 'Ayah Goku dengan ikat kepala merah berdarah', accent: '#dc2626' },
  {
    id: 'jiren',
    label: 'Jiren',
    desc: 'Pride Troopers terkuat Semesta 11',
    accent: '#ef4444',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'full_power', label: 'Full Power' },
    ],
  },
];

export const HXH_CATALOG: ReadonlyArray<CharacterCatalogEntry> = [
  {
    id: 'gon',
    label: 'Gon Freecss',
    desc: 'Pemburu muda berambut spiky & Adult Gon',
    accent: '#16a34a',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'adult', label: 'Adult Gon' },
    ],
  },
  {
    id: 'killua',
    label: 'Killua Zoldyck',
    desc: 'Pembunuh kilat dengan mode Godspeed',
    accent: '#38bdf8',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'godspeed', label: 'Godspeed' },
    ],
  },
  {
    id: 'kurapika',
    label: 'Kurapika',
    desc: 'Pemburu suku Kurta & Rantai Nen',
    accent: '#eab308',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'scarlet_eyes', label: 'Scarlet Eyes' },
    ],
  },
  { id: 'leorio', label: 'Leorio Paradinight', desc: 'Jas biru rapi & kacamata hitam bundar', accent: '#475569' },
  { id: 'hisoka', label: 'Hisoka Morow', desc: 'Bintang & air mata pipi + kartu remi', accent: '#ec4899' },
  { id: 'chrollo', label: 'Chrollo Lucilfer', desc: 'Pemimpin Phantom Troupe jubah bulu & salib', accent: '#7e22ce' },
  {
    id: 'meruem',
    label: 'Meruem',
    desc: 'Raja Semut Chimera & Post-Rose aura emas',
    accent: '#10b981',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'post_rose', label: 'Post-Rose' },
    ],
  },
  { id: 'neferpitou', label: 'Neferpitou', desc: 'Pengawal Kerajaan telinga kucing & Terpsichora', accent: '#a855f7' },
  {
    id: 'netero',
    label: 'Isaac Netero',
    desc: 'Ketua Asosiasi Hunter & 100-Type Bodhisattva',
    accent: '#facc15',
    forms: [
      { id: 'base', label: 'Base' },
      { id: 'bodhisattva', label: 'Bodhisattva' },
    ],
  },
  { id: 'ging', label: 'Ging Freecss', desc: 'Hunter legendaris ayah Gon berpenutup kepala', accent: '#d97706' },
  { id: 'illumi', label: 'Illumi Zoldyck', desc: 'Kakak Killua berambut panjang & jarum Nen', accent: '#4f46e5' },
  { id: 'feitan', label: 'Feitan Portor', desc: 'Phantom Troupe syal tengkorak & pedang payung', accent: '#0f172a' },
  { id: 'shalnark', label: 'Shalnark', desc: 'Black Voice berambut pirang cerah', accent: '#facc15' },
  { id: 'machi', label: 'Machi Komacine', desc: 'Benang Nen merah muda & kimono ninja', accent: '#f472b6' },
  { id: 'nobunaga', label: 'Nobunaga Hazama', desc: 'Pendekar katana Phantom Troupe berambut ikat', accent: '#1e293b' },
  { id: 'uvogin', label: 'Uvogin', desc: 'Raksasa Big Bang Impact Phantom Troupe', accent: '#78350f' },
  { id: 'kite', label: 'Kite', desc: 'Rambut putih panjang, topi biru & sabit Crazy Slots', accent: '#2563eb' },
  {
    id: 'biscuit',
    label: 'Biscuit Krueger',
    desc: 'Guru Nen berpenampilan imut & True Form kekar',
    accent: '#ec4899',
    forms: [
      { id: 'petite', label: 'Petite' },
      { id: 'true_form', label: 'True Form' },
    ],
  },
  { id: 'morel', label: 'Morel Mackernasey', desc: 'Hunter Laut dalam berpipa raksasa & kacamata', accent: '#334155' },
  { id: 'zeno_zoldyck', label: 'Zeno Zoldyck', desc: 'Kakek Killua Dragon Dive berjanggut putih', accent: '#94a3b8' },
];

export const ALL_CHARACTER_CATALOGS: ReadonlyArray<CharacterCatalogEntry> = [
  ...HERO_CATALOG,
  ...GOD_CATALOG,
  ...ONE_PIECE_CATALOG,
  ...JJK_CATALOG,
  ...AOT_CATALOG,
  ...NARUTO_CATALOG,
  ...BLEACH_CATALOG,
  ...DRAGON_BALL_CATALOG,
  ...HXH_CATALOG,
];

const CATALOG_BY_ID = new Map<CharacterCostumeId, CharacterCatalogEntry>(
  ALL_CHARACTER_CATALOGS.map((entry) => [entry.id, entry]),
);

export function getCatalogEntry(id: CharacterCostumeId): CharacterCatalogEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

// =====================================================================
// LIGHTWEIGHT LAZY CHARACTER + MULTI-FORM SPEC REGISTRY
// =====================================================================

interface CharacterDefinition {
  base: CostumeStyleSpec;
  forms?: Record<string, Partial<CostumeStyleSpec>>;
}

const CHARACTER_DEFINITIONS: Partial<Record<CharacterCostumeId, CharacterDefinition>> = {
  // ---------------- HERO (20) ----------------
  doctor_doom: {
    base: {
      torso: '#64748b', accent: '#15803d', armUpper: '#64748b', armLower: '#94a3b8',
      hand: '#64748b', legUpper: '#64748b', legLower: '#475569', boot: '#1e293b',
      fullMask: 'doom_mask', headGear: 'doom_hood', capeColor: '#15803d', metalness: 0.85, roughness: 0.22,
      chestPattern: 'doom_armor', auraColor: '#22c55e',
    },
    forms: {
      god_emperor: {
        torso: '#f8fafc', accent: '#fbbf24', armUpper: '#f8fafc', armLower: '#cbd5e1',
        capeColor: '#f8fafc', headGear: 'doom_hood', auraColor: '#fde047',
      },
    },
  },
  scarlet_witch: {
    base: {
      torso: '#be123c', accent: '#9f1239', armUpper: '#be123c', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#881337',
      hairColor: '#92400e', hairMode: 'long', capeColor: '#9f1239', isFemale: true,
      weapon: 'chaos_orbs', auraColor: '#ef4444',
    },
    forms: {
      darkhold: {
        torso: '#7f1d1d', accent: '#ef4444', headGear: 'scarlet_tiara',
        capeColor: '#450a0a', auraColor: '#dc2626', backWings: 'none', irisColor: '#ef4444',
      },
    },
  },
  doctor_strange: {
    base: {
      torso: '#1d4ed8', accent: '#fbbf24', armUpper: '#1d4ed8', armLower: '#1e3a8a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#451a03',
      hairColor: '#1c1917', hairMode: 'side_part', coat: 'levitation_cloak', capeColor: '#dc2626',
      chestPattern: 'strange_amulet', weapon: 'magic_mandala', auraColor: '#f97316',
    },
    forms: {
      sinister: {
        torso: '#09090b', accent: '#a855f7', capeColor: '#3b0764', auraColor: '#c084fc', faceMark: 'third_eye',
      },
    },
  },
  ironman: {
    base: {
      torso: '#991b1b', accent: '#fbbf24', armUpper: '#991b1b', armLower: '#fbbf24',
      hand: '#991b1b', legUpper: '#991b1b', legLower: '#fbbf24', boot: '#991b1b',
      fullMask: 'ironman', metalness: 0.86, roughness: 0.22, auraColor: '#22d3ee',
    },
    forms: {
      hulkbuster: {
        torso: '#b91c1c', accent: '#f59e0b', scaleMult: 1.28, auraColor: '#38bdf8',
      },
    },
  },
  spiderman: {
    base: {
      torso: '#dc2626', accent: '#1d4ed8', armUpper: '#dc2626', armLower: '#1d4ed8',
      hand: '#dc2626', legUpper: '#1d4ed8', legLower: '#dc2626', boot: '#dc2626',
      fullMask: 'spiderman', metalness: 0.14, roughness: 0.42, chestPattern: 'spider_web',
    },
    forms: {
      iron_spider: {
        torso: '#991b1b', accent: '#fbbf24', armLower: '#fbbf24', backWings: 'iron_spider', metalness: 0.78,
      },
      symbiote: {
        torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
        hand: '#09090b', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b', auraColor: '#334155',
      },
    },
  },
  captain_america: {
    base: {
      torso: '#1d4ed8', accent: '#dc2626', armUpper: '#1d4ed8', armLower: '#f8fafc',
      hand: '#991b1b', legUpper: '#1e3a8a', legLower: '#1e3a8a', boot: '#7c2d12',
      weapon: 'shield', headGear: 'wing_helm', metalness: 0.28,
    },
    forms: {
      worthy: {
        weapon: 'mjolnir', auraColor: '#38bdf8',
      },
    },
  },
  thor: {
    base: {
      torso: '#1e293b', accent: '#cbd5e1', armUpper: '#334155', armLower: '#94a3b8',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#1e293b', boot: '#451a03',
      capeColor: '#dc2626', hairColor: '#facc15', hairMode: 'long', weapon: 'stormbreaker',
      headGear: 'wing_helm', auraColor: '#38bdf8', metalness: 0.65,
    },
    forms: {
      rune_king: {
        torso: '#0f172a', accent: '#fbbf24', capeColor: '#1d4ed8', auraColor: '#fde047', defaultEye: 'ssj',
      },
    },
  },
  hulk: {
    base: {
      torso: '#16a34a', accent: '#7e22ce', armUpper: '#16a34a', armLower: '#15803d',
      hand: '#16a34a', legUpper: '#6b21a8', legLower: '#16a34a', boot: '#15803d',
      skin: '#22c55e', hairColor: '#09090b', hairMode: 'spiky', scaleMult: 1.24, defaultExpression: 'angry',
    },
    forms: {
      professor: {
        torso: '#1e293b', accent: '#a855f7', armUpper: '#1e293b', scaleMult: 1.18, defaultExpression: 'cool',
      },
    },
  },
  black_panther: {
    base: {
      torso: '#09090b', accent: '#a855f7', armUpper: '#09090b', armLower: '#1e1b4b',
      hand: '#09090b', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      fullMask: 'black_panther', metalness: 0.55, auraColor: '#a855f7',
    },
  },
  wolverine: {
    base: {
      torso: '#facc15', accent: '#1d4ed8', armUpper: '#f1c27d', armLower: '#1d4ed8',
      hand: '#facc15', legUpper: '#facc15', legLower: '#1d4ed8', boot: '#1d4ed8',
      fullMask: 'wolverine_cowl', wolverineClaws: true,
    },
  },
  deadpool: {
    base: {
      torso: '#dc2626', accent: '#09090b', armUpper: '#dc2626', armLower: '#09090b',
      hand: '#09090b', legUpper: '#dc2626', legLower: '#09090b', boot: '#09090b',
      fullMask: 'deadpool', weapon: 'dual_swords',
    },
  },
  batman: {
    base: {
      torso: '#1e293b', accent: '#facc15', armUpper: '#1e293b', armLower: '#0f172a',
      hand: '#0f172a', legUpper: '#1e293b', legLower: '#0f172a', boot: '#09090b',
      capeColor: '#0f172a', fullMask: 'batman', metalness: 0.35,
    },
    forms: {
      hellbat: {
        torso: '#09090b', accent: '#dc2626', backWings: 'demon_dark', auraColor: '#ef4444', metalness: 0.85,
      },
    },
  },
  superman: {
    base: {
      torso: '#1d4ed8', accent: '#dc2626', armUpper: '#1d4ed8', armLower: '#1d4ed8',
      hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#1d4ed8', boot: '#dc2626',
      capeColor: '#dc2626', hairColor: '#0f172a', hairMode: 'slick',
    },
  },
  wonder_woman: {
    base: {
      torso: '#b91c1c', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#cbd5e1',
      hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#f1c27d', boot: '#dc2626',
      hairColor: '#09090b', hairMode: 'long', headGear: 'crown_gold', weapon: 'shield', isFemale: true,
    },
  },
  flash: {
    base: {
      torso: '#dc2626', accent: '#facc15', armUpper: '#dc2626', armLower: '#dc2626',
      hand: '#dc2626', legUpper: '#dc2626', legLower: '#dc2626', boot: '#facc15',
      fullMask: 'flash', auraColor: '#facc15',
    },
  },
  aquaman: {
    base: {
      torso: '#ea580c', accent: '#fbbf24', armUpper: '#f59e0b', armLower: '#15803d',
      hand: '#f1c27d', legUpper: '#15803d', legLower: '#15803d', boot: '#fbbf24',
      hairColor: '#92400e', hairMode: 'long', weapon: 'trident', metalness: 0.55,
    },
  },
  green_lantern: {
    base: {
      torso: '#16a34a', accent: '#09090b', armUpper: '#16a34a', armLower: '#09090b',
      hand: '#f8fafc', legUpper: '#09090b', legLower: '#16a34a', boot: '#16a34a',
      hairColor: '#451a03', hairMode: 'short' as 'slick', auraColor: '#4ade80',
    },
  },
  moon_knight: {
    base: {
      torso: '#f8fafc', accent: '#cbd5e1', armUpper: '#f8fafc', armLower: '#e2e8f0',
      hand: '#f8fafc', legUpper: '#f8fafc', legLower: '#e2e8f0', boot: '#f8fafc',
      fullMask: 'moon_knight', capeColor: '#f8fafc', auraColor: '#e2e8f0',
    },
    forms: {
      mr_knight: {
        capeColor: undefined, torso: '#ffffff', accent: '#94a3b8',
      },
    },
  },
  ghost_rider: {
    base: {
      torso: '#09090b', accent: '#f97316', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f8fafc', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      fullMask: 'ghost_rider', weapon: 'kurta_chains', auraColor: '#f97316',
    },
  },
  venom: {
    base: {
      torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
      hand: '#09090b', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      fullMask: 'venom', scaleMult: 1.22, chestPattern: 'spider_web',
    },
  },

  // ---------------- DEWA MITOLOGI (20) ----------------
  buddha: {
    base: {
      torso: '#f59e0b', accent: '#fde047', armUpper: '#facc15', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#d97706', legLower: '#b45309', boot: '#92400e',
      hairColor: '#0f172a', hairMode: 'ushnisha', lotusHalo: true, auraColor: '#fde047',
      defaultExpression: 'cool',
    },
  },
  odin: {
    base: {
      torso: '#1e3a8a', accent: '#fbbf24', armUpper: '#1d4ed8', armLower: '#cbd5e1',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#1e293b', boot: '#451a03',
      hairColor: '#f8fafc', hairMode: 'long', whiteBeard: true, capeColor: '#1d4ed8',
      headGear: 'eyepatch_odin', weapon: 'gungnir', shoulderRavens: true, auraColor: '#fbbf24',
    },
  },
  zeus: {
    base: {
      torso: '#f8fafc', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#fbbf24',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#e2e8f0', boot: '#b45309',
      hairColor: '#f8fafc', hairMode: 'spiky', whiteBeard: true, capeColor: '#f8fafc',
      headGear: 'crown_gold', weapon: 'lightning_bolt', auraColor: '#fde047',
    },
  },
  poseidon: {
    base: {
      torso: '#0e7490', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#0891b2',
      hand: '#f1c27d', legUpper: '#0f766e', legLower: '#155e75', boot: '#b45309',
      hairColor: '#cbd5e1', hairMode: 'long', headGear: 'crown_gold', weapon: 'trident', auraColor: '#22d3ee',
    },
  },
  hades: {
    base: {
      torso: '#1e1b4b', accent: '#a855f7', armUpper: '#0f172a', armLower: '#4c1d95',
      hand: '#e2e8f0', legUpper: '#09090b', legLower: '#09090b', boot: '#1e1b4b',
      skin: '#e2e8f0', hairColor: '#09090b', hairMode: 'long', capeColor: '#09090b',
      headGear: 'crown_gold', weapon: 'bident', auraColor: '#9333ea',
    },
  },
  athena: {
    base: {
      torso: '#f8fafc', accent: '#f59e0b', armUpper: '#f1c27d', armLower: '#fbbf24',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f1c27d', boot: '#d97706',
      hairColor: '#451a03', hairMode: 'long', headGear: 'crown_gold', weapon: 'spear',
      capeColor: '#f8fafc', isFemale: true,
    },
  },
  anubis: {
    base: {
      torso: '#09090b', accent: '#fbbf24', armUpper: '#09090b', armLower: '#fbbf24',
      hand: '#09090b', legUpper: '#f8fafc', legLower: '#09090b', boot: '#fbbf24',
      skin: '#09090b', hairMode: 'bald', jackalHead: true, egyptCollar: true,
      weapon: 'ankh', auraColor: '#fbbf24',
    },
  },
  ra: {
    base: {
      torso: '#f8fafc', accent: '#f59e0b', armUpper: '#e2e8f0', armLower: '#fbbf24',
      hand: '#f1c27d', legUpper: '#f59e0b', legLower: '#f1c27d', boot: '#d97706',
      skin: '#d97706', hairMode: 'bald', falconHead: true, sunDisk: true, egyptCollar: true,
      weapon: 'ankh', auraColor: '#fde047',
    },
  },
  horus: {
    base: {
      torso: '#eab308', accent: '#0284c7', armUpper: '#eab308', armLower: '#0284c7',
      hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#eab308', boot: '#b45309',
      hairMode: 'bald', falconHead: true, egyptCollar: true, weapon: 'spear', auraColor: '#38bdf8',
    },
  },
  osiris: {
    base: {
      torso: '#10b981', accent: '#fbbf24', armUpper: '#f8fafc', armLower: '#10b981',
      hand: '#10b981', legUpper: '#f8fafc', legLower: '#e2e8f0', boot: '#fbbf24',
      skin: '#10b981', hairMode: 'bald', headGear: 'crown_gold', egyptCollar: true,
      weapon: 'ankh', auraColor: '#34d399',
    },
  },
  amaterasu: {
    base: {
      torso: '#f8fafc', accent: '#dc2626', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#dc2626', legLower: '#dc2626', boot: '#f8fafc',
      hairColor: '#09090b', hairMode: 'long', chestPattern: 'shinto_robe', isFemale: true,
      lotusHalo: true, auraColor: '#fb923c',
    },
  },
  susanoo: {
    base: {
      torso: '#1d4ed8', accent: '#38bdf8', armUpper: '#1e3a8a', armLower: '#0284c7',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#1e3a8a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'spiky', weapon: 'sword', auraColor: '#38bdf8',
    },
  },
  tsukuyomi: {
    base: {
      torso: '#312e81', accent: '#cbd5e1', armUpper: '#1e1b4b', armLower: '#312e81',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#0f172a',
      hairColor: '#e2e8f0', hairMode: 'long', capeColor: '#1e1b4b', auraColor: '#818cf8',
    },
  },
  sun_wukong: {
    base: {
      torso: '#dc2626', accent: '#fbbf24', armUpper: '#b91c1c', armLower: '#fbbf24',
      hand: '#e0ac69', legUpper: '#7f1d1d', legLower: '#fbbf24', boot: '#451a03',
      skin: '#e0ac69', hairColor: '#92400e', hairMode: 'spiky', headGear: 'wukong_band',
      tailType: 'monkey', tailColor: '#92400e', weapon: 'ruyi_staff', auraColor: '#fde047',
    },
  },
  nezha: {
    base: {
      torso: '#dc2626', accent: '#facc15', armUpper: '#dc2626', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#dc2626', boot: '#fbbf24',
      hairColor: '#09090b', hairMode: 'twin_tails', coat: 'gundala_scarf',
      fireWheels: true, weapon: 'spear', auraColor: '#f97316',
    },
  },
  erlang_shen: {
    base: {
      torso: '#0284c7', accent: '#cbd5e1', armUpper: '#0369a1', armLower: '#cbd5e1',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#cbd5e1', boot: '#1e293b',
      hairColor: '#09090b', hairMode: 'slick', faceMark: 'third_eye', weapon: 'three_point_spear',
      capeColor: '#f8fafc', auraColor: '#38bdf8',
    },
  },
  siwa: {
    base: {
      torso: '#f1f5f9', accent: '#f97316', armUpper: '#38bdf8', armLower: '#38bdf8',
      hand: '#38bdf8', legUpper: '#ea580c', legLower: '#38bdf8', boot: '#78350f',
      skin: '#60a5fa', hairColor: '#0f172a', hairMode: 'ponytail', faceMark: 'shiva_third_eye',
      weapon: 'trident', auraColor: '#67e8f9',
    },
  },
  wisnu: {
    base: {
      torso: '#1d4ed8', accent: '#fbbf24', armUpper: '#60a5fa', armLower: '#fbbf24',
      hand: '#60a5fa', legUpper: '#facc15', legLower: '#d97706', boot: '#fbbf24',
      skin: '#60a5fa', hairColor: '#0f172a', hairMode: 'slick', headGear: 'crown_gold',
      auraColor: '#fbbf24',
    },
  },
  ganesha: {
    base: {
      torso: '#f97316', accent: '#fbbf24', armUpper: '#fb923c', armLower: '#fb923c',
      hand: '#fb923c', legUpper: '#facc15', legLower: '#fb923c', boot: '#b45309',
      skin: '#fb923c', hairMode: 'bald', elephantHead: true, headGear: 'crown_gold',
      auraColor: '#fbbf24',
    },
  },
  quetzalcoatl: {
    base: {
      torso: '#16a34a', accent: '#fbbf24', armUpper: '#15803d', armLower: '#fbbf24',
      hand: '#e0ac69', legUpper: '#166534', legLower: '#fbbf24', boot: '#78350f',
      hairColor: '#059669', hairMode: 'long', quetzalCrown: true, auraColor: '#4ade80',
    },
  },

  // ---------------- ONE PIECE (25) ----------------
  luffy: {
    base: {
      torso: '#dc2626', accent: '#facc15', armUpper: '#dc2626', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#f1c27d', boot: '#b45309',
      hairColor: '#09090b', hairMode: 'spiky', headGear: 'straw_hat', luffyCord: true,
      faceMark: 'luffy_scar', chestPattern: 'open_vest', defaultExpression: 'laugh',
    },
    forms: {
      gear2: {
        skin: '#fca5a5', armLower: '#fca5a5', hand: '#fca5a5', legLower: '#fca5a5', auraColor: '#f87171',
      },
      gear3: {
        armLower: '#09090b', hand: '#09090b', giantHands: true, auraColor: '#991b1b',
      },
      gear4: {
        torso: '#991b1b', armUpper: '#09090b', armLower: '#09090b', hand: '#09090b',
        scaleMult: 1.24, haloColor: '#e2e8f0', auraColor: '#ef4444', chestPattern: 'haki_armor',
      },
      gear5: {
        torso: '#f8fafc', accent: '#a855f7', armUpper: '#f8fafc', armLower: '#f8fafc',
        hand: '#f8fafc', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#f8fafc',
        skin: '#f8fafc', hairColor: '#ffffff', hairEmissive: '#e2e8f0', headGear: undefined,
        haloColor: '#ffffff', auraColor: '#e9d5ff', defaultEye: 'nika',
      },
    },
  },
  loki: {
    base: {
      torso: '#4c1d95', accent: '#fbbf24', armUpper: '#3b0764', armLower: '#e2e8f0',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#451a03',
      hairColor: '#a855f7', hairMode: 'long', ramHorns: true, eyeBandage: true,
      coat: 'elbaph_fur', seaChains: true, scaleMult: 1.26, chestPattern: 'bandages',
      backLogoText: 'ELBAPH',
    },
    forms: {
      cursed: {
        eyeBandage: true, seaChains: true,
      },
      ragnir: {
        eyeBandage: false, seaChains: false, backProp: 'ragnir_back', weapon: 'ragnir_hammer',
        auraColor: '#a855f7', defaultEye: 'imu', defaultExpression: 'angry',
      },
      nidhogg: {
        torso: '#1e1b4b', accent: '#a855f7', armUpper: '#0f172a', armLower: '#3b0764',
        hand: '#09090b', legUpper: '#09090b', legLower: '#1e1b4b', boot: '#09090b',
        skin: '#312e81', hairColor: '#4c1d95', eyeBandage: false, ramHorns: false,
        dragonHorns: true, backWings: 'dragon_dark', tailType: 'dragon_dark', tailColor: '#3b0764',
        chestPattern: 'scales_dark', auraColor: '#c084fc', scaleMult: 1.3, defaultExpression: 'angry',
      },
    },
  },
  imu: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#09090b', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      skin: '#09090b', hairMode: 'bald', imuSilhouette: true, imuCrownTall: true,
      defaultEye: 'imu', auraColor: '#dc2626',
    },
    forms: {
      demon_silhouette: {
        imuSilhouette: true, imuCrownTall: true, capeColor: '#09090b',
      },
      devil_beast: {
        imuSilhouette: true, imuCrownTall: false, headGear: 'horns', backWings: 'demon_dark',
        tailType: 'arrow_demon', tailColor: '#09090b', scaleMult: 1.28, auraColor: '#ef4444',
      },
      demon_king: {
        imuSilhouette: false, skin: '#0f172a', torso: '#1e1b4b', accent: '#fbbf24',
        coat: 'royal_dark_gold', imuCrownTall: true, chestPattern: 'royal_gold',
        backWings: 'demon_dark', auraColor: '#dc2626', defaultEye: 'imu',
      },
    },
  },
  kaido: {
    base: {
      torso: '#d97706', accent: '#7e22ce', armUpper: '#c2410c', armLower: '#9a3412',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#09090b',
      hairColor: '#0f172a', hairMode: 'long', headGear: 'horns', coat: 'feather_cape',
      weapon: 'kanabo', scaleMult: 1.24, auraColor: '#a855f7', defaultExpression: 'angry',
    },
    forms: {
      hybrid: {
        torso: '#0284c7', armUpper: '#0284c7', skin: '#38bdf8', chestPattern: 'scales_azure',
        tailType: 'dragon_dark', tailColor: '#0284c7', auraColor: '#38bdf8',
      },
      dragon: {
        torso: '#ea580c', accent: '#facc15', skin: '#f97316', hairColor: '#facc15',
        chestPattern: 'scales_azure', tailType: 'dragon_dark', tailColor: '#0284c7',
        auraColor: '#f97316', scaleMult: 1.32,
      },
    },
  },
  garp: {
    base: {
      torso: '#1e293b', accent: '#fbbf24', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'short' as 'slick', coat: 'marine', faceMark: 'garp_scar',
      auraColor: '#ef4444', backLogoText: '正義',
    },
    forms: {
      prime: { hairColor: '#09090b', auraColor: '#ef4444' },
      elder: { hairColor: '#f8fafc', whiteBeard: true, defaultExpression: 'laugh' },
    },
  },
  sengoku: {
    base: {
      torso: '#f8fafc', accent: '#fbbf24', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'afro', whiteBeard: true, coat: 'marine',
      headGear: 'crown_gold', backLogoText: '正義',
    },
    forms: {
      daibutsu: {
        torso: '#fbbf24', accent: '#fde047', armUpper: '#fbbf24', armLower: '#fbbf24',
        hand: '#fbbf24', legUpper: '#fbbf24', legLower: '#fbbf24', boot: '#d97706',
        skin: '#fbbf24', hairColor: '#f59e0b', hairMode: 'ushnisha', scaleMult: 1.3,
        metalness: 0.78, auraColor: '#fde047',
      },
    },
  },
  shirohige: {
    base: {
      torso: '#f1c27d', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'long', coat: 'captain_white', weapon: 'spear',
      faceMark: 'shirohige_stache', scaleMult: 1.26, auraColor: '#e2e8f0', backLogoText: '白ひげ',
    },
    forms: {
      marineford: {
        hairMode: 'covered', headGear: 'towel_headband' as unknown as CostumeStyleSpec['headGear'],
        auraColor: '#38bdf8',
      },
    },
  },
  roger: {
    base: {
      torso: '#dc2626', accent: '#fbbf24', armUpper: '#dc2626', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#1e3a8a', legLower: '#1e3a8a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'long', headGear: 'ace_hat', weapon: 'sword',
      faceMark: 'roger_stache', capeColor: '#dc2626',
    },
    forms: {
      kamusari: {
        auraColor: '#dc2626', defaultExpression: 'laugh',
      },
    },
  },
  shiki: {
    base: {
      torso: '#d97706', accent: '#7f1d1d', armUpper: '#b45309', armLower: '#d97706',
      hand: '#f1c27d', legUpper: '#7f1d1d', legLower: '#7f1d1d', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'long', weapon: 'dual_swords', auraColor: '#fde047',
    },
    forms: {
      impel_down: {
        headGear: 'shiki_wheel', boot: '#cbd5e1',
      },
    },
  },
  zoro: {
    base: {
      torso: '#15803d', accent: '#dc2626', armUpper: '#166534', armLower: '#15803d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#22c55e', hairMode: 'spiky', weapon: 'katana_3', faceMark: 'zoro_scar',
    },
    forms: {
      ashura: {
        auraColor: '#22c55e', extraArms: true, defaultExpression: 'angry',
      },
    },
  },
  sanji: {
    base: {
      torso: '#0f172a', accent: '#eab308', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'slick', faceMark: 'sanji_brow',
    },
    forms: {
      ifrit: {
        boot: '#38bdf8', auraColor: '#38bdf8',
      },
    },
  },
  nami: {
    base: {
      torso: '#0ea5e9', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#f1c27d', boot: '#92400e',
      hairColor: '#f97316', hairMode: 'long', weapon: 'clima_tact', isFemale: true,
    },
    forms: {
      zeus: {
        auraColor: '#fde047',
      },
    },
  },
  usopp: {
    base: {
      torso: '#854d0e', accent: '#facc15', armUpper: '#854d0e', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#713f12', legLower: '#f1c27d', boot: '#451a03',
      hairColor: '#09090b', hairMode: 'curly', headGear: 'usopp_goggles', weapon: 'slingshot',
    },
  },
  chopper: {
    base: {
      torso: '#ec4899', accent: '#38bdf8', armUpper: '#92400e', armLower: '#92400e',
      hand: '#451a03', legUpper: '#92400e', legLower: '#92400e', boot: '#451a03',
      skin: '#b45309', hairColor: '#92400e', hairMode: 'short' as 'slick', headGear: 'chopper_hat',
      scaleMult: 0.78,
    },
    forms: {
      monster: {
        scaleMult: 1.3, headGear: 'horns', auraColor: '#ec4899', defaultExpression: 'angry',
      },
    },
  },
  nico_robin: {
    base: {
      torso: '#4c1d95', accent: '#f472b6', armUpper: '#4c1d95', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#f1c27d', boot: '#312e81',
      hairColor: '#0f172a', hairMode: 'parted', headGear: 'aokiji_glasses', isFemale: true,
      auraColor: '#f472b6',
    },
    forms: {
      demonio: {
        torso: '#7f1d1d', skin: '#991b1b', headGear: 'horns', backWings: 'demon_dark',
        auraColor: '#dc2626', extraArms: true,
      },
    },
  },
  franky: {
    base: {
      torso: '#dc2626', accent: '#38bdf8', armUpper: '#38bdf8', armLower: '#2563eb',
      hand: '#cbd5e1', legUpper: '#1e293b', legLower: '#f1c27d', boot: '#dc2626',
      hairColor: '#38bdf8', hairMode: 'slick', headGear: 'leorio_glasses', scaleMult: 1.24,
    },
  },
  brook: {
    base: {
      torso: '#0f172a', accent: '#fbbf24', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f8fafc', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      skin: '#f8fafc', hairColor: '#09090b', hairMode: 'afro', headGear: 'brook_crown',
      fullMask: 'skull_brook', weapon: 'sword',
    },
  },
  jinbe: {
    base: {
      torso: '#ea580c', accent: '#facc15', armUpper: '#ea580c', armLower: '#0284c7',
      hand: '#0284c7', legUpper: '#1e3a8a', legLower: '#0284c7', boot: '#78350f',
      skin: '#38bdf8', hairColor: '#09090b', hairMode: 'ponytail', scaleMult: 1.22,
      chestPattern: 'kimono', auraColor: '#0ea5e9',
    },
  },
  ace: {
    base: {
      torso: '#f1c27d', accent: '#f97316', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#1e293b',
      hairColor: '#09090b', hairMode: 'spiky', headGear: 'ace_hat', prayerBeads: true,
      weapon: 'fire_orb', auraColor: '#f97316', faceMark: 'ace_freckles', chestPattern: 'open_vest',
    },
  },
  sabo: {
    base: {
      torso: '#1e3a8a', accent: '#facc15', armUpper: '#1e3a8a', armLower: '#1e3a8a',
      hand: '#09090b', legUpper: '#0f172a', legLower: '#0f172a', boot: '#451a03',
      hairColor: '#facc15', hairMode: 'parted', headGear: 'sabo_hat', weapon: 'staff',
    },
    forms: {
      mera: { weapon: 'fire_orb', auraColor: '#f97316' },
    },
  },
  law: {
    base: {
      torso: '#facc15', accent: '#0f172a', armUpper: '#0f172a', armLower: '#facc15',
      hand: '#f1c27d', legUpper: '#1e3a8a', legLower: '#1e3a8a', boot: '#09090b',
      hairColor: '#0f172a', hairMode: 'spiky', headGear: 'trafalgar_hat', weapon: 'sword',
      faceMark: 'law_dark_eyes',
    },
    forms: {
      awakening: { auraColor: '#22d3ee' },
    },
  },
  kid: {
    base: {
      torso: '#7f1d1d', accent: '#f59e0b', armUpper: '#991b1b', armLower: '#64748b',
      hand: '#94a3b8', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#dc2626', hairMode: 'spiky', headGear: 'usopp_goggles', coat: 'feather_cape',
      metalness: 0.6, auraColor: '#ef4444',
    },
  },
  shanks: {
    base: {
      torso: '#f8fafc', accent: '#dc2626', armUpper: '#f8fafc', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#451a03', legLower: '#451a03', boot: '#1e293b',
      hairColor: '#b91c1c', hairMode: 'parted', capeColor: '#09090b', weapon: 'sword',
      missingLeftArm: true, auraColor: '#ef4444', faceMark: 'shanks_scar',
    },
  },
  mihawk: {
    base: {
      torso: '#7f1d1d', accent: '#fbbf24', armUpper: '#7f1d1d', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#1e293b',
      hairColor: '#09090b', hairMode: 'slick', headGear: 'mihawk_hat', weapon: 'yoru',
      defaultEye: 'mihawk',
    },
  },
  boa_hancock: {
    base: {
      torso: '#be123c', accent: '#fbbf24', armUpper: '#be123c', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#9f1239', legLower: '#f1c27d', boot: '#be123c',
      hairColor: '#09090b', hairMode: 'long', capeColor: '#f8fafc', snakeEarrings: true,
      auraColor: '#f472b6', isFemale: true,
    },
  },

  // ---------------- JUJUTSU KAISEN (20) ----------------
  gojo: {
    base: {
      torso: '#0f172a', accent: '#38bdf8', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#f8fafc', hairMode: 'spiky', eyeBandage: true, chestPattern: 'jjk_uniform',
    },
    forms: {
      six_eyes: {
        eyeBandage: false, defaultEye: 'six_eyes', auraColor: '#a855f7',
      },
      shinjuku: {
        eyeBandage: false, defaultEye: 'six_eyes', torso: '#f8fafc', armUpper: '#09090b',
        armLower: '#09090b', auraColor: '#38bdf8',
      },
    },
  },
  sukuna: {
    base: {
      torso: '#f8fafc', accent: '#dc2626', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#09090b', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#fb7185', hairMode: 'spiky', faceMark: 'sukuna_tattoos', defaultEye: 'sukuna',
      chestPattern: 'sukuna_marks', auraColor: '#ef4444', defaultExpression: 'angry',
    },
    forms: {
      meguna: {
        hairColor: '#0f172a', torso: '#0f172a', armUpper: '#0f172a', armLower: '#0f172a',
      },
      heian: {
        scaleMult: 1.24, extraArms: true, faceMark: 'sukuna_heian', auraColor: '#dc2626',
      },
    },
  },
  yuji: {
    base: {
      torso: '#0f172a', accent: '#ef4444', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#dc2626',
      hairColor: '#fb7185', hairMode: 'spiky', chestPattern: 'jjk_uniform',
    },
    forms: {
      black_flash: { auraColor: '#dc2626', hand: '#09090b' },
    },
  },
  megumi: {
    base: {
      torso: '#0f172a', accent: '#38bdf8', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'spiky', chestPattern: 'jjk_uniform',
    },
    forms: {
      mahoraga: { haloColor: '#fbbf24', auraColor: '#1e1b4b' },
    },
  },
  nobara: {
    base: {
      torso: '#0f172a', accent: '#d97706', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#f1c27d', boot: '#451a03',
      hairColor: '#b45309', hairMode: 'bob', weapon: 'nobara_hammer', isFemale: true, chestPattern: 'jjk_uniform',
    },
  },
  yuta: {
    base: {
      torso: '#f8fafc', accent: '#0f172a', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'parted', weapon: 'sword',
    },
    forms: {
      rika: { auraColor: '#9333ea', defaultEye: 'imu' },
    },
  },
  maki: {
    base: {
      torso: '#0f172a', accent: '#15803d', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#15803d', hairMode: 'ponytail', weapon: 'spear', isFemale: true,
    },
    forms: {
      heavenly: { hairMode: 'bob', auraColor: '#22c55e', weapon: 'sword' },
    },
  },
  toji: {
    base: {
      torso: '#09090b', accent: '#475569', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'parted', scaleMult: 1.12,
    },
    forms: {
      isoh: { weapon: 'dual_swords', auraColor: '#94a3b8' },
    },
  },
  nanami: {
    base: {
      torso: '#d6d3d1', accent: '#3b82f6', armUpper: '#d6d3d1', armLower: '#d6d3d1',
      hand: '#f1c27d', legUpper: '#a8a29e', legLower: '#a8a29e', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'side_part', headGear: 'aokiji_glasses', weapon: 'sword',
    },
  },
  hakari: {
    base: {
      torso: '#f8fafc', accent: '#22c55e', armUpper: '#f8fafc', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#7e22ce', hairMode: 'spiky',
    },
    forms: {
      jackpot: { auraColor: '#4ade80', hairColor: '#4ade80' },
    },
  },
  kashimo: {
    base: {
      torso: '#f8fafc', accent: '#22d3ee', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#22d3ee', hairMode: 'twin_tails', weapon: 'staff', auraColor: '#22d3ee',
    },
    forms: {
      mba: { skin: '#67e8f9', auraColor: '#a855f7', defaultEye: 'ssj' },
    },
  },
  higuruma: {
    base: {
      torso: '#1e293b', accent: '#f8fafc', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'parted', weapon: 'nobara_hammer',
    },
  },
  choso: {
    base: {
      torso: '#312e81', accent: '#991b1b', armUpper: '#312e81', armLower: '#312e81',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'twin_tails', auraColor: '#dc2626',
    },
  },
  geto: {
    base: {
      torso: '#eab308', accent: '#4c1d95', armUpper: '#eab308', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#f8fafc',
      hairColor: '#09090b', hairMode: 'long', auraColor: '#7c3aed',
    },
  },
  kenjaku: {
    base: {
      torso: '#eab308', accent: '#7c3aed', armUpper: '#eab308', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#f8fafc',
      hairColor: '#09090b', hairMode: 'long', faceMark: 'yamamoto_scar', auraColor: '#9333ea',
    },
  },
  mahito: {
    base: {
      torso: '#1e1b4b', accent: '#6366f1', armUpper: '#1e1b4b', armLower: '#1e1b4b',
      hand: '#e2e8f0', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#09090b',
      skin: '#e2e8f0', hairColor: '#94a3b8', hairMode: 'long',
    },
    forms: {
      isbodk: {
        torso: '#334155', skin: '#64748b', scaleMult: 1.18, auraColor: '#818cf8', chestPattern: 'armor_plates',
      },
    },
  },
  jogo: {
    base: {
      torso: '#78350f', accent: '#f97316', armUpper: '#78350f', armLower: '#451a03',
      hand: '#a8a29e', legUpper: '#451a03', legLower: '#451a03', boot: '#09090b',
      skin: '#a8a29e', hairMode: 'bald', fullMask: 'jogo_volcano', auraColor: '#f97316',
    },
  },
  hanami: {
    base: {
      torso: '#f8fafc', accent: '#16a34a', armUpper: '#e2e8f0', armLower: '#4d7c0f',
      hand: '#e2e8f0', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      skin: '#e2e8f0', hairMode: 'bald', headGear: 'horns', auraColor: '#22c55e',
    },
  },
  inumaki: {
    base: {
      torso: '#0f172a', accent: '#a855f7', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#e2e8f0', hairMode: 'bob', fullMask: 'kakashi',
    },
  },
  todo: {
    base: {
      torso: '#f1c27d', accent: '#0f172a', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'ponytail', scaleMult: 1.24, faceMark: 'zoro_scar',
    },
  },

  // ---------------- ATTACK ON TITAN (20) ----------------
  eren: {
    base: {
      torso: '#78350f', accent: '#15803d', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#451a03', hairMode: 'parted', coat: 'survey_cape', chestPattern: 'survey_corps',
      weapon: 'dual_swords', backLogoText: '自由',
    },
    forms: {
      attack: {
        torso: '#e0ac69', skin: '#e0ac69', armUpper: '#e0ac69', armLower: '#e0ac69',
        legUpper: '#e0ac69', legLower: '#e0ac69', boot: '#c68642', coat: undefined,
        weapon: undefined, scaleMult: 1.25, hairColor: '#09090b', hairMode: 'long',
        faceMark: 'titan_marks', defaultExpression: 'angry', auraColor: '#ef4444',
      },
      founding: {
        torso: '#e2e8f0', skin: '#cbd5e1', armUpper: '#cbd5e1', legUpper: '#cbd5e1',
        coat: undefined, weapon: undefined, scaleMult: 1.32, hairColor: '#09090b', hairMode: 'long',
        auraColor: '#fbbf24', defaultEye: 'imu',
      },
    },
  },
  mikasa: {
    base: {
      torso: '#78350f', accent: '#dc2626', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#09090b', hairMode: 'bob', coat: 'survey_cape', chestPattern: 'survey_corps',
      weapon: 'dual_swords', isFemale: true,
    },
    forms: {
      scarf: { torso: '#0f172a', coat: 'gundala_scarf', accent: '#dc2626' },
    },
  },
  armin: {
    base: {
      torso: '#78350f', accent: '#15803d', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#facc15', hairMode: 'bob', coat: 'survey_cape', chestPattern: 'survey_corps',
    },
    forms: {
      colossal: {
        torso: '#dc2626', skin: '#ef4444', fullMask: 'titan_colossal', scaleMult: 1.34,
        coat: undefined, auraColor: '#f97316', hairMode: 'bald',
      },
    },
  },
  levi: {
    base: {
      torso: '#78350f', accent: '#15803d', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#09090b', hairMode: 'parted', coat: 'survey_cape', chestPattern: 'survey_corps',
      weapon: 'dual_swords', defaultExpression: 'cool',
    },
    forms: {
      bandaged: { eyeBandage: true, faceMark: 'zoro_scar' },
    },
  },
  erwin: {
    base: {
      torso: '#78350f', accent: '#15803d', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#facc15', hairMode: 'side_part' as 'slick', coat: 'survey_cape',
      chestPattern: 'survey_corps', missingLeftArm: true,
    },
  },
  hange: {
    base: {
      torso: '#78350f', accent: '#15803d', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#451a03', hairMode: 'ponytail', coat: 'survey_cape', headGear: 'leorio_glasses',
    },
  },
  reiner: {
    base: {
      torso: '#78350f', accent: '#d97706', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#facc15', hairMode: 'spiky', chestPattern: 'survey_corps',
    },
    forms: {
      armored: {
        torso: '#d6d3d1', accent: '#dc2626', skin: '#dc2626', fullMask: 'titan_armored',
        scaleMult: 1.28, chestPattern: 'armor_plates', hairMode: 'spiky', hairColor: '#f8fafc',
      },
    },
  },
  bertholdt: {
    base: {
      torso: '#78350f', accent: '#ef4444', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#09090b', hairMode: 'parted',
    },
    forms: {
      colossal: {
        torso: '#dc2626', skin: '#ef4444', fullMask: 'titan_colossal', scaleMult: 1.34,
        auraColor: '#f97316', hairMode: 'bald',
      },
    },
  },
  annie: {
    base: {
      torso: '#f8fafc', accent: '#38bdf8', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#451a03', boot: '#451a03',
      hairColor: '#facc15', hairMode: 'bob', isFemale: true,
    },
    forms: {
      female: {
        torso: '#fca5a5', skin: '#f8fafc', scaleMult: 1.24, chestPattern: 'bandages', auraColor: '#38bdf8',
      },
    },
  },
  zeke: {
    base: {
      torso: '#78350f', accent: '#facc15', armUpper: '#78350f', armLower: '#78350f',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'parted', headGear: 'leorio_glasses',
    },
    forms: {
      beast: {
        torso: '#78350f', skin: '#78350f', armUpper: '#78350f', armLower: '#78350f',
        scaleMult: 1.3, hairColor: '#451a03', defaultExpression: 'angry',
      },
    },
  },
  pieck: {
    base: {
      torso: '#334155', accent: '#94a3b8', armUpper: '#334155', armLower: '#334155',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'long', isFemale: true,
    },
    forms: {
      cart: { torso: '#a8a29e', skin: '#d6d3d1', scaleMult: 1.15, hairMode: 'bald' },
    },
  },
  porco: {
    base: {
      torso: '#475569', accent: '#f59e0b', armUpper: '#475569', armLower: '#475569',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#d97706', hairMode: 'slick',
    },
    forms: {
      jaw: { torso: '#f8fafc', skin: '#d97706', scaleMult: 1.12, fullMask: 'grimmjow_jaw', hairColor: '#ea580c' },
    },
  },
  lara_tybur: {
    base: {
      torso: '#1e293b', accent: '#f8fafc', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'bob', isFemale: true,
    },
    forms: {
      warhammer: {
        torso: '#f8fafc', skin: '#f8fafc', fullMask: 'titan_warhammer', weapon: 'ragnir_hammer', scaleMult: 1.24,
      },
    },
  },
  jean: {
    base: {
      torso: '#78350f', accent: '#15803d', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#92400e', hairMode: 'slick', coat: 'survey_cape', chestPattern: 'survey_corps',
    },
  },
  connie: {
    base: {
      torso: '#78350f', accent: '#15803d', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#64748b', hairMode: 'short' as 'slick', coat: 'survey_cape', chestPattern: 'survey_corps',
    },
  },
  sasha: {
    base: {
      torso: '#78350f', accent: '#b45309', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#78350f', hairMode: 'ponytail', coat: 'survey_cape', isFemale: true, chestPattern: 'survey_corps',
    },
  },
  historia: {
    base: {
      torso: '#1d4ed8', accent: '#fbbf24', armUpper: '#1d4ed8', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#451a03',
      hairColor: '#facc15', hairMode: 'long', headGear: 'crown_gold', isFemale: true,
    },
  },
  ymir_aot: {
    base: {
      torso: '#78350f', accent: '#57534e', armUpper: '#78350f', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#451a03', boot: '#451a03',
      hairColor: '#451a03', hairMode: 'ponytail', coat: 'survey_cape', isFemale: true,
    },
  },
  kenny: {
    base: {
      torso: '#1e293b', accent: '#64748b', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'covered', headGear: 'mihawk_hat', coat: 'yhwach_cloak',
    },
  },
  falco: {
    base: {
      torso: '#334155', accent: '#38bdf8', armUpper: '#334155', armLower: '#334155',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'spiky',
    },
    forms: {
      jaw_falcon: {
        torso: '#e2e8f0', skin: '#cbd5e1', backWings: 'angel_white', auraColor: '#38bdf8',
      },
    },
  },

  // ---------------- NARUTO & BORUTO (20) ----------------
  naruto: {
    base: {
      torso: '#f97316', accent: '#0f172a', armUpper: '#f97316', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#f97316', legLower: '#f97316', boot: '#1e293b',
      hairColor: '#facc15', hairMode: 'spiky', headGear: 'leaf_band', weapon: 'rasengan',
      faceMark: 'naruto_whiskers', auraColor: '#38bdf8',
    },
    forms: {
      sage: { coat: 'hokage', defaultEye: 'sage', auraColor: '#f97316', backLogoText: '七代目' },
      kcm: {
        torso: '#facc15', accent: '#09090b', armUpper: '#facc15', armLower: '#facc15',
        skin: '#fde047', hairEmissive: '#fde047', coat: 'hokage', defaultEye: 'kyuubi', auraColor: '#fde047', backLogoText: '七代目',
      },
      baryon: {
        torso: '#ea580c', accent: '#dc2626', coat: 'jiraiya_haori', defaultEye: 'kyuubi', auraColor: '#ef4444',
      },
    },
  },
  sasuke: {
    base: {
      torso: '#e2e8f0', accent: '#7e22ce', armUpper: '#e2e8f0', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#0f172a', hairMode: 'spiky', weapon: 'sword', defaultEye: 'sharingan',
      auraColor: '#a855f7', backLogoText: 'うちは',
    },
    forms: {
      rinnegan: { defaultEye: 'rinnegan', capeColor: '#0f172a', auraColor: '#9333ea' },
      curse_mark: {
        skin: '#94a3b8', hairColor: '#1e1b4b', backWings: 'demon_dark', auraColor: '#7e22ce',
      },
    },
  },
  boruto: {
    base: {
      torso: '#0f172a', accent: '#ec4899', armUpper: '#0f172a', armLower: '#ec4899',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'spiky', headGear: 'leaf_band', faceMark: 'boruto_whiskers',
    },
    forms: {
      karma: { faceMark: 'karma_boruto', auraColor: '#38bdf8', defaultEye: 'byakugan' },
    },
  },
  kakashi: {
    base: {
      torso: '#15803d', accent: '#1e293b', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#1e293b', legUpper: '#1e293b', legLower: '#1e293b', boot: '#0f172a',
      hairColor: '#cbd5e1', hairMode: 'spiky', fullMask: 'kakashi', headGear: 'leaf_band',
    },
    forms: {
      dms: { defaultEye: 'mangekyou', auraColor: '#38bdf8' },
    },
  },
  itachi: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'ponytail', coat: 'akatsuki', faceMark: 'itachi_lines',
      defaultEye: 'mangekyou', auraColor: '#ef4444',
    },
  },
  madara: {
    base: {
      torso: '#7f1d1d', accent: '#0f172a', armUpper: '#7f1d1d', armLower: '#450a0a',
      hand: '#1e293b', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'long', weapon: 'gunbai', defaultEye: 'rinnegan', auraColor: '#dc2626',
    },
    forms: {
      six_paths: {
        torso: '#f8fafc', skin: '#e2e8f0', hairColor: '#f8fafc', coat: 'captain_white',
        haloColor: '#09090b', auraColor: '#fde047',
      },
    },
  },
  obito: {
    base: {
      torso: '#09090b', accent: '#f97316', armUpper: '#09090b', armLower: '#09090b',
      hand: '#1e293b', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'spiky', fullMask: 'obito_mask', coat: 'akatsuki',
      weapon: 'gunbai', auraColor: '#f97316',
    },
    forms: {
      juubi: {
        fullMask: undefined, torso: '#f8fafc', skin: '#e2e8f0', hairColor: '#f8fafc',
        defaultEye: 'rinnegan', auraColor: '#e2e8f0',
      },
    },
  },
  minato: {
    base: {
      torso: '#15803d', accent: '#f8fafc', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#0f172a',
      hairColor: '#facc15', hairMode: 'spiky', headGear: 'leaf_band', coat: 'hokage',
      auraColor: '#facc15', backLogoText: '四代目',
    },
    forms: {
      kcm: { torso: '#facc15', skin: '#fde047', auraColor: '#fde047' },
    },
  },
  sakura: {
    base: {
      torso: '#dc2626', accent: '#f8fafc', armUpper: '#dc2626', armLower: '#f1c27d',
      hand: '#1e293b', legUpper: '#be123c', legLower: '#f1c27d', boot: '#0f172a',
      hairColor: '#f472b6', hairMode: 'bob', headGear: 'leaf_band', faceMark: 'byakugou', isFemale: true,
    },
  },
  hinata: {
    base: {
      torso: '#a855f7', accent: '#f8fafc', armUpper: '#a855f7', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#09090b',
      hairColor: '#1e1b4b', hairMode: 'long', defaultEye: 'byakugan', isFemale: true, auraColor: '#c084fc',
    },
  },
  shikamaru: {
    base: {
      torso: '#15803d', accent: '#1e293b', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'ponytail', headGear: 'leaf_band',
    },
  },
  rock_lee: {
    base: {
      torso: '#16a34a', accent: '#f97316', armUpper: '#16a34a', armLower: '#f8fafc',
      hand: '#f8fafc', legUpper: '#16a34a', legLower: '#f97316', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'bob', headGear: 'leaf_band',
    },
    forms: {
      eight_gates: { skin: '#ef4444', auraColor: '#ef4444' },
    },
  },
  gaara: {
    base: {
      torso: '#7f1d1d', accent: '#d6d3d1', armUpper: '#7f1d1d', armLower: '#7f1d1d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#dc2626', hairMode: 'spiky', auraColor: '#d97706',
    },
  },
  jiraiya: {
    base: {
      torso: '#b91c1c', accent: '#fbbf24', armUpper: '#b91c1c', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#78350f',
      hairColor: '#f8fafc', hairMode: 'spiky', headGear: 'oil_band', coat: 'jiraiya_haori', weapon: 'rasengan',
    },
    forms: {
      sage: { defaultEye: 'sage', auraColor: '#f97316' },
    },
  },
  tsunade: {
    base: {
      torso: '#15803d', accent: '#94a3b8', armUpper: '#15803d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#f1c27d', boot: '#09090b',
      hairColor: '#fde047', hairMode: 'twin_tails', coat: 'tsunade_haori', faceMark: 'byakugou',
      auraColor: '#4ade80', isFemale: true,
    },
  },
  orochimaru: {
    base: {
      torso: '#e2e8f0', accent: '#7e22ce', armUpper: '#e2e8f0', armLower: '#e2e8f0',
      hand: '#f8fafc', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      skin: '#f8fafc', hairColor: '#09090b', hairMode: 'long', weapon: 'sword', auraColor: '#a855f7',
    },
  },
  pain: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#f97316', hairMode: 'spiky', coat: 'akatsuki', defaultEye: 'rinnegan', auraColor: '#c084fc',
    },
  },
  killer_bee: {
    base: {
      torso: '#f8fafc', accent: '#eab308', armUpper: '#e0ac69', armLower: '#e0ac69',
      hand: '#e0ac69', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      skin: '#c68642', hairColor: '#f8fafc', hairMode: 'spiky', headGear: 'leorio_glasses', weapon: 'katana_3',
    },
  },
  kawaki: {
    base: {
      torso: '#1e293b', accent: '#ef4444', armUpper: '#1e293b', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'undercut' as 'spiky', weapon: 'staff',
    },
    forms: {
      karma: { faceMark: 'karma_kawaki', auraColor: '#ef4444', defaultEye: 'imu' },
    },
  },
  mitsuki: {
    base: {
      torso: '#38bdf8', accent: '#1e3a8a', armUpper: '#38bdf8', armLower: '#38bdf8',
      hand: '#f8fafc', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      skin: '#f8fafc', hairColor: '#bae6fd', hairMode: 'parted',
    },
    forms: {
      sage: { headGear: 'horns', auraColor: '#22d3ee', defaultEye: 'sage' },
    },
  },

  // ---------------- BLEACH TYBW (20) ----------------
  ichigo: {
    base: {
      torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#f97316', hairMode: 'spiky', weapon: 'sword', auraColor: '#38bdf8', chestPattern: 'shihakusho',
    },
    forms: {
      bankai: { weapon: 'dual_swords', auraColor: '#dc2626', coat: 'yhwach_cloak' },
      hos: { headGear: 'broken_horn', auraColor: '#fbbf24', defaultEye: 'imu' },
    },
  },
  rukia: {
    base: {
      torso: '#09090b', accent: '#e0f2fe', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#0f172a', hairMode: 'bob', weapon: 'sode_shirayuki', auraColor: '#7dd3fc', isFemale: true,
    },
    forms: {
      bankai: { torso: '#f8fafc', armUpper: '#f8fafc', armLower: '#f8fafc', hairColor: '#f8fafc', auraColor: '#bae6fd' },
    },
  },
  renji: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#dc2626', hairMode: 'ponytail', weapon: 'sword',
    },
  },
  uryu: {
    base: {
      torso: '#f8fafc', accent: '#38bdf8', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#f8fafc',
      hairColor: '#1e293b', hairMode: 'parted', coat: 'sternritter',
    },
    forms: {
      vollstandig: { backWings: 'angel_white', auraColor: '#38bdf8' },
    },
  },
  orihime: {
    base: {
      torso: '#f8fafc', accent: '#fb923c', armUpper: '#f8fafc', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#1e3a8a', legLower: '#f1c27d', boot: '#451a03',
      hairColor: '#f97316', hairMode: 'long', isFemale: true, auraColor: '#fbbf24',
    },
  },
  chad: {
    base: {
      torso: '#0f172a', accent: '#dc2626', armUpper: '#f8fafc', armLower: '#09090b',
      hand: '#09090b', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      skin: '#c68642', hairColor: '#1c1917', hairMode: 'parted', scaleMult: 1.22,
    },
  },
  byakuya: {
    base: {
      torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#0f172a', hairMode: 'long', headGear: 'kenseikan', coat: 'captain_white',
      divisionNo: '六', weapon: 'sword', auraColor: '#f472b6',
    },
  },
  toshiro: {
    base: {
      torso: '#09090b', accent: '#22d3ee', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#f8fafc', hairMode: 'spiky', coat: 'captain_white', divisionNo: '十',
      headGear: 'ice_crown', weapon: 'sword', auraColor: '#67e8f9',
    },
    forms: {
      adult: { scaleMult: 1.12, hairMode: 'parted', backWings: 'angel_white' },
    },
  },
  kenpachi: {
    base: {
      torso: '#09090b', accent: '#f8fafc', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'spiky', coat: 'sleeveless_captain', divisionNo: '十一',
      weapon: 'sword', auraColor: '#facc15', faceMark: 'kenpachi_scar',
    },
    forms: {
      bankai: { skin: '#dc2626', auraColor: '#ef4444', defaultExpression: 'angry' },
    },
  },
  shunsui: {
    base: {
      torso: '#09090b', accent: '#ec4899', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#451a03', hairMode: 'long', coat: 'captain_white', divisionNo: '一', weapon: 'dual_swords',
    },
  },
  urahara: {
    base: {
      torso: '#166534', accent: '#f8fafc', armUpper: '#166534', armLower: '#166534',
      hand: '#f1c27d', legUpper: '#166534', legLower: '#166534', boot: '#78350f',
      hairColor: '#facc15', hairMode: 'covered', headGear: 'urahara_hat', weapon: 'sword',
    },
  },
  yoruichi: {
    base: {
      torso: '#f97316', accent: '#a855f7', armUpper: '#c68642', armLower: '#c68642',
      hand: '#c68642', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      skin: '#c68642', hairColor: '#7e22ce', hairMode: 'ponytail', isFemale: true,
    },
    forms: {
      thundergod: { auraColor: '#a855f7', defaultEye: 'ssj' },
    },
  },
  aizen: {
    base: {
      torso: '#0f172a', accent: '#9333ea', armUpper: '#0f172a', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#451a03', hairMode: 'slick', fullMask: 'aizen_eyepatch', auraColor: '#a855f7',
    },
    forms: {
      hogyoku: {
        torso: '#f8fafc', fullMask: undefined, coat: 'espada', backWings: 'butterflies', auraColor: '#c084fc',
      },
    },
  },
  ulquiorra: {
    base: {
      torso: '#f8fafc', accent: '#10b981', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f8fafc', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#09090b',
      skin: '#f1f5f9', hairColor: '#09090b', hairMode: 'spiky', headGear: 'broken_horn',
      coat: 'espada', faceMark: 'ulquiorra_tears', auraColor: '#10b981',
    },
    forms: {
      segunda: {
        torso: '#09090b', headGear: 'horns', backWings: 'demon_dark', tailType: 'arrow_demon',
        tailColor: '#09090b', auraColor: '#10b981',
      },
    },
  },
  grimmjow: {
    base: {
      torso: '#f8fafc', accent: '#38bdf8', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#09090b',
      hairColor: '#38bdf8', hairMode: 'spiky', fullMask: 'grimmjow_jaw', coat: 'espada',
      weapon: 'sword', auraColor: '#38bdf8',
    },
  },
  yhwach: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'long', coat: 'yhwach_cloak', weapon: 'sword',
      auraColor: '#38bdf8', scaleMult: 1.12,
    },
    forms: {
      almighty: { defaultEye: 'imu', auraColor: '#09090b' },
    },
  },
  jugram: {
    base: {
      torso: '#f8fafc', accent: '#fbbf24', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#f8fafc',
      hairColor: '#facc15', hairMode: 'long', coat: 'sternritter', weapon: 'sword',
    },
  },
  bambietta: {
    base: {
      torso: '#f8fafc', accent: '#ef4444', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#f1c27d', boot: '#f8fafc',
      hairColor: '#1c1917', hairMode: 'long', coat: 'sternritter', isFemale: true, auraColor: '#ef4444',
    },
  },
  yamamoto: {
    base: {
      torso: '#09090b', accent: '#f97316', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#f8fafc', hairMode: 'bald', coat: 'captain_white', divisionNo: '一',
      whiteBeard: true, weapon: 'ryujin_jakka', auraColor: '#f97316', faceMark: 'yamamoto_scar',
    },
    forms: {
      zanka: { coat: undefined, auraColor: '#ef4444' },
    },
  },
  unohana: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'long', coat: 'captain_white', divisionNo: '四',
      weapon: 'sword', isFemale: true,
    },
  },

  // ---------------- DRAGON BALL (20) ----------------
  goku: {
    base: {
      torso: '#f97316', accent: '#1d4ed8', armUpper: '#f97316', armLower: '#1d4ed8',
      hand: '#f1c27d', legUpper: '#f97316', legLower: '#f97316', boot: '#1d4ed8',
      hairColor: '#09090b', hairMode: 'spiky', chestPattern: 'gi_symbol',
    },
    forms: {
      ssj: { hairColor: '#fde047', hairEmissive: '#facc15', auraColor: '#facc15', defaultEye: 'ssj' },
      ssj_blue: { hairColor: '#38bdf8', hairEmissive: '#0ea5e9', auraColor: '#38bdf8', defaultEye: 'ssj' },
      ui: {
        torso: '#1d4ed8', hairColor: '#f8fafc', hairEmissive: '#e2e8f0', auraColor: '#cbd5e1',
        defaultEye: 'ui',
      },
    },
  },
  vegeta: {
    base: {
      torso: '#1d4ed8', accent: '#f8fafc', armUpper: '#1d4ed8', armLower: '#f8fafc',
      hand: '#f8fafc', legUpper: '#1d4ed8', legLower: '#1d4ed8', boot: '#f8fafc',
      hairColor: '#09090b', hairMode: 'spiky', chestPattern: 'saiyan_armor', faceMark: 'ssj_brows',
    },
    forms: {
      ssj: { hairColor: '#fde047', hairEmissive: '#facc15', auraColor: '#facc15', defaultEye: 'ssj' },
      ssj_blue: { hairColor: '#38bdf8', hairEmissive: '#0ea5e9', auraColor: '#38bdf8', defaultEye: 'ssj' },
      ultra_ego: {
        hairColor: '#a855f7', hairEmissive: '#9333ea', auraColor: '#a855f7', defaultEye: 'imu',
      },
    },
  },
  gohan: {
    base: {
      torso: '#6b21a8', accent: '#dc2626', armUpper: '#6b21a8', armLower: '#dc2626',
      hand: '#f1c27d', legUpper: '#6b21a8', legLower: '#6b21a8', boot: '#78350f',
      hairColor: '#09090b', hairMode: 'spiky',
    },
    forms: {
      ultimate: { auraColor: '#f8fafc' },
      beast: { hairColor: '#e2e8f0', hairEmissive: '#cbd5e1', auraColor: '#c084fc', defaultEye: 'imu' },
    },
  },
  piccolo: {
    base: {
      torso: '#581c87', accent: '#2563eb', armUpper: '#4ade80', armLower: '#4ade80',
      hand: '#4ade80', legUpper: '#581c87', legLower: '#581c87', boot: '#78350f',
      skin: '#4ade80', hairColor: '#4ade80', hairMode: 'bald', headGear: 'piccolo_turban', capeColor: '#f8fafc',
    },
    forms: {
      orange: {
        skin: '#f97316', armUpper: '#f97316', armLower: '#f97316', hand: '#f97316',
        headGear: undefined, scaleMult: 1.24, auraColor: '#fb923c',
      },
    },
  },
  trunks: {
    base: {
      torso: '#2563eb', accent: '#09090b', armUpper: '#2563eb', armLower: '#2563eb',
      hand: '#f1c27d', legUpper: '#334155', legLower: '#334155', boot: '#eab308',
      hairColor: '#c084fc', hairMode: 'parted', backProp: 'trunks_sword',
    },
  },
  frieza: {
    base: {
      torso: '#f8fafc', accent: '#7e22ce', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f8fafc', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#f8fafc',
      skin: '#f8fafc', hairMode: 'bald', tailType: 'beerus', tailColor: '#f8fafc', auraColor: '#a855f7',
    },
    forms: {
      golden: {
        torso: '#facc15', accent: '#7e22ce', armUpper: '#facc15', armLower: '#facc15',
        legUpper: '#facc15', legLower: '#facc15', skin: '#facc15', tailColor: '#facc15',
        metalness: 0.72, auraColor: '#fde047',
      },
      black: {
        torso: '#1e293b', accent: '#09090b', armUpper: '#1e293b', armLower: '#09090b',
        legUpper: '#1e293b', legLower: '#09090b', skin: '#cbd5e1', tailColor: '#09090b',
        auraColor: '#334155',
      },
    },
  },
  cell: {
    base: {
      torso: '#16a34a', accent: '#0f172a', armUpper: '#15803d', armLower: '#16a34a',
      hand: '#16a34a', legUpper: '#15803d', legLower: '#16a34a', boot: '#09090b',
      skin: '#22c55e', hairMode: 'bald', headGear: 'horns', backWings: 'demon_dark', auraColor: '#fde047',
    },
  },
  majin_buu: {
    base: {
      torso: '#f472b6', accent: '#f8fafc', armUpper: '#f472b6', armLower: '#f472b6',
      hand: '#f472b6', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#fbbf24',
      skin: '#f472b6', hairMode: 'bald', faceMark: 'majin_m', scaleMult: 1.2,
    },
  },
  broly: {
    base: {
      torso: '#1e1b4b', accent: '#22c55e', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'spiky', scaleMult: 1.24,
    },
    forms: {
      lssj: {
        hairColor: '#4ade80', hairEmissive: '#22c55e', auraColor: '#22c55e', scaleMult: 1.32, defaultEye: 'ssj',
      },
    },
  },
  gogeta: {
    base: {
      torso: '#1e293b', accent: '#f97316', armUpper: '#f1c27d', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#1e293b',
      hairColor: '#09090b', hairMode: 'spiky',
    },
    forms: {
      ssj_blue: { hairColor: '#38bdf8', hairEmissive: '#0ea5e9', auraColor: '#38bdf8', defaultEye: 'ssj' },
    },
  },
  vegito: {
    base: {
      torso: '#1d4ed8', accent: '#f97316', armUpper: '#1d4ed8', armLower: '#f8fafc',
      hand: '#f8fafc', legUpper: '#1d4ed8', legLower: '#1d4ed8', boot: '#f8fafc',
      hairColor: '#09090b', hairMode: 'spiky',
    },
    forms: {
      ssj_blue: { hairColor: '#38bdf8', hairEmissive: '#0ea5e9', auraColor: '#38bdf8', defaultEye: 'ssj' },
    },
  },
  beerus: {
    base: {
      torso: '#a855f7', accent: '#fbbf24', armUpper: '#a855f7', armLower: '#a855f7',
      hand: '#a855f7', legUpper: '#1d4ed8', legLower: '#1d4ed8', boot: '#1e293b',
      skin: '#a855f7', hairColor: '#4c1d95', hairMode: 'bald', headGear: 'beerus_ears',
      egyptCollar: true, tailType: 'beerus', tailColor: '#a855f7', auraColor: '#c084fc',
    },
  },
  whis: {
    base: {
      torso: '#7f1d1d', accent: '#38bdf8', armUpper: '#7f1d1d', armLower: '#7f1d1d',
      hand: '#93c5fd', legUpper: '#7f1d1d', legLower: '#7f1d1d', boot: '#1e1b4b',
      skin: '#93c5fd', hairColor: '#f8fafc', hairMode: 'whis_tall',
      coat: 'whis_robe', neckHaloColor: '#38bdf8', weapon: 'whis_staff', auraColor: '#7dd3fc',
    },
  },
  zeno: {
    base: {
      torso: '#1d4ed8', accent: '#facc15', armUpper: '#db2777', armLower: '#facc15',
      hand: '#818cf8', legUpper: '#1e1b4b', legLower: '#db2777', boot: '#facc15',
      skin: '#818cf8', hairColor: '#09090b', hairMode: 'bald', headGear: 'zeno_ears',
      scaleMult: 0.72, headOval: true, auraColor: '#fde047', faceMark: 'zeno_stripes',
    },
  },
  krillin: {
    base: {
      torso: '#f97316', accent: '#1d4ed8', armUpper: '#f97316', armLower: '#1d4ed8',
      hand: '#f1c27d', legUpper: '#f97316', legLower: '#f97316', boot: '#1e293b',
      hairMode: 'bald', scaleMult: 0.86,
    },
  },
  android_17: {
    base: {
      torso: '#10b981', accent: '#f97316', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#1e3a8a', legLower: '#1e3a8a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'bob',
    },
  },
  android_18: {
    base: {
      torso: '#2563eb', accent: '#f8fafc', armUpper: '#2563eb', armLower: '#2563eb',
      hand: '#f1c27d', legUpper: '#1d4ed8', legLower: '#1d4ed8', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'bob', isFemale: true,
    },
  },
  tien: {
    base: {
      torso: '#15803d', accent: '#f8fafc', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#15803d', legLower: '#15803d', boot: '#09090b',
      hairMode: 'bald', faceMark: 'third_eye',
    },
  },
  bardock: {
    base: {
      torso: '#15803d', accent: '#dc2626', armUpper: '#15803d', armLower: '#dc2626',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#15803d',
      hairColor: '#09090b', hairMode: 'spiky', headGear: 'oil_band', chestPattern: 'saiyan_armor',
      faceMark: 'luffy_scar',
    },
  },
  jiren: {
    base: {
      torso: '#dc2626', accent: '#09090b', armUpper: '#dc2626', armLower: '#09090b',
      hand: '#cbd5e1', legUpper: '#09090b', legLower: '#09090b', boot: '#f8fafc',
      skin: '#cbd5e1', hairMode: 'bald', scaleMult: 1.24,
    },
    forms: {
      full_power: { auraColor: '#ef4444', torso: '#cbd5e1', scaleMult: 1.3 },
    },
  },

  // ---------------- HUNTER X HUNTER (20) ----------------
  gon: {
    base: {
      torso: '#16a34a', accent: '#f97316', armUpper: '#16a34a', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#15803d', legLower: '#f1c27d', boot: '#166534',
      hairColor: '#064e3b', hairMode: 'gon_spiky',
    },
    forms: {
      adult: { scaleMult: 1.2, auraColor: '#fbbf24', defaultExpression: 'angry' },
    },
  },
  killua: {
    base: {
      torso: '#1e3a8a', accent: '#f8fafc', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#334155', legLower: '#f1c27d', boot: '#4338ca',
      hairColor: '#e2e8f0', hairMode: 'spiky', backProp: 'killua_skateboard', auraColor: '#38bdf8',
    },
    forms: {
      godspeed: { hairEmissive: '#bae6fd', auraColor: '#22d3ee', defaultEye: 'ssj' },
    },
  },
  kurapika: {
    base: {
      torso: '#1d4ed8', accent: '#f97316', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#1e293b',
      hairColor: '#fde047', hairMode: 'bob', weapon: 'kurta_chains',
    },
    forms: {
      scarlet_eyes: { defaultEye: 'sharingan', auraColor: '#ef4444' },
    },
  },
  leorio: {
    base: {
      torso: '#1e293b', accent: '#f8fafc', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'spiky', headGear: 'leorio_glasses',
    },
  },
  hisoka: {
    base: {
      torso: '#f8fafc', accent: '#be185d', armUpper: '#f8fafc', armLower: '#be185d',
      hand: '#fde2c4', legUpper: '#1e1b4b', legLower: '#facc15', boot: '#be185d',
      skin: '#fde2c4', hairColor: '#db2777', hairMode: 'slick', faceMark: 'hisoka_marks',
      weapon: 'playing_card', auraColor: '#ec4899',
    },
  },
  chrollo: {
    base: {
      torso: '#09090b', accent: '#7e22ce', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'slick', coat: 'feather_cape', auraColor: '#9333ea',
    },
  },
  meruem: {
    base: {
      torso: '#15803d', accent: '#4c1d95', armUpper: '#16a34a', armLower: '#15803d',
      hand: '#16a34a', legUpper: '#16a34a', legLower: '#15803d', boot: '#09090b',
      skin: '#4ade80', hairMode: 'bald', headGear: 'horns', tailType: 'arrow_demon', tailColor: '#15803d',
    },
    forms: {
      post_rose: { auraColor: '#fde047', backWings: 'angel_white' },
    },
  },
  neferpitou: {
    base: {
      torso: '#1e3a8a', accent: '#a855f7', armUpper: '#1e3a8a', armLower: '#f8fafc',
      hand: '#f8fafc', legUpper: '#1e3a8a', legLower: '#f8fafc', boot: '#09090b',
      skin: '#f8fafc', hairColor: '#e2e8f0', hairMode: 'bob', headGear: 'beerus_ears',
      tailType: 'beerus', tailColor: '#e2e8f0', isFemale: true,
    },
  },
  netero: {
    base: {
      torso: '#f8fafc', accent: '#facc15', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#78350f',
      hairColor: '#f8fafc', hairMode: 'ponytail', whiteBeard: true,
    },
    forms: {
      bodhisattva: { lotusHalo: true, auraColor: '#fde047', extraArms: true },
    },
  },
  ging: {
    base: {
      torso: '#78350f', accent: '#d97706', armUpper: '#78350f', armLower: '#78350f',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#451a03',
      hairColor: '#1c1917', hairMode: 'covered', headGear: 'towel_headband' as unknown as CostumeStyleSpec['headGear'],
    },
  },
  illumi: {
    base: {
      torso: '#15803d', accent: '#facc15', armUpper: '#15803d', armLower: '#15803d',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'long',
    },
  },
  feitan: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'parted', fullMask: 'kakashi', weapon: 'sword',
    },
  },
  shalnark: {
    base: {
      torso: '#16a34a', accent: '#facc15', armUpper: '#16a34a', armLower: '#16a34a',
      hand: '#f1c27d', legUpper: '#1e3a8a', legLower: '#1e3a8a', boot: '#09090b',
      hairColor: '#facc15', hairMode: 'bob',
    },
  },
  machi: {
    base: {
      torso: '#f472b6', accent: '#1e1b4b', armUpper: '#f472b6', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#f1c27d', boot: '#09090b',
      hairColor: '#ec4899', hairMode: 'ponytail', isFemale: true,
    },
  },
  nobunaga: {
    base: {
      torso: '#1e293b', accent: '#dc2626', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#451a03',
      hairColor: '#09090b', hairMode: 'ponytail', weapon: 'sword',
    },
  },
  uvogin: {
    base: {
      torso: '#78350f', accent: '#f59e0b', armUpper: '#f1c27d', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#451a03', legLower: '#451a03', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'spiky', scaleMult: 1.28, defaultExpression: 'angry',
    },
  },
  kite: {
    base: {
      torso: '#1d4ed8', accent: '#f8fafc', armUpper: '#1d4ed8', armLower: '#1d4ed8',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#f8fafc', hairMode: 'long', headGear: 'trafalgar_hat', weapon: 'scythe',
    },
  },
  biscuit: {
    base: {
      torso: '#ec4899', accent: '#f8fafc', armUpper: '#ec4899', armLower: '#f1c27d',
      hand: '#f1c27d', legUpper: '#be185d', legLower: '#f1c27d', boot: '#be185d',
      hairColor: '#facc15', hairMode: 'twin_tails', scaleMult: 0.78, isFemale: true,
    },
    forms: {
      true_form: { scaleMult: 1.32, armUpper: '#f1c27d', defaultExpression: 'angry' },
    },
  },
  morel: {
    base: {
      torso: '#1e293b', accent: '#f8fafc', armUpper: '#1e293b', armLower: '#1e293b',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#f8fafc', hairMode: 'long', headGear: 'leorio_glasses', weapon: 'staff',
    },
  },
  zeno_zoldyck: {
    base: {
      torso: '#4c1d95', accent: '#94a3b8', armUpper: '#4c1d95', armLower: '#4c1d95',
      hand: '#f1c27d', legUpper: '#1e1b4b', legLower: '#1e1b4b', boot: '#09090b',
      hairColor: '#f8fafc', hairMode: 'bald', whiteBeard: true, auraColor: '#fde047',
    },
  },

  // ---------------- LEGACY ALIASES ----------------
  aokiji: {
    base: {
      torso: '#f8fafc', accent: '#0284c7', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#0f172a',
      hairColor: '#0f172a', hairMode: 'spiky', headGear: 'aokiji_glasses', coat: 'marine', auraColor: '#67e8f9',
    },
  },
  hashirama: {
    base: {
      torso: '#991b1b', accent: '#fbbf24', armUpper: '#991b1b', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#1e293b', legLower: '#1e293b', boot: '#09090b',
      hairColor: '#09090b', hairMode: 'long', headGear: 'leaf_band', auraColor: '#22c55e',
    },
  },
  tobirama: {
    base: {
      torso: '#1d4ed8', accent: '#f8fafc', armUpper: '#1d4ed8', armLower: '#0f172a',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#e2e8f0', hairMode: 'spiky', headGear: 'leaf_band', auraColor: '#38bdf8',
    },
  },
  hiruzen: {
    base: {
      torso: '#1e293b', accent: '#b91c1c', armUpper: '#1e293b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      hairColor: '#cbd5e1', hairMode: 'slick', coat: 'hokage', weapon: 'staff', backLogoText: '三代目',
    },
  },
  gin: {
    base: {
      torso: '#09090b', accent: '#cbd5e1', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#f8fafc',
      hairColor: '#cbd5e1', hairMode: 'bob', coat: 'sleeveless_captain', divisionNo: '三', weapon: 'sword',
    },
  },
  ichibe: {
    base: {
      torso: '#09090b', accent: '#dc2626', armUpper: '#09090b', armLower: '#09090b',
      hand: '#f1c27d', legUpper: '#09090b', legLower: '#09090b', boot: '#f8fafc',
      hairColor: '#09090b', hairMode: 'bald', coat: 'captain_white', divisionNo: '零',
      prayerBeads: true, weapon: 'kanabo', scaleMult: 1.16,
    },
  },
  k_cyber: {
    base: {
      torso: '#0f172a', accent: '#22d3ee', armUpper: '#1e293b', armLower: '#06b6d4',
      hand: '#0f172a', legUpper: '#0f172a', legLower: '#1e293b', boot: '#06b6d4',
      fullMask: 'k_cyber', auraColor: '#22d3ee', metalness: 0.78,
    },
  },
  taekwondo_hero: {
    base: {
      torso: '#f8fafc', accent: '#0f172a', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f1c27d', legUpper: '#f8fafc', legLower: '#f8fafc', boot: '#0f172a',
      hairColor: '#1c1917', hairMode: 'spiky', headGear: 'leaf_band',
    },
  },
  ultraman: {
    base: {
      torso: '#e2e8f0', accent: '#dc2626', armUpper: '#dc2626', armLower: '#e2e8f0',
      hand: '#e2e8f0', legUpper: '#dc2626', legLower: '#e2e8f0', boot: '#dc2626',
      fullMask: 'ultraman', metalness: 0.55, auraColor: '#38bdf8',
    },
  },
  kamen_rider: {
    base: {
      torso: '#059669', accent: '#dc2626', armUpper: '#0f172a', armLower: '#059669',
      hand: '#0f172a', legUpper: '#0f172a', legLower: '#059669', boot: '#1e293b',
      fullMask: 'kamen_rider', capeColor: '#dc2626', metalness: 0.65,
    },
  },
  shinobi: {
    base: {
      torso: '#0f172a', accent: '#475569', armUpper: '#0f172a', armLower: '#1e293b',
      hand: '#09090b', legUpper: '#0f172a', legLower: '#0f172a', boot: '#09090b',
      coat: 'gundala_scarf', fullMask: 'kakashi', hairMode: 'spiky', weapon: 'katana_3',
    },
  },
  gatotkaca: {
    base: {
      torso: '#111827', accent: '#f59e0b', armUpper: '#111827', armLower: '#f59e0b',
      hand: '#f1c27d', legUpper: '#111827', legLower: '#111827', boot: '#d97706',
      capeColor: '#78350f', headGear: 'mahkota_wayang', metalness: 0.62,
    },
  },
  gundala: {
    base: {
      torso: '#991b1b', accent: '#facc15', armUpper: '#0f172a', armLower: '#991b1b',
      hand: '#0f172a', legUpper: '#0f172a', legLower: '#0f172a', boot: '#991b1b',
      headGear: 'wing_helm', coat: 'gundala_scarf', auraColor: '#38bdf8',
    },
  },
  sri_asih: {
    base: {
      torso: '#b91c1c', accent: '#fbbf24', armUpper: '#f1c27d', armLower: '#fbbf24',
      hand: '#f1c27d', legUpper: '#7f1d1d', legLower: '#f1c27d', boot: '#fbbf24',
      hairColor: '#1c1917', hairMode: 'long', headGear: 'mahkota_wayang', coat: 'gundala_scarf', isFemale: true,
    },
  },
  prometheus: {
    base: {
      torso: '#7c2d12', accent: '#fb923c', armUpper: '#f1c27d', armLower: '#f97316',
      hand: '#fb923c', legUpper: '#431407', legLower: '#7c2d12', boot: '#b45309',
      hairColor: '#ea580c', hairMode: 'spiky', weapon: 'fire_orb', auraColor: '#f97316',
    },
  },
  krishna: {
    base: {
      torso: '#facc15', accent: '#0284c7', armUpper: '#38bdf8', armLower: '#38bdf8',
      hand: '#38bdf8', legUpper: '#facc15', legLower: '#eab308', boot: '#d97706',
      skin: '#38bdf8', hairColor: '#0f172a', hairMode: 'slick', headGear: 'crown_gold',
      faceMark: 'krishna_tilak', auraColor: '#fde047',
    },
  },
  hanoman: {
    base: {
      torso: '#f8fafc', accent: '#dc2626', armUpper: '#f8fafc', armLower: '#f8fafc',
      hand: '#f8fafc', legUpper: '#dc2626', legLower: '#f8fafc', boot: '#b45309',
      skin: '#f8fafc', hairColor: '#f8fafc', hairMode: 'spiky', headGear: 'crown_gold', weapon: 'staff',
    },
  },
};

export function canonicalizeCharacterAndForm(
  suit: CharacterCostumeId | undefined,
  formId?: string,
): { suit: CharacterCostumeId; formId: string } {
  if (!suit || suit === 'none') {
    return { suit: 'none', formId: 'base' };
  }
  if (suit === 'luffy_gear5') {
    return { suit: 'luffy', formId: 'gear5' };
  }
  if (suit === 'goku_ssj') {
    return { suit: 'goku', formId: 'ssj' };
  }
  const cat = CATALOG_BY_ID.get(suit);
  const forms = cat?.forms;
  if (forms && forms.length > 0) {
    const valid = formId && forms.some((f) => f.id === formId);
    return { suit, formId: valid ? formId! : forms[0].id };
  }
  return { suit, formId: 'base' };
}

export function resolveCharacterSpec(
  rawSuit: CharacterCostumeId | undefined,
  rawForm?: string,
): CostumeStyleSpec | undefined {
  const { suit, formId } = canonicalizeCharacterAndForm(rawSuit, rawForm);
  if (suit === 'none') return undefined;
  const def = CHARACTER_DEFINITIONS[suit];
  if (!def) return undefined;
  const formOverride = def.forms?.[formId];
  if (!formOverride) return def.base;
  return { ...def.base, ...formOverride };
}

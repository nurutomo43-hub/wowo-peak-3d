export type Role = 'student' | 'teacher';
export type GenderType = 'male' | 'female';
export type TimeOfDay = 'pagi' | 'siang' | 'sore' | 'malam';
export type WeatherType = 'cerah' | 'berkabut' | 'hujan' | 'badai' | 'salju' | 'kiamat';
export type MapThemeId = 'nusantara' | 'lava' | 'salju' | 'sky_kingdom' | 'cyber_neon';
export type MapSelectionChoice = MapThemeId | 'random';

export interface MapThemeMeta {
  id: MapThemeId;
  name: string;
  shortName: string;
  subtitle: string;
  accentHex: string;
  badgeClass: string;
}

export const MAP_THEMES: ReadonlyArray<MapThemeMeta> = [
  {
    id: 'nusantara',
    name: 'Puncak Nusantara',
    shortName: 'Nusantara',
    subtitle: 'Tropis hijau cerah, jembatan kayu klasik, awan putih',
    accentHex: '#10b981',
    badgeClass: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'lava',
    name: 'Kawah Lava Vulkanik',
    shortName: 'Lava Vulkanik',
    subtitle: 'Tebing obsidian gelap, sungai lahar menyala & langit jingga',
    accentHex: '#f97316',
    badgeClass: 'from-orange-500 to-red-600',
  },
  {
    id: 'salju',
    name: 'Puncak Salju Everest',
    shortName: 'Salju Everest',
    subtitle: 'Pegunungan es biru-putih, kabut dingin & jembatan berlapis es',
    accentHex: '#38bdf8',
    badgeClass: 'from-sky-400 to-blue-600',
  },
  {
    id: 'sky_kingdom',
    name: 'Negeri Awan & Pelangi',
    shortName: 'Sky Kingdom',
    subtitle: 'Pulau melayang di lautan awan, pelangi cakrawala & pilar kristal',
    accentHex: '#ec4899',
    badgeClass: 'from-pink-400 via-sky-400 to-amber-400',
  },
  {
    id: 'cyber_neon',
    name: 'Dunia Cyber Neon',
    shortName: 'Cyber Neon',
    subtitle: 'Arena malam futuristik dengan garis neon cyan & ungu menyala',
    accentHex: '#a855f7',
    badgeClass: 'from-cyan-500 to-purple-600',
  },
];

export type OutfitType =
  | 'windbreaker'
  | 'casual'
  | 'flannel'
  | 'tactical_vest'
  | 'tunic'
  | 'outdoor_vest'
  | 'formal'
  | 'poncho'
  | 'koko'
  | 'kebaya'
  | 'school';

export type PantsStyleType = 'jeans' | 'cargo' | 'shorts' | 'skirt';

export type HeadAccessoryType =
  | 'none'
  | 'rimba'
  | 'baseball'
  | 'beanie'
  | 'towel_headband'
  | 'headlamp'
  | 'bando'
  | 'hairpin'
  | 'peci'
  | 'blangkon';

export type BackGearType = 'none' | 'carrier' | 'sling' | 'cape' | 'wings' | 'jetpack';

export type FaceExpressionType =
  | 'auto'
  | 'smile'
  | 'laugh'
  | 'angry'
  | 'annoyed'
  | 'sad'
  | 'shocked'
  | 'cool'
  | 'sleepy'
  | 'shy'
  | 'ninja_mask'
  | 'elder_wise'
  | 'otaku_glasses'
  | 'chibi';

export type FaceAgeType = 'young' | 'elder';

export type EyeStyleType =
  | 'auto'
  | 'normal'
  | 'sharingan'
  | 'mangekyou'
  | 'rinnegan'
  | 'byakugan'
  | 'sage'
  | 'kyuubi'
  | 'imu'
  | 'nika'
  | 'mihawk'
  | 'six_eyes'
  | 'sukuna'
  | 'ssj'
  | 'ui'
  | 'upper_moon'
  | 'geass';

export type NeckAccessoryType = 'none' | 'scarf' | 'knit_scarf';
export type WristAccessoryType = 'none' | 'watch';

export type CharacterCostumeId =
  | 'none'
  // Hero (20)
  | 'doctor_doom'
  | 'scarlet_witch'
  | 'doctor_strange'
  | 'ironman'
  | 'spiderman'
  | 'captain_america'
  | 'thor'
  | 'hulk'
  | 'black_panther'
  | 'wolverine'
  | 'deadpool'
  | 'batman'
  | 'superman'
  | 'wonder_woman'
  | 'flash'
  | 'aquaman'
  | 'green_lantern'
  | 'moon_knight'
  | 'ghost_rider'
  | 'venom'
  // Dewa Mitologi Dunia (20)
  | 'buddha'
  | 'odin'
  | 'zeus'
  | 'poseidon'
  | 'hades'
  | 'athena'
  | 'anubis'
  | 'ra'
  | 'horus'
  | 'osiris'
  | 'amaterasu'
  | 'susanoo'
  | 'tsukuyomi'
  | 'sun_wukong'
  | 'nezha'
  | 'erlang_shen'
  | 'siwa'
  | 'wisnu'
  | 'ganesha'
  | 'quetzalcoatl'
  // One Piece (25)
  | 'luffy'
  | 'loki'
  | 'imu'
  | 'kaido'
  | 'garp'
  | 'sengoku'
  | 'shirohige'
  | 'roger'
  | 'shiki'
  | 'zoro'
  | 'sanji'
  | 'nami'
  | 'usopp'
  | 'chopper'
  | 'nico_robin'
  | 'franky'
  | 'brook'
  | 'jinbe'
  | 'ace'
  | 'sabo'
  | 'law'
  | 'kid'
  | 'shanks'
  | 'mihawk'
  | 'boa_hancock'
  // Jujutsu Kaisen (20)
  | 'gojo'
  | 'sukuna'
  | 'yuji'
  | 'megumi'
  | 'nobara'
  | 'yuta'
  | 'maki'
  | 'toji'
  | 'nanami'
  | 'hakari'
  | 'kashimo'
  | 'higuruma'
  | 'choso'
  | 'geto'
  | 'kenjaku'
  | 'mahito'
  | 'jogo'
  | 'hanami'
  | 'inumaki'
  | 'todo'
  // Attack on Titan (20)
  | 'eren'
  | 'mikasa'
  | 'armin'
  | 'levi'
  | 'erwin'
  | 'hange'
  | 'reiner'
  | 'bertholdt'
  | 'annie'
  | 'zeke'
  | 'pieck'
  | 'porco'
  | 'lara_tybur'
  | 'jean'
  | 'connie'
  | 'sasha'
  | 'historia'
  | 'ymir_aot'
  | 'kenny'
  | 'falco'
  // Naruto & Boruto (20)
  | 'naruto'
  | 'sasuke'
  | 'boruto'
  | 'kakashi'
  | 'itachi'
  | 'madara'
  | 'obito'
  | 'minato'
  | 'sakura'
  | 'hinata'
  | 'shikamaru'
  | 'rock_lee'
  | 'gaara'
  | 'jiraiya'
  | 'tsunade'
  | 'orochimaru'
  | 'pain'
  | 'killer_bee'
  | 'kawaki'
  | 'mitsuki'
  // Bleach TYBW (20)
  | 'ichigo'
  | 'rukia'
  | 'renji'
  | 'uryu'
  | 'orihime'
  | 'chad'
  | 'byakuya'
  | 'toshiro'
  | 'kenpachi'
  | 'shunsui'
  | 'urahara'
  | 'yoruichi'
  | 'aizen'
  | 'ulquiorra'
  | 'grimmjow'
  | 'yhwach'
  | 'jugram'
  | 'bambietta'
  | 'yamamoto'
  | 'unohana'
  // Dragon Ball (20)
  | 'goku'
  | 'vegeta'
  | 'gohan'
  | 'piccolo'
  | 'trunks'
  | 'frieza'
  | 'cell'
  | 'majin_buu'
  | 'broly'
  | 'gogeta'
  | 'vegito'
  | 'beerus'
  | 'whis'
  | 'zeno'
  | 'krillin'
  | 'android_17'
  | 'android_18'
  | 'tien'
  | 'bardock'
  | 'jiren'
  // Hunter x Hunter (20)
  | 'gon'
  | 'killua'
  | 'kurapika'
  | 'leorio'
  | 'hisoka'
  | 'chrollo'
  | 'meruem'
  | 'neferpitou'
  | 'netero'
  | 'ging'
  | 'illumi'
  | 'feitan'
  | 'shalnark'
  | 'machi'
  | 'nobunaga'
  | 'uvogin'
  | 'kite'
  | 'biscuit'
  | 'morel'
  | 'zeno_zoldyck'
  // Legacy Aliases (auto-normalized)
  | 'luffy_gear5'
  | 'goku_ssj'
  | 'aokiji'
  | 'hashirama'
  | 'tobirama'
  | 'hiruzen'
  | 'gin'
  | 'ichibe'
  | 'k_cyber'
  | 'taekwondo_hero'
  | 'ultraman'
  | 'kamen_rider'
  | 'shinobi'
  | 'gatotkaca'
  | 'gundala'
  | 'sri_asih'
  | 'prometheus'
  | 'krishna'
  | 'hanoman';

export type SuperheroSuitType = CharacterCostumeId;
export type HatType = HeadAccessoryType | 'headband' | 'helmet' | 'crown';

export type HairStyle =
  | 'short'
  | 'mohawk'
  | 'side_part'
  | 'spiky'
  | 'undercut'
  | 'curly'
  | 'long_loose'
  | 'ponytail'
  | 'twin_braids'
  | 'single_braid'
  | 'twintails'
  | 'hijab'
  | 'hijab_sport'
  | 'parted'
  | 'long_tie'
  | 'bob'
  | 'covered'
  | 'bald';

export type EmoteType = 'wave' | 'celebrate' | 'cheer' | 'scared' | 'laugh' | 'sit';
export type RespawnMode = 'last_cp' | 'prev_cp' | 'base_camp';
export type RoomStatus = 'waiting' | 'started' | 'ended';
export type DisasterEventType =
  | 'hail'
  | 'fire_rain'
  | 'heavy_rain'
  | 'thick_fog'
  | 'landslide'
  | 'flash_flood'
  | 'lava_rain'
  | 'lava_landslide'
  | 'lava_flood'
  | 'kuntilanak'
  | 'pocong'
  | 'thunder'
  | 'earthquake'
  | 'wildfire'
  | 'meteor'
  | 'wildlife'
  | 'yeti'
  | 'snowstorm'
  | 'brainrot';

export interface TriggerDisasterPayload {
  type: DisasterEventType;
  duration: number;
  timestamp: number;
  count?: number;
  offsets?: number[];
}

export type RoomCommandType =
  | DisasterEventType
  | 'pause_class'
  | 'start_expedition'
  | 'end_session'
  | 'CHANGE_MAP';

export interface RoomCommandPayload {
  type: RoomCommandType;
  eventId: string;
  triggeredAt: number;
  duration: number;
  count?: number;
  offsets?: number[];
  paused?: boolean;
  remainingSec?: number;
  sessionEndsAt?: number | null;
  settings?: RoomSettings;
  mapId?: MapThemeId;
  participants?: ParticipantSummary[];
  reason?: 'teacher' | 'timeout';
  leaderboard?: ParticipantSummary[];
  exportRows?: ExportStudentRow[];
}

export interface AvatarConfig {
  gender: GenderType;
  outfit: OutfitType;
  pantsStyle: PantsStyleType;
  jacket: string;
  pantsColor: string;
  skinColor: string;
  hairStyle: HairStyle;
  hairColor: string;
  headAccessory: HeadAccessoryType;
  hat?: HatType;
  glasses: boolean;
  backGear: BackGearType;
  pack: string;
  superheroSuit: CharacterCostumeId;
  characterForm?: string;
  faceExpression?: FaceExpressionType;
  faceAge?: FaceAgeType;
  eyeStyle?: EyeStyleType;
  neckAccessory?: NeckAccessoryType;
  wristAccessory?: WristAccessoryType;
}

export const DEFAULT_STUDENT_AVATAR: AvatarConfig = {
  gender: 'male',
  outfit: 'windbreaker',
  pantsStyle: 'cargo',
  jacket: '#ef4444',
  pantsColor: '#1e293b',
  skinColor: '#f1c27d',
  hairStyle: 'short',
  hairColor: '#1c1917',
  headAccessory: 'rimba',
  hat: 'rimba',
  glasses: false,
  backGear: 'carrier',
  pack: '#78350f',
  superheroSuit: 'none',
  characterForm: 'base',
  faceExpression: 'auto',
  faceAge: 'young',
  eyeStyle: 'auto',
  neckAccessory: 'none',
  wristAccessory: 'none',
};

export const DEFAULT_TEACHER_AVATAR: AvatarConfig = {
  gender: 'male',
  outfit: 'windbreaker',
  pantsStyle: 'cargo',
  jacket: '#d97706',
  pantsColor: '#292524',
  skinColor: '#f1c27d',
  hairStyle: 'side_part',
  hairColor: '#1c1917',
  headAccessory: 'rimba',
  hat: 'rimba',
  glasses: true,
  backGear: 'carrier',
  pack: '#1f2937',
  superheroSuit: 'none',
  characterForm: 'base',
  faceExpression: 'auto',
  faceAge: 'young',
  eyeStyle: 'auto',
  neckAccessory: 'none',
  wristAccessory: 'none',
};

export interface QuizQuestion {
  no: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface ShuffledQuestion {
  cp: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface EssayQuestion {
  no: number;
  question: string;
  acceptedAnswers: string[];
  rawKey: string;
  explanation?: string;
}

export interface AnswerRecord {
  cp: number;
  question: string;
  chosen: string;
  correctKey: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface EssayAnswerRecord {
  no: number;
  question: string;
  studentAnswer: string;
  correctKey: string;
  isCorrect: boolean;
  timeSpent: number;
}

export interface RoomSettings {
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  selectedMap?: MapThemeId;
  quizDuration: number;
  sessionDurationMinutes: number; // 10..60 minutes
  explanationDurationSec: number; // 40, 50, 60
  difficultyLevel: number;
  respawnMode: RespawnMode;
  pgWeight: number;    // default 75 (25 PG * 3 pts = 75)
  essayWeight: number; // default 25 (5 Essay * 5 pts = 25)
}

export interface ParticipantSummary {
  id: string;
  name: string;
  avatar: AvatarConfig;
  currentCP: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  essayCorrect: number;
  essayWrong: number;
  essayDone: boolean;
  fallCount: number;
  online: boolean;
  finished: boolean;
}

export interface ExportStudentRow {
  id: string;
  name: string;
  currentCP: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  essayCorrect: number;
  essayWrong: number;
  essayDone: boolean;
  fallCount: number;
  answers: AnswerRecord[];
  essayAnswers: EssayAnswerRecord[];
}

export interface PublicRoomState {
  roomCode: string;
  status: RoomStatus;
  settings: RoomSettings;
  paused: boolean;
  sessionEnded: boolean;
  remainingSec: number;
  questionCount: number;
  essayQuestionCount: number;
  participants: ParticipantSummary[];
}

export interface PlayerPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  cp?: number;
  state?: 'idle' | 'walk' | 'jump' | 'climb' | 'slide' | 'hurt';
}

export interface RemotePlayerPayload {
  id: string;
  role: Role;
  name: string;
  avatar: AvatarConfig;
  currentCP: number;
  score: number;
  pose: PlayerPose;
}

export interface StudentRestoreProgress {
  roomCode: string;
  studentId: string;
  studentName: string;
  avatarConfig: AvatarConfig;
  currentCP: number;
  completedCPs: number[];
  score: number;
  correctCount: number;
  wrongCount: number;
  essayCorrect: number;
  essayWrong: number;
  essayDone: boolean;
  fallCount: number;
  answers: AnswerRecord[];
  essayAnswers: EssayAnswerRecord[];
  studentStartedAt?: number;
  remainingSec?: number;
}

export interface DifficultyConfig {
  level: number;
  name: string;
  speedMult: number;
  pathWidthMult: number;
  warnSec: number;
  ghostRate: number;
  rockRate: number;
  landslideCountMin: number;
  landslideCountMax: number;
  lightningCount: number;
  wildfireClusters: number;
  quakeDuration: number;
  wildlifeCountPerTier: number;
}

export const DIFFICULTY_LEVELS: Record<number, DifficultyConfig> = {
  1: { level: 1, name: 'Ayam / Powke', speedMult: 0.35, pathWidthMult: 1.4, warnSec: 8.0, ghostRate: 0.35, rockRate: 0.35, landslideCountMin: 3, landslideCountMax: 4, lightningCount: 1, wildfireClusters: 1, quakeDuration: 2.2, wildlifeCountPerTier: 1 },
  2: { level: 2, name: 'Siput Ngantuk', speedMult: 0.48, pathWidthMult: 1.3, warnSec: 7.5, ghostRate: 0.5, rockRate: 0.5, landslideCountMin: 4, landslideCountMax: 5, lightningCount: 1, wildfireClusters: 1, quakeDuration: 2.5, wildlifeCountPerTier: 1 },
  3: { level: 3, name: 'Bocil Pemula', speedMult: 0.65, pathWidthMult: 1.2, warnSec: 6.0, ghostRate: 0.65, rockRate: 0.65, landslideCountMin: 7, landslideCountMax: 9, lightningCount: 2, wildfireClusters: 2, quakeDuration: 3.0, wildlifeCountPerTier: 2 },
  4: { level: 4, name: 'Pendaki Santuy', speedMult: 0.82, pathWidthMult: 1.1, warnSec: 5.5, ghostRate: 0.8, rockRate: 0.8, landslideCountMin: 10, landslideCountMax: 13, lightningCount: 2, wildfireClusters: 2, quakeDuration: 3.4, wildlifeCountPerTier: 2 },
  5: { level: 5, name: 'Warga Lokal', speedMult: 1.0, pathWidthMult: 1.0, warnSec: 5.0, ghostRate: 1.0, rockRate: 1.0, landslideCountMin: 12, landslideCountMax: 18, lightningCount: 3, wildfireClusters: 3, quakeDuration: 4.0, wildlifeCountPerTier: 3 },
  6: { level: 6, name: 'Pendaki Kalcer', speedMult: 1.18, pathWidthMult: 1.0, warnSec: 4.5, ghostRate: 1.2, rockRate: 1.15, landslideCountMin: 16, landslideCountMax: 22, lightningCount: 4, wildfireClusters: 3, quakeDuration: 4.4, wildlifeCountPerTier: 4 },
  7: { level: 7, name: 'Atlet Tanjakan', speedMult: 1.38, pathWidthMult: 0.95, warnSec: 4.0, ghostRate: 1.5, rockRate: 1.35, landslideCountMin: 20, landslideCountMax: 26, lightningCount: 5, wildfireClusters: 4, quakeDuration: 4.8, wildlifeCountPerTier: 5 },
  8: { level: 8, name: 'Sepuh Gunung', speedMult: 1.58, pathWidthMult: 0.9, warnSec: 3.5, ghostRate: 1.75, rockRate: 1.55, landslideCountMin: 25, landslideCountMax: 31, lightningCount: 6, wildfireClusters: 5, quakeDuration: 5.4, wildlifeCountPerTier: 6 },
  9: { level: 9, name: 'Raja Iblis', speedMult: 1.78, pathWidthMult: 0.88, warnSec: 3.0, ghostRate: 2.0, rockRate: 1.85, landslideCountMin: 29, landslideCountMax: 35, lightningCount: 7, wildfireClusters: 6, quakeDuration: 5.8, wildlifeCountPerTier: 7 },
  10: { level: 10, name: 'DEWA', speedMult: 2.05, pathWidthMult: 0.85, warnSec: 2.5, ghostRate: 2.35, rockRate: 2.25, landslideCountMin: 34, landslideCountMax: 40, lightningCount: 9, wildfireClusters: 7, quakeDuration: 6.5, wildlifeCountPerTier: 8 },
};

export interface RadarBlip {
  id: string;
  name: string;
  role: Role;
  relX: number;
  relY: number;
}

export interface HudSnapshot {
  altitudePct: number;
  nextCpIndex: number;
  distToNextCp: number;
  elevToNextCp: number;
  radarAngleDeg: number;
  targetBlip: { relX: number; relY: number };
  nearbyBlips: RadarBlip[];
  locomotionMode: 'walk' | 'climb' | 'slide';
}

export const EMOTE_ITEMS: ReadonlyArray<{ id: EmoteType; emoji: string; label: string }> = [
  { id: 'wave', emoji: '👋', label: 'Melambai' },
  { id: 'celebrate', emoji: '🎉', label: 'Selebrasi' },
  { id: 'cheer', emoji: '💪', label: 'Semangat' },
  { id: 'scared', emoji: '😱', label: 'Takut' },
  { id: 'laugh', emoji: '😂', label: 'Ketawa' },
  { id: 'sit', emoji: '🧘', label: 'Duduk Istirahat' },
];

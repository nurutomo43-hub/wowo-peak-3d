export type Role = 'student' | 'teacher';
export type GenderType = 'male' | 'female';
export type TimeOfDay = 'pagi' | 'siang' | 'sore' | 'malam';
export type WeatherType = 'cerah' | 'berkabut' | 'hujan' | 'badai' | 'salju' | 'kiamat';

export type OutfitType =
  | 'windbreaker'
  | 'casual'
  | 'flannel'
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
  | 'peci'
  | 'blangkon';

export type BackGearType = 'none' | 'carrier' | 'cape' | 'wings' | 'jetpack';

export type CharacterCostumeId =
  | 'none'
  // Universal Superhero (Marvel & DC)
  | 'ironman'
  | 'spiderman'
  | 'captain_america'
  | 'thor'
  | 'hulk'
  | 'superman'
  | 'batman'
  | 'wonder_woman'
  | 'flash'
  // Asian & Indonesian Superhero
  | 'k_cyber'
  | 'taekwondo_hero'
  | 'ultraman'
  | 'kamen_rider'
  | 'shinobi'
  | 'gatotkaca'
  | 'gundala'
  | 'sri_asih'
  // Mythology Gods (Greek, Hindu, Nusantara)
  | 'zeus'
  | 'prometheus'
  | 'poseidon'
  | 'athena'
  | 'krishna'
  | 'siwa'
  | 'wisnu'
  | 'hanoman'
  // Anime: One Piece (13)
  | 'luffy'
  | 'luffy_gear5'
  | 'boa_hancock'
  | 'zoro'
  | 'kaido'
  | 'aokiji'
  | 'shanks'
  | 'mihawk'
  | 'sanji'
  | 'ace'
  | 'law'
  | 'nami'
  | 'nico_robin'
  // Anime: Naruto & Boruto (14)
  | 'naruto'
  | 'sasuke'
  | 'kakashi'
  | 'sakura'
  | 'hashirama'
  | 'tobirama'
  | 'hiruzen'
  | 'minato'
  | 'tsunade'
  | 'jiraiya'
  | 'boruto'
  | 'itachi'
  | 'obito'
  | 'madara'
  // Anime: Bleach TYBW (12)
  | 'ichigo'
  | 'gin'
  | 'aizen'
  | 'ichibe'
  | 'yhwach'
  | 'ulquiorra'
  | 'grimmjow'
  | 'kenpachi'
  | 'toshiro'
  | 'byakuya'
  | 'rukia'
  | 'yamamoto';

export type SuperheroSuitType = CharacterCostumeId;
export type HatType = HeadAccessoryType | 'headband' | 'helmet' | 'crown';

export type HairStyle =
  | 'short'
  | 'side_part'
  | 'spiky'
  | 'undercut'
  | 'long_loose'
  | 'ponytail'
  | 'twin_braids'
  | 'hijab'
  | 'parted'
  | 'long_tie'
  | 'bob'
  | 'covered'
  | 'bald';

export type EmoteType = 'wave' | 'celebrate' | 'cheer' | 'scared' | 'laugh' | 'sit';
export type RespawnMode = 'last_cp' | 'prev_cp' | 'base_camp';
export type DisasterEventType =
  | 'landslide'
  | 'kuntilanak'
  | 'pocong'
  | 'thunder'
  | 'earthquake'
  | 'wildfire'
  | 'meteor';

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
  quizDuration: number;
  sessionDurationMinutes: number; // 10, 15, 20, 25, 30
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
  settings: RoomSettings;
  paused: boolean;
  sessionEnded: boolean;
  remainingSec: number;
  questionCount: number;
  essayQuestionCount: number;
  participants: ParticipantSummary[];
}

export interface SupabaseRoomConfig {
  teacherId: string;
  teacherName: string;
  teacherAvatar: AvatarConfig;
  settings: RoomSettings;
  paused: boolean;
  sessionEnded: boolean;
  endReason?: 'teacher' | 'timeout';
  remainingSec: number;
  sessionEndsAt: number | null;
  kickedIds: string[];
  questions: QuizQuestion[] | null;
  essayQuestions: EssayQuestion[] | null;
  createdAt: number;
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

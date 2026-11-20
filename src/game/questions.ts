import * as XLSX from 'xlsx';
import type {
  EssayQuestion,
  ExportStudentRow,
  ParticipantSummary,
  QuizQuestion,
  ShuffledQuestion,
} from '../types/game';

export const DEFAULT_QUESTIONS: QuizQuestion[] = [
  { no: 1, question: 'Apa nama ibu kota baru Negara Kesatuan Republik Indonesia yang dibangun di Kalimantan Timur?', options: { A: 'Nusantara', B: 'Bandung', C: 'Surabaya', D: 'Makassar' }, answer: 'A', explanation: 'Ibu Kota Nusantara (IKN) dibangun di sebagian wilayah Provinsi Kalimantan Timur.' },
  { no: 2, question: 'Gunung tertinggi di Pulau Jawa yang memiliki puncak bernama Mahameru adalah...', options: { A: 'Gunung Merapi', B: 'Gunung Semeru', C: 'Gunung Rinjani', D: 'Gunung Kerinci' }, answer: 'B', explanation: 'Gunung Semeru di Jawa Timur berketinggian 3.676 mdpl dengan puncak Mahameru.' },
  { no: 3, question: 'Proses penguapan air dari permukaan laut atau sungai akibat panas matahari disebut...', options: { A: 'Kondensasi', B: 'Presipitasi', C: 'Evaporasi', D: 'Infiltrasi' }, answer: 'C', explanation: 'Evaporasi adalah perubahan wujud air cair menjadi uap air karena energi panas.' },
  { no: 4, question: 'Hasil dari 15 × 12 − 30 adalah...', options: { A: '140', B: '150', C: '160', D: '180' }, answer: 'B', explanation: '15 × 12 = 180, lalu 180 − 30 = 150.' },
  { no: 5, question: 'Gas terbanyak penyusun atmosfer Bumi (sekitar 78%) adalah...', options: { A: 'Oksigen', B: 'Karbon Dioksida', C: 'Nitrogen', D: 'Argon' }, answer: 'C', explanation: 'Atmosfer Bumi terdiri dari sekitar 78% Nitrogen dan 21% Oksigen.' },
  { no: 6, question: 'Sila ketiga Pancasila ("Persatuan Indonesia") dilambangkan oleh simbol...', options: { A: 'Bintang', B: 'Rantai Emas', C: 'Pohon Beringin', D: 'Kepala Banteng' }, answer: 'C', explanation: 'Pohon Beringin melambangkan sila ketiga Pancasila, Persatuan Indonesia.' },
  { no: 7, question: 'Alat ukur tekanan udara yang digunakan dalam ekspedisi cuaca gunung adalah...', options: { A: 'Termometer', B: 'Barometer', C: 'Anemometer', D: 'Higrometer' }, answer: 'B', explanation: 'Barometer mengukur tekanan atmosfer, sedangkan anemometer mengukur kecepatan angin.' },
  { no: 8, question: 'Lapisan bumi paling luar tempat makhluk hidup berpijak disebut...', options: { A: 'Kerak Bumi', B: 'Mantel Bumi', C: 'Inti Luar', D: 'Inti Dalam' }, answer: 'A', explanation: 'Kerak Bumi (crust) adalah lapisan padat paling luar dari struktur Bumi.' },
  { no: 9, question: 'Seorang pendaki menempuh 2,5 km lalu melanjutkan 1,5 km lagi. Total jaraknya dalam meter adalah...', options: { A: '3.000 m', B: '3.500 m', C: '4.000 m', D: '4.500 m' }, answer: 'C', explanation: '2,5 km + 1,5 km = 4 km = 4.000 meter.' },
  { no: 10, question: 'Organ tumbuhan yang menjadi pusat utama terjadinya proses fotosintesis adalah...', options: { A: 'Akar', B: 'Batang', C: 'Daun', D: 'Biji' }, answer: 'C', explanation: 'Daun mengandung kloroplas berklorofil yang menangkap energi cahaya matahari.' },
  { no: 11, question: 'Tanggal diperingatinya Hari Sumpah Pemuda di Indonesia setiap tahun adalah...', options: { A: '17 Agustus', B: '28 Oktober', C: '10 November', D: '1 Juni' }, answer: 'B', explanation: 'Sumpah Pemuda dicetuskan pada Kongres Pemuda II tanggal 28 Oktober 1928.' },
  { no: 12, question: 'Perubahan wujud benda padat langsung menjadi gas (seperti kapur barus) disebut...', options: { A: 'Menyublim', B: 'Mengkristal', C: 'Mencair', D: 'Mengembun' }, answer: 'A', explanation: 'Menyublim adalah perubahan wujud langsung dari padat menjadi gas.' },
  { no: 13, question: 'Satuan Internasional (SI) untuk gaya adalah...', options: { A: 'Joule', B: 'Watt', C: 'Newton', D: 'Pascal' }, answer: 'C', explanation: 'Gaya dinyatakan dalam satuan Newton (N), sesuai nama Sir Isaac Newton.' },
  { no: 14, question: 'Semakin tinggi posisi pendaki dari permukaan laut, tekanan udaranya akan semakin...', options: { A: 'Tinggi', B: 'Rendah', C: 'Tetap sama', D: 'Tidak terukur' }, answer: 'B', explanation: 'Semakin tinggi tempat, lapisan udara di atasnya makin tipis sehingga tekanan udara makin rendah.' },
  { no: 15, question: 'Danau vulkanik terbesar di Indonesia dan Asia Tenggara adalah...', options: { A: 'Danau Singkarak', B: 'Danau Toba', C: 'Danau Poso', D: 'Danau Sentani' }, answer: 'B', explanation: 'Danau Toba di Sumatera Utara terbentuk akibat letusan supervolcano purba.' },
  { no: 16, question: 'Hasil dari 3/4 + 1/2 dalam bentuk bilangan desimal adalah...', options: { A: '1,00', B: '1,25', C: '1,50', D: '0,75' }, answer: 'B', explanation: '3/4 (0,75) + 1/2 (0,50) = 1,25.' },
  { no: 17, question: 'Energi yang dimiliki suatu benda karena posisinya pada ketinggian tertentu disebut...', options: { A: 'Energi Kinetik', B: 'Energi Potensial Gravitasi', C: 'Energi Kimia', D: 'Energi Listrik' }, answer: 'B', explanation: 'Energi potensial gravitasi dihitung dengan rumus Ep = m · g · h.' },
  { no: 18, question: 'Planet terdekat dengan Matahari dalam tata surya kita adalah...', options: { A: 'Venus', B: 'Mars', C: 'Merkurius', D: 'Bumi' }, answer: 'C', explanation: 'Urutan planet dari Matahari dimulai dari Merkurius, Venus, Bumi, Mars, hingga Neptunus.' },
  { no: 19, question: 'Sikap paling tepat untuk menjaga kelestarian alam saat mendaki gunung adalah...', options: { A: 'Memetik bunga edelweiss', B: 'Membawa turun kembali semua sampah', C: 'Membuat api unggun sembarangan', D: 'Memotong jalur di luar trek' }, answer: 'B', explanation: 'Prinsip Leave No Trace mewajibkan pendaki membawa turun kembali seluruh sampah.' },
  { no: 20, question: 'Bahasa pemrograman utama yang berjalan di browser untuk merender grafik WebGL 3D adalah...', options: { A: 'JavaScript', B: 'COBOL', C: 'Pascal', D: 'Fortran' }, answer: 'A', explanation: 'Browser menjalankan JavaScript (dan TypeScript yang dikompilasi ke JS) untuk WebGL.' },
  { no: 21, question: 'Besar sebuah sudut siku-siku tepat sama dengan...', options: { A: '45 derajat', B: '60 derajat', C: '90 derajat', D: '180 derajat' }, answer: 'C', explanation: 'Sudut siku-siku memiliki besar tepat 90°.' },
  { no: 22, question: 'Pahlawan nasional pencipta lagu kebangsaan "Indonesia Raya" adalah...', options: { A: 'Ki Hajar Dewantara', B: 'W.R. Supratman', C: 'Ismail Marzuki', D: 'C. Simanjuntak' }, answer: 'B', explanation: 'Wage Rudolf Supratman menggubah lagu Indonesia Raya dan memperdengarkannya pada 1928.' },
  { no: 23, question: 'Bencana tanah longsor di lereng gunung curam paling sering dipicu oleh...', options: { A: 'Hujan deras dan gundulnya pepohonan', B: 'Angin sepoi-sepoi', C: 'Bulan purnama', D: 'Pelangi setelah hujan' }, answer: 'A', explanation: 'Resapan air hujan berlebih tanpa akar pohon pengikat membuat lereng rawan longsor.' },
  { no: 24, question: 'Reptil endemik raksasa Indonesia yang hidup di Nusa Tenggara Timur adalah...', options: { A: 'Orangutan', B: 'Komodo', C: 'Anoa', D: 'Cenderawasih' }, answer: 'B', explanation: 'Komodo (Varanus komodoensis) adalah kadal terbesar di dunia asli Pulau Komodo, NTT.' },
  { no: 25, question: 'Jika suhu di Base Camp 28°C dan tiap naik 100 m turun 0,6°C, suhu di +1.000 m lebih tinggi adalah...', options: { A: '24°C', B: '22°C', C: '20°C', D: '18°C' }, answer: 'B', explanation: 'Penurunan suhu = (1000 / 100) × 0,6°C = 6°C. Jadi 28°C − 6°C = 22°C.' },
];

export const DEFAULT_ESSAY_QUESTIONS: EssayQuestion[] = [
  {
    no: 1,
    question: 'Siapakah nama Presiden pertama Republik Indonesia yang membacakan teks Proklamasi pada 17 Agustus 1945?',
    acceptedAnswers: ['soekarno', 'ir. soekarno', 'ir soekarno', 'bung karno', 'sukarno'],
    rawKey: 'soekarno / ir. soekarno / bung karno',
    explanation: 'Ir. Soekarno (Bung Karno) merupakan proklamator dan Presiden pertama RI.',
  },
  {
    no: 2,
    question: 'Tuliskan rumus kimia dari molekul air murni!',
    acceptedAnswers: ['h2o', 'h 2 o'],
    rawKey: 'H2O',
    explanation: 'Setiap molekul air terdiri atas dua atom hidrogen dan satu atom oksigen (H2O).',
  },
  {
    no: 3,
    question: 'Apa nama samudra terluas dan terdalam di planet Bumi?',
    acceptedAnswers: ['pasifik', 'samudra pasifik', 'lautan pasifik', 'pacific'],
    rawKey: 'pasifik / samudra pasifik',
    explanation: 'Samudra Pasifik mencakup sekitar sepertiga luas permukaan Bumi dan memiliki Palung Mariana.',
  },
  {
    no: 4,
    question: 'Berapakah hasil dari akar kuadrat 144 ditambah 8?',
    acceptedAnswers: ['20', 'dua puluh'],
    rawKey: '20 / dua puluh',
    explanation: 'Akar kuadrat dari 144 adalah 12, kemudian 12 + 8 = 20.',
  },
  {
    no: 5,
    question: 'Sebutkan nama semboyan negara Indonesia yang berarti "Berbeda-beda tetapi tetap satu jua"!',
    acceptedAnswers: ['bhinneka tunggal ika', 'bhineka tunggal ika'],
    rawKey: 'bhinneka tunggal ika',
    explanation: 'Bhinneka Tunggal Ika diambil dari kitab Sutasoma karya Mpu Tantular.',
  },
];

export function normalizeEssayText(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'`()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitAcceptedKeys(rawKey: string): string[] {
  return String(rawKey || '')
    .split(/[\/;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function evaluateEssayAnswer(studentInput: string, acceptedAnswers: string[]): boolean {
  const cleanStudent = normalizeEssayText(studentInput);
  if (!cleanStudent) return false;
  return acceptedAnswers.some((k) => {
    const cleanKey = normalizeEssayText(k);
    if (!cleanKey) return false;
    return cleanStudent === cleanKey;
  });
}

export function computeFinalGrade(
  pgCorrect: number,
  essayCorrect: number,
  pgWeight = 75,
  essayWeight = 25,
  pgTotal = 25,
  essayTotal = 5,
): { pgScore: number; essayScore: number; totalScore: number; totalCorrect: number } {
  const safePgTotal = Math.max(1, pgTotal);
  const safeEssayTotal = Math.max(1, essayTotal);
  const clampedPg = Math.max(0, Math.min(safePgTotal, pgCorrect));
  const clampedEssay = Math.max(0, Math.min(safeEssayTotal, essayCorrect));
  const pgScore = Number(((clampedPg / safePgTotal) * pgWeight).toFixed(2));
  const essayScore = Number(((clampedEssay / safeEssayTotal) * essayWeight).toFixed(2));
  const totalScore = Number((pgScore + essayScore).toFixed(2));
  return {
    pgScore,
    essayScore,
    totalScore,
    totalCorrect: clampedPg + clampedEssay,
  };
}

export const CUSTOM_PG_STORAGE_KEY = 'wowo_peak_custom_pg_v1';
export const CUSTOM_ESSAY_STORAGE_KEY = 'wowo_peak_custom_essay_v1';

export function saveCustomPgToStorage(questions: QuizQuestion[], fileName: string) {
  try {
    localStorage.setItem(CUSTOM_PG_STORAGE_KEY, JSON.stringify({ fileName, questions }));
  } catch {
    // ignore storage quota errors
  }
}

export function loadCustomPgFromStorage(): { fileName: string; questions: QuizQuestion[] } | null {
  try {
    const raw = localStorage.getItem(CUSTOM_PG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fileName?: string; questions?: QuizQuestion[] };
    if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
      return {
        fileName: parsed.fileName || 'Soal_PG_Kustom.xlsx',
        questions: parsed.questions,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearCustomPgFromStorage() {
  try {
    localStorage.removeItem(CUSTOM_PG_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function saveCustomEssayToStorage(questions: EssayQuestion[], fileName: string) {
  try {
    localStorage.setItem(CUSTOM_ESSAY_STORAGE_KEY, JSON.stringify({ fileName, questions }));
  } catch {
    // ignore storage quota errors
  }
}

export function loadCustomEssayFromStorage(): { fileName: string; questions: EssayQuestion[] } | null {
  try {
    const raw = localStorage.getItem(CUSTOM_ESSAY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fileName?: string; questions?: EssayQuestion[] };
    if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
      return {
        fileName: parsed.fileName || 'Soal_Isian_Kustom.xlsx',
        questions: parsed.questions,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearCustomEssayFromStorage() {
  try {
    localStorage.removeItem(CUSTOM_ESSAY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildStudentQuizDeck(
  baseQuestions: QuizQuestion[] | null | undefined,
  roomCode: string,
  studentId: string,
): ShuffledQuestion[] {
  const source =
    Array.isArray(baseQuestions) && baseQuestions.length > 0 ? baseQuestions : DEFAULT_QUESTIONS;
  const rng = mulberry32(hashSeed(`${roomCode}::${studentId}`));

  let pool: QuizQuestion[] = [];
  while (pool.length < 25) {
    pool = pool.concat(shuffleWithRng(source, rng));
  }
  pool = pool.slice(0, 25);

  const keys: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  return pool.map((q, idx) => {
    const origPairs = keys.map((k) => ({
      text: q.options[k],
      isCorrect: k === q.answer,
    }));
    const shuffledPairs = shuffleWithRng(origPairs, rng);
    const newOptions = { A: '', B: '', C: '', D: '' };
    let newAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
    shuffledPairs.forEach((p, i) => {
      const letter = keys[i];
      newOptions[letter] = p.text;
      if (p.isCorrect) newAnswer = letter;
    });
    return {
      cp: idx + 1,
      question: q.question,
      options: newOptions,
      answer: newAnswer,
      explanation: q.explanation || '',
    };
  });
}

export function downloadPgTemplateExcel() {
  const rows = [
    {
      No: 1,
      Pertanyaan: 'Berapakah hasil dari 8 × 7?',
      'Pilihan A': '54',
      'Pilihan B': '56',
      'Pilihan C': '58',
      'Pilihan D': '64',
      'Kunci Jawaban': 'B',
      Pembahasan: '8 dikali 7 sama dengan 56.',
    },
    {
      No: 2,
      Pertanyaan: 'Planet terbesar di Tata Surya adalah...',
      'Pilihan A': 'Bumi',
      'Pilihan B': 'Saturnus',
      'Pilihan C': 'Jupiter',
      'Pilihan D': 'Neptunus',
      'Kunci Jawaban': 'C',
      Pembahasan: 'Jupiter merupakan planet raksasa gas terbesar di Tata Surya.',
    },
    {
      No: 3,
      Pertanyaan: 'Ibukota Provinsi Jawa Barat adalah...',
      'Pilihan A': 'Bandung',
      'Pilihan B': 'Semarang',
      'Pilihan C': 'Bogor',
      'Pilihan D': 'Cirebon',
      'Kunci Jawaban': 'A',
      Pembahasan: 'Bandung adalah ibu kota Provinsi Jawa Barat.',
    },
    {
      No: 4,
      Pertanyaan: 'Gas utama yang dihirup manusia saat bernapas adalah...',
      'Pilihan A': 'Karbon Monoksida',
      'Pilihan B': 'Oksigen',
      'Pilihan C': 'Helium',
      'Pilihan D': 'Metana',
      'Kunci Jawaban': 'B',
      Pembahasan: 'Manusia membutuhkan oksigen (O2) untuk respirasi seluler.',
    },
    {
      No: 5,
      Pertanyaan: 'Rumus kimia untuk molekul air adalah...',
      'Pilihan A': 'CO2',
      'Pilihan B': 'NaCl',
      'Pilihan C': 'H2O',
      'Pilihan D': 'O2',
      'Kunci Jawaban': 'C',
      Pembahasan: 'Air terdiri dari dua atom Hidrogen dan satu atom Oksigen (H2O).',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bank_Soal_PG');
  XLSX.writeFile(wb, 'Template_PG_WOWO_Peak.xlsx');
}

export const downloadTemplateExcel = downloadPgTemplateExcel;

export function downloadEssayTemplateExcel() {
  const rows = DEFAULT_ESSAY_QUESTIONS.map((q) => ({
    No: q.no,
    Pertanyaan: q.question,
    'Kunci Jawaban': q.rawKey,
    Pembahasan: q.explanation || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Isian_Singkat_Puncak');
  XLSX.writeFile(wb, 'Template_Isian_Singkat_WOWO.xlsx');
}

function normHeader(val: unknown): string {
  return String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_.:*()\[\]-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellStr(row: unknown[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  const v = row[idx];
  return v === null || v === undefined ? '' : String(v).trim();
}

function isRowEmpty(row: unknown[]): boolean {
  return row.every((c) => String(c ?? '').trim() === '');
}

async function readWorkbookFromFile(file: File, label: string): Promise<XLSX.WorkBook> {
  const nameLower = file.name.toLowerCase();
  if (!/\.(xlsx|xls|csv)$/i.test(nameLower)) {
    throw new Error(
      `Format file "${file.name}" tidak didukung untuk ${label}. Gunakan file .xlsx, .xls, atau .csv.`,
    );
  }
  if (file.size === 0) {
    throw new Error(`File "${file.name}" kosong (0 byte).`);
  }

  try {
    if (nameLower.endsWith('.csv')) {
      const textRaw = await file.text();
      const text = textRaw.replace(/^\uFEFF/, '');
      if (!text.trim()) {
        throw new Error(`File CSV "${file.name}" tidak berisi data.`);
      }
      const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
      const semiCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const FS = tabCount > commaCount && tabCount > semiCount ? '\t' : semiCount > commaCount ? ';' : ',';
      return XLSX.read(text, { type: 'string', FS });
    }
    const buffer = await file.arrayBuffer();
    return XLSX.read(buffer, { type: 'array' });
  } catch (err) {
    if (err instanceof Error && err.message.includes('File')) throw err;
    throw new Error(
      `File "${file.name}" rusak atau bukan dokumen Excel/CSV yang valid.`,
    );
  }
}

function resolvePgAnswerKey(
  rawKey: string,
  options: { A: string; B: string; C: string; D: string },
): 'A' | 'B' | 'C' | 'D' | null {
  const trimmed = String(rawKey || '').trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') {
    return upper;
  }

  const prefixMatch = trimmed.match(/^(?:opsi|pilihan|jawaban|huruf)?\s*([A-D])(?:\s*[.):-]\s*.*)?$/i);
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
  }

  const normKey = normalizeEssayText(trimmed);
  if (normKey) {
    for (const letter of ['A', 'B', 'C', 'D'] as const) {
      if (normalizeEssayText(options[letter]) === normKey) {
        return letter;
      }
    }
  }

  return null;
}

export function parsePgRowsFromAoA(
  aoa: unknown[][],
): { questions: QuizQuestion[]; warnings: string[] } {
  const nonEmptyRows = aoa.filter((r) => Array.isArray(r) && !isRowEmpty(r));
  if (nonEmptyRows.length === 0) {
    throw new Error('Sheet pertama file Excel PG kosong. Isi soal terlebih dahulu.');
  }

  const Q_ALIASES = ['pertanyaan', 'soal', 'question', 'butir soal', 'teks soal', 'isi soal'];
  const A_ALIASES = ['pilihan a', 'opsi a', 'jawaban a', 'pil a', 'a'];
  const B_ALIASES = ['pilihan b', 'opsi b', 'jawaban b', 'pil b', 'b'];
  const C_ALIASES = ['pilihan c', 'opsi c', 'jawaban c', 'pil c', 'c'];
  const D_ALIASES = ['pilihan d', 'opsi d', 'jawaban d', 'pil d', 'd'];
  const KEY_ALIASES = ['kunci jawaban', 'kunci', 'jawaban', 'answer', 'kunci soal', 'kj', 'jawaban benar'];
  const EXP_ALIASES = ['pembahasan', 'penjelasan', 'explanation', 'keterangan', 'uraian'];

  const findCol = (normed: string[], aliases: string[], prefixOk = false) =>
    normed.findIndex(
      (h) => aliases.includes(h) || (prefixOk && aliases.some((al) => al.length > 2 && h.startsWith(al))),
    );

  let headerIdx = -1;
  let qCol = -1;
  let aCol = -1;
  let bCol = -1;
  let cCol = -1;
  let dCol = -1;
  let keyCol = -1;
  let expCol = -1;

  for (let r = 0; r < Math.min(6, nonEmptyRows.length); r++) {
    const normed = nonEmptyRows[r].map(normHeader);
    const qc = findCol(normed, Q_ALIASES, true);
    const ac = findCol(normed, A_ALIASES, false);
    const bc = findCol(normed, B_ALIASES, false);
    const cc = findCol(normed, C_ALIASES, false);
    const dc = findCol(normed, D_ALIASES, false);
    const kc = findCol(normed, KEY_ALIASES, true);
    const ec = findCol(normed, EXP_ALIASES, true);

    if ((qc >= 0 && (ac >= 0 || kc >= 0)) || (ac >= 0 && bc >= 0 && kc >= 0)) {
      headerIdx = r;
      qCol = qc;
      aCol = ac;
      bCol = bc;
      cCol = cc;
      dCol = dc;
      keyCol = kc;
      expCol = ec;
      break;
    }
  }

  const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
  const parsed: QuizQuestion[] = [];
  const warnings: string[] = [];

  for (let r = startRow; r < nonEmptyRows.length; r++) {
    const row = nonEmptyRows[r];
    if (isRowEmpty(row)) continue;

    let question = '';
    let A = '';
    let B = '';
    let C = '';
    let D = '';
    let rawKey = '';
    let explanation = '';

    if (headerIdx >= 0) {
      question = cellStr(row, qCol);
      A = cellStr(row, aCol);
      B = cellStr(row, bCol);
      C = cellStr(row, cCol);
      D = cellStr(row, dCol);
      rawKey = cellStr(row, keyCol);
      explanation = cellStr(row, expCol);
    } else {
      // Headerless fallback: check whether Column 1 (index 0) is "No" (e.g. 1, 2, 3...)
      const col0 = cellStr(row, 0);
      const hasNoCol = /^\d+[.)]?$/.test(col0) && row.length >= 7;
      const off = hasNoCol ? 1 : 0;
      question = cellStr(row, off);
      A = cellStr(row, off + 1);
      B = cellStr(row, off + 2);
      C = cellStr(row, off + 3);
      D = cellStr(row, off + 4);
      rawKey = cellStr(row, off + 5);
      explanation = cellStr(row, off + 6);
    }

    if (!question && !A && !B && !C && !D) continue;

    const resolvedKey = resolvePgAnswerKey(rawKey, { A, B, C, D });
    if (!question || !A || !B || !C || !D || !resolvedKey) {
      warnings.push(
        `Baris ${r + 1} dilewati: ${
          !question
            ? 'Pertanyaan kosong'
            : !A || !B || !C || !D
              ? 'Opsi A/B/C/D belum lengkap'
              : `Kunci Jawaban "${rawKey || '-'}" tidak cocok dengan A/B/C/D atau teks opsi`
        }.`,
      );
      continue;
    }

    parsed.push({
      no: parsed.length + 1,
      question,
      options: { A, B, C, D },
      answer: resolvedKey,
      explanation,
    });
  }

  if (parsed.length === 0) {
    const hint =
      headerIdx < 0
        ? 'Pastikan kolom header berisi: Pertanyaan (atau Soal), Opsi A–D (atau A–D), dan Kunci Jawaban (atau Kunci) — atau susun tanpa header: No, Pertanyaan, A, B, C, D, Kunci.'
        : warnings[0] || 'Semua baris soal tidak lengkap.';
    throw new Error(`Tidak ada soal PG valid yang ditemukan. ${hint}`);
  }

  return { questions: parsed, warnings };
}

export async function parseExcelQuestions(
  file: File,
): Promise<{ questions: QuizQuestion[]; warnings: string[] }> {
  const wb = await readWorkbookFromFile(file, 'Soal PG');
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) {
    throw new Error('File Excel PG tidak memiliki sheet yang dapat dibaca.');
  }
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[firstSheet], {
    header: 1,
    defval: '',
  });
  return parsePgRowsFromAoA(aoa);
}

export function parseEssayRowsFromAoA(
  aoa: unknown[][],
): { questions: EssayQuestion[]; warnings: string[] } {
  const nonEmptyRows = aoa.filter((r) => Array.isArray(r) && !isRowEmpty(r));
  if (nonEmptyRows.length === 0) {
    throw new Error('Sheet pertama file Excel Isian Singkat kosong. Isi soal terlebih dahulu.');
  }

  const Q_ALIASES = ['pertanyaan', 'soal', 'question', 'butir soal', 'teks soal', 'isi soal'];
  const KEY_ALIASES = [
    'kunci jawaban',
    'kunci',
    'jawaban',
    'answer',
    'kunci soal',
    'kj',
    'kunci jawaban bisa dipisah dengan / atau ;',
  ];
  const EXP_ALIASES = ['pembahasan', 'penjelasan', 'explanation', 'keterangan', 'uraian'];

  const findCol = (normed: string[], aliases: string[]) =>
    normed.findIndex((h) => aliases.includes(h) || aliases.some((al) => al.length > 3 && h.startsWith(al)));

  let headerIdx = -1;
  let qCol = -1;
  let keyCol = -1;
  let expCol = -1;

  for (let r = 0; r < Math.min(6, nonEmptyRows.length); r++) {
    const normed = nonEmptyRows[r].map(normHeader);
    const qc = findCol(normed, Q_ALIASES);
    const kc = findCol(normed, KEY_ALIASES);
    const ec = findCol(normed, EXP_ALIASES);
    if (qc >= 0 && kc >= 0) {
      headerIdx = r;
      qCol = qc;
      keyCol = kc;
      expCol = ec;
      break;
    }
  }

  const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;
  const parsed: EssayQuestion[] = [];
  const warnings: string[] = [];

  for (let r = startRow; r < nonEmptyRows.length; r++) {
    const row = nonEmptyRows[r];
    if (isRowEmpty(row)) continue;

    let question = '';
    let rawKey = '';
    let explanation = '';

    if (headerIdx >= 0) {
      question = cellStr(row, qCol);
      rawKey = cellStr(row, keyCol);
      explanation = cellStr(row, expCol);
    } else {
      // Headerless fallback: check whether Column 1 (index 0) is "No"
      const col0 = cellStr(row, 0);
      const hasNoCol = /^\d+[.)]?$/.test(col0) && row.length >= 3;
      const off = hasNoCol ? 1 : 0;
      question = cellStr(row, off);
      rawKey = cellStr(row, off + 1);
      explanation = cellStr(row, off + 2);
    }

    if (!question && !rawKey) continue;

    const acceptedAnswers = splitAcceptedKeys(rawKey);
    if (!question || acceptedAnswers.length === 0) {
      warnings.push(`Baris ${r + 1} Isian Singkat tidak memiliki pertanyaan atau kunci jawaban.`);
      continue;
    }

    parsed.push({
      no: parsed.length + 1,
      question,
      acceptedAnswers,
      rawKey,
      explanation,
    });
  }

  if (parsed.length === 0) {
    const hint =
      headerIdx < 0
        ? 'Pastikan kolom header berisi: Pertanyaan (atau Soal) dan Kunci Jawaban (atau Kunci) — atau susun tanpa header: No, Pertanyaan, Kunci Jawaban, Pembahasan.'
        : warnings[0] || 'Semua baris soal Isian Singkat tidak lengkap.';
    throw new Error(`Tidak ada soal Isian Singkat valid yang ditemukan. ${hint}`);
  }

  if (parsed.length < 5) {
    warnings.push(
      `Terbaca ${parsed.length} soal Isian Singkat (disarankan 5 soal untuk Pos Ujian Puncak).`,
    );
  }

  return {
    questions: parsed.slice(0, 5).map((q, i) => ({ ...q, no: i + 1 })),
    warnings,
  };
}

export async function parseEssayExcelQuestions(
  file: File,
): Promise<{ questions: EssayQuestion[]; warnings: string[] }> {
  const wb = await readWorkbookFromFile(file, 'Soal Isian Singkat');
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) {
    throw new Error('File Excel Isian Singkat tidak memiliki sheet yang dapat dibaca.');
  }
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[firstSheet], {
    header: 1,
    defval: '',
  });
  return parseEssayRowsFromAoA(aoa);
}

export function exportResultsToExcel(
  roomCode: string,
  leaderboard: ParticipantSummary[],
  exportRows: ExportStudentRow[],
  pgWeight = 75,
  essayWeight = 25,
) {
  const summarySheetData = leaderboard.map((row, i) => {
    const grade = computeFinalGrade(row.correctCount, row.essayCorrect || 0, pgWeight, essayWeight);
    return {
      Peringkat: i + 1,
      'Nama Siswa': row.name,
      'CP Tercapai': `${row.currentCP} / 25`,
      'PG Benar (0-25)': row.correctCount,
      'Isian Singkat Benar (0-5)': row.essayCorrect || 0,
      'Total Soal Benar (0-30)': grade.totalCorrect,
      [`Nilai PG (/${pgWeight})`]: grade.pgScore,
      [`Nilai Isian (/${essayWeight})`]: grade.essayScore,
      'Total Nilai Akhir (0-100)': grade.totalScore,
      'Skor Poin Ekspedisi': row.score,
      'Jumlah Jatuh': row.fallCount,
      Status: row.finished ? 'Selesai Ujian Puncak' : row.currentCP >= 25 ? 'Di Puncak (Belum Isian)' : 'Dalam Pendakian',
    };
  });

  const essayDetailData: Array<Record<string, string | number>> = [];
  exportRows.forEach((stu) => {
    if (!stu.essayAnswers || stu.essayAnswers.length === 0) {
      essayDetailData.push({
        'Nama Siswa': stu.name,
        'No Isian': '-',
        Pertanyaan: '(Belum mengerjakan Ujian Isian Puncak)',
        'Jawaban Ketikan Siswa': '-',
        'Kunci Jawaban Diterima': '-',
        Status: '-',
        'Waktu Jawab (dtk)': '-',
      });
    } else {
      stu.essayAnswers.forEach((ans) => {
        essayDetailData.push({
          'Nama Siswa': stu.name,
          'No Isian': `Isian ${ans.no}`,
          Pertanyaan: ans.question,
          'Jawaban Ketikan Siswa': ans.studentAnswer || '(Kosong)',
          'Kunci Jawaban Diterima': ans.correctKey,
          Status: ans.isCorrect ? 'Benar' : 'Salah',
          'Waktu Jawab (dtk)': ans.timeSpent,
        });
      });
    }
  });

  const detailSheetData: Array<Record<string, string | number>> = [];
  exportRows.forEach((stu) => {
    if (!stu.answers || stu.answers.length === 0) {
      detailSheetData.push({
        'Nama Siswa': stu.name,
        Checkpoint: '-',
        Pertanyaan: '(Belum menjawab soal PG)',
        'Jawaban Siswa': '-',
        'Kunci Jawaban': '-',
        Status: '-',
        'Waktu Jawab (dtk)': '-',
      });
    } else {
      stu.answers.forEach((ans) => {
        detailSheetData.push({
          'Nama Siswa': stu.name,
          Checkpoint: `CP ${ans.cp}`,
          Pertanyaan: ans.question,
          'Jawaban Siswa': ans.chosen || 'TIMEOUT',
          'Kunci Jawaban': ans.correctKey,
          Status: ans.isCorrect ? 'Benar' : 'Salah',
          'Waktu Jawab (dtk)': ans.timeSpent,
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(summarySheetData);
  const ws2 = XLSX.utils.json_to_sheet(essayDetailData);
  const ws3 = XLSX.utils.json_to_sheet(detailSheetData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Rekap_Nilai_Akhir');
  XLSX.utils.book_append_sheet(wb, ws2, 'Rincian_Isian_Singkat');
  XLSX.utils.book_append_sheet(wb, ws3, 'Detail_Pilihan_Ganda');
  XLSX.writeFile(wb, `Rekap_Nilai_WOWO_Peak_${roomCode}.xlsx`);
}

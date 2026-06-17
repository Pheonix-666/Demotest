import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  deadline?: string;
  isActive: boolean;
}

export interface Submission {
  id: string;
  examId: string;
  examTitle: string;
  studentName: string;
  studentId: string;
  fileName: string;
  filePath: string;
  submittedAt: string;
  fileSize: number;
}

// ── EXAMS ──
export function getExams(): Exam[] {
  ensureDataDir();
  if (!fs.existsSync(EXAMS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(EXAMS_FILE, 'utf-8')); }
  catch { return []; }
}

export function saveExam(exam: Exam): void {
  ensureDataDir();
  const exams = getExams();
  exams.push(exam);
  fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2));
}

export function updateExam(id: string, updates: Partial<Exam>): boolean {
  const exams = getExams();
  const idx = exams.findIndex(e => e.id === id);
  if (idx === -1) return false;
  exams[idx] = { ...exams[idx], ...updates };
  fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2));
  return true;
}

export function deleteExam(id: string): boolean {
  const exams = getExams();
  const filtered = exams.filter(e => e.id !== id);
  if (filtered.length === exams.length) return false;
  fs.writeFileSync(EXAMS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

// ── SUBMISSIONS ──
export function getSubmissions(): Submission[] {
  ensureDataDir();
  if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8')); }
  catch { return []; }
}

export function saveSubmission(sub: Submission): void {
  ensureDataDir();
  const subs = getSubmissions();
  subs.push(sub);
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(subs, null, 2));
}

export function deleteSubmission(id: string): boolean {
  const subs = getSubmissions();
  const filtered = subs.filter(s => s.id !== id);
  if (filtered.length === subs.length) return false;
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

// ── ADMIN AUTH ──
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

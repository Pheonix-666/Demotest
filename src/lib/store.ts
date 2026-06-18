import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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

// Helper to map DB row to Exam interface
function mapExamFromDb(row: any): Exam {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    fileName: row.file_name,
    filePath: row.file_path,
    uploadedAt: row.uploaded_at,
    deadline: row.deadline || undefined,
    isActive: row.is_active,
  };
}

// Helper to map Exam interface to DB row
function mapExamToDb(exam: Exam): any {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    file_name: exam.fileName,
    file_path: exam.filePath,
    uploaded_at: exam.uploadedAt,
    deadline: exam.deadline || null,
    is_active: exam.isActive,
  };
}

// Helper to map DB row to Submission interface
function mapSubmissionFromDb(row: any): Submission {
  return {
    id: row.id,
    examId: row.exam_id,
    examTitle: row.exam_title,
    studentName: row.student_name,
    studentId: row.student_id,
    fileName: row.file_name,
    filePath: row.file_path,
    submittedAt: row.submitted_at,
    fileSize: row.file_size,
  };
}

// Helper to map Submission interface to DB row
function mapSubmissionToDb(sub: Submission): any {
  return {
    id: sub.id,
    exam_id: sub.examId,
    exam_title: sub.examTitle,
    student_name: sub.studentName,
    student_id: sub.studentId,
    file_name: sub.fileName,
    file_path: sub.filePath,
    submitted_at: sub.submittedAt,
    file_size: sub.fileSize,
  };
}

// ── EXAMS DATABASE OPERATIONS ──
export async function getExams(): Promise<Exam[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized. Returning empty exams list.');
    return [];
  }
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('uploaded_at', { ascending: false });
  if (error) {
    console.error('Error fetching exams:', error);
    return [];
  }
  return (data || []).map(mapExamFromDb);
}

export async function saveExam(exam: Exam): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized.');
  const { error } = await supabase
    .from('exams')
    .insert([mapExamToDb(exam)]);
  if (error) throw error;
}

export async function updateExam(id: string, updates: Partial<Exam>): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client not initialized.');
  
  const dbUpdates: any = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.fileName !== undefined) dbUpdates.file_name = updates.fileName;
  if (updates.filePath !== undefined) dbUpdates.file_path = updates.filePath;
  if (updates.uploadedAt !== undefined) dbUpdates.uploaded_at = updates.uploadedAt;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline || null;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase
    .from('exams')
    .update(dbUpdates)
    .eq('id', id);
  if (error) {
    console.error('Error updating exam:', error);
    return false;
  }
  return true;
}

export async function deleteExam(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client not initialized.');
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting exam:', error);
    return false;
  }
  return true;
}

// ── SUBMISSIONS DATABASE OPERATIONS ──
export async function getSubmissions(): Promise<Submission[]> {
  if (!supabase) {
    console.warn('Supabase client not initialized. Returning empty submissions list.');
    return [];
  }
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
  return (data || []).map(mapSubmissionFromDb);
}

export async function saveSubmission(sub: Submission): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized.');
  const { error } = await supabase
    .from('submissions')
    .insert([mapSubmissionToDb(sub)]);
  if (error) throw error;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client not initialized.');
  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting submission:', error);
    return false;
  }
  return true;
}

// ── STORAGE BUCKET OPERATIONS ──

export async function uploadExamFile(fileName: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.storage
    .from('EXAMS')
    .upload(fileName, buffer, {
      contentType,
      upsert: true
    });
  if (error) throw error;
  return data.path;
}

export async function uploadSubmissionFile(fileName: string, buffer: Buffer, contentType: string): Promise<string> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.storage
    .from('SUBMISSIONS')
    .upload(fileName, buffer, {
      contentType,
      upsert: true
    });
  if (error) throw error;
  return data.path;
}

export async function downloadExamFile(filePath: string): Promise<Buffer> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.storage
    .from('EXAMS')
    .download(filePath);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadSubmissionFile(filePath: string): Promise<Buffer> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { data, error } = await supabase.storage
    .from('SUBMISSIONS')
    .download(filePath);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteExamFile(filePath: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { error } = await supabase.storage
    .from('EXAMS')
    .remove([filePath]);
  if (error) throw error;
}

export async function deleteSubmissionFile(filePath: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client is not initialized.');
  const { error } = await supabase.storage
    .from('SUBMISSIONS')
    .remove([filePath]);
  if (error) throw error;
}

// ── ADMIN AUTH ──
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

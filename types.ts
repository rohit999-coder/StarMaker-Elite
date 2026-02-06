
export interface FormData {
  singerName: string;
  singerId: string; // Unique ID provided by Admin
  dp: string;       // Base64 Profile Picture
}

export interface AIReviewResult {
  score: number;
  strengths: string[];
  suggestions: string[];
  toneAnalysis: string;
}

export interface EvaluationOrder {
  id: string;
  singerId: string;
  assignedJudgeId: string; // The specific judge assigned to this task
  assignedAt: string;
  status: 'PENDING' | 'COMPLETED';
  score?: number;
  taskTitle: string;
}

export interface JudgeRecord {
  id: string;
  judgeId: string;   // Unique ID created by Admin (e.g., JDG-1234)
  password: string;  // Created by Admin
  name: string;      // Judge's name
}

export interface SavedRecord extends FormData {
  id: string;
  password: string; // Assigned by Admin
  submittedAt: string;
  aiReview?: AIReviewResult;
  isProfileSet: boolean;
  judgeMark?: number; // Overall/Latest score given by the human judge
  isOnline?: boolean; // Availability status for judging
  isBanned?: boolean; // Account suspension status
  orders?: EvaluationOrder[]; // History of evaluation assignments
}

export type UserRole = 'SINGER' | 'JUDGE' | 'ADMIN' | 'GUEST';
export type FormStep = 'LANDING' | 'LOGIN' | 'FORM' | 'REVIEW' | 'SUCCESS' | 'RECORDS' | 'JUDGE_VIEW' | 'SINGER_HOME';

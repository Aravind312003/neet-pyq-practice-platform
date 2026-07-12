export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Question {
  id: number | string;
  year: number;
  question_number: number;
  subject: string;
  chapter: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
}

export interface TestResult {
  score: number;
  percentage: number;
  accuracy: number;
  correct: number;
  wrong: number;
  unanswered: number;
  timeTaken: number;
  testType: 'year' | 'random';
  year: string | number;
  questions: Question[];
  answers: { [key: string]: string };
}

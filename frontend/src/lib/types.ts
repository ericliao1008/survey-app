export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "text_short"
  | "text_long"
  | "likert_5"
  | "rating_10"
  | "number"
  | "date";

export interface Option {
  id: number;
  order: number;
  text: string;
  value: string;
}

export interface Question {
  id: number;
  order: number;
  type: QuestionType;
  text: string;
  required: boolean;
  config?: Record<string, unknown> | null;
  options: Option[];
}

export interface Survey {
  id: number;
  slug: string;
  title: string;
  description?: string | null;
  is_active: boolean;
  questions: Question[];
}

/** 填写中的答案值 */
export type AnswerValue =
  | { kind: "text"; value: string }
  | { kind: "number"; value: number }
  | { kind: "options"; value: number[] }
  | { kind: "none" };

export interface AnswerPayload {
  question_id: number;
  value_text?: string | null;
  value_number?: number | null;
  selected_option_ids?: number[] | null;
}

export interface SubmitPayload {
  visitor_id: string;
  answers: AnswerPayload[];
}

/** 统计结果 */
export interface QuestionStat {
  question_id: number;
  order: number;
  text: string;
  type: QuestionType;
  answered: number;
  options?: { text: string; value: string; count: number }[];
  mean?: number;
  min?: number;
  max?: number;
}

export interface SurveyStats {
  survey_slug: string;
  survey_title: string;
  total_responses: number;
  questions: QuestionStat[];
}

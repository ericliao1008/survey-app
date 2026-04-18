export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "text_short"
  | "text_long"
  | "likert_5"
  | "rating_10"
  | "number"
  | "date"
  | "matrix_single"
  | "matrix_likert"
  | "matrix_multi"
  | "cbc_task";

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

/** CBC 联合分析方案（一个属性集合的快照） */
export interface CBCProfile {
  [attrKey: string]: string;
}

export interface CBCAnswer {
  profiles: CBCProfile[];
  choice: "A" | "B" | "C" | "none" | null;
}

/** 矩阵题答案：
 * - matrix_single: 每行 value → 单列 value (string)
 * - matrix_likert: 每行 value → 1-5 评分 (number)
 * - matrix_multi:  每行 value → 多列 value 数组 (string[])
 */
export type MatrixAnswer = Record<string, string | number | string[]>;

/** 运行时的题目实例：普通题 = question；pipe 题 = question + pipeOption */
export interface QuestionInstance {
  key: string; // 唯一键：`${question.id}` 或 `${question.id}:${pipeOption.id}`
  question: Question;
  pipeOption: Option | null;
}

/** 填写中的答案值 */
export interface AnswerState {
  text?: string;
  number?: number | null;
  optionIds?: number[];
  singleOptionId?: number | null;
  date?: string;
  matrix?: MatrixAnswer;
  cbc?: CBCAnswer;
  /** 选项级附加文本：key=option_id，value=用户填写内容（对应 option_extras） */
  optionTexts?: Record<number, string>;
}

export interface AnswerPayload {
  question_id: number;
  value_text?: string | null;
  value_number?: number | null;
  selected_option_ids?: number[] | null;
  value_json?: Record<string, unknown> | null;
  pipe_option_id?: number | null;
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

export type SurveyQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'short_text'
  | 'long_text'
  | 'scale'
  | 'boolean'

export interface SurveyOption {
  id: number
  label: string
  value: string
  position: number
}

export interface SurveyQuestion {
  id: number
  question: string
  type: SurveyQuestionType
  position: number
  required: boolean
  scale_min: number | null
  scale_max: number | null
  help_text: string | null
  options?: SurveyOption[]
}

export interface Survey {
  id: number
  promotion_id: number
  title: string
  description: string | null
  status: 'draft' | 'published' | 'closed'
  starts_at: string | null
  ends_at: string | null
  published_at: string | null
  closed_at: string | null
  questions: SurveyQuestion[]
}

export interface SurveyResponseAnswer {
  question_id: number
  value: unknown
}

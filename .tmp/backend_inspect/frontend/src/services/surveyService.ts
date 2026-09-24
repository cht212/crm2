import { $api } from '@/utils/api'
import type { Survey, SurveyResponseAnswer } from '@/types/survey'
import type { SurveyForm } from '@/types/promotion'

export const surveyService = {
  async createSurvey(promotionId: number, data: SurveyForm) {
    return await $api<{ survey: Survey }>(`promotions/${promotionId}/survey`, {
      method: 'POST',
      body: data,
    })
  },

  async updateSurvey(id: number, data: Partial<SurveyForm>) {
    return await $api<{ survey: Survey }>(`surveys/${id}`, {
      method: 'PATCH',
      body: data,
    })
  },

  async publishSurvey(id: number) {
    return await $api<{ survey: Survey }>(`surveys/${id}/publish`, { method: 'POST' })
  },

  async closeSurvey(id: number) {
    return await $api<{ survey: Survey }>(`surveys/${id}/close`, { method: 'POST' })
  },

  async getResults(id: number) {
    return await $api<{ results: SurveyResults }>(`surveys/${id}/results`)
  },

  async getSurvey(id: number) {
    return await $api<{ survey: Survey }>(`surveys/${id}`)
  },

  async getMyResponse(id: number) {
    return await $api<{ has_responded: boolean }>(`surveys/${id}/my-response`)
  },

  async submitResponse(id: number, answers: SurveyResponseAnswer[]) {
    return await $api<{ message: string; response_id: number }>(`surveys/${id}/responses`, {
      method: 'POST',
      body: { answers },
    })
  },
}

export interface SurveyResults {
  survey_id: number
  total_responses: number
  respondents: {
    response_id: number
    user_id: string
    name: string | null
    email: string | null
    company_name: string | null
    submitted_at: string | null
    answers: {
      question_id: number
      value: unknown
    }[]
  }[]
  questions: {
    question_id: number
    question: string
    type: string
    responses: number
    average?: number | null
    distribution?: Record<string, number>
    text_responses?: string[]
  }[]
}

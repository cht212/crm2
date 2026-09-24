import type { Survey, SurveyQuestionType } from '@/types/survey'

export interface Promotion {
  id: number
  title: string
  summary: string
  content: string
  type_post: 'news' | 'promotion' | 'survey' | string
  author_id: string
  author?: { id: string; name: string }
  image_url: string | null
  published_at: string | null
  starts_at: string | null
  ends_at: string | null
  audience_type: 'all' | 'selected'
  customers?: { id: number; company_name: string }[]
  status: 'draft' | 'published' | 'archived'
  images?: PromotionImage[]
  attachments?: PromotionAttachment[]
  embeds: PromotionEmbedForm[]
  survey?: Survey | null
}

export interface PromotionImage {
  id: number
  url: string
  alt_text: string | null
  sort_order: number
}

export interface PromotionAttachment {
  id: number
  name: string
  mime_type: string
  size: number
  url: string
  sort_order: number
}

export interface PromotionForm {
  title: string
  summary: string
  content: string
  type_post: 'news' | 'promotion' | 'survey'
  image_url: string
  published_at: string | null
  starts_at: string | null
  ends_at: string | null
  audience_type: 'all' | 'selected'
  customer_ids: number[]
  status: Promotion['status']
  images: File[]
  existingImages: PromotionImage[]
  deletedImageIds: number[]
  attachments: File[]
  existingAttachments: PromotionAttachment[]
  deletedAttachmentIds: number[]
  embeds: PromotionEmbedForm[]
  survey?: SurveyForm
}

export interface PromotionEmbedForm {
  id?: number
  platform: 'tiktok' | 'facebook' | 'instagram' | 'youtube'
  url: string
  title?: string
}

export interface PromotionListResponse {
  promotions: Promotion[]
  totalPromotions: number
  per_page: number
  current_page: number
}

export interface SurveyFormQuestion {
  question: string
  type: SurveyQuestionType
  position: number
  required: boolean
  scale_min: number | null
  scale_max: number | null
  help_text: string
  options: { label: string; value: string; position: number }[]
}

export interface SurveyForm {
  title: string
  description: string
  status: 'draft' | 'published'
  starts_at: string | null
  ends_at: string | null
  questions: SurveyFormQuestion[]
}

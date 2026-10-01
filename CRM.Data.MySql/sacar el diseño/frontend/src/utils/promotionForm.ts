import type { Promotion, PromotionForm, SurveyForm } from '@/types/promotion'

export const emptySurveyForm = () => ({
  title: '',
  description: '',
  status: 'draft' as const,
  starts_at: null,
  ends_at: null,
  questions: [],
})

export const normalizeSurveyForm = (survey: SurveyForm): SurveyForm => ({
  ...survey,
  questions: survey.questions.map((question, index) => ({
    ...question,
    position: index + 1,
    required: Boolean(question.required),
    scale_min: question.type === 'scale'
      ? (question.scale_min !== null && Number.isFinite(Number(question.scale_min))
          ? Number(question.scale_min)
          : 1)
      : null,
    scale_max: question.type === 'scale'
      ? (question.scale_max !== null && Number.isFinite(Number(question.scale_max))
          ? Number(question.scale_max)
          : 5)
      : null,
    options: question.type === 'single_choice' || question.type === 'multiple_choice'
      ? question.options.map((option, optionIndex) => ({
          ...option,
          position: optionIndex + 1,
        }))
      : [],
  })),
})

export const emptyPromotionForm = (): PromotionForm => ({
  title: '',
  summary: '',
  content: '<p></p>',
  type_post: 'news',
  image_url: '',
  published_at: null,
  starts_at: null,
  ends_at: null,
  audience_type: 'all',
  customer_ids: [],
  status: 'draft',
  images: [],
  existingImages: [],
  deletedImageIds: [],
  attachments: [],
  existingAttachments: [],
  deletedAttachmentIds: [],
  embeds: [],
  survey: emptySurveyForm(),
})

export const promotionToForm = (promotion: Promotion): PromotionForm => ({
  title: promotion.title,
  summary: promotion.summary,
  content: promotion.content,
  type_post: promotion.type_post as PromotionForm['type_post'],
  image_url: promotion.image_url ?? '',
  published_at: promotion.published_at,
  starts_at: promotion.starts_at,
  ends_at: promotion.ends_at,
  audience_type: promotion.audience_type ?? 'all',
  customer_ids: promotion.customers?.map(customer => customer.id) ?? [],
  status: promotion.status,
  images: [],
  existingImages: promotion.images ?? [],
  deletedImageIds: [],
  attachments: [],
  existingAttachments: promotion.attachments ?? [],
  deletedAttachmentIds: [],
  embeds: promotion.embeds ?? [],
  survey: promotion.survey
    ? {
        title: promotion.survey.title,
        description: promotion.survey.description ?? '',
        status: promotion.survey.status === 'published' ? 'published' : 'draft',
        starts_at: promotion.survey.starts_at,
        ends_at: promotion.survey.ends_at,
        questions: promotion.survey.questions.map(question => ({
          question: question.question,
          type: question.type,
          position: question.position,
          required: question.required,
          scale_min: question.scale_min,
          scale_max: question.scale_max,
          help_text: question.help_text ?? '',
          options: question.options?.map(option => ({
            label: option.label,
            value: option.value,
            position: option.position,
          })) ?? [],
        })),
      }
    : emptySurveyForm(),
})

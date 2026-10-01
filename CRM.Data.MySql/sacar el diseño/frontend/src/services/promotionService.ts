import type { Promotion, PromotionForm, PromotionListResponse } from '@/types/promotion'
import { $api } from '@/utils/api'

const toFormData = (data: PromotionForm) => {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (key === 'images' || key === 'existingImages' || key === 'deletedImageIds' || key === 'attachments' || key === 'existingAttachments' || key === 'deletedAttachmentIds' || key === 'embeds' || key === 'customer_ids' || key === 'survey')
      return

    if (value !== null && (value !== '' || key === 'image_url'))
      formData.append(key, String(value))
  })

  data.images.forEach(image => formData.append('images[]', image))
  data.deletedImageIds.forEach(id => formData.append('deleted_image_ids[]', String(id)))
  data.attachments.forEach(file => formData.append('attachments[]', file))
  data.deletedAttachmentIds.forEach(id => formData.append('deleted_attachment_ids[]', String(id)))
  data.embeds.forEach((embed, index) => {
    formData.append(`embeds[${index}][platform]`, embed.platform)
    formData.append(`embeds[${index}][url]`, embed.url)
    if (embed.title)
      formData.append(`embeds[${index}][title]`, embed.title)
  })
  data.customer_ids.forEach(id => formData.append('customer_ids[]', String(id)))

  return formData
}

export const promotionService = {
  async getPromotions(params: Record<string, string | number | boolean> = {}) {
    return await $api<PromotionListResponse>('promotions', { query: params })
  },

  async getPromotion(id: number) {
    return await $api<{ promotion: Promotion }>(`promotions/${id}`)
  },

  async createPromotion(data: PromotionForm) {
    return await $api<{ promotion: Promotion }>('promotions', {
      method: 'POST',
      body: toFormData(data),
    })
  },

  async updatePromotion(id: number, data: PromotionForm) {
    const body = toFormData(data)

    body.append('embeds_present', '1')
    body.append('_method', 'PUT')

    return await $api<{ promotion: Promotion }>(`promotions/${id}`, {
      method: 'POST',
      body,
    })
  },

  async archivePromotion(id: number) {
    return await $api<{ promotion: Promotion }>(`promotions/${id}/archive`, {
      method: 'POST',
    })
  },
}

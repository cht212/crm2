import type { Promotion } from '@/types/promotion'

export const promotionTypeLabels: Record<string, string> = {
  news: 'Novedad',
  promotion: 'Promoción',
  survey: 'Encuesta',
}

export const promotionStatusLabels: Record<Promotion['status'], string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
}

export const promotionTypeLabel = (type: Promotion['type_post']) =>
  promotionTypeLabels[type] ?? 'Novedad'

export const promotionStatusLabel = (status: Promotion['status']) =>
  promotionStatusLabels[status] ?? 'Sin estado'

export const promotionStatusColor = (status: Promotion['status']) =>
  status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'secondary'

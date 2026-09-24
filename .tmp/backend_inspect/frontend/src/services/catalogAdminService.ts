import { $api } from '@/utils/api'

export interface CatalogAdminItem {
  id?: number
  product_type_id?: number
  type_id?: number
  subtype_id?: number
  name?: string
  code?: string
  description?: string | null
  value?: number | string
  unit?: string
  related_value?: string
  max_quantity?: number
  is_active?: boolean
  uses_finish?: boolean
  uses_lengths?: boolean
  uses_series?: boolean
  uses_thickness?: boolean
  uses_dimensions?: boolean
  finish?: { id?: number }
  products?: CatalogAdminItem[]
  series?: CatalogAdminItem[]
  lengths?: CatalogAdminItem[]
  characteristics?: CatalogAdminItem[]
  finishes?: CatalogAdminItem[]
  thicknesses?: CatalogAdminItem[]
  type?: CatalogAdminItem
  [key: string]: unknown
}

export interface CatalogAdminResponse {
  data: CatalogAdminItem[]
  meta?: { total: number; current_page: number; per_page: number }
}

type CatalogAdminResourceResponse = CatalogAdminItem | { data: CatalogAdminItem }

const unwrapResource = (response: CatalogAdminResourceResponse): CatalogAdminItem =>
  'data' in response && response.data && !Array.isArray(response.data)
    ? { ...response.data }
    : response

export const catalogAdminService = {
  async list(resource: string, params: Record<string, string | number | boolean> = {}) {
    return await $api<CatalogAdminResponse>(`catalog/${resource}`, { query: params })
  },

  async create(resource: string, data: CatalogAdminItem) {
    const response = await $api<CatalogAdminResourceResponse>(`catalog/${resource}`, {
      method: 'POST',
      body: data,
    })

    return unwrapResource(response)
  },

  async show(resource: string, id: number) {
    const response = await $api<CatalogAdminResourceResponse>(`catalog/${resource}/${id}`)

    return unwrapResource(response)
  },

  async update(resource: string, id: number | string, data: CatalogAdminItem) {
    const response = await $api<CatalogAdminResourceResponse>(`catalog/${resource}/${id}`, {
      method: 'PUT',
      body: data,
    })

    return unwrapResource(response)
  },

  async remove(resource: string, id: number | string) {
    return await $api(`catalog/${resource}/${id}`, { method: 'DELETE' })
  },
}

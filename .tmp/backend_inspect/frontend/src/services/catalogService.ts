import type { CatalogType } from '@/types/catalog'

export const getQuoteConfigurations = async (): Promise<CatalogType[]> => {
  return await $api<CatalogType[]>('/catalog/quote-configurations')
}

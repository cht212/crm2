import { onMounted, ref, watch } from 'vue'
import { promotionService } from '@/services/promotionService'
import type { Promotion } from '@/types/promotion'

export function usePromotionManagement() {
  const items = ref<Promotion[]>([])
  const loading = ref(false)
  const error = ref('')
  const search = ref('')
  const page = ref(1)
  const itemsPerPage = ref(10)
  const total = ref(0)

  const load = async () => {
    loading.value = true
    error.value = ''

    try {
      const response = await promotionService.getPromotions({
        q: search.value,
        page: page.value,
        itemsPerPage: itemsPerPage.value,
      })

      items.value = response.promotions
      total.value = response.totalPromotions
    }
    catch (requestError) {
      console.error(requestError)
      error.value = 'No se pudieron cargar las publicaciones.'
    }
    finally {
      loading.value = false
    }
  }

  const archive = async (item: Promotion) => {
    await promotionService.archivePromotion(item.id)
    await load()
  }

  watch([search, page, itemsPerPage], load)
  onMounted(load)

  return {
    items,
    loading,
    error,
    search,
    page,
    itemsPerPage,
    total,
    archive,
  }
}

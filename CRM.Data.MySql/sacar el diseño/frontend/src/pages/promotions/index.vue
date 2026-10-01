<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { promotionService } from '@/services/promotionService'
import type { Promotion } from '@/types/promotion'
import { promotionTypeLabel } from '@/utils/promotionPresentation'

type NewsFilter = 'all' | 'news' | 'promotion' | 'survey'

const selectedFilter = ref<NewsFilter>('all')
const newsItems = ref<Promotion[]>([])
const isLoading = ref(false)
const itemsPerPage = ref(6)
const page = ref(1)
const totalItems = ref(0)
const currentTime = ref(Date.now())
let countdownInterval: ReturnType<typeof setInterval> | undefined

const snackbar = ref(false)
const snackbarMessage = ref('')

const promotionsCount = computed(() => selectedFilter.value === 'promotion' ? totalItems.value : null)

const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))

const filterOptions: { value: NewsFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'Todas', icon: 'ri-apps-line' },
  { value: 'news', label: 'Novedades', icon: 'ri-notification-3-line' },
  { value: 'promotion', label: 'Promociones', icon: 'ri-price-tag-3-line' },
  { value: 'survey', label: 'Encuestas', icon: 'ri-questionnaire-line' },
]

const promotionTypeColor = (type: Promotion['type_post']) => {
  if (type === 'promotion')
    return 'success'

  if (type === 'survey')
    return 'warning'

  return 'primary'
}

const formatDate = (date: string | null) => {
  if (!date)
    return 'Sin fecha de publicación'

  return new Date(date).toLocaleDateString('es-PE')
}

const parsePromotionDate = (date: string | null) => {
  if (!date)
    return null

  const dateParts = date.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/)

  const normalizedDate = dateParts
    ? `${dateParts[1]}T${dateParts[2]}`
    : date

  const timestamp = new Date(normalizedDate).getTime()

  return Number.isNaN(timestamp) ? null : timestamp
}

const formatRemainingTime = (totalSeconds: number) => {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0)
    return `${days}d ${String(hours).padStart(2, '0')}h`

  if (hours > 0)
    return `${hours}h ${String(minutes).padStart(2, '0')}m`

  return `${minutes}m`
}

const promotionCountdown = (item: Promotion) => {
  if (item.type_post !== 'promotion')
    return null

  const startsAt = parsePromotionDate(item.starts_at)
  const endsAt = parsePromotionDate(item.ends_at)
  const now = currentTime.value

  if (startsAt && now < startsAt) {
    return {
      text: `Comienza en ${formatRemainingTime(Math.ceil((startsAt - now) / 1000))}`,
      color: 'primary',
      icon: 'ri-time-line',
    }
  }

  if (endsAt && now < endsAt) {
    return {
      text: `Termina en ${formatRemainingTime(Math.ceil((endsAt - now) / 1000))}`,
      color: 'success',
      icon: 'ri-flashlight-line',
    }
  }

  if (endsAt) {
    return {
      text: 'Promoción finalizada',
      color: 'secondary',
      icon: 'ri-time-line',
    }
  }

  return null
}

const loadNewsItems = async () => {
  isLoading.value = true

  try {
    const response = await promotionService.getPromotions({
      active_only: true,
      itemsPerPage: itemsPerPage.value,
      page: page.value,
      ...(selectedFilter.value !== 'all' ? { type_post: selectedFilter.value } : {}),
    })

    newsItems.value = response.promotions
    totalItems.value = response.totalPromotions
  }
  catch (error) {
    console.error('No se pudieron cargar las novedades.', error)
    snackbarMessage.value = 'No se pudieron cargar las novedades.'
    snackbar.value = true
  }
  finally {
    isLoading.value = false
  }
}

const handlePromotionPublished = () => {
  page.value = 1
  void loadNewsItems()
}

onMounted(() => {
  countdownInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)

  loadNewsItems()
  window.addEventListener('app:promotion-published', handlePromotionPublished)
})

onUnmounted(() => {
  if (countdownInterval)
    clearInterval(countdownInterval)

  window.removeEventListener('app:promotion-published', handlePromotionPublished)
})

watch(selectedFilter, () => {
  const wasFirstPage = page.value === 1
  page.value = 1

  if (wasFirstPage)
    void loadNewsItems()
})

watch(page, () => {
  void loadNewsItems()
})
</script>

<template>
  <div>
    <VCard
      class="mb-6 promotions-hero"
      color="primary"
      variant="tonal"
    >
      <VCardText class="py-10 py-md-12 position-relative">
        <div
          class="d-flex flex-column gap-y-4 mx-auto"
          :class="$vuetify.display.mdAndUp ? 'w-50' : 'w-100'"
        >
          <div class="d-flex justify-center">
            <VAvatar
              color="primary"
              variant="flat"
              size="56"
              rounded
            >
              <VIcon
                icon="ri-megaphone-line"
                size="28"
              />
            </VAvatar>
          </div>

          <h4
            class="text-h4 text-center text-wrap mx-auto"
            :class="$vuetify.display.mdAndUp ? 'w-75' : 'w-100'"
          >
            Lo más reciente de
            <span class="text-primary">HPD Glass Group.</span>
          </h4>

          <p class="text-center text-wrap text-body-1 mx-auto mb-0">
            Revisa nuestros comunicados, promociones y encuestas disponibles para ti.
          </p>

          <div class="d-flex justify-center align-center flex-wrap ga-2 mt-2">
            <VChip
              v-for="filter in filterOptions"
              :key="filter.value"
              :color="selectedFilter === filter.value ? 'primary' : undefined"
              :variant="selectedFilter === filter.value ? 'flat' : 'outlined'"
              filter
              :prepend-icon="filter.icon"
              @click="selectedFilter = filter.value"
            >
              {{ filter.label }}
            </VChip>
          </div>
        </div>
      </VCardText>
    </VCard>

    <VCard>
      <VCardText class="pa-4 pa-md-6">
        <div class="d-flex justify-space-between align-center flex-wrap ga-4 mb-6">
          <div>
            <h5 class="text-h5 mb-1">
              Para ti
            </h5>
            <div class="text-body-2 text-medium-emphasis">
              {{ totalItems }} {{ totalItems === 1 ? 'publicación disponible' : 'publicaciones disponibles' }}
            </div>
          </div>

          <VChip
            v-if="promotionsCount !== null"
            color="success"
            variant="tonal"
          >
            {{ promotionsCount }} promociones
          </VChip>
        </div>

        <VRow
          v-if="isLoading"
          class="match-height"
        >
          <VCol
            v-for="item in 6"
            :key="item"
            cols="12"
            md="4"
            sm="6"
          >
            <VSkeletonLoader type="card" />
          </VCol>
        </VRow>

        <VAlert
          v-else-if="newsItems.length === 0"
          type="info"
          variant="tonal"
        >
          No hay comunicados disponibles para este filtro.
        </VAlert>

        <VRow
          v-else
          class="match-height promotion-grid"
        >
          <VCol
            v-for="item in newsItems"
            :key="item.id"
            cols="12"
            md="4"
            sm="6"
          >
            <VCard
              flat
              border
              class="h-100 promotion-card"
            >
              <div class="promotion-card__media pa-2">
                <VImg
                  v-if="item.images?.[0]?.url || item.image_url"
                  :src="item.images?.[0]?.url || item.image_url || undefined"
                  height="196"
                  cover
                  rounded
                />
                <div
                  v-else
                  class="d-flex align-center justify-center bg-surface-variant rounded"
                  style="height: 180px;"
                >
                  <VIcon
                    :icon="item.type_post === 'survey' ? 'ri-questionnaire-line' : 'ri-image-line'"
                    size="40"
                    color="medium-emphasis"
                  />
                </div>
                <VChip
                  size="small"
                  :color="promotionTypeColor(item.type_post)"
                  variant="flat"
                  class="promotion-card__type"
                >
                  {{ promotionTypeLabel(item.type_post) }}
                </VChip>
              </div>

              <VCardText class="pt-3 pb-2">
                <h5 class="text-h5 mb-2 text-truncate">
                  {{ item.title }}
                </h5>

                <p class="mb-4 text-body-2 text-medium-emphasis promotion-card__summary">
                  {{ item.summary }}
                </p>

                <VChip
                  v-if="promotionCountdown(item)"
                  :color="promotionCountdown(item)?.color"
                  size="small"
                  variant="tonal"
                  class="mb-4"
                >
                  <VIcon
                    :icon="promotionCountdown(item)?.icon"
                    start
                    size="16"
                  />
                  {{ promotionCountdown(item)?.text }}
                </VChip>

                <div class="d-flex align-center text-body-2 text-medium-emphasis mb-2">
                  <VIcon
                    icon="ri-calendar-line"
                    size="16"
                    class="me-2"
                  />
                  Publicado el {{ formatDate(item.published_at) }}
                </div>
              </VCardText>

              <VCardActions class="px-4 pb-4 pt-0">
                <VBtn
                  block
                  color="primary"
                  variant="tonal"
                  :to="{ name: 'promotions-id', params: { id: item.id } }"
                >
                  Leer publicación
                  <VIcon
                    icon="ri-arrow-right-line"
                    end
                  />
                </VBtn>
              </VCardActions>
            </VCard>
          </VCol>
        </VRow>

        <VPagination
          v-if="totalPages > 1"
          v-model="page"
          rounded
          color="primary"
          :length="totalPages"
          class="mt-6"
        />
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar"
      color="error"
      location="top right"
      timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.promotions-hero {
  overflow: hidden;
}

.promotion-card {
  overflow: hidden;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.promotion-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(var(--v-theme-on-surface), 0.1);
}

.promotion-card__media {
  position: relative;
}

.promotion-card__type {
  position: absolute;
  inset-block-start: 1rem;
  inset-inline-start: 1rem;
}

.promotion-card__summary {
  display: -webkit-box;
  overflow: hidden;
  min-block-size: 3.1rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { promotionService } from "@/services/promotionService";
import PromotionCountdown from "@/components/promotions/PromotionCountdown.vue";
import PromotionEmbeds from "@/components/promotions/PromotionEmbeds.vue";
import type { Promotion } from "@/types/promotion";
import SurveyResponseForm from "@/components/surveys/SurveyResponseForm.vue";
import { promotionTypeLabel } from "@/utils/promotionPresentation";

const route = useRoute();
const promotion = ref<Promotion | null>(null);
const loading = ref(true);
const error = ref("");
const isPromotion = computed(() => promotion.value?.type_post === "promotion");
const isSurvey = computed(() => promotion.value?.type_post === "survey");
const promotionTypeColor = computed(() =>
  promotion.value?.type_post === "promotion"
    ? "success"
    : promotion.value?.type_post === "survey"
      ? "warning"
      : "primary",
);
const promotionTypeIcon = computed(() =>
  promotion.value?.type_post === "promotion"
    ? "ri-price-tag-3-line"
    : promotion.value?.type_post === "survey"
      ? "ri-questionnaire-line"
      : "ri-notification-3-line",
);

const parsePromotionDate = (date: string | null) => {
  if (!date) return null;

  /// La API devuelve cadenas ISO con formato UTC, pero estos campos representan
  // la programación local seleccionada en el formulario de la promoción.
  const dateParts = date.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/,
  );

  const normalizedDate = dateParts ? `${dateParts[1]}T${dateParts[2]}` : date;

  const timestamp = new Date(normalizedDate).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatDate = (date: string | null) => {
  if (!date) return "Fecha no disponible";

  const timestamp = parsePromotionDate(date);

  return timestamp
    ? new Date(timestamp).toLocaleDateString("es-PE")
    : "Fecha no disponible";
};

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024)
    return `${Math.ceil(size / 1024)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatPublishedDate = (date: string | null) => {
  if (!date) return "Fecha no disponible";

  const timestamp = parsePromotionDate(date);

  return timestamp
    ? new Intl.DateTimeFormat("es-PE", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(timestamp))
    : "Fecha no disponible";
};

const loadPromotion = async () => {
  loading.value = true;
  error.value = "";
  promotion.value = null;

  try {
    const response = await promotionService.getPromotion(
      Number(route.params.id),
    );

    promotion.value = response.promotion;
  } catch (requestError) {
    console.error(requestError);
    error.value = "La publicación que buscas no está disponible.";
  } finally {
    loading.value = false;
  }
};

onMounted(loadPromotion);

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId !== oldId)
      await loadPromotion();
  },
);
</script>

<template>
  <VSkeletonLoader v-if="loading" type="card" />

  <VAlert v-else-if="error || !promotion" type="info" variant="tonal">
    {{ error || "La publicación que buscas no está disponible." }}

    <template #append>
      <VBtn to="/promotions" variant="text"> Volver a promociones </VBtn>
    </template>
  </VAlert>

  <template v-else>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <VBtn
        to="/promotions"
        variant="text"
        prepend-icon="ri-arrow-left-line"
      >
        Volver a publicaciones
      </VBtn>
      <div class="text-body-2 text-medium-emphasis">
        Publicado el {{ formatPublishedDate(promotion.published_at) }}
      </div>
    </div>

    <VRow class="align-start">
      <VCol cols="12" :md="promotion.embeds?.length || isPromotion ? 8 : 12">
        <VCard class="promotion-detail-card">
          <VCarousel
            v-if="(promotion.images ?? []).length > 1"
            height="360"
            hide-delimiter-background
            show-arrows="hover"
          >
            <VCarouselItem
              v-for="image in promotion.images ?? []"
              :key="image.id"
              :src="image.url"
              cover
            />
          </VCarousel>
          <VImg
            v-else-if="promotion.images?.[0]?.url || promotion.image_url"
            :src="
              promotion.images?.[0]?.url || promotion.image_url || undefined
            "
            height="360"
            cover
          />
          <div
            v-else
            class="d-flex align-center justify-center bg-surface-variant"
            style="height: 360px;"
          >
            <VIcon
              :icon="isSurvey ? 'ri-questionnaire-line' : 'ri-image-line'"
              size="56"
              color="medium-emphasis"
            />
          </div>

          <VCardText class="pa-5 pa-md-8">
            <VChip
              :color="promotionTypeColor"
              variant="tonal"
              :prepend-icon="promotionTypeIcon"
              class="mb-4"
            >
              {{ promotionTypeLabel(promotion.type_post) }}
            </VChip>

            <h1 class="text-h4 text-md-h3 mb-3">
              {{ promotion.title }}
            </h1>

            <p class="text-body-1 text-medium-emphasis mb-5">
              {{ promotion.summary }}
            </p>

            <div class="d-flex flex-wrap ga-3 mb-6">
              <VChip
                v-if="isPromotion"
                size="small"
                color="success"
                variant="tonal"
                prepend-icon="ri-calendar-check-line"
              >
                Vigencia de la promoción
              </VChip>
              <VChip
                v-if="isSurvey"
                size="small"
                color="warning"
                variant="tonal"
                prepend-icon="ri-questionnaire-line"
              >
                Participa en la encuesta
              </VChip>
            </div>

            <VDivider class="mb-6" />

            <div
              v-if="isPromotion"
              class="promotion-dates d-flex flex-wrap ga-4 mb-8"
            >
              <div class="promotion-date">
                <VIcon icon="ri-play-circle-line" color="success" />
                <span>
                  <small>Inicia</small>
                  <strong>{{ formatDate(promotion.starts_at) }}</strong>
                </span>
              </div>
              <div class="promotion-date">
                <VIcon icon="ri-stop-circle-line" color="error" />
                <span>
                  <small>Finaliza</small>
                  <strong>{{ formatDate(promotion.ends_at) }}</strong>
                </span>
              </div>
            </div>

            <div class="promotion-content text-body-1">
              <!-- Content is generated by Tiptap and sanitized by the API contract. -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="promotion.content" />
            </div>

            <SurveyResponseForm
              v-if="isSurvey && promotion.survey"
              :survey="promotion.survey"
            />

            <VCard
              v-if="promotion.attachments?.length"
              variant="outlined"
              class="mt-8"
            >
              <VCardItem>
                <VCardTitle class="text-subtitle-1">
                  Archivos relacionados
                </VCardTitle>
                <VCardSubtitle>
                  Descarga la documentación de esta publicación.
                </VCardSubtitle>
              </VCardItem>
              <VList density="compact">
                <VListItem
                  v-for="attachment in promotion.attachments"
                  :key="attachment.id"
                  :href="attachment.url"
                  target="_blank"
                  rel="noopener"
                  :title="attachment.name"
                  :subtitle="formatFileSize(attachment.size)"
                >
                  <template #prepend>
                    <VIcon icon="ri-file-download-line" class="me-3" />
                  </template>
                  <template #append>
                    <VIcon icon="ri-external-link-line" />
                  </template>
                </VListItem>
              </VList>
            </VCard>
          </VCardText>
        </VCard>
      </VCol>

      <VCol v-if="promotion.embeds?.length || isPromotion" cols="12" md="4">
        <div class="embed-sidebar">
          <PromotionCountdown
            v-if="isPromotion"
            :starts-at="promotion.starts_at"
            :ends-at="promotion.ends_at"
          />

          <PromotionEmbeds
            v-if="promotion.embeds?.length"
            :embeds="promotion.embeds"
          />
        </div>
      </VCol>
    </VRow>
  </template>
</template>

<style scoped>
.promotion-detail-card {
  overflow: hidden;
}

.promotion-content {
  line-height: 1.8;
}

.promotion-content :deep(p) {
  margin-block-end: 1rem;
}

.promotion-content :deep(img) {
  max-inline-size: 100%;
  block-size: auto;
  border-radius: 0.75rem;
}

.promotion-content :deep(a) {
  color: rgb(var(--v-theme-primary));
}

.promotion-date {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-inline-size: 190px;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 0.75rem;
}

.promotion-date span {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.promotion-date small {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media (max-width: 959px) {
  .embed-sidebar {
    position: static;
  }
}
</style>

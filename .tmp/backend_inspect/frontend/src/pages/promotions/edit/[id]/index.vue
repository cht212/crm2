<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PromotionForm from '@/components/promotions/PromotionForm.vue'
import { promotionService } from '@/services/promotionService'
import { surveyService } from '@/services/surveyService'
import type { Promotion, PromotionForm as PromotionFormData } from '@/types/promotion'
import { emptyPromotionForm, normalizeSurveyForm, promotionToForm } from '@/utils/promotionForm'

definePage({ meta: { action: 'update', subject: 'Promotion' } })

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const loadError = ref('')
const validationErrors = ref<Record<string, string[]>>({})

const form = ref<PromotionFormData>(emptyPromotionForm())

const toDateTimeLocal = (value: string | null) => {
  if (!value)
    return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime()))
    return null

  const pad = (part: number) => String(part).padStart(2, '0')

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T')
}

const loadPromotion = async () => {
  loading.value = true
  loadError.value = ''

  try {
    const response = await promotionService.getPromotion(Number(route.params.id))

    const promotion = response.promotion

    form.value = {
      ...promotionToForm(promotion),
      published_at: toDateTimeLocal(promotion.published_at),
      starts_at: toDateTimeLocal(promotion.starts_at),
      ends_at: toDateTimeLocal(promotion.ends_at),
    }
  }
  catch (requestError) {
    console.error(requestError)
    loadError.value = 'No se pudo cargar la publicación.'
  }
  finally {
    loading.value = false
  }
}

onMounted(loadPromotion)

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId !== oldId)
      await loadPromotion()
  },
)

const submit = async (status: Promotion['status']) => {
  form.value.status = status
  saving.value = true
  error.value = ''
  validationErrors.value = {}
  try {
    await promotionService.updatePromotion(Number(route.params.id), form.value)

    if (form.value.type_post === 'survey' && form.value.survey) {
      const promotion = await promotionService.getPromotion(Number(route.params.id))

      if (promotion.promotion.survey) {
        await surveyService.updateSurvey(promotion.promotion.survey.id, {
          title: form.value.title,
          description: form.value.summary,
          questions: normalizeSurveyForm(form.value.survey).questions,
          starts_at: form.value.survey.starts_at,
          ends_at: form.value.survey.ends_at,
        })
      }
    }
    router.push({ name: 'promotions-manage' })
  }
  catch (caught) {
    const responseData = (caught as {
      data?: { errors?: Record<string, string[]>; message?: string }
    })?.data
    const responseErrors = responseData?.errors
    const responseMessage = responseData?.message

    if (responseErrors)
      validationErrors.value = responseErrors
    else
      error.value = responseMessage || 'No se pudo actualizar la publicación. Verifica los datos.'

    console.error(caught)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h4 class="text-h4 mb-6">
      Editar publicación
    </h4>
    <VSkeletonLoader
      v-if="loading"
      type="card"
    />
    <VAlert
      v-else-if="loadError"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      {{ loadError }}
    </VAlert>
    <PromotionForm
      v-else
      v-model:form="form"
      :saving="saving"
      :error="error"
      :validation-errors="validationErrors"
      @submit="submit"
      @cancel="router.back()"
    />
  </div>
</template>

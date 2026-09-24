<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PromotionForm from '@/components/promotions/PromotionForm.vue'
import { promotionService } from '@/services/promotionService'
import { surveyService } from '@/services/surveyService'
import type { Promotion, PromotionForm as PromotionFormData } from '@/types/promotion'
import { emptyPromotionForm, normalizeSurveyForm } from '@/utils/promotionForm'

definePage({ meta: { action: 'create', subject: 'Promotion' } })

const router = useRouter()
const saving = ref(false)
const error = ref('')
const validationErrors = ref<Record<string, string[]>>({})

const form = ref<PromotionFormData>(emptyPromotionForm())

const submit = async (status: Promotion['status']) => {
  form.value.status = status
  saving.value = true
  error.value = ''
  validationErrors.value = {}

  try {
    const requestedStatus = form.value.status
    const isSurvey = form.value.type_post === 'survey'
    const promotionData = isSurvey
      ? { ...form.value, status: 'draft' as const }
      : form.value
    const response = await promotionService.createPromotion(promotionData)

    if (isSurvey && form.value.survey) {
      const survey = normalizeSurveyForm(form.value.survey)

      await surveyService.createSurvey(response.promotion.id, {
        ...survey,
        title: form.value.title,
        description: form.value.summary,
        status: requestedStatus === 'published' ? 'published' : 'draft',
      })

      if (requestedStatus === 'published')
        await promotionService.updatePromotion(response.promotion.id, form.value)
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
      error.value = responseMessage || 'No se pudo guardar la publicación. Verifica los datos.'

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
       Publicación
    </h4>
    <PromotionForm
      v-model:form="form"
      :saving="saving"
      :error="error"
      :validation-errors="validationErrors"
      @submit="submit"
      @cancel="router.back()"
    />
  </div>
</template>

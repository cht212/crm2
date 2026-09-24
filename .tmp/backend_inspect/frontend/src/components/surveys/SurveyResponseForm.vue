<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { surveyService } from '@/services/surveyService'
import type { Survey, SurveyQuestion } from '@/types/survey'

const props = defineProps<{
  survey: Survey
}>()

const answers = reactive<Record<number, unknown>>({})
const isLoading = ref(false)
const isSubmitted = ref(false)
const hasResponded = ref(false)
const errorMessage = ref('')
const validationMessage = ref('')

const questions = computed(() => [...props.survey.questions].sort((a, b) => a.position - b.position))

const isOptionSelected = (questionId: number, value: string) =>
  Array.isArray(answers[questionId]) && (answers[questionId] as string[]).includes(value)

const toggleOption = (questionId: number, value: string, selected: boolean) => {
  const current = Array.isArray(answers[questionId]) ? [...answers[questionId] as string[]] : []

  answers[questionId] = selected
    ? [...current, value]
    : current.filter(item => item !== value)
}

const hasAnswer = (question: SurveyQuestion) => {
  const value = answers[question.id]

  if (value === undefined || value === null || value === '')
    return false

  return !Array.isArray(value) || value.length > 0
}

const isFiveStarScale = (question: SurveyQuestion) =>
  question.type === 'scale' && question.scale_min === 1 && question.scale_max === 5

const submit = async () => {
  validationMessage.value = ''
  errorMessage.value = ''

  const missingQuestion = questions.value.find(question => question.required && !hasAnswer(question))

  if (missingQuestion) {
    validationMessage.value = 'Completa todas las preguntas obligatorias antes de enviar.'
    return
  }

  isLoading.value = true

  try {
    await surveyService.submitResponse(
      props.survey.id,
      questions.value
        .filter(hasAnswer)
        .map(question => ({
          question_id: question.id,
          value: answers[question.id],
        })),
    )
    isSubmitted.value = true
  }
  catch (error) {
    console.error('No se pudo registrar la respuesta de la encuesta.', error)
    errorMessage.value = error instanceof Error
      ? error.message
      : 'No se pudo registrar tu respuesta. Inténtalo nuevamente.'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    const response = await surveyService.getMyResponse(props.survey.id)

    hasResponded.value = response.has_responded
  }
  catch (error) {
    console.error('No se pudo consultar el estado de la encuesta.', error)
  }
})
</script>

<template>
  <VCard
    variant="outlined"
    class="mt-8"
  >
    <VCardText v-if="hasResponded || isSubmitted">
      <VAlert
        type="success"
        variant="tonal"
      >
        Gracias por participar. Tu respuesta ya fue registrada.
      </VAlert>
    </VCardText>

    <VCardText v-else>
      <VAlert
        v-if="validationMessage || errorMessage"
        :type="validationMessage ? 'warning' : 'error'"
        variant="tonal"
        class="mb-6"
      >
        {{ validationMessage || errorMessage }}
      </VAlert>

      <div class="d-flex flex-column ga-6">
        <div
          v-for="question in questions"
          :key="question.id"
        >
          <div class="text-subtitle-1 font-weight-medium mb-1">
            {{ question.position }}. {{ question.question }}
            <span
              v-if="question.required"
              class="text-error"
            >*</span>
          </div>
          <div
            v-if="question.help_text"
            class="text-body-2 text-medium-emphasis mb-3"
          >
            {{ question.help_text }}
          </div>

          <VRadioGroup
            v-if="question.type === 'single_choice'"
            v-model="answers[question.id]"
          >
            <VRadio
              v-for="option in question.options"
              :key="option.id"
              :label="option.label"
              :value="option.value"
            />
          </VRadioGroup>

          <div v-else-if="question.type === 'multiple_choice'">
            <VCheckbox
              v-for="option in question.options"
              :key="option.id"
              :label="option.label"
              :model-value="isOptionSelected(question.id, option.value)"
              @update:model-value="toggleOption(question.id, option.value, Boolean($event))"
            />
          </div>

          <VTextField
            v-else-if="question.type === 'short_text'"
            v-model="answers[question.id]"
            label="Respuesta"
            maxlength="255"
          />

          <VTextarea
            v-else-if="question.type === 'long_text'"
            v-model="answers[question.id]"
            label="Respuesta"
            rows="4"
            maxlength="5000"
          />

          <div v-else-if="isFiveStarScale(question)" class="survey-rating">
            <VRating
              :model-value="Number(answers[question.id] ?? 0)"
              length="5"
              size="40"
              active-color="warning"
              hover
              clearable
              @update:model-value="answers[question.id] = Number($event)"
            />
            <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
              <span>Muy insatisfecho</span>
              <span>Excelente</span>
            </div>
          </div>

          <VSlider
            v-else-if="question.type === 'scale'"
            :model-value="Number(answers[question.id] ?? question.scale_min ?? 1)"
            :min="question.scale_min ?? 1"
            :max="question.scale_max ?? 5"
            :step="1"
            thumb-label
            color="primary"
            @update:model-value="answers[question.id] = Number($event)"
          />

          <VSwitch
            v-else-if="question.type === 'boolean'"
            v-model="answers[question.id]"
            label="Sí"
            color="primary"
          />
        </div>
      </div>

      <VBtn
        class="mt-8"
        color="primary"
        :loading="isLoading"
        @click="submit"
      >
        Enviar respuestas
      </VBtn>
    </VCardText>
  </VCard>
</template>

<style scoped>
.survey-rating {
  display: inline-block;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.5);
}
</style>

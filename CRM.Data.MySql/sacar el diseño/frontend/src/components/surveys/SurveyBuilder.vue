<script setup lang="ts">
import { computed } from 'vue'
import type { SurveyForm, SurveyFormQuestion } from '@/types/promotion'
import type { SurveyQuestionType } from '@/types/survey'

const props = defineProps<{
  modelValue: SurveyForm
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SurveyForm]
}>()

const form = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const questionTypes: { title: string; value: SurveyQuestionType }[] = [
  { title: 'Selección única', value: 'single_choice' },
  { title: 'Selección múltiple', value: 'multiple_choice' },
  { title: 'Texto corto', value: 'short_text' },
  { title: 'Texto largo', value: 'long_text' },
  { title: 'Escala / estrellas (1 a 5)', value: 'scale' },
  { title: 'Sí / No', value: 'boolean' },
]

const isChoice = (question: SurveyFormQuestion) =>
  question.type === 'single_choice' || question.type === 'multiple_choice'

const addQuestion = () => {
  form.value.questions.push({
    question: '',
    type: 'single_choice',
    position: form.value.questions.length + 1,
    required: true,
    scale_min: 1,
    scale_max: 5,
    help_text: '',
    options: [
      { label: '', value: '', position: 1 },
      { label: '', value: '', position: 2 },
    ],
  })
}

const removeQuestion = (index: number) => {
  form.value.questions.splice(index, 1)
  form.value.questions.forEach((question, position) => {
    question.position = position + 1
  })
}

const addOption = (question: SurveyFormQuestion) => {
  question.options.push({
    label: '',
    value: '',
    position: question.options.length + 1,
  })
}

const removeOption = (question: SurveyFormQuestion, index: number) => {
  question.options.splice(index, 1)
  question.options.forEach((option, position) => {
    option.position = position + 1
  })
}

const resetTypeConfiguration = (question: SurveyFormQuestion) => {
  if (!isChoice(question))
    question.options = []

  if (question.type === 'scale') {
    question.scale_min = Number.isFinite(question.scale_min) ? question.scale_min : 1
    question.scale_max = Number.isFinite(question.scale_max) ? question.scale_max : 5
  }
  else {
    question.scale_min = null
    question.scale_max = null
  }

  if (isChoice(question) && question.options.length < 2) {
    question.options = [
      { label: '', value: '', position: 1 },
      { label: '', value: '', position: 2 },
    ]
  }
}
</script>

<template>
  <VCard variant="outlined">
    <VCardItem>
      <VCardTitle>Configuración de encuesta</VCardTitle>
      <VCardSubtitle>
        El título y el resumen se toman de la publicación. Agrega las preguntas
        que responderán los clientes.
      </VCardSubtitle>
    </VCardItem>
    <VCardText>
      <div class="d-flex flex-column ga-4">
        <VCard
          v-for="(question, index) in form.questions"
          :key="question.position"
          variant="tonal"
        >
          <VCardItem>
            <template #prepend>
              <VAvatar
                color="primary"
                variant="tonal"
                size="32"
              >
                {{ index + 1 }}
              </VAvatar>
            </template>
            <VCardTitle class="text-subtitle-1">
              Pregunta {{ index + 1 }}
            </VCardTitle>
            <template #append>
              <VBtn
                icon="ri-delete-bin-line"
                size="small"
                variant="text"
                color="error"
                @click="removeQuestion(index)"
              />
            </template>
          </VCardItem>
          <VCardText>
            <VTextField
              v-model="question.question"
              label="Pregunta"
              required
              class="mb-3"
            />
            <VSelect
              v-model="question.type"
              label="Tipo de respuesta"
              :items="questionTypes"
              class="mb-3"
              @update:model-value="resetTypeConfiguration(question)"
            />
            <VTextField
              v-model="question.help_text"
              label="Ayuda para el cliente (opcional)"
              class="mb-3"
            />
            <VSwitch
              v-model="question.required"
              label="Pregunta obligatoria"
              color="primary"
              hide-details
            />

            <VRow v-if="question.type === 'scale'" class="mt-2">
              <VCol cols="12">
                <VAlert
                  type="info"
                  variant="tonal"
                  density="compact"
                >
                  Usa mínimo 1 y máximo 5 para mostrar estrellas al cliente.
                </VAlert>
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model.number="question.scale_min"
                  type="number"
                  label="Mínimo"
                  min="0"
                />
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model.number="question.scale_max"
                  type="number"
                  label="Máximo"
                  min="1"
                />
              </VCol>
            </VRow>

            <div v-if="isChoice(question)" class="mt-4">
              <div class="text-subtitle-2 mb-2">
                Opciones de respuesta
              </div>
              <div
                v-for="(option, optionIndex) in question.options"
                :key="option.position"
                class="d-flex align-center ga-2 mb-2"
              >
                <VTextField
                  v-model="option.label"
                  label="Texto visible"
                  density="compact"
                  hide-details
                />
                <VTextField
                  v-model="option.value"
                  label="Valor"
                  density="compact"
                  hide-details
                />
                <VBtn
                  icon="ri-delete-bin-line"
                  size="small"
                  variant="text"
                  color="error"
                  :disabled="question.options.length <= 2"
                  @click="removeOption(question, optionIndex)"
                />
              </div>
              <VBtn
                variant="text"
                size="small"
                prepend-icon="ri-add-line"
                @click="addOption(question)"
              >
                Agregar opción
              </VBtn>
            </div>
          </VCardText>
        </VCard>
      </div>

      <VBtn
        class="mt-4"
        variant="tonal"
        prepend-icon="ri-add-line"
        @click="addQuestion"
      >
        Agregar pregunta
      </VBtn>
    </VCardText>
  </VCard>
</template>

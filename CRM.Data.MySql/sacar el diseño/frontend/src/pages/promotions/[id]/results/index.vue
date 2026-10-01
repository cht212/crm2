<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  ArcElement,
  Tooltip,
} from 'chart.js'
import { surveyService, type SurveyResults } from '@/services/surveyService'

definePage({ meta: { action: 'read', subject: 'Promotion' } })

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, Tooltip)

type ResultsTab = 'summary' | 'question' | 'individual'

const route = useRoute()
const results = ref<SurveyResults | null>(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref<ResultsTab>('summary')
const selectedQuestion = ref(0)
const selectedRespondent = ref(0)

const currentQuestion = computed(() => results.value?.questions[selectedQuestion.value])
const currentRespondent = computed(() => results.value?.respondents[selectedRespondent.value])

const typeLabel = (type: string) => ({
  single_choice: 'Selección única',
  multiple_choice: 'Selección múltiple',
  short_text: 'Texto corto',
  long_text: 'Texto largo',
  scale: 'Escala',
  boolean: 'Sí / No',
}[type] ?? type)

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-PE') : 'Sin fecha'

const answerFor = (questionId: number) =>
  currentRespondent.value?.answers.find(answer => answer.question_id === questionId)?.value

const formatAnswer = (value: unknown) => {
  if (Array.isArray(value))
    return value.join(', ')

  if (typeof value === 'boolean')
    return value ? 'Sí' : 'No'

  return value === null || value === undefined || value === '' ? 'Sin respuesta' : String(value)
}

const optionLabel = (value: string) =>
  value === '1' || value === 'true' ? 'Sí' : value === '0' || value === 'false' ? 'No' : value

const chartLabels = (question: SurveyResults['questions'][number]) =>
  Object.keys(question.distribution ?? {}).map(optionLabel)

const chartValues = (question: SurveyResults['questions'][number]) =>
  Object.values(question.distribution ?? {})

const isDoughnutQuestion = (question: SurveyResults['questions'][number]) =>
  (question.type === 'boolean' || question.type === 'single_choice')
  && Object.keys(question.distribution ?? {}).length > 0
  && Object.keys(question.distribution ?? {}).length <= 5

const barChartData = (question: SurveyResults['questions'][number]) => ({
  labels: chartLabels(question),
  datasets: [{
    label: 'Respuestas',
    data: chartValues(question),
    backgroundColor: '#7367F0',
    borderRadius: 6,
    barThickness: 24,
  }],
})

const doughnutChartData = (question: SurveyResults['questions'][number]) => ({
  labels: chartLabels(question),
  datasets: [{
    data: chartValues(question),
    backgroundColor: ['#7367F0', '#28C76F', '#FF9F43', '#EA5455', '#00CFE8'],
    borderWidth: 0,
  }],
})

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 } },
    y: { grid: { display: false } },
  },
}

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
}

const nextQuestion = (step: number) => {
  if (!results.value)
    return

  selectedQuestion.value = Math.min(
    Math.max(selectedQuestion.value + step, 0),
    results.value.questions.length - 1,
  )
}

const nextRespondent = (step: number) => {
  if (!results.value)
    return

  selectedRespondent.value = Math.min(
    Math.max(selectedRespondent.value + step, 0),
    results.value.respondents.length - 1,
  )
}

onMounted(async () => {
  try {
    const response = await surveyService.getResults(Number(route.params.id))

    results.value = response.results
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudieron cargar los resultados de la encuesta.'
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="survey-results">
    <div class="d-flex flex-wrap justify-space-between align-center ga-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">
          Respuestas
        </h4>
        <p class="text-body-1 mb-0">
          Analiza las respuestas de tu encuesta.
        </p>
      </div>
      <VBtn
        variant="text"
        prepend-icon="ri-arrow-left-line"
        :to="{ name: 'promotions-manage' }"
      >
        Volver a publicaciones
      </VBtn>
    </div>

    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      {{ error }}
    </VAlert>

    <VSkeletonLoader
      v-else-if="loading"
      type="card, table"
    />

    <VCard v-else-if="results">
      <VCardText class="pa-0">
        <div class="results-header pa-6">
          <div class="d-flex justify-space-between align-start">
            <div>
              <div class="text-h5">
                {{ results.total_responses }} respuestas
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                {{ results.questions.length }} preguntas · {{ results.respondents.length }} participantes
              </div>
            </div>
            <VIcon
              icon="ri-bar-chart-box-line"
              color="primary"
              size="32"
            />
          </div>
        </div>

        <VTabs
          v-model="activeTab"
          color="primary"
          grow
        >
          <VTab value="summary">
            Resumen
          </VTab>
          <VTab value="question">
            Pregunta
          </VTab>
          <VTab value="individual">
            Individual
          </VTab>
        </VTabs>

        <VDivider />

        <VWindow v-model="activeTab">
          <VWindowItem value="summary">
            <div class="pa-6">
              <VRow class="mb-2">
                <VCol
                  cols="12"
                  md="4"
                >
                  <VCard
                    variant="tonal"
                    color="primary"
                  >
                    <VCardText>
                      <div class="text-body-2">
                        Respuestas
                      </div>
                      <div class="text-h3 mt-2">
                        {{ results.total_responses }}
                      </div>
                    </VCardText>
                  </VCard>
                </VCol>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VCard
                    variant="tonal"
                    color="success"
                  >
                    <VCardText>
                      <div class="text-body-2">
                        Preguntas
                      </div>
                      <div class="text-h3 mt-2">
                        {{ results.questions.length }}
                      </div>
                    </VCardText>
                  </VCard>
                </VCol>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VCard
                    variant="tonal"
                    color="info"
                  >
                    <VCardText>
                      <div class="text-body-2">
                        Participantes
                      </div>
                      <div class="text-h3 mt-2">
                        {{ results.respondents.length }}
                      </div>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>

              <div class="text-subtitle-1 font-weight-medium mt-6 mb-4">
                Resumen por pregunta
              </div>
              <VCard
                v-for="question in results.questions"
                :key="question.question_id"
                variant="outlined"
                class="mb-4"
              >
                <VCardText>
                  <div class="d-flex justify-space-between ga-4 mb-3">
                    <strong>{{ question.question }}</strong>
                    <span class="text-body-2 text-medium-emphasis">
                      {{ question.responses }} respuestas
                    </span>
                  </div>
                  <div
                    v-if="question.average !== undefined"
                    class="text-h5 text-primary mb-3"
                  >
                    {{ question.average ?? '—' }}
                    <span class="text-body-2 text-medium-emphasis">promedio</span>
                  </div>
                  <div
                    v-if="question.distribution && Object.keys(question.distribution).length"
                    class="chart-container mb-4"
                  >
                    <Doughnut
                      v-if="isDoughnutQuestion(question)"
                      :data="doughnutChartData(question)"
                      :options="doughnutChartOptions"
                    />
                    <Bar
                      v-else
                      :data="barChartData(question)"
                      :options="barChartOptions"
                    />
                  </div>
                  <div
                    v-for="(count, value) in question.distribution"
                    :key="value"
                    class="mb-3"
                  >
                    <div class="d-flex justify-space-between text-body-2 mb-1">
                      <span>{{ optionLabel(value) }}</span>
                      <strong>{{ count }}</strong>
                    </div>
                    <VProgressLinear
                      :model-value="question.responses ? (count / question.responses) * 100 : 0"
                      color="primary"
                      rounded
                    />
                  </div>
                </VCardText>
              </VCard>
            </div>
          </VWindowItem>

          <VWindowItem value="question">
            <div class="pa-6">
              <div class="d-flex align-center justify-space-between mb-6">
                <VBtn
                  icon="ri-arrow-left-line"
                  variant="text"
                  :disabled="selectedQuestion === 0"
                  @click="nextQuestion(-1)"
                />
                <div class="text-center">
                  <div class="text-body-2 text-medium-emphasis">
                    Pregunta {{ selectedQuestion + 1 }} de {{ results.questions.length }}
                  </div>
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ currentQuestion?.question }}
                  </div>
                </div>
                <VBtn
                  icon="ri-arrow-right-line"
                  variant="text"
                  :disabled="selectedQuestion === results.questions.length - 1"
                  @click="nextQuestion(1)"
                />
              </div>
              <VChip
                size="small"
                color="primary"
                variant="tonal"
                class="mb-4"
              >
                {{ typeLabel(currentQuestion?.type ?? '') }}
              </VChip>
              <VCard variant="outlined">
                <VCardText>
                  <div class="text-body-2 text-medium-emphasis mb-4">
                    {{ currentQuestion?.responses }} respuestas
                  </div>
                  <div
                    v-if="currentQuestion?.distribution && Object.keys(currentQuestion.distribution).length"
                    class="chart-container chart-container-large mb-6"
                  >
                    <Doughnut
                      v-if="isDoughnutQuestion(currentQuestion)"
                      :data="doughnutChartData(currentQuestion)"
                      :options="doughnutChartOptions"
                    />
                    <Bar
                      v-else
                      :data="barChartData(currentQuestion)"
                      :options="barChartOptions"
                    />
                  </div>
                  <div
                    v-for="(count, value) in currentQuestion?.distribution"
                    :key="value"
                    class="mb-4"
                  >
                    <div class="d-flex justify-space-between mb-1">
                      <span>{{ optionLabel(value) }}</span>
                      <strong>{{ count }}</strong>
                    </div>
                    <VProgressLinear
                      :model-value="currentQuestion?.responses ? (count / currentQuestion.responses) * 100 : 0"
                      color="primary"
                      rounded
                      height="10"
                    />
                  </div>
                  <VList v-if="currentQuestion?.text_responses?.length">
                    <VListItem
                      v-for="(answer, index) in currentQuestion.text_responses"
                      :key="index"
                      :title="answer"
                    />
                  </VList>
                </VCardText>
              </VCard>
            </div>
          </VWindowItem>

          <VWindowItem value="individual">
            <div class="pa-6">
              <div class="d-flex align-center justify-space-between mb-6">
                <VBtn
                  icon="ri-arrow-left-line"
                  variant="text"
                  :disabled="selectedRespondent === 0"
                  @click="nextRespondent(-1)"
                />
                <div class="text-center">
                  <div class="text-body-2 text-medium-emphasis">
                    Respuesta {{ selectedRespondent + 1 }} de {{ results.respondents.length }}
                  </div>
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ currentRespondent?.name || 'Participante sin nombre' }}
                  </div>
                </div>
                <VBtn
                  icon="ri-arrow-right-line"
                  variant="text"
                  :disabled="selectedRespondent === results.respondents.length - 1"
                  @click="nextRespondent(1)"
                />
              </div>

              <VCard variant="outlined" class="mb-6">
                <VCardText class="d-flex flex-wrap ga-6">
                  <div>
                    <div class="text-caption text-medium-emphasis">Correo</div>
                    <div>{{ currentRespondent?.email || 'Sin correo' }}</div>
                  </div>
                  <div>
                    <div class="text-caption text-medium-emphasis">Empresa</div>
                    <div>{{ currentRespondent?.company_name || 'Sin empresa' }}</div>
                  </div>
                  <div>
                    <div class="text-caption text-medium-emphasis">Enviada</div>
                    <div>{{ formatDate(currentRespondent?.submitted_at ?? null) }}</div>
                  </div>
                </VCardText>
              </VCard>

              <VCard
                v-for="question in results.questions"
                :key="question.question_id"
                variant="outlined"
                class="mb-4"
              >
                <VCardText>
                  <div class="text-subtitle-2 mb-2">
                    {{ question.question }}
                  </div>
                  <div class="text-body-1">
                    {{ formatAnswer(answerFor(question.question_id)) }}
                  </div>
                </VCardText>
              </VCard>
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </div>
</template>

<style scoped>
.survey-results {
  max-width: 1000px;
  margin-inline: auto;
}

.results-header {
  background: color-mix(in srgb, var(--v-theme-primary) 8%, transparent);
}

.chart-container {
  block-size: 220px;
  max-inline-size: 620px;
  margin-inline: auto;
}

.chart-container-large {
  block-size: 300px;
}
</style>

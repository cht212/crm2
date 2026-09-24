<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  startsAt: string | null
  endsAt: string | null
}>()

const currentTime = ref(Date.now())
let countdownInterval: ReturnType<typeof setInterval> | undefined

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

const phase = computed(() => {
  const startsAt = parsePromotionDate(props.startsAt)
  if (!startsAt)
    return null

  if (currentTime.value < startsAt)
    return 'upcoming'

  const endsAt = parsePromotionDate(props.endsAt)

  return endsAt && currentTime.value >= endsAt ? 'ended' : 'active'
})

const countdown = computed(() => {
  if (!['upcoming', 'active'].includes(phase.value ?? ''))
    return null

  const targetDate = phase.value === 'upcoming' ? props.startsAt : props.endsAt
  const targetTimestamp = parsePromotionDate(targetDate)

  if (!targetTimestamp)
    return null

  const totalSeconds = Math.max(0, Math.floor((targetTimestamp - currentTime.value) / 1000))

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
})

const progress = computed(() => {
  if (!countdown.value)
    return 0

  if (phase.value === 'active' && props.startsAt && props.endsAt) {
    const startsAt = parsePromotionDate(props.startsAt)
    const endsAt = parsePromotionDate(props.endsAt)

    if (startsAt && endsAt && endsAt > startsAt)
      return Math.min(100, Math.max(0, ((currentTime.value - startsAt) / (endsAt - startsAt)) * 100))
  }

  return (60 - countdown.value.seconds) / 60 * 100
})

const padTime = (value: number) => String(value).padStart(2, '0')

onMounted(() => {
  countdownInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (countdownInterval)
    clearInterval(countdownInterval)
})
</script>

<template>
  <VCard
    v-if="['upcoming', 'active'].includes(phase ?? '') && countdown"
    variant="tonal"
    :color="phase === 'active' ? 'success' : 'primary'"
    class="promotion-countdown mb-6"
  >
    <VCardText class="pa-4">
      <div class="d-flex align-center ga-3 mb-4">
        <VAvatar
          :color="phase === 'active' ? 'success' : 'primary'"
          variant="flat"
          rounded
        >
          <VIcon icon="ri-time-line" />
        </VAvatar>
        <div>
          <div class="text-subtitle-1 font-weight-medium">
            {{ phase === 'active' ? '¡Aún estás a tiempo!' : 'Disponible próximamente' }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ phase === 'active' ? 'Aprovecha la promoción antes de que termine.' : 'La promoción comienza en' }}
          </div>
        </div>
      </div>

      <VProgressLinear
        :model-value="progress"
        :color="phase === 'active' ? 'success' : 'primary'"
        height="5"
        rounded
        class="mb-4"
      />

      <div class="countdown-grid">
        <div class="countdown-unit">
          <strong class="text-h4">{{ countdown.days }}</strong>
          <span class="text-caption">días</span>
        </div>
        <div class="countdown-unit">
          <strong class="text-h4">{{ padTime(countdown.hours) }}</strong>
          <span class="text-caption">horas</span>
        </div>
        <div class="countdown-unit">
          <strong class="text-h4">{{ padTime(countdown.minutes) }}</strong>
          <span class="text-caption">minutos</span>
        </div>
        <div class="countdown-unit">
          <strong class="text-h4">{{ padTime(countdown.seconds) }}</strong>
          <span class="text-caption">segundos</span>
        </div>
      </div>
    </VCardText>
  </VCard>

  <div
    v-else-if="phase === 'ended'"
    class="promotion-status promotion-status--ended mb-6"
  >
    <VIcon
      icon="ri-time-line"
      size="24"
    />
    <div>
      <div class="font-weight-medium">
        Promoción finalizada
      </div>
      <div class="text-body-2">
        Esta promoción ya no se encuentra vigente.
      </div>
    </div>
  </div>
</template>

<style scoped>
.countdown-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.countdown-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-block-size: 78px;
  padding: 0.75rem 0.5rem;
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 0.75rem;
  background: rgba(var(--v-theme-surface), 0.65);
}

.countdown-unit span {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.promotion-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
}

.promotion-status--ended {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  background: rgba(var(--v-theme-on-surface), 0.06);
}

@media (max-width: 480px) {
  .countdown-grid {
    gap: 0.5rem;
  }

  .countdown-unit {
    min-block-size: 68px;
    padding-inline: 0.25rem;
  }
}
</style>

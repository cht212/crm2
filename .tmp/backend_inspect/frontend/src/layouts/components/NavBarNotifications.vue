<script lang="ts" setup>
import type { Notification } from '@layouts/types'
import { getEcho } from '@/services/echo'
import { notificationService, type AppNotification } from '@/services/notificationService'
import type { UserData } from '@/types/user'
import { useRouter } from 'vue-router'

const notifications = ref<Notification[]>([])
const notificationIds = new Map<number, string>()
const displayIds = new Map<string, number>()
let nextDisplayId = 1
const quoteRequestIds = new Map<number, number>()
const promotionIds = new Map<number, number>()
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarNotification = ref<Notification | null>(null)
const userData = useCookie<UserData | null>('userData')
const router = useRouter()
const maxNotifications = 20
let channelName = ''

type BroadcastNotification = {
  id: string
  type: string
  title: string
  message: string
  promotion_title?: string
  quote_request_id?: number
  request_number?: string
  promotion_id?: number
  image_url?: string | null
}

const playNotificationSound = () => {
  const audioContext = new AudioContext()
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine' // Suave y limpio para notificaciones
  oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime) // Nota C6

  gain.gain.setValueAtTime(0.5, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.25)
  oscillator.addEventListener('ended', () => {
    void audioContext.close()
  }, { once: true })
}

const getDisplayId = (databaseId: string) => {
  const existingId = displayIds.get(databaseId)
  if (existingId !== undefined)
    return existingId

  const displayId = nextDisplayId++
  displayIds.set(databaseId, displayId)
  notificationIds.set(displayId, databaseId)

  return displayId
}

const toNotification = (item: AppNotification): Notification => ({
  id: (() => {
    const id = getDisplayId(item.id)

    if (item.data.quote_request_id)
      quoteRequestIds.set(id, item.data.quote_request_id)
    if (item.data.promotion_id)
      promotionIds.set(id, item.data.promotion_id)
    return id
  })(),
  ...(item.data.image_url
    ? { img: item.data.image_url }
    : { icon: 'ri-file-list-3-line' }),
  title: item.data.promotion_title
    ? `${item.data.title}: ${item.data.promotion_title}`
    : item.data.title,
  subtitle: item.data.message,
  time: new Date(item.created_at).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
  }),
  isSeen: Boolean(item.read_at),
  color: 'info',
})

const addNotification = (item: BroadcastNotification) => {
  const notificationId = item.id || `${item.type}-${item.promotion_id || item.quote_request_id || Date.now()}`

  if ([...notificationIds.values()].includes(notificationId))
    return

  const notification: AppNotification = {
    id: notificationId,
    type: item.type,
    data: {
      title: item.title,
      message: item.message,
      promotion_title: item.promotion_title,
      quote_request_id: item.quote_request_id,
      request_number: item.request_number,
      promotion_id: item.promotion_id,
      image_url: item.image_url,
    },
    read_at: null,
    created_at: new Date().toISOString(),
  }

  notifications.value = [toNotification(notification), ...notifications.value].slice(0, maxNotifications)
  snackbarNotification.value = toNotification(notification)
  snackbar.value = true

  if (item.promotion_id)
    window.dispatchEvent(new CustomEvent('app:promotion-published', { detail: item }))

  try {
    playNotificationSound()
  }
  catch (error) {
    console.warn('No se pudo reproducir el sonido de la notificación.', error)
  }
}

onMounted(async () => {
  try {
    const response = await notificationService.list()
    notificationIds.clear()
    displayIds.clear()
    nextDisplayId = 1
    quoteRequestIds.clear()
    promotionIds.clear()
    notifications.value = response.notifications.slice(0, maxNotifications).map(toNotification)
  }
  catch (error) {
    console.error(error)
    snackbarMessage.value = 'No se pudieron cargar las notificaciones.'
    snackbar.value = true
  }

  const userId = userData.value?.id
  if (userId) {
    channelName = `App.Models.User.${userId}`
    getEcho().private(channelName).notification(addNotification)
  }
})

onUnmounted(() => {
  if (channelName)
    getEcho().leave(channelName)
})

const removeNotification = async (notificationId: number) => {
  const databaseId = notificationIds.get(notificationId)
  if (!databaseId)
    return

  try {
    await notificationService.remove(databaseId)
    notifications.value = notifications.value.filter(item => item.id !== notificationId)
    notificationIds.delete(notificationId)
    displayIds.delete(databaseId)
    quoteRequestIds.delete(notificationId)
    promotionIds.delete(notificationId)
  }
  catch (error) {
    console.error(error)
    snackbarMessage.value = 'No se pudo eliminar la notificación.'
    snackbar.value = true
  }
}

const markRead = async (notificationIdsToMark: number[]) => {
  await Promise.all(notificationIdsToMark.map(async id => {
    const item = notifications.value.find(notification => notification.id === id)
    const databaseId = notificationIds.get(id)

    if (!item || !databaseId || item.isSeen)
      return

    item.isSeen = true

    try {
      await notificationService.markRead(databaseId)
    }
    catch (error) {
      item.isSeen = false
      console.error(error)
      snackbarMessage.value = 'No se pudo actualizar la notificación.'
      snackbar.value = true
    }
  }))
}

const markUnRead = async (notificationIdsToMark: number[]) => {
  await Promise.all(notificationIdsToMark.map(async id => {
    const item = notifications.value.find(notification => notification.id === id)
    const databaseId = notificationIds.get(id)

    if (!item || !databaseId || !item.isSeen)
      return

    item.isSeen = false

    try {
      await notificationService.markUnread(databaseId)
    }
    catch (error) {
      item.isSeen = true
      console.error(error)
      snackbarMessage.value = 'No se pudo actualizar la notificación.'
      snackbar.value = true
    }
  }))
}

const handleNotificationClick = (notification: Notification) => {
  const databaseId = notificationIds.get(notification.id)
  if (!notification.isSeen) {
    markRead([notification.id])
  }

  if (databaseId) {
    const quoteRequestId = quoteRequestIds.get(notification.id)
    if (quoteRequestId)
      router.push(`/quotations/${quoteRequestId}`)
    else {
      const promotionId = promotionIds.get(notification.id)
      if (promotionId)
        router.push({ name: 'promotions-id', params: { id: promotionId } })
    }
  }
}

</script>

<template>
  <div>
    <Notifications
      :notifications="notifications"
      @remove="removeNotification"
      @read="markRead"
      @unread="markUnRead"
      @click:notification="handleNotificationClick"
    />
    <VSnackbar
      v-model="snackbar"
      color="info"
      location="bottom end"
      :timeout="6000"
      min-width="340"
      max-width="420"
    >
      <div
        v-if="snackbarNotification"
        class="d-flex align-center ga-3 cursor-pointer notification-snackbar"
        @click="handleNotificationClick(snackbarNotification)"
      >
        <VAvatar size="36" variant="tonal" color="primary">
          <VImg
            v-if="snackbarNotification.img"
            :src="snackbarNotification.img"
            cover
            eager
          />
          <VIcon
            v-else
            :icon="snackbarNotification.icon"
          />
        </VAvatar>
        <div>
          <div class="text-body-2 font-weight-medium">
            {{ snackbarNotification.title }}
          </div>
          <div class="text-caption notification-snackbar-summary">
            {{ snackbarNotification.subtitle }}
          </div>
        </div>
      </div>
      <span v-else>{{ snackbarMessage }}</span>
    </VSnackbar>
  </div>
</template>

<style scoped>
.notification-snackbar {
  min-inline-size: 280px;
}

.notification-snackbar-summary {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical; 
  -webkit-line-clamp: 3;
}
</style>

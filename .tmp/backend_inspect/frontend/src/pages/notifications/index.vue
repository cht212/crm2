<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { notificationService, type AppNotification } from '@/services/notificationService'

const router = useRouter()
const notifications = ref<AppNotification[]>([])
const page = ref(1)
const perPage = 10
const totalNotifications = ref(0)
const loading = ref(false)
const error = ref('')

const loadNotifications = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await notificationService.listAll(page.value, perPage)

    notifications.value = response.notifications
    totalNotifications.value = response.totalNotifications
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudieron cargar las notificaciones.'
  }
  finally {
    loading.value = false
  }
}

const formatDate = (date: string) => new Date(date).toLocaleString('es-PE', {
  timeZone: 'America/Lima',
})

const markRead = async (notification: AppNotification) => {
  if (notification.read_at)
    return

  try {
    await notificationService.markRead(notification.id)
    notification.read_at = new Date().toISOString()
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo marcar la notificación como leída.'
  }
}

const openNotification = async (notification: AppNotification) => {
  await markRead(notification)

  if (notification.data.quote_request_id) {
    await router.push(`/quotations/${notification.data.quote_request_id}`)

    return
  }

  if (notification.data.promotion_id) {
    await router.push({
      name: 'promotions-id',
      params: { id: notification.data.promotion_id },
    })
  }
}

const removeNotification = async (notification: AppNotification) => {
  try {
    await notificationService.remove(notification.id)
    notifications.value = notifications.value.filter(item => item.id !== notification.id)
    totalNotifications.value--
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo eliminar la notificación.'
  }
}

watch(page, loadNotifications)
onMounted(loadNotifications)
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between align-center ga-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">
          Todas las notificaciones
        </h4>
        <p class="text-body-1 mb-0">
          Consulta el historial de avisos recibidos.
        </p>
      </div>
      <VBtn
        variant="tonal"
        :to="{ name: 'root' }"
      >
        Volver al inicio
      </VBtn>
    </div>

    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </VAlert>

    <VCard>
      <VCardText v-if="loading" class="d-flex justify-center pa-8">
        <VProgressCircular indeterminate color="primary" />
      </VCardText>

      <VList v-else-if="notifications.length" lines="two">
        <template
          v-for="(notification, index) in notifications"
          :key="notification.id"
        >
          <VDivider v-if="index > 0" />
          <VListItem
            class="py-3"
            :class="{ 'notification-unread': !notification.read_at }"
            @click="openNotification(notification)"
          >
            <template #prepend>
              <VAvatar
                size="44"
                :variant="notification.data.image_url ? undefined : 'tonal'"
                color="primary"
              >
                <VImg
                  v-if="notification.data.image_url"
                  :src="notification.data.image_url"
                  eager
                  cover
                />
                <VIcon
                  v-else
                  icon="ri-notification-3-line"
                />
              </VAvatar>
            </template>

            <VListItemTitle class="font-weight-medium">
              {{ notification.data.promotion_title
                ? `${notification.data.title}: ${notification.data.promotion_title}`
                : notification.data.title }}
            </VListItemTitle>
            <VListItemSubtitle class="notification-summary">
              {{ notification.data.message }}
            </VListItemSubtitle>
            <VListItemSubtitle class="mt-1">
              {{ formatDate(notification.created_at) }}
            </VListItemSubtitle>

            <template #append>
              <div class="d-flex align-center ga-2">
                <VChip
                  v-if="!notification.read_at"
                  size="small"
                  color="primary"
                  variant="tonal"
                >
                  Nueva
                </VChip>
                <VBtn
                  icon="ri-delete-bin-line"
                  size="small"
                  variant="text"
                  color="error"
                  aria-label="Eliminar notificación"
                  @click.stop="removeNotification(notification)"
                />
              </div>
            </template>
          </VListItem>
        </template>
      </VList>

      <VCardText
        v-else
        class="text-center text-medium-emphasis pa-8"
      >
        No se encontraron notificaciones.
      </VCardText>

      <VDivider />
      <VCardActions class="justify-center pa-4">
        <VPagination
          v-model="page"
          :length="Math.max(1, Math.ceil(totalNotifications / perPage))"
          :total-visible="7"
          :disabled="loading || totalNotifications === 0"
        />
      </VCardActions>
    </VCard>
  </div>
</template>

<style scoped>
.notification-unread {
  background: rgba(var(--v-theme-primary), 0.06);
}

.notification-summary {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
</style>

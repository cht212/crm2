<script setup lang="ts">
import { ref } from 'vue'
import { usePromotionManagement } from '@/composables/usePromotionManagement'
import type { Promotion } from '@/types/promotion'
import {
  promotionStatusColor,
  promotionStatusLabel,
  promotionTypeLabel,
} from '@/utils/promotionPresentation'

definePage({ meta: { action: 'read', subject: 'Promotion' } })

const {
  items,
  loading,
  error,
  search,
  page,
  itemsPerPage,
  total,
  archive,
} = usePromotionManagement()

const archiveDialog = ref(false)
const archiveTarget = ref<Promotion | null>(null)
const archiving = ref(false)
const archiveError = ref('')

const openArchiveDialog = (item: Promotion) => {
  archiveTarget.value = item
  archiveError.value = ''
  archiveDialog.value = true
}

const confirmArchive = async () => {
  if (!archiveTarget.value)
    return

  archiving.value = true
  archiveError.value = ''

  try {
    await archive(archiveTarget.value)
    archiveDialog.value = false
    archiveTarget.value = null
  }
  catch (requestError) {
    console.error(requestError)
    archiveError.value = 'No se pudo archivar la publicación.'
  }
  finally {
    archiving.value = false
  }
}
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between align-center ga-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">
          Publicaciones
        </h4>
        <p class="text-body-1 mb-0">
          Gestiona novedades, promociones y artículos.
        </p>
      </div>
      <VBtn
        color="primary"
        :to="{ name: 'promotions-add' }"
      >
        <VIcon
          icon="ri-add-line"
          start
        />
        Nueva publicación
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

    <VCard>
      <VCardText>
        <VTextField
          v-model="search"
          label="Buscar publicaciones"
          prepend-inner-icon="ri-search-line"
          clearable
          class="mb-4"
        />
        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          :headers="[
            { title: 'Título', key: 'title' },
            { title: 'Tipo', key: 'type_post' },
            { title: 'Publicación', key: 'published_at' },
            { title: 'Estado', key: 'status' },
            { title: 'Acciones', key: 'actions', sortable: false },
          ]"
          :items="items"
          :items-length="total"
          :loading="loading"
          item-value="id"
          loading-text="Cargando publicaciones..."
          no-data-text="No hay datos disponibles para mostrar"
          @update:page="page = $event"
        >
          <template #item.type_post="{ item }">
            <VChip
              size="small"
              variant="tonal"
              color="primary"
            >
              {{ promotionTypeLabel(item.type_post) }}
            </VChip>
          </template>
          <template #item.published_at="{ item }">
            {{ item.published_at ? new Date(item.published_at).toLocaleString('es-PE') : 'Sin programar' }}
          </template>
          <template #item.status="{ item }">
            <VChip
              size="small"
              :color="promotionStatusColor(item.status)"
            >
              {{ promotionStatusLabel(item.status) }}
            </VChip>
          </template>
          <template #item.actions="{ item }">
            <VTooltip text="Ver publicación" location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-eye-line"
                  size="small"
                  variant="text"
                  :to="{ name: 'promotions-id', params: { id: item.id } }"
                />
              </template>
            </VTooltip>
            <VTooltip text="Editar publicación" location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-edit-line"
                  size="small"
                  variant="text"
                  color="primary"
                  :to="{ name: 'promotions-edit-id', params: { id: item.id } }"
                />
              </template>
            </VTooltip>
            <VTooltip
              v-if="item.type_post === 'survey' && item.survey"
              text="Ver resultados"
              location="top"
            >
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-bar-chart-box-line"
                  size="small"
                  variant="text"
                  color="success"
                  :to="{ name: 'promotions-id-results', params: { id: item.survey?.id } }"
                />
              </template>
            </VTooltip>
            <VTooltip text="Archivar publicación" location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-archive-line"
                  size="small"
                  variant="text"
                  color="warning"
                  :disabled="item.status === 'archived'"
                  @click="openArchiveDialog(item)"
                />
              </template>
            </VTooltip>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <VDialog
      v-model="archiveDialog"
      max-width="480"
      persistent
    >
      <VCard rounded="xl">
        <VCardItem>
          <template #prepend>
            <VAvatar
              color="warning"
              variant="tonal"
              size="44"
            >
              <VIcon icon="ri-archive-line" />
            </VAvatar>
          </template>
          <VCardTitle>Archivar publicación</VCardTitle>
        </VCardItem>

        <VCardText>
          <VAlert
            v-if="archiveError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ archiveError }}
          </VAlert>
          ¿Deseas archivar
          <strong>{{ archiveTarget?.title }}</strong>?
          <div class="text-body-2 text-medium-emphasis mt-2">
            La publicación se conservará, pero dejará de estar disponible como
            contenido activo.
          </div>
        </VCardText>

        <VCardActions class="justify-end ga-2">
          <VBtn
            variant="text"
            :disabled="archiving"
            @click="archiveDialog = false"
          >
            Cancelar
          </VBtn>
          <VBtn
            color="warning"
            :loading="archiving"
            prepend-icon="ri-archive-line"
            @click="confirmArchive"
          >
            Archivar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

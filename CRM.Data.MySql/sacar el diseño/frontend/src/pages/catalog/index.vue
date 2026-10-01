<script setup lang="ts">
definePage({ meta: { action: 'read', subject: 'Catalog' } })

const sections = [
  { title: 'Tipos de productos', resource: 'types', icon: 'ri-layout-grid-line' },
  { title: 'Subtipos', resource: 'subtypes', icon: 'ri-node-tree' },
  { title: 'Productos', resource: 'products', icon: 'ri-box-3-line' },
  { title: 'Acabados', resource: 'finishes', icon: 'ri-palette-line' },
  { title: 'Longitudes', resource: 'lengths', icon: 'ri-expand-width-line' },
  { title: 'Características adicionales', resource: 'additional-characteristics', icon: 'ri-list-check-3' },
]
</script>

<template>
  <div>
    <div class="mb-6">
      <h4 class="text-h4 mb-1">
        Catálogo
      </h4>
      <p class="text-body-1 mb-0">
        Administra los datos utilizados en las cotizaciones.
      </p>
    </div>

    <VRow>
      <VCol
        v-for="section in sections"
        :key="section.resource"
        cols="12"
        sm="6"
        md="4"
      >
        <VCard
          :to="`/catalog/${section.resource}`"
          class="h-100"
          hover
        >
          <VCardText class="d-flex align-center ga-4 pa-6">
            <VAvatar
              color="primary"
              variant="tonal"
              size="44"
            >
              <VIcon :icon="section.icon" />
            </VAvatar>
            <div>
              <div class="text-subtitle-1 font-weight-medium">
                {{ section.title }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                Gestionar registros
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import CatalogCrudPage from '@/components/catalog/CatalogCrudPage.vue'

definePage({ meta: { action: 'read', subject: 'Catalog' } })
</script>

<template>
  <CatalogCrudPage
    resource="additional-characteristics"
    title="Características adicionales"
    icon="ri-list-check-3"
    :headers="[
      { title: 'Código', key: 'code' },
      { title: 'Nombre', key: 'name' },
    ]"
    :fields="[
      { key: 'code', label: 'Código', required: true },
      { key: 'name', label: 'Nombre', required: true },
    ]"
    loading="Cargando características adicionales..."
  />
</template>

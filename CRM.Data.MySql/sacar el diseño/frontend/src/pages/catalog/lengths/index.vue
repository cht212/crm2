<script setup lang="ts">
import CatalogCrudPage from '@/components/catalog/CatalogCrudPage.vue'

definePage({ meta: { action: 'read', subject: 'Catalog' } })
</script>

<template>
  <CatalogCrudPage
    resource="lengths"
    title="Longitudes"
    icon="ri-expand-width-line"
    :headers="[
      { title: 'Código', key: 'code' },
      { title: 'Valor', key: 'value' },
    ]"
    :fields="[
      { key: 'code', label: 'Código', required: true },
      { key: 'value', label: 'Valor', type: 'number', required: true },
    ]"
    loading="Cargando longitudes..."
  />
</template>

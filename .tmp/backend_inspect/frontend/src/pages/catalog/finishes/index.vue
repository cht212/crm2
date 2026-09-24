<script setup lang="ts">
import CatalogCrudPage from '@/components/catalog/CatalogCrudPage.vue'

definePage({ meta: { action: 'read', subject: 'Catalog' } })
</script>

<template>
  <CatalogCrudPage
    resource="finishes"
    title="Acabados"
    icon="ri-palette-line"
    :headers="[
      { title: 'Nombre', key: 'name' },
      { title: 'Valor relacionado', key: 'related_value' },
    ]"
    :fields="[
      { key: 'name', label: 'Nombre', required: true },
      { key: 'related_value', label: 'Valor relacionado', required: true },
    ]"
    loading="Cargando acabados..."
  />
</template>

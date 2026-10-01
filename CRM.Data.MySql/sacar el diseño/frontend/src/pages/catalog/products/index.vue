<script setup lang="ts">
import CatalogCrudPage from '@/components/catalog/CatalogCrudPage.vue'

definePage({ meta: { action: 'read', subject: 'Catalog' } })
</script>

<template>
  <CatalogCrudPage
    resource="products"
    title="Productos"
    icon="ri-box-3-line"
    :headers="[
      { title: 'Tipo (código)', key: 'type_code' },
      { title: 'Subtipo (código)', key: 'subtype_code' },
      { title: 'Código', key: 'code' },
      { title: 'Nombre', key: 'name' },
      { title: 'Cantidad máxima', key: 'max_quantity' },
    ]"
    :fields="[
      { key: 'code', label: 'Código', required: true },
      { key: 'name', label: 'Nombre', required: true },
      { key: 'type_id', label: 'Tipo', type: 'select', required: true },
      { key: 'subtype_id', label: 'Subtipo', type: 'select', required: true },
      { key: 'max_quantity', label: 'Cantidad máxima', type: 'number', required: true },
    ]"
    loading="Cargando productos..."
  />
</template>

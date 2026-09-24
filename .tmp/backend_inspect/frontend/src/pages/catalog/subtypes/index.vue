<script setup lang="ts">
import CatalogCrudPage from '@/components/catalog/CatalogCrudPage.vue'
import { catalogAdminService, type CatalogAdminItem } from '@/services/catalogAdminService'
import { onMounted, ref } from 'vue'

definePage({ meta: { action: 'read', subject: 'Catalog' } })

const typeOptions = ref<{ title: string; value: number }[]>([])

onMounted(async () => {
  const response = await catalogAdminService.list('types', { per_page: 100 })

  typeOptions.value = response.data
    .filter((type): type is CatalogAdminItem & { id: number; name: string } =>
      typeof type.id === 'number' && typeof type.name === 'string',
    )
    .map(type => ({ title: type.name, value: type.id }))
})
</script>

<template>
  <CatalogCrudPage
    resource="subtypes"
    title="Subtipos"
    icon="ri-node-tree"
    loading="Cargando subtipos..."
    :headers="[
      { title: 'Código', key: 'code' },
      { title: 'Nombre', key: 'name' },
      { title: 'Tipo de producto', key: 'product_type_id' },
    ]"
    :fields="[
      { key: 'code', label: 'Código', required: true },
      { key: 'name', label: 'Nombre', required: true },
      {
        key: 'product_type_id',
        label: 'Tipo de producto',
        type: 'select',
        options: typeOptions,
        required: true,
      },
    ]"
  />
</template>

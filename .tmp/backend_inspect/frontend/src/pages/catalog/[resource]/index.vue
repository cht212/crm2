<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useRoute, useRouter } from 'vue-router'
import AppDrawerHeaderSection from '@core/components/AppDrawerHeaderSection.vue'
import { type CatalogAdminItem, catalogAdminService } from '@/services/catalogAdminService'

definePage({ meta: { action: 'read', subject: 'Catalog' } })

const route = useRoute()
const router = useRouter()
const resource = computed(() => String(route.params.resource))
const items = ref<CatalogAdminItem[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const drawer = ref(false)
const editingId = ref<number | null>(null)
const form = ref<CatalogAdminItem>({ is_active: true })
const typeOptions = ref<CatalogAdminItem[]>([])
const search = ref('')
const deleteDrawer = ref(false)
const deleteTarget = ref<CatalogAdminItem | null>(null)

const labels: Record<string, string> = {
  'types': 'Tipos de productos',
  'products': 'Productos',
  'subtypes': 'Subtipos',
  'thicknesses': 'Espesores',
  'series': 'Series',
  'finishes': 'Acabados',
  'lengths': 'Longitudes',
  'additional-characteristics': 'Características adicionales',
}

const fields = computed(() => {
  const definitions: Record<string, string[]> = {
    'types': ['name'],
    'products': ['code', 'name', 'description', 'max_quantity', 'subtype_id'],
    'subtypes': ['code', 'name', 'product_type_id'],
    'thicknesses': ['product_type_id', 'value', 'unit', 'description'],
    'series': ['product_type_id', 'code', 'description'],
    'finishes': ['name', 'related_value'],
    'lengths': ['code', 'value'],
    'additional-characteristics': ['name'],
  }

  return definitions[resource.value] ?? ['name']
})

const fieldLabel = (field: string) => field.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())

const configurationItems = (item: CatalogAdminItem) => {
  const configuration = Array.isArray(item.configuration)
    ? item.configuration[0]
    : item.configuration

  if (!configuration)
    return []

  return [
    { key: 'uses_finish', label: 'Acabados' },
    { key: 'uses_lengths', label: 'Longitudes' },
    { key: 'uses_thickness', label: 'Espesores' },
    { key: 'uses_dimensions', label: 'Dimensiones' },
  ].filter(attribute => configuration[attribute.key])
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const typeFilter = route.query.type_id ? Number(route.query.type_id) : undefined
    const params: Record<string, string | number | boolean> = { per_page: 100 }

    if (typeFilter && ['subtypes'].includes(resource.value))
      params.product_type_id = typeFilter

    if (typeFilter && ['series', 'thicknesses'].includes(resource.value))
      params.product_type_id = typeFilter

    const response = await catalogAdminService.list(resource.value, params)

    items.value = response.data

    if (resource.value === 'subtypes') {
      const typesResponse = await catalogAdminService.list('types', { per_page: 100 })

      typeOptions.value = typesResponse.data
    }
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo cargar el catálogo.'
  }
  finally {
    loading.value = false
  }
}

const openCreate = () => {
  if (resource.value === 'types') {
    router.push('/catalog/types/new')

    return
  }

  editingId.value = null
  form.value = { is_active: true }
  drawer.value = true
}

const openEdit = (item: CatalogAdminItem) => {
  if (resource.value === 'types' && item.id) {
    router.push(`/catalog/types/${item.id}`)

    return
  }

  editingId.value = item.id ?? null
  form.value = { ...item }
  drawer.value = true
}

const save = async () => {
  saving.value = true
  try {
    if (editingId.value)
      await catalogAdminService.update(resource.value, editingId.value, form.value)
    else
      await catalogAdminService.create(resource.value, form.value)

    drawer.value = false
    await load()
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo guardar el registro.'
  }
  finally {
    saving.value = false
  }
}

const toggleTypeStatus = async (item: CatalogAdminItem, value: boolean | null) => {
  if (!item.id || value === null)
    return

  const previousValue = item.is_active

  item.is_active = value

  try {
    await catalogAdminService.update('types', item.id, { is_active: value })
  }
  catch (requestError) {
    item.is_active = previousValue
    console.error(requestError)
    error.value = 'No se pudo cambiar el estado del tipo.'
  }
}

const remove = async (item: CatalogAdminItem) => {
  if (!item.id)
    return

  deleteTarget.value = item
  deleteDrawer.value = true
}

const confirmRemove = async () => {
  if (!deleteTarget.value?.id)
    return

  saving.value = true
  try {
    await catalogAdminService.remove(resource.value, deleteTarget.value.id)
    deleteDrawer.value = false
    deleteTarget.value = null
    await load()
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo eliminar el registro.'
  }
  finally {
    saving.value = false
  }
}

const visibleItems = computed(() => {
  const value = search.value.toLowerCase()

  return items.value.filter(item => JSON.stringify(item).toLowerCase().includes(value))
})

watch(resource, load)
onMounted(load)
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between align-center ga-4 mb-6">
      <div>
        <VBtn
          variant="text"
          prepend-icon="ri-arrow-left-line"
          class="mb-2"
          @click="router.push('/catalog')"
        >
          Catálogo
        </VBtn>
        <h4 class="text-h4">
          {{ labels[resource] ?? 'Catálogo' }}
        </h4>
      </div>
      <VBtn
        color="primary"
        prepend-icon="ri-add-line"
        @click="openCreate"
      >
        Nuevo registro
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
      <VCardText>
        <VTextField
          v-model="search"
          label="Buscar"
          prepend-inner-icon="ri-search-line"
          clearable
          class="mb-4"
        />
        <VDataTable
          :headers="[
            { title: 'ID', key: 'id' },
            ...fields.map(field => ({ title: fieldLabel(field), key: field })),
            ...(resource === 'types' ? [{ title: 'Configuración', key: 'configuration', sortable: false }] : []),
            { title: 'Activo', key: 'is_active' },
            { title: 'Acciones', key: 'actions', sortable: false },
          ]"
          :items="visibleItems"
          :loading="loading"
          loading-text="Cargando tipos..."
        >
          <template #item.configuration="{ item }">
            <div class="d-flex flex-wrap ga-1 py-2">
              <VChip
                v-for="configuration in configurationItems(item)"
                :key="configuration.key"
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ configuration.label }}
              </VChip>
              <span
                v-if="!configurationItems(item).length"
                class="text-medium-emphasis"
              >
                Sin configuraciones
              </span>
            </div>
          </template>
          <template #item.product_type_id="{ item }">
            <span v-if="resource === 'subtypes'">
              {{ typeOptions.find(type => type.id === item.product_type_id)?.name ?? item.product_type_id ?? '—' }}
            </span>
            <span v-else>{{ item.product_type_id ?? '—' }}</span>
          </template>
          <template #item.is_active="{ item }">
            <VSwitch
              v-if="resource === 'types'"
              :model-value="item.is_active"
              color="success"
              density="compact"
              hide-details
              @update:model-value="toggleTypeStatus(item, $event)"
            />
            <VChip
              v-else
              size="small"
              :color="item.is_active ? 'success' : 'secondary'"
            >
              {{ item.is_active ? 'Sí' : 'No' }}
            </VChip>
          </template>
          <template #item.actions="{ item }">
            <VTooltip
              v-if="resource === 'types' && item.id"
              text="Configurar tipo"
              location="top"
            >
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-settings-3-line"
                  size="small"
                  variant="text"
                  @click="router.push(`/catalog/types/${item.id}`)"
                />
              </template>
            </VTooltip>
            <VTooltip
              v-if="resource !== 'types'"
              text="Editar registro"
              location="top"
            >
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-edit-line"
                  size="small"
                  variant="text"
                  @click="openEdit(item)"
                />
              </template>
            </VTooltip>
            <VTooltip
              v-if="resource !== 'types'"
              text="Eliminar registro"
              location="top"
            >
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-delete-bin-line"
                  size="small"
                  variant="text"
                  color="error"
                  @click="remove(item)"
                />
              </template>
            </VTooltip>
          </template>
        </VDataTable>
      </VCardText>
    </VCard>

    <VNavigationDrawer
      v-model="drawer"
      location="right"
      temporary
      border="none"
      width="440"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection
        :title="editingId ? 'Editar registro' : 'Nuevo registro'"
        @cancel="drawer = false"
      />
      <VDivider />
      <PerfectScrollbar
        tag="div"
        :options="{ wheelPropagation: false }"
        class="flex-grow-1"
      >
        <VCardText class="d-flex flex-column ga-4">
          <VSelect
            v-if="resource === 'subtypes'"
            v-model="form.product_type_id"
            :items="typeOptions"
            item-title="name"
            item-value="id"
            label="Tipo de producto"
            autocomplete="off"
            clearable
          />
          <template
            v-for="field in fields.filter(field => field !== 'product_type_id')"
            :key="field"
          >
            <VTextField
              v-model="form[field]"
              :label="fieldLabel(field)"
              :type="['value', 'max_quantity', 'subtype_id'].includes(field) ? 'number' : 'text'"
              autocomplete="off"
            />
          </template>
          <VSwitch
            v-model="form.is_active"
            label="Activo"
          />
        </VCardText>
      </PerfectScrollbar>
      <VDivider />
      <template #append>
        <div class="pa-5 d-flex flex-row-reverse gap-3">
          <VBtn
            color="primary"
            :loading="saving"
            @click="save"
          >
            Guardar
          </VBtn>
          <VBtn
            variant="outlined"
            color="secondary"
            @click="drawer = false"
          >
            Cancelar
          </VBtn>
        </div>
      </template>
    </VNavigationDrawer>

    <VNavigationDrawer
      v-model="deleteDrawer"
      location="right"
      temporary
      border="none"
      width="380"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection
        title="Eliminar registro"
        @cancel="deleteDrawer = false"
      />
      <VDivider />
      <PerfectScrollbar
        tag="div"
        :options="{ wheelPropagation: false }"
        class="flex-grow-1"
      >
        <VCardText>
          <VAlert
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            Esta acción no se puede deshacer.
          </VAlert>
          <p class="text-body-1 mb-0">
            ¿Deseas eliminar este registro?
          </p>
          <p class="text-body-2 text-medium-emphasis">
            {{ deleteTarget?.name || deleteTarget?.code || `Registro #${deleteTarget?.id}` }}
          </p>
        </VCardText>
      </PerfectScrollbar>
      <VDivider />
      <template #append>
        <div class="pa-5 d-flex flex-row-reverse gap-3">
          <VBtn
            color="error"
            :loading="saving"
            @click="confirmRemove"
          >
            Eliminar
          </VBtn>
          <VBtn
            variant="outlined"
            color="secondary"
            @click="deleteDrawer = false"
          >
            Cancelar
          </VBtn>
        </div>
      </template>
    </VNavigationDrawer>
  </div>
</template>

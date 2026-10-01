<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useRoute, useRouter } from 'vue-router'
import AppDrawerHeaderSection from '@core/components/AppDrawerHeaderSection.vue'
import { type CatalogAdminItem, catalogAdminService } from '@/services/catalogAdminService'
import { getCatalogValidationMessages } from '@/utils/catalogErrors'

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
const debouncedSearch = ref('')
const deleteDrawer = ref(false)
const deleteTarget = ref<CatalogAdminItem | null>(null)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')
const page = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const formErrors = ref<string[]>([])
let searchTimeout: ReturnType<typeof setTimeout> | undefined

const labels: Record<string, string> = {
  'types': 'Tipos de productos',
  'products': 'Productos',
  'subtypes': 'Subtipos',
  'finishes': 'Acabados',
  'lengths': 'Longitudes',
  'additional-characteristics': 'Características adicionales',
}

const fields = computed(() => {
  const definitions: Record<string, string[]> = {
    'types': ['name'],
    'products': ['code', 'name', 'max_quantity', 'subtype_id'],
    'subtypes': ['code', 'name', 'product_type_id'],
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

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const typeFilter = route.query.type_id ? Number(route.query.type_id) : undefined
    const params: Record<string, string | number | boolean> = {
      page: page.value,
      per_page: itemsPerPage.value,
    }

    if (debouncedSearch.value.trim())
      params.q = debouncedSearch.value.trim()

    if (typeFilter && ['subtypes'].includes(resource.value))
      params.product_type_id = typeFilter

    const response = await catalogAdminService.list(resource.value, params)

    items.value = response.data
    totalItems.value = response.meta?.total ?? response.data.length

  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo cargar el catálogo.'
  }
  finally {
    loading.value = false
  }
}

const ensureTypeOptions = async () => {
  if (typeOptions.value.length)
    return

  const typesResponse = await catalogAdminService.list('types', { per_page: 100, is_active: true })

  typeOptions.value = typesResponse.data.filter(type => type.is_active !== false)
}

const openCreate = async () => {
  if (resource.value === 'types') {
    router.push('/catalog/types/new')

    return
  }

  editingId.value = null
  form.value = { is_active: true }
  formErrors.value = []
  drawer.value = true

  if (resource.value === 'subtypes')
    await ensureTypeOptions()
}

const openEdit = async (item: CatalogAdminItem) => {
  if (resource.value === 'types' && item.id) {
    router.push(`/catalog/types/${item.id}`)

    return
  }

  editingId.value = item.id ?? null
  form.value = { ...item }
  formErrors.value = []
  drawer.value = true

  if (resource.value === 'subtypes')
    await ensureTypeOptions()
}

const save = async () => {
  saving.value = true
  formErrors.value = []
  try {
    const editingItemId = editingId.value
    const wasEditing = editingItemId !== null

    if (wasEditing)
      await catalogAdminService.update(resource.value, editingItemId, form.value)
    else
      await catalogAdminService.create(resource.value, form.value)

    drawer.value = false
    showSnackbar(
      wasEditing ? `${labels[resource.value] ?? 'Registro'} actualizado correctamente.` : `${labels[resource.value] ?? 'Registro'} creado correctamente.`,
    )
    await load()
  }
  catch (requestError) {
    console.error(requestError)
    formErrors.value = getCatalogValidationMessages(requestError)
    if (formErrors.value.length) {
      error.value = ''
    }
    else {
      error.value = 'No se pudo guardar el registro.'
      showSnackbar(error.value, 'error')
    }
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
    showSnackbar(`${labels[resource.value] ?? 'Registro'} eliminado correctamente.`)
    await load()
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo eliminar el registro.'
    showSnackbar('No se pudo eliminar el registro.', 'error')
  }
  finally {
    saving.value = false
  }
}

watch(resource, load)
onMounted(async () => {
  await load()

  const successMessage = typeof route.query.success === 'string'
    ? route.query.success
    : ''

  if (successMessage) {
    showSnackbar(successMessage)
    await router.replace({ query: { ...route.query, success: undefined } })
  }
})
watch([page, itemsPerPage, debouncedSearch], load)
watch(search, () => {
  if (searchTimeout)
    clearTimeout(searchTimeout)

  page.value = 1
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = search.value
  }, 300)
})
onBeforeUnmount(() => {
  if (searchTimeout)
    clearTimeout(searchTimeout)
})
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
        <VDataTableServer
          :headers="[
            { title: 'ID', key: 'id' },
            ...fields.map(field => ({ title: fieldLabel(field), key: field })),
            ...(resource === 'types' ? [{ title: 'Configuración', key: 'configuration', sortable: false }] : []),
            { title: 'Activo', key: 'is_active' },
            { title: 'Acciones', key: 'actions', sortable: false },
          ]"
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :items="items"
          :items-length="totalItems"
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
        </VDataTableServer>
      </VCardText>
    </VCard>

    <VNavigationDrawer
      v-model="drawer"
      location="right"
      temporary
      border="none"
      persistent
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
          <VAlert
            v-if="formErrors.length"
            type="error"
            variant="tonal"
            closable
            @click:close="formErrors = []"
          >
            <div
              v-for="message in formErrors"
              :key="message"
            >
              {{ message }}
            </div>
          </VAlert>

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

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      location="top"
      :timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>

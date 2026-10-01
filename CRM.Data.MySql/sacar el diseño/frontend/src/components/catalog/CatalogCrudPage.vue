<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useRoute, useRouter } from 'vue-router'
import AppDrawerHeaderSection from '@core/components/AppDrawerHeaderSection.vue'
import { type CatalogAdminItem, catalogAdminService } from '@/services/catalogAdminService'
import { getCatalogValidationErrors, getCatalogValidationMessages } from '@/utils/catalogErrors'

interface CatalogField {
  key: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select'
  required?: boolean
  options?: { title: string; value: number | string }[]
}

const props = defineProps<{
  resource: string
  title: string
  icon: string
  headers: { title: string; key: string }[]
  fields: CatalogField[]
  loading: string
  defaults?: CatalogAdminItem
  onOpenForm?: () => Promise<void>
}>()

const route = useRoute()
const router = useRouter()
const items = ref<CatalogAdminItem[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')
const debouncedSearch = ref('')
const drawer = ref(false)
const deleteDrawer = ref(false)
const editingId = ref<number | null>(null)
const deleteTarget = ref<CatalogAdminItem | null>(null)
const page = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(0)
const form = ref<CatalogAdminItem>({})
const typeOptions = ref<CatalogAdminItem[]>([])
const subtypeOptions = ref<Array<CatalogAdminItem & { type_name?: string }>>([])
const catalogTypeOptions = ref<CatalogAdminItem[]>([])
const activeSubtypeOptions = ref<CatalogAdminItem[]>([])
const importDialog = ref(false)
const importFile = ref<File | null>(null)
const importing = ref(false)
const importMessage = ref('')
const importError = ref('')
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')
const formErrors = ref<string[]>([])
const fieldErrors = ref<Record<string, string[]>>({})
let searchTimeout: ReturnType<typeof setTimeout> | undefined
const availableSubtypes = computed(() => {
  if (!form.value.type_id)
    return subtypeOptions.value

  return subtypeOptions.value.filter(
    subtype => Number(subtype.product_type_id ?? subtype.type_id ?? subtype.type?.id) === Number(form.value.type_id),
  )
})

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const load = async () => {
  loading.value = true
  error.value = ''

  try {
    const typeId = route.query.type_id ? Number(route.query.type_id) : undefined
    const params: Record<string, string | number | boolean> = {
      page: page.value,
      per_page: itemsPerPage.value,
    }

    if (debouncedSearch.value.trim())
      params.q = debouncedSearch.value.trim()

    if (typeId && props.resource === 'products')
      params.product_type_id = typeId


    const response = await catalogAdminService.list(props.resource, params)

    items.value = response.data
    totalItems.value = response.meta?.total ?? response.data.length

  }
  catch (requestError) {
    console.error(requestError)
    error.value = `No se pudo cargar ${props.title.toLowerCase()}.`
  }
  finally {
    loading.value = false
  }
}

const ensureProductOptions = async (currentProduct?: CatalogAdminItem) => {
  const [typesResponse, subtypesResponse] = await Promise.all([
    catalogAdminService.list('types', { per_page: 100 }),
    catalogAdminService.list('subtypes', { per_page: 100, is_active: true }),
  ])

  catalogTypeOptions.value = typesResponse.data
  activeSubtypeOptions.value = subtypesResponse.data
    .filter(subtype => subtype.is_active !== false)

  typeOptions.value = [...catalogTypeOptions.value]
  subtypeOptions.value = activeSubtypeOptions.value.map(subtype => ({
    ...subtype,
    type_name: subtype.type?.name ?? 'Tipo no disponible',
  }))

  const currentSubtype = currentProduct?.subtype

  if (currentSubtype) {
    const currentTypeId = Number(currentSubtype.product_type_id ?? currentSubtype.type_id ?? currentSubtype.type?.id)

    if (currentSubtype.type && !typeOptions.value.some(type => Number(type.id) === currentTypeId))
      typeOptions.value.push(currentSubtype.type)

    if (!subtypeOptions.value.some(subtype => Number(subtype.id) === Number(currentSubtype.id))) {
      subtypeOptions.value.push({
        ...currentSubtype,
        product_type_id: currentTypeId,
        type_name: currentSubtype.type?.name ?? 'Tipo no disponible',
      })
    }
  }
}

const openCreate = async () => {
  editingId.value = null

  const typeId = route.query.type_id ? Number(route.query.type_id) : undefined
  const relationDefaults: CatalogAdminItem = {}

  if (typeId && props.resource === 'products')
    relationDefaults.type_id = typeId

  try {
    if (props.resource === 'products')
      await ensureProductOptions()
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudieron cargar los tipos y subtipos del catálogo.'
    showSnackbar(error.value, 'error')

    return
  }

  try {
    if (props.onOpenForm)
      await props.onOpenForm()
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudieron cargar las opciones del formulario.'
    showSnackbar(error.value, 'error')

    return
  }

  form.value = { ...relationDefaults, ...props.defaults, is_active: true }
  formErrors.value = []
  fieldErrors.value = {}
  drawer.value = true
}

const openEdit = async (item: CatalogAdminItem) => {
  try {
    if (props.resource === 'products')
      await ensureProductOptions(item)
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudieron cargar los tipos y subtipos del catálogo.'
    showSnackbar(error.value, 'error')

    return
  }

  try {
    if (props.onOpenForm)
      await props.onOpenForm()
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudieron cargar las opciones del formulario.'
    showSnackbar(error.value, 'error')

    return
  }

  const productTypeId = item.subtype?.product_type_id
    ?? item.subtype?.type_id
    ?? item.subtype?.type?.id
    ?? item.type_id

  editingId.value = item.id ?? null
  form.value = {
    ...item,
    type_id: productTypeId === undefined ? undefined : Number(productTypeId),
  }
  formErrors.value = []
  fieldErrors.value = {}
  drawer.value = true
}

watch(
  () => form.value.type_id,
  (typeId, previousTypeId) => {
    if (typeId === previousTypeId || !form.value.subtype_id)
      return

    const selectedSubtype = availableSubtypes.value.find(
      subtype => Number(subtype.id) === Number(form.value.subtype_id),
    )

    if (!selectedSubtype)
      form.value.subtype_id = undefined
  },
)

const save = async () => {
  saving.value = true
  error.value = ''
  formErrors.value = []
  fieldErrors.value = {}

  try {
    const { type_id: _typeId, ...payload } = form.value

    const editingItemId = editingId.value
    const wasEditing = editingItemId !== null

    if (wasEditing)
      await catalogAdminService.update(props.resource, editingItemId, payload)
    else
      await catalogAdminService.create(props.resource, payload)

    drawer.value = false
    showSnackbar(
      wasEditing ? `${props.title} actualizado correctamente.` : `${props.title} creado correctamente.`,
    )
    await load()
  }
  catch (requestError) {
    console.error(requestError)
    fieldErrors.value = getCatalogValidationErrors(requestError)

    if (Object.keys(fieldErrors.value).length) {
      formErrors.value = []
      error.value = ''
      return
    }

    formErrors.value = getCatalogValidationMessages(requestError)

    if (formErrors.value.length) {
      error.value = ''
      return
    }

    error.value = 'No se pudo guardar el registro.'
    showSnackbar(error.value, 'error')
  }
  finally {
    saving.value = false
  }
}

watch(
  () => form.value.type_id,
  (typeId) => {
    if (
      form.value.subtype_id &&
      typeId &&
      !availableSubtypes.value.some(
        subtype => Number(subtype.id) === Number(form.value.subtype_id),
      )
    ) {
      form.value.subtype_id = undefined
    }
  },
)

const askDelete = (item: CatalogAdminItem) => {
  deleteTarget.value = item
  deleteDrawer.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value?.id)
    return

  saving.value = true

  try {
    await catalogAdminService.remove(props.resource, deleteTarget.value.id)
    deleteDrawer.value = false
    deleteTarget.value = null
    showSnackbar(`${props.title} eliminado correctamente.`)
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

const openImport = () => {
  importFile.value = null
  importMessage.value = ''
  importError.value = ''
  importDialog.value = true
}

const importCatalog = async () => {
  if (!importFile.value)
    return

  importing.value = true
  importMessage.value = ''
  importError.value = ''

  try {
    const response = await catalogAdminService.import(
      props.resource as 'subtypes' | 'products' | 'finishes',
      importFile.value,
    )

    importMessage.value = `${response.message} Registros importados: ${response.imported}.`
    await load()
  }
  catch (requestError) {
    console.error(requestError)
    const validationMessages = getCatalogValidationMessages(requestError)

    importError.value = validationMessages.length
      ? validationMessages.join('\n')
      : 'No se pudo importar el archivo. Verifica el formato y los códigos relacionados.'
  }
  finally {
    importing.value = false
  }
}

onMounted(load)
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
        <div class="d-flex align-center ga-3">
          <VAvatar
            color="primary"
            variant="tonal"
          >
            <VIcon :icon="props.icon" />
          </VAvatar>
          <h4 class="text-h4">
            {{ props.title }}
          </h4>
        </div>
      </div>
      <div class="d-flex flex-wrap ga-3">
        <VBtn
          color="primary"
          prepend-icon="ri-add-line"
          @click="openCreate"
        >
          Nuevo registro
        </VBtn>
        <VBtn
          v-if="['subtypes', 'products', 'finishes'].includes(props.resource)"
          variant="tonal"
          prepend-icon="ri-file-excel-2-line"
          @click="openImport"
        >
          Importar Excel
        </VBtn>
      </div>
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
          :headers="[...props.headers, { title: 'Estado', key: 'is_active' }, { title: 'Acciones', key: 'actions', sortable: false }]"
          v-model:page="page"
          v-model:items-per-page="itemsPerPage"
          :items="items"
          :items-length="totalItems"
          :loading="loading"
          :loading-text="props.loading"
        >
          <template #item.is_active="{ item }">
            <VChip
              size="small"
              :color="item.is_active ? 'success' : 'secondary'"
            >
              {{ item.is_active ? 'Activo' : 'Inactivo' }}
            </VChip>
          </template>
          <template #item.product_type_id="{ item }">
            {{ item.type?.name ?? item.product_type_id ?? '—' }}
          </template>
          <template #item.type_code="{ item }">
            {{ item.subtype?.type?.code ?? '—' }}
          </template>
          <template #item.subtype_code="{ item }">
            {{ item.subtype?.code ?? '—' }}
          </template>
          <template #item.code="{ item }">
            {{ item.code ?? '—' }}
          </template>
          <template #item.subtype_id="{ item }">
            {{ item.subtype?.name ?? item.subtype_id ?? '—' }}
          </template>
          <template #item.actions="{ item }">
            <VTooltip text="Editar" location="top">
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
            <VTooltip text="Eliminar" location="top">
              <template #activator="{ props }">
                <VBtn
                  v-bind="props"
                  icon="ri-delete-bin-line"
                  size="small"
                  variant="text"
                  color="error"
                  @click="askDelete(item)"
                />
              </template>
            </VTooltip>
          </template>
        </VDataTableServer>
      </VCardText>
    </VCard>

    <VDialog
      v-model="importDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>Importar {{ props.title.toLowerCase() }}</VCardTitle>
        <VCardText>
          <VAlert
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <template v-if="props.resource === 'subtypes'">
              Columnas obligatorias: tipo, codigo, subtipo.
            </template>
            <template v-else-if="props.resource === 'products'">
              Columnas obligatorias: subtipo, codigo, producto. Puedes agregar la columna opcional cantidad_maxima; si la dejas vacía o no la incluyes, se usará 99.
            </template>
            <template v-else>
              Columnas obligatorias: nombre, valor_relacionado.
            </template>
          </VAlert>
          <VFileInput
            v-model="importFile"
            label="Archivo Excel"
            accept=".xlsx,.xls,.csv"
            prepend-icon="ri-file-excel-2-line"
            show-size
            clearable
          />
          <VAlert
            v-if="importMessage"
            type="success"
            variant="tonal"
            class="mt-4"
          >
            {{ importMessage }}
          </VAlert>
          <VAlert
            v-if="importError"
            type="error"
            variant="tonal"
            class="mt-4"
          >
            {{ importError }}
          </VAlert>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="importDialog = false"
          >
            Cerrar
          </VBtn>
          <VBtn
            color="primary"
            :loading="importing"
            :disabled="!importFile"
            @click="importCatalog"
          >
            Importar
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

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
        :title="editingId ? `Editar ${props.title.toLowerCase()}` : `Nuevo ${props.title.toLowerCase()}`"
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

          <template
            v-for="field in props.fields"
            :key="field.key"
          >
            <VSelect
              v-if="props.resource === 'products' && field.key === 'type_id'"
              v-model="form.type_id"
              :items="typeOptions"
              item-title="name"
              item-value="id"
              label="Tipo"
              placeholder="Selecciona un tipo"
              :required="field.required"
              :error-messages="fieldErrors.type_id"
              autocomplete="off"
              clearable
            />
            <VAutocomplete
              v-else-if="props.resource === 'products' && field.key === 'subtype_id'"
              v-model="form.subtype_id"
              :items="availableSubtypes"
              item-title="name"
              item-value="id"
              label="Subtipo"
              placeholder="Busca un subtipo"
              :required="field.required"
              :disabled="!form.type_id"
              autocomplete="off"
              clearable
              :error-messages="fieldErrors.subtype_id"
            />
            <VSelect
              v-else-if="field.type === 'select' && field.key !== 'type_id' && field.key !== 'subtype_id'"
              v-model="form[field.key]"
              :items="field.options"
              :label="field.label"
              :required="field.required"
              autocomplete="off"
              clearable
              :error-messages="fieldErrors[field.key]"
            />
            <VTextarea
              v-else-if="field.type === 'textarea'"
              v-model="form[field.key]"
              :label="field.label"
              :required="field.required"
              rows="3"
              autocomplete="off"
              :error-messages="fieldErrors[field.key]"
            />
            <VTextField
              v-else
              v-model="form[field.key]"
              :label="field.label"
              :type="field.type ?? 'text'"
              :required="field.required"
              autocomplete="off"
              :error-messages="fieldErrors[field.key]"
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
            color="warning"
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
      persistent
      width="380"
      class="scrollable-content"
    >
      <AppDrawerHeaderSection
        title="Eliminar registro"
        @cancel="deleteDrawer = false"
      />
      <VDivider />
      <VCardText>
        <VAlert
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          Esta acción no se puede deshacer.
        </VAlert>
        <p class="text-body-1">
          ¿Deseas eliminar este registro?
        </p>
        <p class="text-body-2 text-medium-emphasis">
          {{ deleteTarget?.name || deleteTarget?.code || `Registro #${deleteTarget?.id}` }}
        </p>
      </VCardText>
      <template #append>
        <div class="pa-5 d-flex flex-row-reverse gap-3">
          <VBtn
            color="error"
            :loading="saving"
            @click="confirmDelete"
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

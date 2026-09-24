<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { useRoute, useRouter } from 'vue-router'
import AppDrawerHeaderSection from '@core/components/AppDrawerHeaderSection.vue'
import { type CatalogAdminItem, catalogAdminService } from '@/services/catalogAdminService'

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
}>()

const route = useRoute()
const router = useRouter()
const items = ref<CatalogAdminItem[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')
const drawer = ref(false)
const deleteDrawer = ref(false)
const editingId = ref<number | null>(null)
const deleteTarget = ref<CatalogAdminItem | null>(null)
const form = ref<CatalogAdminItem>({})

const load = async () => {
  loading.value = true
  error.value = ''

  try {
    const typeId = route.query.type_id ? Number(route.query.type_id) : undefined
    const params: Record<string, string | number | boolean> = { per_page: 100 }

    if (typeId && props.resource === 'products')
      params.type_id = typeId

    if (typeId && ['series', 'thicknesses'].includes(props.resource))
      params.product_type_id = typeId

    const response = await catalogAdminService.list(props.resource, params)

    items.value = response.data
  }
  catch (requestError) {
    console.error(requestError)
    error.value = `No se pudo cargar ${props.title.toLowerCase()}.`
  }
  finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null

  const typeId = route.query.type_id ? Number(route.query.type_id) : undefined
  const relationDefaults: CatalogAdminItem = {}

  if (typeId && props.resource === 'products')
    relationDefaults.type_id = typeId

  if (typeId && ['series', 'thicknesses'].includes(props.resource))
    relationDefaults.product_type_id = typeId

  form.value = { ...relationDefaults, ...props.defaults, is_active: true }
  drawer.value = true
}

const openEdit = (item: CatalogAdminItem) => {
  editingId.value = item.id ?? null
  form.value = { ...item }
  drawer.value = true
}

const save = async () => {
  saving.value = true
  error.value = ''

  try {
    if (editingId.value)
      await catalogAdminService.update(props.resource, editingId.value, form.value)
    else
      await catalogAdminService.create(props.resource, form.value)

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
  const query = search.value.toLowerCase()

  return items.value.filter(item => JSON.stringify(item).toLowerCase().includes(query))
})

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
          :headers="[...props.headers, { title: 'Estado', key: 'is_active' }, { title: 'Acciones', key: 'actions', sortable: false }]"
          :items="visibleItems"
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
          <template
            v-for="field in props.fields"
            :key="field.key"
          >
            <VSelect
              v-if="field.type === 'select'"
              v-model="form[field.key]"
              :items="field.options"
              :label="field.label"
              :required="field.required"
              autocomplete="off"
              clearable
            />
            <VTextarea
              v-else-if="field.type === 'textarea'"
              v-model="form[field.key]"
              :label="field.label"
              :required="field.required"
              rows="3"
              autocomplete="off"
            />
            <VTextField
              v-else
              v-model="form[field.key]"
              :label="field.label"
              :type="field.type ?? 'text'"
              :required="field.required"
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
  </div>
</template>

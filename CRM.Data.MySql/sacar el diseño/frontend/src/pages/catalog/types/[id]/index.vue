<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type CatalogAdminItem, catalogAdminService } from '@/services/catalogAdminService'
import { getCatalogValidationMessages } from '@/utils/catalogErrors'

definePage({ meta: { action: 'read', subject: 'Catalog' } })

const route = useRoute()
const router = useRouter()
const routeId = String(route.params.id)
const isNew = ref(routeId === 'new')
const typeId = ref<number | null>(isNew.value ? null : Number(routeId))
const type = ref<CatalogAdminItem | null>(null)
const form = ref<CatalogAdminItem>({ name: '', is_active: true })

const configuration = ref<CatalogAdminItem>({
  uses_finish: false,
  uses_lengths: false,
  uses_thickness: false,
  uses_dimensions: false,
  is_active: true,
})

const loading = ref(!isNew.value)
const catalogsLoading = ref(true)
const saving = ref(false)
const error = ref('')
const formErrors = ref<string[]>([])
const lengths = ref<CatalogAdminItem[]>([])
const finishes = ref<CatalogAdminItem[]>([])
const characteristics = ref<CatalogAdminItem[]>([])
const selectedLengthIds = ref<number[]>([])
const selectedFinishIds = ref<number[]>([])
const selectedCharacteristicIds = ref<number[]>([])

const attributes = [
  { key: 'uses_lengths', title: 'Longitudes', description: 'Permite seleccionar longitudes para este tipo.', icon: 'ri-expand-width-line', resource: 'lengths' },
  { key: 'uses_thickness', title: 'Espesores', description: 'Permite ingresar el espesor manualmente en la cotización.', icon: 'ri-ruler-line', resource: null },
  { key: 'uses_finish', title: 'Acabados', description: 'Permite seleccionar acabados para este tipo.', icon: 'ri-palette-line', resource: 'finishes' },
  { key: 'uses_dimensions', title: 'Dimensiones', description: 'Solicita ancho y alto en la cotización.', icon: 'ri-aspect-ratio-line', resource: null },
] as const

const relationItems = (relation: unknown): CatalogAdminItem[] => {
  if (Array.isArray(relation))
    return relation as CatalogAdminItem[]

  if (relation && typeof relation === 'object' && 'data' in relation && Array.isArray(relation.data))
    return relation.data as CatalogAdminItem[]

  return []
}

const catalogItemId = (item: unknown) => {
  if (item && typeof item === 'object' && 'raw' in item)
    item = item.raw

  return item && typeof item === 'object' ? Number((item as CatalogAdminItem).id) : Number(item)
}

const activeItems = (items: CatalogAdminItem[]) =>
  items.filter(item => item.is_active !== false && item.finish?.is_active !== false)

const finishItems = (items: CatalogAdminItem[]) =>
  activeItems(items).map(item => item.finish ?? item)

const lengthTitle = (item: unknown) => {
  if (item && typeof item === 'object' && 'raw' in item)
    item = item.raw

  const length = item as CatalogAdminItem

  return `${length?.value ?? ''}${length?.code ? ` (${length.code})` : ''}`.trim()
}

const load = async () => {
  loading.value = true
  catalogsLoading.value = true
  error.value = ''

  try {
    const typeResponsePromise = typeId.value
      ? catalogAdminService.show('types', typeId.value)
      : Promise.resolve(null)

    const response = await typeResponsePromise
    const typeConfiguration = response
      ? relationItems(response.configuration)[0] ?? response.configuration
      : configuration.value

    const [lengthsResponse, finishesResponse, characteristicsResponse] = await Promise.all([
      typeConfiguration?.uses_lengths
        ? catalogAdminService.list('lengths', { per_page: 100, is_active: true })
        : Promise.resolve({ data: [] as CatalogAdminItem[] }),
      catalogAdminService.list('finishes', { per_page: 100, is_active: true }),
      catalogAdminService.list('additional-characteristics', { per_page: 100, is_active: true }),
    ])

    if (response) {
      type.value = response
      form.value = { code: response.code, name: response.name, is_active: response.is_active }

      const responseLengths = relationItems(response.lengths)
      const responseFinishes = relationItems(response.finishes)
      const responseCharacteristics = relationItems(response.characteristics)

      if (typeConfiguration && typeof typeConfiguration === 'object')
        configuration.value = { ...configuration.value, ...typeConfiguration }

      selectedLengthIds.value = activeItems(responseLengths).map(item => Number(item.id))
      selectedFinishIds.value = activeItems(responseFinishes).map(item => Number(item.finish_id ?? item.finish?.id ?? item.id))
      selectedCharacteristicIds.value = activeItems(responseCharacteristics).map(item => Number(item.id))
    }

    lengths.value = activeItems(lengthsResponse.data ?? [])
    finishes.value = activeItems(finishesResponse.data ?? [])
    characteristics.value = activeItems(characteristicsResponse.data ?? [])

    if (response) {
      lengths.value = [...lengths.value, ...activeItems(relationItems(response.lengths))]
      finishes.value = [...finishes.value, ...finishItems(relationItems(response.finishes))]
      characteristics.value = [...characteristics.value, ...activeItems(relationItems(response.characteristics))]
    }

    const uniqueItems = (items: CatalogAdminItem[]) => Array.from(
      new Map(items.map(item => [catalogItemId(item), item])).values(),
    )

    lengths.value = uniqueItems(lengths.value)
    finishes.value = uniqueItems(finishes.value)
    characteristics.value = uniqueItems(characteristics.value)

  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo cargar el tipo de producto.'
  }
  finally {
    loading.value = false
    catalogsLoading.value = false
  }
}

const save = async () => {
  saving.value = true
  error.value = ''
  formErrors.value = []

  try {
    const payload: CatalogAdminItem = {
      ...form.value,
      configuration: configuration.value,
      length_ids: selectedLengthIds.value,
      finish_ids: selectedFinishIds.value,
      characteristic_ids: selectedCharacteristicIds.value,
    }

    if (isNew.value) {
      const created = await catalogAdminService.create('types', payload)

      if (!created.id)
        throw new Error('El backend no devolvió el identificador del tipo creado.')

      typeId.value = Number(created.id)
      type.value = created
      isNew.value = false
      await router.replace({
        path: '/catalog/types',
        query: { success: 'Tipo de producto creado correctamente.' },
      })

      return
    }

    if (!typeId.value)
      throw new Error('Identificador de tipo inválido.')

    type.value = await catalogAdminService.update('types', typeId.value, payload)
    await router.replace({
      path: '/catalog/types',
      query: { success: 'Tipo de producto actualizado correctamente.' },
    })
  }
  catch (requestError) {
    console.error(requestError)
    formErrors.value = getCatalogValidationMessages(requestError)
    error.value = formErrors.value.length ? '' : 'No se pudo guardar el tipo de producto.'
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <VCard class="overflow-visible">
      <div class="w-100 sticky-header overflow-hidden rounded-t">
        <div class="d-flex align-center gap-4 flex-wrap bg-custom-background pa-4">
          <div>
            <VCardTitle class="pa-0">
              {{ isNew ? 'Nuevo tipo de producto' : `Editar tipo: ${type?.name ?? ''}` }}
            </VCardTitle>
            <div class="text-body-2 text-medium-emphasis">
              Configura los datos y atributos del tipo.
            </div>
          </div>
          <VSpacer />
          <VBtn
            variant="tonal"
            class="me-2"
            @click="router.push('/catalog/types')"
          >
            Volver
          </VBtn>
          <VBtn
            color="primary"
            :loading="saving"
            @click="save"
          >
            Guardar
          </VBtn>
        </div>
      </div>

      <VCardText class="form-content">
        <VProgressLinear
          v-if="loading"
          indeterminate
          class="mb-4"
        />
        <VAlert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ error }}
        </VAlert>
        <VAlert
          v-if="formErrors.length"
          type="error"
          variant="tonal"
          closable
          class="mb-4"
          @click:close="formErrors = []"
        >
          <div
            v-for="message in formErrors"
            :key="message"
          >
            {{ message }}
          </div>
        </VAlert>
        <VRow>
          <VCol
            cols="12"
            md="10"
            class="mx-auto"
          >
            <h2 class="text-lg font-weight-medium mb-4">
              1. Información del tipo
            </h2>
            <VRow>
              <VCol
                cols="12"
                md="5"
              >
                <VTextField
                  v-model="form.code"
                  label="Código"
                  placeholder="Ej. VID"
                  density="compact"
                  :disabled="loading"
                  hint="Código usado por las importaciones."
                  persistent-hint
                />
              </VCol>
              <VCol
                cols="12"
                md="5"
              >
                <VTextField
                  v-model="form.name"
                  label="Nombre del tipo"
                  placeholder="Ej. Vidrio"
                  density="compact"
                  :disabled="loading"
                />
              </VCol>
              <VCol
                cols="12"
                md="4"
              >
                <VSwitch
                  v-model="form.is_active"
                  label="Tipo activo"
                  density="compact"
                />
              </VCol>
            </VRow>

            <VDivider class="my-6" />
            <h2 class="text-lg font-weight-medium mb-4">
              2. Atributos del tipo
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Selecciona qué información solicitará el cotizador.
            </p>
            <VRow>
              <VCol
                v-for="attribute in attributes"
                :key="attribute.key"
                cols="12"
                sm="6"
              >
                <VSwitch
                  v-model="configuration[attribute.key]"
                  :label="attribute.title"
                  :hint="attribute.description"
                  persistent-hint
                  density="compact"
                />
              </VCol>
            </VRow>

            <VDivider class="my-6" />
            <h2 class="text-lg font-weight-medium mb-4">
              3. Configuración del catálogo
            </h2>
            <VRow>
              <VCol
                v-if="configuration.uses_lengths"
                cols="12"
                md="12"
              >
                <VAutocomplete
                  v-model="selectedLengthIds"
                  :items="lengths"
                  :item-title="lengthTitle"
                  :item-value="catalogItemId"
                  label="Longitudes"
                  placeholder="Busca y selecciona longitudes"
                  density="compact"
                  :loading="catalogsLoading"
                  :disabled="catalogsLoading"
                  multiple
                  chips
                  closable-chips
                  clearable
                  :menu-props="{ maxHeight: 280, zIndex: 1000 }"
                />
              </VCol>
              <VCol
                v-if="configuration.uses_finish"
                cols="12"
                md="12"
              >
                <VAutocomplete
                  v-model="selectedFinishIds"
                  :items="finishes"
                  item-title="name"
                  :item-value="catalogItemId"
                  label="Acabados"
                  placeholder="Busca y selecciona acabados"
                  density="compact"
                  :loading="catalogsLoading"
                  :disabled="catalogsLoading"
                  multiple
                  chips
                  closable-chips
                  clearable
                  :menu-props="{ maxHeight: 280, zIndex: 1000 }"
                />
              </VCol>
              <VCol
                cols="12"
                md="12"
              >
                <VAutocomplete
                  v-model="selectedCharacteristicIds"
                  :items="characteristics"
                  item-title="name"
                  :item-value="catalogItemId"
                  label="Características adicionales"
                  placeholder="Busca y selecciona características"
                  density="compact"
                  :loading="catalogsLoading"
                  :disabled="catalogsLoading"
                  multiple
                  chips
                  closable-chips
                  clearable
                  :menu-props="{ maxHeight: 280, zIndex: 1000 }"
                />
              </VCol>
            </VRow>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.sticky-header {
  position: sticky;
  z-index: 9;
  transition: all 0.3s ease-in-out;
}

.layout-nav-type-vertical {
  &.layout-navbar-sticky {
    .sticky-header {
      inset-block: 4rem 0;
    }
  }

  &.layout-navbar-static {
    .sticky-header {
      inset-block: 0 0;
    }
  }
}

.layout-nav-type-horizontal {
  &.layout-navbar-static {
    .sticky-header {
      inset-block: 0 0;
    }
  }

  &.layout-navbar-sticky {
    .sticky-header {
      inset-block: 7.375rem 0;
    }
  }
}
</style>

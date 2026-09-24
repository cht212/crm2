<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type CatalogAdminItem, catalogAdminService } from '@/services/catalogAdminService'

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
const success = ref('')
const products = ref<CatalogAdminItem[]>([])
const lengths = ref<CatalogAdminItem[]>([])
const finishes = ref<CatalogAdminItem[]>([])
const characteristics = ref<CatalogAdminItem[]>([])
const selectedProductIds = ref<number[]>([])
const selectedLengthIds = ref<number[]>([])
const selectedFinishIds = ref<number[]>([])
const selectedCharacteristicIds = ref<number[]>([])

const attributes = [
  { key: 'uses_thickness', title: 'Espesores', description: 'Permite ingresar el espesor manualmente en la cotización.', icon: 'ri-ruler-line', resource: null },
  { key: 'uses_lengths', title: 'Longitudes', description: 'Permite seleccionar longitudes para este tipo.', icon: 'ri-expand-width-line', resource: 'lengths' },
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

const productTitle = (item: unknown) => {
  if (item && typeof item === 'object' && 'raw' in item)
    item = item.raw

  const product = item as CatalogAdminItem

  return `${product?.code ?? ''} - ${product?.name ?? ''}`.trim()
}

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

    const catalogResponsesPromise = Promise.all([
      catalogAdminService.list('products', { per_page: 100 }),
      catalogAdminService.list('lengths', { per_page: 100 }),
      catalogAdminService.list('finishes', { per_page: 100 }),
      catalogAdminService.list('additional-characteristics', { per_page: 100 }),
    ])

    const response = await typeResponsePromise

    if (response) {
      type.value = response
      form.value = { name: response.name, is_active: response.is_active }

      const typeConfiguration = relationItems(response.configuration)[0] ?? response.configuration
      const responseLengths = relationItems(response.lengths)
      const responseFinishes = relationItems(response.finishes)
      const responseCharacteristics = relationItems(response.characteristics)

      if (typeConfiguration && typeof typeConfiguration === 'object')
        configuration.value = { ...configuration.value, ...typeConfiguration, uses_series: false }

      selectedLengthIds.value = responseLengths.map(item => Number(item.id))
      selectedFinishIds.value = responseFinishes.map(item => Number(item.finish_id ?? item.finish?.id ?? item.id))
      selectedCharacteristicIds.value = responseCharacteristics.map(item => Number(item.id))
      selectedProductIds.value = relationItems(response.products).map(item => Number(item.id))
    }

    const [productsResponse, lengthsResponse, finishesResponse, characteristicsResponse] = await catalogResponsesPromise

    products.value = productsResponse.data ?? []
    lengths.value = lengthsResponse.data ?? []
    finishes.value = finishesResponse.data ?? []
    characteristics.value = characteristicsResponse.data ?? []

    if (response) {
      products.value = [...products.value, ...relationItems(response.products)]
      lengths.value = [...lengths.value, ...relationItems(response.lengths)]
      finishes.value = [...finishes.value, ...relationItems(response.finishes)]
      characteristics.value = [...characteristics.value, ...relationItems(response.characteristics)]
    }

    const uniqueItems = (items: CatalogAdminItem[]) => Array.from(
      new Map(items.map(item => [catalogItemId(item), item])).values(),
    )

    products.value = uniqueItems(products.value)
    lengths.value = uniqueItems(lengths.value)
    finishes.value = uniqueItems(finishes.value)
    characteristics.value = uniqueItems(characteristics.value)

    if (typeId.value && !selectedProductIds.value.length)
      selectedProductIds.value = products.value.filter(product => Number(product.type_id) === typeId.value).map(product => Number(product.id))
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
  success.value = ''

  try {
    const payload: CatalogAdminItem = {
      ...form.value,
      configuration: configuration.value,
      product_ids: selectedProductIds.value,
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
      await router.replace(`/catalog/types/${created.id}`)

      return
    }

    if (!typeId.value)
      throw new Error('Identificador de tipo inválido.')

    type.value = await catalogAdminService.update('types', typeId.value, payload)
    success.value = 'El tipo de producto se guardó correctamente.'
  }
  catch (requestError) {
    console.error(requestError)
    error.value = 'No se pudo guardar el tipo de producto.'
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
          v-if="success"
          type="success"
          variant="tonal"
          class="mb-4"
        >
          {{ success }}
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
                md="8"
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
              <VCol cols="12">
                <VAutocomplete
                  v-model="selectedProductIds"
                  :items="products"
                  :item-title="productTitle"
                  :item-value="catalogItemId"
                  label="Productos"
                  placeholder="Busca y selecciona uno o varios productos"
                  density="compact"
                  :loading="catalogsLoading"
                  :disabled="catalogsLoading"
                  multiple
                  chips
                  closable-chips
                  clearable
                />
              </VCol>
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

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { QuoteRequestDetail } from "@/composables/useQuoteRequest";
import type { CatalogType } from "@/types/catalog";
import {
  getCatalogFinishes,
  getCatalogLengths,
  getCatalogProducts,
  getCatalogSubtype,
  getCatalogSubtypes,
  getCatalogType,
  getCatalogTypeOptions,
} from "@/composables/useQuoteCatalog";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import AppDrawerHeaderSection from "@core/components/AppDrawerHeaderSection.vue";

type ProductDraft = Omit<
  QuoteRequestDetail,
  "id" | "product_type" | "product" | "length" | "finish"
>;

interface Props {
  modelValue: boolean;
  catalog: CatalogType[];
  detail?: QuoteRequestDetail | null;
  duplicateDetail?: QuoteRequestDetail | null;
  refreshCatalog: () => Promise<boolean>;
}

const props = withDefaults(defineProps<Props>(), {
  detail: null,
  duplicateDetail: null,
});

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "save", draft: ProductDraft, detailId: number | null): void;
}>();

const createEmptyDraft = (): ProductDraft => ({
  product_type_id: null,
  subtype_id: null,
  product_id: null,
  lengths_id: null,
  finish_id: null,
  thickness: null,
  base: null,
  height: null,
  quantity: 1,
  observation: null,
  characteristics: [],
});

const draft = reactive<ProductDraft>(createEmptyDraft());
const form = ref();
const loadingTypeCatalog = ref(false);
const catalogRefreshError = ref("");
let typeCatalogRequestId = 0

const isEditing = computed(() => !!props.detail && !props.duplicateDetail);
const selectedType = computed(() =>
  getCatalogType(props.catalog, draft.product_type_id),
);
const selectedConfig = computed(() => selectedType.value?.configuration);
const selectedSubtype = computed(() =>
  getCatalogSubtype(
    props.catalog,
    draft.product_type_id,
    draft.subtype_id,
  ),
);
const selectedProduct = computed(() =>
  draft.product_type_id && draft.subtype_id
    ? getCatalogProducts(
        props.catalog,
        draft.product_type_id,
        draft.subtype_id,
      ).find((product) => product.id === draft.product_id)
    : undefined,
);

const typeOptions = computed(() => getCatalogTypeOptions(props.catalog));

const subtypeOptions = computed(() =>
  draft.product_type_id
    ? getCatalogSubtypes(props.catalog, draft.product_type_id)
    : [],
);

const productOptions = computed(
  () =>
    (draft.product_type_id && draft.subtype_id
      ? getCatalogProducts(
          props.catalog,
          draft.product_type_id,
          draft.subtype_id,
        )
      : []
    ).map((product) => ({
      title: product.name,
      value: product.id,
    })),
);
const lengthOptions = computed(
  () =>
    getCatalogLengths(props.catalog, draft.product_type_id).map((length) => ({
      title: length.value,
      value: length.id,
    })),
);
const finishOptions = computed(
  () =>
    getCatalogFinishes(props.catalog, draft.product_type_id).map((finish) => ({
      title: finish.name,
      value: finish.id,
    })),
);
const characteristics = computed(
  () => selectedType.value?.characteristics ?? [],
);
const characteristicOptions = computed(() =>
  characteristics.value.map((characteristic) => ({
    title: characteristic.name,
    value: characteristic.id,
  })),
);

const resetDraft = () => {
  typeCatalogRequestId++
  loadingTypeCatalog.value = false;
  catalogRefreshError.value = "";

  const detail = props.duplicateDetail ?? props.detail;

  Object.assign(
    draft,
    detail
      ? {
          product_type_id: detail.product_type_id,
          subtype_id: detail.subtype_id,
          product_id: detail.product_id,
          lengths_id: detail.lengths_id,
          finish_id: detail.finish_id,
          thickness: detail.thickness,
          base: detail.base,
          height: detail.height,
          quantity: detail.quantity,
          observation: detail.observation,
          characteristics: [...detail.characteristics],
        }
      : createEmptyDraft(),
  );
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) resetDraft();
  },
  { immediate: true },
);

watch(
  () => props.detail,
  () => {
    if (props.modelValue) resetDraft();
  },
);

watch(
  () => props.duplicateDetail,
  () => {
    if (props.modelValue) resetDraft();
  },
);

const close = () => {
  emit("update:modelValue", false);
};

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

const updateType = async (typeId: number | null) => {
  const requestId = ++typeCatalogRequestId;

  catalogRefreshError.value = "";
  draft.product_type_id = typeId;
  draft.subtype_id = null;
  draft.product_id = null;
  draft.lengths_id = null;
  draft.finish_id = null;
  draft.thickness = null;
  draft.base = null;
  draft.height = null;
  draft.characteristics = [];

  if (!typeId) return;

  loadingTypeCatalog.value = true;

  try {
    const refreshed = await props.refreshCatalog();

    if (requestId !== typeCatalogRequestId) return;

    if (!refreshed) {
      catalogRefreshError.value =
        "No se pudo actualizar la configuración. Vuelve a seleccionar el tipo para intentarlo nuevamente.";
      draft.product_type_id = null;

      return;
    }

    const subtypes = getCatalogSubtypes(props.catalog, typeId);

    draft.subtype_id = subtypes.length === 1 ? subtypes[0].id : null;
  } finally {
    if (requestId === typeCatalogRequestId)
      loadingTypeCatalog.value = false;
  }
};

const updateSubtype = (subtypeId: number | null) => {
  draft.subtype_id = subtypeId;
  draft.product_id = null;
  draft.lengths_id = null;
  draft.finish_id = null;
  draft.thickness = null;
  draft.base = null;
  draft.height = null;
  draft.characteristics = [];
};

type NumericField = "thickness" | "base" | "height" | "quantity";

const updateNumericField = (
  field: NumericField,
  value: string | number | null,
) => {
  const text = String(value ?? "");

  if (field === "thickness") {
    const normalized = text.replace(",", ".");

    draft.thickness = normalized === "" ? null : Number(normalized);

    return;
  }

  const digitsOnly = text.replace(/\D/g, "");
  const numericValue = digitsOnly ? Number(digitsOnly) : null;

  draft[field] = numericValue as never;
};

const preventNonNumericInput = (event: KeyboardEvent, allowDecimal = false) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ].includes(event.key)
  ) {
    return;
  }

  if (allowDecimal) {
    if (!/^[0-9.]$/.test(event.key)) {
      event.preventDefault();
    }

    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
};

const save = async () => {
  const result = await form.value?.validate();
  if (result && !result.valid) return;

  emit(
    "save",
    { ...draft, characteristics: [...draft.characteristics] },
    props.duplicateDetail ? null : props.detail?.id ?? null,
  );
};
</script>

<template>
  <VDialog
    v-model="drawerVisible"
    persistent
    :z-index="2400"
    transition="quote-drawer-transition"
    content-class="product-drawer-overlay"
  >
    <VCard class="product-drawer-card d-flex flex-column">
      <AppDrawerHeaderSection
        :title="props.duplicateDetail ? 'Duplicar producto' : isEditing ? 'Editar producto' : 'Agregar producto'"
        @cancel="close"
      />
      <VDivider />
      <PerfectScrollbar
        tag="div"
        :options="{ wheelPropagation: false }"
        class="flex-grow-1"
      >
        <VForm
          ref="form"
          class="product-drawer-form px-5 py-4"
        >
          <p class="text-body-2 text-medium-emphasis mb-4">
            Completa los datos según la configuración del producto.
          </p>
          <div class="d-flex flex-column ga-4">
            <VAutocomplete
              :model-value="draft.product_type_id"
              label="Tipo de producto"
              placeholder="Selecciona un tipo"
              :items="typeOptions"
              :loading="loadingTypeCatalog"
              :disabled="loadingTypeCatalog"
              variant="outlined"
              prepend-inner-icon="ri-layout-grid-line"
              autocomplete="off"
              :rules="[(value) => !!value || 'Selecciona un tipo de producto.']"
              @update:model-value="updateType"
            />

            <VAlert
              v-if="catalogRefreshError"
              type="error"
              variant="tonal"
              density="compact"
            >
              {{ catalogRefreshError }}
            </VAlert>

            <VAutocomplete
              v-if="draft.product_type_id"
              :model-value="draft.subtype_id"
              label="Subtipo de producto"
              placeholder="Selecciona un subtipo"
              :items="
                subtypeOptions.map((subtype) => ({
                  title: subtype.name,
                  value: subtype.id,
                }))
              "
              variant="outlined"
              :disabled="loadingTypeCatalog"
              autocomplete="off"
              prepend-inner-icon="ri-node-tree"
              :rules="[(value) => !!value || 'Selecciona un subtipo.']"
              @update:model-value="updateSubtype"
            />

            <VAutocomplete
              v-if="draft.subtype_id"
              v-model="draft.product_id"
              label="Producto"
              placeholder="Selecciona un producto"
              :items="productOptions"
              variant="outlined"
              :disabled="loadingTypeCatalog"
              prepend-inner-icon="ri-box-3-line"
              autocomplete="off"
              :rules="[(value) => !!value || 'Selecciona un producto.']"
            />
          </div>

          <div v-if="draft.product_id" class="d-flex flex-column ga-5 mt-4">
            <VRow
              v-if="selectedConfig?.uses_lengths || selectedConfig?.uses_finish"
              class="ma-0"
            >
              <VCol
                v-if="selectedConfig?.uses_lengths"
                cols="12"
                :sm="selectedConfig?.uses_finish ? 6 : 12"
                class="pa-0 pe-sm-2 pb-4 pb-sm-0"
              >
                <VAutocomplete
                  v-model="draft.lengths_id"
                  label="Longitud"
                  :items="lengthOptions"
                  :disabled="loadingTypeCatalog"
                  variant="outlined"
                  prepend-inner-icon="ri-ruler-line"
                  autocomplete="off"
                  :rules="[(value) => !!value || 'Selecciona una longitud.']"
                />
              </VCol>
              <VCol
                v-if="selectedConfig?.uses_finish"
                cols="12"
                :sm="selectedConfig?.uses_lengths ? 6 : 12"
                class="pa-0"
              >
                <VAutocomplete
                  v-model="draft.finish_id"
                  label="Acabado"
                  :items="finishOptions"
                  :disabled="loadingTypeCatalog"
                  variant="outlined"
                  prepend-inner-icon="ri-paint-line"
                  autocomplete="off"
                  :rules="[(value) => !!value || 'Selecciona un acabado.']"
                />
              </VCol>
            </VRow>

            <VTextField
              v-if="selectedConfig?.uses_thickness"
              :model-value="draft.thickness"
              label="Espesor (mm)"
              type="number"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              autocomplete="off"
              variant="outlined"
              prepend-inner-icon="ri-expand-width-line"
              :rules="[
                (value) =>
                  (value !== null && value !== '' && Number(value) > 0) ||
                  'Ingresa un espesor mayor a 0.',

                (value) =>
                  value === null ||
                  value === '' ||
                  /^\d+(\.\d{1,2})?$/.test(String(value)) ||
                  'El espesor admite máximo 2 decimales.',
              ]"
              @update:model-value="updateNumericField('thickness', $event)"
            />
            <VRow v-if="selectedConfig?.uses_dimensions" class="ma-0">
              <VCol cols="6" class="pa-0 pe-2">
                <VTextField
                  :model-value="draft.base"
                  label="Base"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  autocomplete="off"
                  variant="outlined"
                  :rules="[
                    (value) =>
                      (Number.isInteger(Number(value)) && Number(value) > 0) ||
                      'Ingresa una base entera mayor a 0.',
                  ]"
                  @keydown="preventNonNumericInput"
                  @update:model-value="updateNumericField('base', $event)"
                />
              </VCol>
              <VCol cols="6" class="pa-0 ps-2">
                <VTextField
                  :model-value="draft.height"
                  label="Altura"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  autocomplete="off"
                  variant="outlined"
                  :rules="[
                    (value) =>
                      (Number.isInteger(Number(value)) && Number(value) > 0) ||
                      'Ingresa una altura entera mayor a 0.',
                  ]"
                  @keydown="preventNonNumericInput"
                  @update:model-value="updateNumericField('height', $event)"
                />
              </VCol>
            </VRow>

            <VAutocomplete
              v-if="characteristics.length"
              v-model="draft.characteristics"
              label="Características"
              placeholder="Selecciona características"
              :items="characteristicOptions"
              variant="outlined"
              multiple
              chips
              closable-chips
              density="comfortable"
              prepend-inner-icon="ri-list-check-2"
              autocomplete="off"
              hide-details
            />

            <VTextField
              :model-value="draft.quantity"
              label="Cantidad"
              type="number"
              min="1"
              :max="selectedProduct?.max_quantity"
              step="1"
              inputmode="numeric"
              autocomplete="off"
              variant="outlined"
              prepend-inner-icon="ri-stack-line"
              :hint="
                typeof selectedProduct?.max_quantity === 'number'
                  ? `Máximo permitido: ${selectedProduct.max_quantity}`
                  : undefined
              "
              persistent-hint
              :rules="[
                (value) => {
                  const quantity = Number(value);

                  if (!Number.isInteger(quantity) || quantity < 1)
                    return 'La cantidad debe ser un entero mayor a 0.';

                  if (
                    selectedProduct &&
                    typeof selectedProduct.max_quantity === 'number' &&
                    quantity > selectedProduct.max_quantity
                  )
                    return `La cantidad máxima permitida es ${selectedProduct.max_quantity}.`;

                  return true;
                },
              ]"
              @keydown="preventNonNumericInput"
              @update:model-value="updateNumericField('quantity', $event)"
            />
          </div>
        </VForm>
      </PerfectScrollbar>
      <VDivider />
      <div class="pa-5 d-flex flex-row-reverse gap-3 product-drawer-actions">
        <VBtn
          color="primary"
          @click="save"
        >
          {{ isEditing ? "Guardar cambios" : "Agregar producto" }}
        </VBtn>
        <VBtn
          variant="outlined"
          color="warning"
          @click="close"
        >
          Cancelar
        </VBtn>
      </div>
    </VCard>
  </VDialog>
</template>

<style scoped lang="scss">
:global(.v-dialog > .v-overlay__content.product-drawer-overlay) {
  position: fixed !important;
  inset: 0 0 0 auto !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: flex-end !important;
  width: 440px !important;
  max-width: 100vw !important;
  height: 100dvh !important;
  max-height: 100dvh !important;
  margin: 0 !important;
  pointer-events: none;
}

:global(.product-drawer-overlay.quote-drawer-transition-enter-active),
:global(.product-drawer-overlay.quote-drawer-transition-leave-active) {
  transition: transform 260ms cubic-bezier(0.2, 0, 0, 1) !important;
}

:global(.product-drawer-overlay.quote-drawer-transition-enter-from),
:global(.product-drawer-overlay.quote-drawer-transition-leave-to) {
  transform: translateX(100%);
}

.product-drawer-card {
  width: 100% !important;
  max-width: 100% !important;
  height: 100%;
  border-radius: 0 !important;
  pointer-events: auto;
}

.product-drawer-form {
  flex: 1 1 auto;
  background: rgb(var(--v-theme-surface));
}

@media (max-width: 600px) {
  :global(.v-dialog > .v-overlay__content.product-drawer-overlay) {
    width: 100vw !important;
  }

  .product-drawer-actions {
    padding: 1rem !important;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom)) !important;
  }
}

</style>

<script setup lang="ts">
import {
  computed,
  reactive,
  ref,
  watch,
} from "vue";
import type { QuoteRequestDetail } from "@/composables/useQuoteRequest";
import type { CatalogType } from "@/types/catalog";
import { getCatalogSubtypes } from "@/composables/useQuoteCatalog";

type ProductDraft = Omit<
  QuoteRequestDetail,
  "id" | "product_type" | "product" | "length" | "finish"
>;

interface Props {
  modelValue: boolean;
  catalog: CatalogType[];
  detail?: QuoteRequestDetail | null;
}

const props = withDefaults(defineProps<Props>(), {
  detail: null,
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

const isEditing = computed(() => !!props.detail);
const selectedType = computed(() =>
  props.catalog.find((type) => type.id === draft.product_type_id),
);
const selectedConfig = computed(() => selectedType.value?.configuration);
const selectedSubtype = computed(() =>
  selectedType.value?.subtypes?.find((subtype) => subtype.id === draft.subtype_id),
);

const typeOptions = computed(() =>
  props.catalog.map((type) => ({ title: type.name, value: type.id })),
);
const productOptions = computed(
  () =>
    (selectedSubtype.value?.products ?? []).map((product) => ({
      title: product.name,
      value: product.id,
    })) ?? [],
);
const lengthOptions = computed(
  () =>
    selectedType.value?.lengths.map((length) => ({
      title: length.value,
      value: length.id,
    })) ?? [],
);
const finishOptions = computed(
  () =>
    selectedType.value?.finishes.map((finish) => ({
      title: finish.name,
      value: finish.id,
    })) ?? [],
);
const characteristics = computed(() => selectedType.value?.characteristics ?? []);
const characteristicOptions = computed(() =>
  characteristics.value.map((characteristic) => ({
    title: characteristic.name,
    value: characteristic.id,
  })),
);

const resetDraft = () => {
  const detail = props.detail;
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

const close = () => {
  emit("update:modelValue", false);
};

const updateType = (typeId: number | null) => {
  draft.product_type_id = typeId;
  draft.subtype_id = null;
  draft.product_id = null;
  draft.lengths_id = null;
  draft.finish_id = null;
  draft.thickness = null;
  draft.base = null;
  draft.height = null;
  draft.characteristics = [];
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
  const digitsOnly = String(value ?? "").replace(/\D/g, "");
  const numericValue = digitsOnly ? Number(digitsOnly) : null;

  draft[field] = numericValue as never;
};

const preventNonNumericInput = (event: KeyboardEvent) => {
  if (
    event.ctrlKey ||
    event.metaKey ||
    ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"].includes(
      event.key,
    )
  ) {
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
};

const save = async () => {
  const result = await form.value?.validate();
  if (result && !result.valid) return;

  emit("save", { ...draft, characteristics: [...draft.characteristics] }, props.detail?.id ?? null);
};
</script>

<template>
  <VNavigationDrawer
    temporary
    location="end"
    width="450"
    class="product-drawer"
    :model-value="props.modelValue"
    @update:model-value="value => value ? undefined : close()"
  >
    <div class="d-flex flex-column h-100">
        <div class="product-drawer-header px-5 py-4">
          <div class="d-flex align-start justify-space-between ga-3">
          <div>
            <div class="text-overline text-primary">Detalle de cotización</div>
            <h2 id="product-drawer-title" class="text-h5 font-weight-bold">
              {{ isEditing ? "Editar producto" : "Agregar producto" }}
            </h2>
            <p class="text-body-2 text-medium-emphasis mb-0 mt-1">
              Completa los datos según la configuración del producto.
            </p>
          </div>
          <VBtn
            icon="ri-close-line"
            variant="text"
            color="secondary"
            aria-label="Cerrar formulario de producto"
            @click.stop="close"
          />
          </div>
        </div>

        <VForm
          ref="form"
          class="product-drawer-form flex-grow-1 overflow-y-auto px-5 py-4"
        >
          <div class="d-flex flex-column ga-4">
            <VAutocomplete
              :model-value="draft.product_type_id"
              label="Tipo de producto"
              placeholder="Selecciona un tipo"
              :items="typeOptions"
              variant="outlined"
              prepend-inner-icon="ri-layout-grid-line"
              autocomplete="off"
              :rules="[(value) => !!value || 'Selecciona un tipo de producto.']"
              @update:model-value="updateType"
            />

            <VAutocomplete
              v-if="draft.product_type_id"
              :model-value="draft.subtype_id"
              label="Subtipo de producto"
              placeholder="Selecciona un subtipo"
              :items="getCatalogSubtypes(props.catalog, draft.product_type_id).map(subtype => ({ title: subtype.name, value: subtype.id }))"
              variant="outlined"
              prepend-inner-icon="ri-node-tree"
              autocomplete="off"
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
              sm="6"
              class="pa-0 pe-sm-2 pb-4 pb-sm-0"
            >
              <VAutocomplete
                v-model="draft.lengths_id"
                label="Longitud"
                :items="lengthOptions"
                variant="outlined"
                prepend-inner-icon="ri-ruler-line"
                autocomplete="off"
                :rules="[(value) => !!value || 'Selecciona una longitud.']"
              />
            </VCol>
            <VCol
              v-if="selectedConfig?.uses_finish"
              cols="12"
              sm="6"
              class="pa-0 ps-sm-2"
            >
              <VAutocomplete
                v-model="draft.finish_id"
                label="Acabado"
                :items="finishOptions"
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
            min="1"
            step="1"
            inputmode="numeric"
            autocomplete="off"
            variant="outlined"
            prepend-inner-icon="ri-expand-width-line"
            :rules="[(value) => Number(value) > 0 || 'Ingresa un espesor mayor a 0.']"
            @keydown="preventNonNumericInput"
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
                    Number.isInteger(Number(value)) && Number(value) > 0 ||
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
                    Number.isInteger(Number(value)) && Number(value) > 0 ||
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
            step="1"
            inputmode="numeric"
            autocomplete="off"
            variant="outlined"
            prepend-inner-icon="ri-stack-line"
            :rules="[(value) => Number(value) >= 1 || 'La cantidad debe ser mayor a 0.']"
            @keydown="preventNonNumericInput"
            @update:model-value="updateNumericField('quantity', $event)"
          />

        </div>
        </VForm>

        <div class="product-drawer-actions d-flex flex-column ga-2 px-5 py-4">
          <VBtn
            color="primary"
            size="large"
            block
            prepend-icon="ri-check-line"
            @click="save"
          >
            {{ isEditing ? "Guardar cambios" : "Agregar producto" }}
          </VBtn>
          <VBtn variant="outlined" color="secondary" block @click="close">
            Cancelar
          </VBtn>
        </div>
    </div>
  </VNavigationDrawer>
</template>

<style scoped lang="scss">
.product-drawer-header {
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

.product-drawer-form {
  min-height: 0;
  background: rgb(var(--v-theme-surface));
  }

.product-drawer-actions {
  flex-shrink: 0;
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
</style>

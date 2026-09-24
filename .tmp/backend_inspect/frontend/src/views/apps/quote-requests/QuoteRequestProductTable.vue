<script setup lang="ts">
import {
  getCatalogFinishes,
  getCatalogLengths,
  getCatalogProducts,
  getCatalogSubtype,
  getCatalogType,
} from "@/composables/useQuoteCatalog";
import type { QuoteRequestDetail } from "@/composables/useQuoteRequest";
import type { CatalogType } from "@/types/catalog";
import { computed } from "vue";

interface Props {
  catalog: CatalogType[];
  details: QuoteRequestDetail[];
  loadingCatalog: boolean;
  editable?: boolean;
  drawerMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: true,
  drawerMode: false,
});

const emit = defineEmits<{
  (event: "removeDetail", id: number): void;
  (event: "openAddProduct"): void;
  (event: "openEditProduct", detail: QuoteRequestDetail): void;
}>();

const productDetails = computed(() =>
  props.details.filter((detail) => detail.product_id !== null),
);

const getProductName = (detail: QuoteRequestDetail) =>
  detail.product?.name ??
  getCatalogProducts(props.catalog, detail.product_type_id, detail.subtype_id)
    .find((product) => product.id === detail.product_id)?.name ??
  "—";

const getSubtypeName = (detail: QuoteRequestDetail) =>
  detail.subtype_id
    ? getCatalogSubtype(
        props.catalog,
        detail.product_type_id,
        detail.subtype_id,
      )?.name ?? "—"
    : "—";

const getLengthName = (detail: QuoteRequestDetail) =>
  detail.length?.value ??
  getCatalogLengths(props.catalog, detail.product_type_id).find(
    (length) => length.id === detail.lengths_id,
  )?.value ??
  "—";

const getFinishName = (detail: QuoteRequestDetail) =>
  detail.finish?.name ??
  getCatalogFinishes(props.catalog, detail.product_type_id).find(
    (finish) => finish.id === detail.finish_id,
  )?.name ??
  "—";

const getCharacteristicName = (
  detail: QuoteRequestDetail,
  characteristic: unknown,
) => {
  if (
    typeof characteristic === "object" &&
    characteristic !== null &&
    "name" in characteristic &&
    typeof characteristic.name === "string"
  ) {
    return characteristic.name;
  }

  const characteristicId =
    typeof characteristic === "object" &&
    characteristic !== null &&
    "id" in characteristic
      ? characteristic.id
      : characteristic;

  return (
    props.catalog
      .find((type) => type.id === detail.product_type_id)?.characteristics.find(
        (item) => item.id === characteristicId,
      )?.name ??
    "Característica"
  );
};

const getCharacteristicKey = (characteristic: unknown) =>
  typeof characteristic === "object" &&
  characteristic !== null &&
  "id" in characteristic
    ? String(characteristic.id)
    : String(characteristic);

const headers = [
  { title: "Tipo", key: "product_type_id", sortable: false },
  { title: "Subtipo", key: "subtype_id", sortable: false },
  { title: "Producto", key: "product_id", sortable: false },
  { title: "Espesor (mm.)", key: "thickness", sortable: false },
  { title: "Longitud (mt.)", key: "lengths_id", sortable: false },
  { title: "Acabado", key: "finish_id", sortable: false },
  { title: "Base", key: "base", sortable: false, width: 82 },
  { title: "Altura", key: "height", sortable: false, width: 82 },
  { title: "Adicional", key: "characteristics", sortable: false },
  { title: "Cant.", key: "quantity", sortable: false },
  { title: "Acciones", key: "actions", sortable: false, width: 110 },
];
</script>

<template>
  <div class="product-table-wrapper" data-quote-tour="products">
    <div class="product-table-toolbar d-flex justify-space-between align-center mb-4">
      <div class="product-table-heading">
        <div class="text-subtitle-1 font-weight-bold">
          {{ props.editable ? "Productos solicitados" : "Detalle de productos" }}
        </div>
        <div class="text-body-2 text-medium-emphasis">
          {{
            props.editable
              ? productDetails.length
                ? "Agrega y configura los productos que deseas incluir en la solicitud."
                : "Aún no has agregado productos a la solicitud."
              : `${productDetails.length} ${productDetails.length === 1 ? "producto" : "productos"}`
          }}
        </div>
      </div>

      <VBtn
        v-if="props.editable && props.drawerMode"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="ri-add-line"
        class="text-none"
        @click="emit('openAddProduct')"
      >
        Agregar ítem
      </VBtn>
    </div>

    <div v-if="productDetails.length" class="table-scroll-hint text-caption text-medium-emphasis mb-2">
      Desliza horizontalmente para consultar todas las columnas.
    </div>

    <div v-if="productDetails.length" class="quotation-table-scroll">
      <VDataTable
        :headers="headers"
        :items="productDetails"
        item-value="id"
        hide-default-footer
        density="comfortable"
        class="quotation-table"
        :loading="props.loadingCatalog"
      >
        <template #item.product_type_id="{ item }">
          <span class="text-uppercase font-weight-bold">
            {{ item.product_type?.name ?? getCatalogType(props.catalog, item.product_type_id)?.name ?? "—" }}
          </span>
        </template>

        <template #item.subtype_id="{ item }">
          <span class="font-weight-medium">{{ getSubtypeName(item) }}</span>
        </template>

        <template #item.product_id="{ item }">
          <span class="font-weight-medium">{{ getProductName(item) }}</span>
        </template>

        <template #item.thickness="{ item }">
          {{ item.thickness !== null ? `${item.thickness} mm` : "—" }}
        </template>

        <template #item.lengths_id="{ item }">
          {{ getLengthName(item) }}
        </template>

        <template #item.finish_id="{ item }">
          {{ getFinishName(item) }}
        </template>

        <template
          v-for="dimension in ['base', 'height'] as const"
          :key="dimension"
          #[`item.${dimension}`]="{ item }"
        >
          {{ item[dimension] ?? "—" }}
        </template>

        <template #item.characteristics="{ item }">
          <div class="d-flex flex-wrap ga-1">
            <VChip
              v-for="characteristic in item.characteristics"
              :key="getCharacteristicKey(characteristic)"
              size="x-small"
              variant="tonal"
              color="primary"
            >
              {{ getCharacteristicName(item, characteristic) }}
            </VChip>
            <span v-if="!item.characteristics.length" class="text-grey">—</span>
          </div>
        </template>

        <template #item.quantity="{ item }">
          <span class="font-weight-bold">{{ item.quantity }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex align-center ga-1">
            <VBtn
              v-if="props.editable"
              icon
              size="small"
              color="primary"
              variant="text"
              aria-label="Editar producto"
              @click="emit('openEditProduct', item)"
            >
              <VIcon icon="ri-edit-line" size="16" />
            </VBtn>
            <VBtn
              v-if="props.editable"
              icon
              size="x-small"
              color="error"
              variant="text"
              aria-label="Eliminar producto"
              @click="emit('removeDetail', item.id)"
            >
              <VIcon icon="ri-delete-bin-line" size="16" />
            </VBtn>
          </div>
        </template>
      </VDataTable>
    </div>

    <VSheet
      v-else
      border
      rounded
      class="empty-products d-flex flex-column align-center justify-center pa-8 text-center"
    >
      <VIcon icon="ri-box-3-line" size="36" color="primary" class="mb-3" />
      <div class="text-subtitle-2 font-weight-medium">No hay productos agregados</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Usa “Agregar ítem” para configurar el primer producto.
      </div>
    </VSheet>
  </div>
</template>

<style scoped>
.product-table-wrapper {
  width: 100%;
}

.quotation-table-scroll {
  width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
}

.quotation-table :deep(table) {
  min-width: 1320px;
}

.quotation-table :deep(th),
.quotation-table :deep(td) {
  padding: 8px 10px !important;
  vertical-align: middle !important;
}

.empty-products {
  min-height: 180px;
  border-style: dashed !important;
}

.table-scroll-hint {
  display: none;
}

@media (max-width: 600px) {
  .product-table-toolbar {
    align-items: stretch !important;
    flex-direction: column;
    gap: 0.75rem;
  }

  .product-table-toolbar .v-btn {
    width: 100%;
  }

  .table-scroll-hint {
    display: block;
  }
}
</style>

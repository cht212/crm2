<script setup lang="ts">
definePage({
  meta: {
    action: "read",
    subject: "QuoteRequest",
  },
});

import { useCollapsedSidebar } from "@/composables/useCollapsedSidebar";
import type { QuoteRequestDetail } from "@/composables/useQuoteRequest";
import { useQuoteRequest } from "@/composables/useQuoteRequest";
import { useAbility } from "@/plugins/casl/composables/useAbility";
import { getQuoteConfigurations } from "@/services/catalogService";
import {
  getQuoteRequest,
  updateQuoteRequest,
} from "@/services/quoteRequestService";
import type { CatalogType } from "@/types/catalog";
import type { FileData } from "@/types/file";
import type { QuoteRequest } from "@/types/quoteRequest";
import type { UserData } from "@/types/user";
import QuoteRequestAttachments from "@/views/apps/quote-requests/QuoteRequestAttachments.vue";
import QuoteRequestProductDrawer from "@/views/apps/quote-requests/QuoteRequestProductDrawer.vue";
import QuoteRequestProductTable from "@/views/apps/quote-requests/QuoteRequestProductTable.vue";
import QuoteRequestSkeleton from "@/views/apps/quote-requests/QuoteRequestSkeleton.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const collapseSidebar = useCollapsedSidebar();
const ability = useAbility();
const userData = useCookie<UserData | null>("userData");
const canUpdateQuote = computed(() => ability.can("update", "QuoteRequest"));
const isCustomer = computed(() => userData.value?.roles?.includes("customer"));
const {
  saveDetail,
  removeDetail,
  validate,
  validationErrors,
  catalog: validationCatalog,
} = useQuoteRequest();

const quoteRequest = ref<QuoteRequest | null>(null);
const catalog = ref<CatalogType[]>([]);

const loading = ref(true);
const loadingCatalog = ref(false);
const errorMessage = ref("");

const snackbar = ref(false);
const snackbarMessage = ref("");
const editing = ref(false);
const attachedFiles = ref<FileData[]>([]);
const snackbarColor = ref<"success" | "error" | "info" | "warning">("success");
const deletedAttachments = ref<number[]>([]);
const showDeleteDetailDialog = ref(false);
const detailToDeleteId = ref<number | null>(null);

const normalizeDimension = (value: number | null) => {
  if (value === null) return null;

  const number = Number(value);

  return Number.isFinite(number) ? Math.trunc(number) : null;
};

const normalizeQuoteDetails = <
  T extends { base: number | null; height: number | null },
>(
  details: T[],
) =>
  details.map((detail) => ({
    ...detail,
    subtype_id:
      (detail as T & { subtype_id?: number | null }).subtype_id ?? null,
    base: normalizeDimension(detail.base),
    height: normalizeDimension(detail.height),
  }));

const showSnackbar = (
  message: string,
  color: "success" | "error" | "info" | "warning" = "success",
) => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

const isDraft = computed(() => quoteRequest.value?.status.name === "Borrador");
const isEditable = computed(() =>
  Boolean(isDraft.value && isCustomer.value && canUpdateQuote.value),
);

const goBackToQuotations = () => {
  router.push({ name: "quotations-list" });
};

const getQuote = async () => {
  loading.value = true;
  errorMessage.value = "";

  try {
    const id = Number(route.params.id);

    const response = await getQuoteRequest(id);
    const data = response.quote_response;

    quoteRequest.value = {
      ...data,
      details: normalizeQuoteDetails(data.details),
    };

    editing.value = false;

    if (data.status.name === "Borrador") await startEditing();
  } catch (error) {
    console.error(error);
    errorMessage.value = "No se pudo cargar la cotización.";
  } finally {
    loading.value = false;
  }
};

const loadCatalog = async () => {
  loadingCatalog.value = true;
  errorMessage.value = "";

  try {
    catalog.value = await getQuoteConfigurations();
    validationCatalog.value = catalog.value;
    return true;
  } catch (error) {
    console.error(error);
    errorMessage.value = "No se pudieron cargar los catálogos.";
    return false;
  } finally {
    loadingCatalog.value = false;
  }
};

const startEditing = async () => {
  if (!isEditable.value) return;

  collapseSidebar();

  if (!catalog.value.length) await loadCatalog();

  if (quoteRequest.value) {
    quoteRequest.value.details = quoteRequest.value.details.map((detail) => ({
      ...detail,
      base: normalizeDimension(detail.base),
      height: normalizeDimension(detail.height),
      characteristics: detail.characteristics.map((characteristic: any) =>
        typeof characteristic === "object" && characteristic !== null
          ? characteristic.id
          : characteristic,
      ),
    }));
  }

  editing.value = true;
};

const showProductDrawer = ref(false);
const editingDetailId = ref<number | null>(null);
const duplicateDetail = ref<QuoteRequestDetail | null>(null);

const openAddProduct = () => {
  duplicateDetail.value = null;
  editingDetailId.value = null;
  showProductDrawer.value = true;
};

const openEditProduct = (detail: QuoteRequestDetail) => {
  duplicateDetail.value = null;
  editingDetailId.value = detail.id;
  showProductDrawer.value = true;
};

const openDuplicateProduct = (detail: QuoteRequestDetail) => {
  editingDetailId.value = null;
  duplicateDetail.value = {
    ...detail,
    characteristics: [...detail.characteristics],
  };
  showProductDrawer.value = true;
};

const editingDetail = computed(
  () =>
    quoteRequest.value?.details.find(
      (detail) => detail.id === editingDetailId.value,
    ) ?? null,
);

const detailToDelete = computed(
  () =>
    quoteRequest.value?.details.find(
      (detail) => detail.id === detailToDeleteId.value,
    ) ?? null,
);

const requestDeleteDetail = (detailId: number) => {
  detailToDeleteId.value = detailId;
  showDeleteDetailDialog.value = true;
};

const cancelDeleteDetail = () => {
  showDeleteDetailDialog.value = false;
  detailToDeleteId.value = null;
};

const confirmDeleteDetail = () => {
  if (!quoteRequest.value || detailToDeleteId.value === null) return;

  removeDetail(detailToDeleteId.value, quoteRequest.value.details);
  showDeleteDetailDialog.value = false;
  detailToDeleteId.value = null;
  showSnackbar("Producto eliminado de la edición.", "success");
};

const saveProduct = (
  draft: Omit<
    QuoteRequestDetail,
    "id" | "product_type" | "product" | "length" | "finish"
  >,
  detailId: number | null,
) => {
  if (!quoteRequest.value) return;

  const result = saveDetail(draft, detailId, quoteRequest.value.details);

  if (result === "quantity-limit") {
    showSnackbar("La cantidad total supera el máximo permitido.", "error");
    return;
  }

  if (result === "merged") {
    showSnackbar("La cantidad se sumó al producto existente.", "success");
  }

  showProductDrawer.value = false;
};

const saving = ref(false);

const saveEditing = async () => {
  if (!quoteRequest.value || !isEditable.value) return;

  if (!validate(quoteRequest.value.details)) {
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    const cleanDetails = quoteRequest.value.details.map((detail) => {
      return {
        id: detail.id < 0 ? null : detail.id,
        product_type_id: detail.product_type_id!,
        subtype_id: detail.subtype_id!,
        product_id: detail.product_id!,
        lengths_id: detail.lengths_id,
        finish_id: detail.finish_id,
        thickness: detail.thickness,
        base: detail.base,
        height: detail.height,
        quantity: detail.quantity,
        observation: detail.observation,
        characteristics: detail.characteristics,
      };
    });

    const response = await updateQuoteRequest(quoteRequest.value.id, {
      subject: quoteRequest.value.subject,
      observations: quoteRequest.value.observations || null,
      details: cleanDetails,
      attachments: attachedFiles.value.map((f) => f.file),
      deleted_attachments: deletedAttachments.value,
    });

    const updatedData = response.quote_request;
    if (updatedData && updatedData.details) {
      updatedData.details = updatedData.details.map((detail: any) => ({
        ...detail,
        base: normalizeDimension(detail.base),
        height: normalizeDimension(detail.height),
        characteristics: detail.characteristics
          ? detail.characteristics.map((c: any) =>
              typeof c === "object" && c !== null ? c.id : c,
            )
          : [],
      }));
    }

    quoteRequest.value = {
      ...updatedData,
      attachments: updatedData.attachments ?? [],
    };

    attachedFiles.value = [];
    deletedAttachments.value = [];

    showSnackbar("Cotización actualizada correctamente.", "success");
  } catch (error: any) {
    console.error(error);
    showSnackbar(
      "No se pudo actualizar la cotización. Inténtalo nuevamente.",
      "error",
    );
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await getQuote();

  if (route.query.created === "1")
    showSnackbar("Cotización creada correctamente.");
});

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId !== oldId) await getQuote();
  },
);
</script>

<template>
  <VRow justify="center">
    <!-- ===================================================== -->
    <!-- LOADING / SKELETON                                    -->
    <!-- ===================================================== -->

    <VCol v-if="loading" cols="12" lg="12">
      <QuoteRequestSkeleton />
    </VCol>

    <!-- ===================================================== -->
    <!-- COTIZACIÓN                                            -->
    <!-- ===================================================== -->

    <VCol v-else-if="quoteRequest" cols="12" lg="12">
      <VCard class="quotation-document" :aria-busy="saving">
        <VCardText class="quotation-content pa-8">
          <VBtn
            class="quotation-back-button mb-4"
            variant="text"
            color="primary"
            prepend-icon="ri-arrow-left-line"
            @click="goBackToQuotations"
          >
            Volver a cotizaciones
          </VBtn>

          <!-- HEADER -->
          <div
            class="quotation-header d-flex justify-space-between align-start flex-wrap gap-4"
          >
            <div class="quotation-customer">
              <div class="text-h5 font-weight-bold quotation-company-name">
                {{ quoteRequest.customer.company_name }}
              </div>

              <div
                class="quotation-customer-details text-body-2 text-medium-emphasis mt-1 d-flex flex-column"
              >
                <span>RUC: {{ quoteRequest.customer.tax_number }}</span>
                <span
                  v-if="quoteRequest.customer.address"
                  class="quotation-address"
                >
                  {{ quoteRequest.customer.address }}
                </span>
              </div>
            </div>

            <div class="quotation-meta text-end">
              <div class="text-overline text-medium-emphasis quotation-label">
                COTIZACIÓN
              </div>
              <div class="quotation-meta-row">
                <div class="quotation-reference">
                  <div
                    class="text-h6 font-weight-bold quotation-request-number"
                  >
                    {{ quoteRequest.request_number }}
                  </div>
                  <VChip
                    :color="quoteRequest.status.color_hex"
                    variant="tonal"
                    class="quotation-status"
                  >
                    {{ quoteRequest.status.name }}
                  </VChip>
                </div>
                <VBtn
                  v-if="isEditable && editing"
                  color="primary"
                  :loading="saving"
                  :disabled="saving"
                  class="quotation-save-button"
                  @click="saveEditing"
                >
                  Guardar
                </VBtn>
              </div>
            </div>
          </div>

          <VDivider class="quotation-divider my-6" />

          <!-- INFORMACIÓN -->
          <VRow>
            <VCol cols="12" md="8">
              <div class="text-caption text-medium-emphasis mb-1">Asunto</div>

              <div class="text-body-1 font-weight-medium">
                {{ quoteRequest.subject }}
              </div>
            </VCol>

            <VCol cols="12" md="4">
              <div class="text-caption text-medium-emphasis mb-1">
                Fecha de solicitud
              </div>

              <div class="text-body-1 font-weight-medium">
                {{
                  new Date(quoteRequest.requested_at).toLocaleDateString(
                    "es-PE",
                  )
                }}
              </div>
            </VCol>
          </VRow>

          <!-- DETALLE DE PRODUCTOS -->
          <div class="mt-8">
            <VAlert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </VAlert>
            <QuoteRequestProductTable
              :catalog="catalog"
              :details="quoteRequest.details"
              :loading-catalog="loadingCatalog"
              :editable="editing"
              :drawer-mode="editing"
              @remove-detail="requestDeleteDetail"
              @open-duplicate-product="openDuplicateProduct"
              @open-add-product="openAddProduct"
              @open-edit-product="openEditProduct"
            />
          </div>

          <QuoteRequestProductDrawer
            v-model="showProductDrawer"
            :catalog="catalog"
            :detail="editingDetail"
            :duplicate-detail="duplicateDetail"
            :refresh-catalog="loadCatalog"
            @save="saveProduct"
          />

          <!-- OBSERVACIONES -->
          <div class="mt-8">
            <div class="text-subtitle-1 font-weight-bold mb-3">
              Observaciones
            </div>

            <VTextarea
              v-if="editing"
              v-model="quoteRequest.observations"
              variant="outlined"
              rows="3"
              hide-details
              placeholder="Ingrese observaciones"
            />

            <VSheet v-else border rounded class="pa-4">
              <span v-if="quoteRequest.observations" class="text-body-2">
                {{ quoteRequest.observations }}
              </span>

              <span v-else class="text-body-2 text-medium-emphasis">
                Sin observaciones.
              </span>
            </VSheet>
          </div>

          <!-- DOCUMENTOS ADJUNTOS -->
          <QuoteRequestAttachments
            :attachments="quoteRequest.attachments"
            :editing="editing"
            :new-files="attachedFiles"
            :deleted-attachments="deletedAttachments"
            @update:new-files="attachedFiles = $event"
            @update:deleted-attachments="deletedAttachments = $event"
            @error="showSnackbar($event, 'error')"
          />

          <!-- FOOTER -->
          <VDivider class="my-8" />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- SNACKBAR -->
  <VSnackbar
    v-model="snackbar"
    :color="snackbarColor"
    location="top"
    :timeout="4000"
  >
    {{ snackbarMessage }}
  </VSnackbar>

  <VDialog v-model="showDeleteDetailDialog" max-width="440">
    <VCard>
      <VCardText class="pa-6">
        <div class="d-flex align-start ga-4">
          <VAvatar color="error" variant="tonal" size="48">
            <VIcon icon="ri-delete-bin-line" />
          </VAvatar>
          <div>
            <div class="text-h6">¿Eliminar producto?</div>
            <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
              Se quitará
              <strong>{{
                detailToDelete?.product?.name ?? "este producto"
              }}</strong>
              de la cotización al guardar los cambios.
            </p>
          </div>
        </div>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="text" @click="cancelDeleteDetail">
          Conservar producto
        </VBtn>
        <VBtn
          color="error"
          variant="flat"
          prepend-icon="ri-delete-bin-line"
          @click="confirmDeleteDetail"
        >
          Eliminar
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.quotation-document {
  margin: 0 auto;
}

@media (max-width: 599.98px) {
  .quotation-content {
    padding: 0.875rem !important;
  }

  .quotation-back-button {
    margin-inline-start: -0.5rem;
    margin-block-end: 0.25rem !important;
    min-height: 2.25rem;
  }

  .quotation-header {
    display: flex !important;
    flex-direction: column;
    gap: 0.5rem !important;
  }

  .quotation-company-name {
    font-size: 1.05rem !important;
    line-height: 1.3;
  }

  .quotation-customer-details {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.5rem;
    row-gap: 0.125rem;
    font-size: 0.75rem !important;
    line-height: 1.15rem;
  }

  .quotation-address::before {
    content: "·";
    margin-inline-end: 0.5rem;
  }

  .quotation-meta {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    text-align: start !important;
  }

  .quotation-label {
    display: none;
  }

  .quotation-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .quotation-reference {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .quotation-request-number {
    font-size: 0.9rem !important;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .quotation-status {
    margin-block-start: 0 !important;
  }

  .quotation-save-button {
    flex: 0 0 auto;
    min-height: 2.25rem;
  }

  .quotation-divider {
    margin-block: 0.75rem !important;
  }
}
</style>

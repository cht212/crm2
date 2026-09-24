<script setup lang="ts">
definePage({
  meta: {
    action: "read",
    subject: "QuoteRequest",
  },
});

import { useQuoteRequest } from "@/composables/useQuoteRequest";
import { useAbility } from "@/plugins/casl/composables/useAbility";
import { getQuoteConfigurations } from "@/services/catalogService";
import {
  getQuoteRequest,
  submitQuoteRequest,
  updateQuoteRequest,
} from "@/services/quoteRequestService";
import type { CatalogType } from "@/types/catalog";
import type { QuoteRequest } from "@/types/quoteRequest";
import type { UserData } from "@/types/user";
import QuoteRequestProductTable from "@/views/apps/quote-requests/QuoteRequestProductTable.vue";
import QuoteRequestProductDrawer from "@/views/apps/quote-requests/QuoteRequestProductDrawer.vue";
import QuoteRequestAttachments from "@/views/apps/quote-requests/QuoteRequestAttachments.vue";
import QuoteRequestSkeleton from "@/views/apps/quote-requests/QuoteRequestSkeleton.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { FileData } from "@/types/file";
import type { QuoteRequestDetail } from "@/composables/useQuoteRequest";

const route = useRoute();
const ability = useAbility();
const userData = useCookie<UserData | null>("userData");
const canUpdateQuote = computed(() => ability.can("update", "QuoteRequest"));
const isCustomer = computed(() =>
  userData.value?.roles?.includes("customer"),
);
const {
  updateType,
  updateField,
  addDetail,
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

const normalizeDimension = (value: number | null) => {
  if (value === null) return null;

  const number = Number(value);

  return Number.isFinite(number) ? Math.trunc(number) : null;
};

const normalizeQuoteDetails = <T extends { base: number | null; height: number | null }>(
  details: T[],
) =>
  details.map((detail) => ({
    ...detail,
    subtype_id: (detail as T & { subtype_id?: number | null }).subtype_id ?? null,
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
const canSubmit = computed(() => isEditable.value && !editing.value);

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
  } catch (error) {
    console.error(error);
    errorMessage.value = "No se pudo cargar la cotización.";
  } finally {
    loading.value = false;
  }
};

const loadCatalog = async () => {
  loadingCatalog.value = true;

  try {
    catalog.value = await getQuoteConfigurations();
    validationCatalog.value = catalog.value;
  } catch (error) {
    console.error(error);
    errorMessage.value = "No se pudieron cargar los catálogos.";
  } finally {
    loadingCatalog.value = false;
  }
};

const startEditing = async () => {
  if (!isEditable.value) return;

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

const cancelEditing = async () => {
  editing.value = false;

  await getQuote();
};

const showProductDrawer = ref(false);
const editingDetailId = ref<number | null>(null);

const openAddProduct = () => {
  editingDetailId.value = null;
  showProductDrawer.value = true;
};

const openEditProduct = (detail: QuoteRequestDetail) => {
  editingDetailId.value = detail.id;
  showProductDrawer.value = true;
};

const editingDetail = computed(() =>
  quoteRequest.value?.details.find(
    (detail) => detail.id === editingDetailId.value,
  ) ?? null,
);

const saveProduct = (
  draft: Omit<
    QuoteRequestDetail,
    "id" | "product_type" | "product" | "length" | "finish"
  >,
  detailId: number | null,
) => {
  if (!quoteRequest.value) return;

  let detail = detailId === null
    ? quoteRequest.value.details.find(
        (item) => !item.product_type_id && !item.product_id,
      )
    : quoteRequest.value.details.find((item) => item.id === detailId);

  if (!detail) {
    addDetail(quoteRequest.value.details);
    detail = quoteRequest.value.details.at(-1);
  }

  if (!detail) return;

  updateType(detail, draft.product_type_id);
  updateField(detail, "subtype_id", draft.subtype_id);
  updateField(detail, "product_id", draft.product_id);
  updateField(detail, "lengths_id", draft.lengths_id);
  updateField(detail, "finish_id", draft.finish_id);
  updateField(detail, "thickness", draft.thickness);
  updateField(detail, "base", draft.base);
  updateField(detail, "height", draft.height);
  updateField(detail, "quantity", draft.quantity);
  updateField(detail, "observation", draft.observation);
  updateField(detail, "characteristics", draft.characteristics);
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

    console.log(
      "Archivos a enviar:",
      attachedFiles.value.map(({ file }) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    );

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
    editing.value = false;

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

const submitQuote = async () => {
  if (!quoteRequest.value || !canSubmit.value) return;

  saving.value = true;

  try {
    const response = await submitQuoteRequest(quoteRequest.value.id);

    quoteRequest.value = {
      ...response.quote_request,
      attachments: response.quote_request.attachments ?? [],
    };
    showSnackbar("Cotización enviada correctamente.", "success");
  } catch (error) {
    console.error(error);
    showSnackbar("No se pudo enviar la cotización.", "error");
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
    if (newId !== oldId)
      await getQuote();
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
      <VCard class="quotation-document">
        <VCardText class="pa-8">
          <!-- HEADER -->
          <div class="d-flex justify-space-between align-start flex-wrap gap-4">
            <div>
              <div class="text-h5 font-weight-bold">
                {{ quoteRequest.customer.company_name }}
              </div>

              <div class="text-body-2 text-medium-emphasis mt-1">
                RUC: {{ quoteRequest.customer.tax_number }}
              </div>

              <div
                v-if="quoteRequest.customer.address"
                class="text-body-2 text-medium-emphasis"
              >
                {{ quoteRequest.customer.address }}
              </div>
            </div>

            <div class="text-end">
              <div class="text-overline text-medium-emphasis">COTIZACIÓN</div>

              <div class="text-h6 font-weight-bold">
                {{ quoteRequest.request_number }}
              </div>

              <VChip
                :color="quoteRequest.status.color_hex"
                variant="tonal"
                class="mt-2"
              >
                {{ quoteRequest.status.name }}
              </VChip>

              <!-- ACCIONES -->
              <div
                v-if="isEditable || canSubmit"
                class="d-flex justify-end gap-2 mt-4"
              >
                <VBtn
                  v-if="!editing && isEditable"
                  color="primary"
                  variant="tonal"
                  @click="startEditing"
                >
                  Editar
                </VBtn>

                <template v-if="editing">
                  <VBtn variant="text" @click="cancelEditing"> Cancelar </VBtn>

                  <VBtn
                    color="primary"
                    :loading="saving"
                    :disabled="saving"
                    @click="saveEditing"
                  >
                    Guardar
                  </VBtn>
                </template>

                <VBtn
                  v-if="canSubmit"
                  color="primary"
                  :loading="saving"
                  :disabled="saving"
                  @click="submitQuote"
                >
                  Enviar a revisión
                </VBtn>

              </div>
            </div>
          </div>

          <VDivider class="my-6" />

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
            <QuoteRequestProductTable
              :catalog="catalog"
              :details="quoteRequest.details"
              :loading-catalog="loadingCatalog"
              :editable="editing"
              :drawer-mode="editing"
              @remove-detail="
                (id: number) => removeDetail(id, quoteRequest!.details)
              "
              @open-add-product="openAddProduct"
              @open-edit-product="openEditProduct"
            />
          </div>

          <QuoteRequestProductDrawer
            v-model="showProductDrawer"
            :catalog="catalog"
            :detail="editingDetail"
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
    location="top end"
    :timeout="4000"
  >
    {{ snackbarMessage }}
  </VSnackbar>
</template>

<style scoped>
.quotation-document {
  margin: 0 auto;
}
</style>

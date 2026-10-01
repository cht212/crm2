<script setup lang="ts">
import { useQuoteRequest } from "@/composables/useQuoteRequest";
import { useQuoteRequestTour } from "@/composables/useQuoteRequestTour";
import { useCollapsedSidebar } from "@/composables/useCollapsedSidebar";
import {
  createQuoteRequest,
  getQuoteRequest,
} from "@/services/quoteRequestService";
import type { UserData } from "@/types/user";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import QuoteRequestProductTable from "./QuoteRequestProductTable.vue";
import QuoteRequestProductDrawer from "./QuoteRequestProductDrawer.vue";
import type { FileData } from "@/types/file";
import type { QuoteRequestDetail } from "@/composables/useQuoteRequest";

const userData = useCookie<UserData | null>("userData");

const hasCustomer = computed(() => {
  return !!userData.value?.customer_id && !!userData.value?.customer;
});

const subject = ref("");
const observations = ref("");
const snackbar = ref(false);
const subjectError = ref("");
const snackbarMessage = ref("");
const snackbarColor = ref("success");
const router = useRouter();
const route = useRoute();
const collapseSidebar = useCollapsedSidebar();
collapseSidebar();
const { start: startTour } = useQuoteRequestTour();
const showSnackbar = (
  message: string,
  color: "success" | "error" = "success",
) => {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};
const {
  catalog,
  details,
  loadingCatalog,
  errorMessage,
  saving,
  loadCatalog,
  saveDetail,
  removeDetail,
  validate,
  validationErrors,
} = useQuoteRequest();

const isDuplicatingQuote = ref(false);
const duplicateLoadError = ref("");
const duplicateLoaded = ref(false);
const getCharacteristicId = (characteristic: unknown) =>
  typeof characteristic === "object" &&
  characteristic !== null &&
  "id" in characteristic
    ? Number(characteristic.id)
    : Number(characteristic);

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
    details.value.find((detail) => detail.id === editingDetailId.value) ?? null,
);

const saveProduct = (
  draft: Omit<
    QuoteRequestDetail,
    "id" | "product_type" | "product" | "length" | "finish"
  >,
  detailId: number | null,
) => {
  const result = saveDetail(draft, detailId);

  if (result === "quantity-limit") {
    showSnackbar("La cantidad total supera el máximo permitido.", "error");
    return;
  }

  showSnackbar(
    result === "merged"
      ? "La cantidad se sumó al producto existente."
      : result === "updated"
        ? "Producto actualizado correctamente."
        : "Producto agregado correctamente.",
  );

  showProductDrawer.value = false;
};
onMounted(async () => {
  const duplicateId = Number(route.query.duplicate);
  const hasDuplicateId = Number.isInteger(duplicateId) && duplicateId > 0;
  const catalogLoaded = loadCatalog();

  if (!hasDuplicateId) {
    await catalogLoaded;

    return;
  }

  isDuplicatingQuote.value = true;

  try {
    const [catalogReady, response] = await Promise.all([
      catalogLoaded,
      getQuoteRequest(duplicateId),
    ]);

    if (!catalogReady) return;

    const source = response.quote_response;

    subject.value = `Copia de ${source.subject}`;
    observations.value = source.observations ?? "";
    details.value = source.details.map((detail, index) => ({
      id: -(index + 1),
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
      characteristics: (detail.characteristics as unknown[]).map(
        getCharacteristicId,
      ),
    }));
    duplicateLoaded.value = true;
  } catch (error) {
    console.error(error);
    duplicateLoadError.value =
      "No se pudo cargar la cotización que quieres duplicar.";
  } finally {
    isDuplicatingQuote.value = false;
  }
});

const attachedFiles = ref<FileData[]>([]);

const submit = async () => {
  subjectError.value = "";

  if (isDuplicatingQuote.value) return;

  if (duplicateLoadError.value) {
    showSnackbar(duplicateLoadError.value, "error");

    return;
  }

  if (!subject.value.trim()) {
    subjectError.value = "Debe ingresar el asunto de la solicitud.";
    return;
  }

  if (!details.value.some((detail) => detail.product_id !== null)) {
    showSnackbar("Debes agregar al menos un producto a la solicitud.", "error");
    return;
  }

  if (!validate()) return;

  saving.value = true;

  try {
    const response = await createQuoteRequest({
      subject: subject.value.trim(),
      observations: observations.value || null,
      details: details.value.map((detail) => ({
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
      })),
      attachments: attachedFiles.value.map((f) => f.file),
    });

    await router.push({
      path: `/quotations/${response.quote_request.id}`,
      query: {
        created: "1",
      },
    });
  } catch (error) {
    showSnackbar(
      "No se pudo crear la solicitud. Inténtalo nuevamente.",
      "error",
    );
  } finally {
    saving.value = false;
  }
};

const showDeleteDialog = ref(false);
const detailToDelete = ref<number | null>(null);

const requestDeleteProduct = (detailId: number) => {
  detailToDelete.value = detailId;
  showDeleteDialog.value = true;
};

const confirmDeleteProduct = () => {
  if (detailToDelete.value === null) return;
  removeDetail(detailToDelete.value);
  showSnackbar("Producto eliminado correctamente.");
  detailToDelete.value = null;
  showDeleteDialog.value = false;
};
const cancelDeleteProduct = () => {
  showDeleteDialog.value = false;
  detailToDelete.value = null;
};
</script>

<template>
  <VCard class="overflow-visible">
    <div class="sticky-header w-100 overflow-hidden">
      <div
        class="quote-header d-flex align-center gap-4 flex-wrap bg-custom-background pa-6"
      >
        <div class="quote-header-copy">
          <VCardTitle class="pa-0"> Nueva solicitud de cotización </VCardTitle>

          <div class="text-body-2 text-medium-emphasis mt-1">
            Registra los productos que deseas cotizar.
          </div>
        </div>

        <VSpacer />

        <div class="quote-header-actions d-flex align-center flex-wrap ga-2">
          <VBtn
            variant="text"
            color="primary"
            prepend-icon="ri-question-line"
            @click="startTour()"
          >
            Ver tutorial
          </VBtn>

          <VBtn variant="tonal" @click="router.back()"> Cancelar </VBtn>

          <VBtn
            data-quote-tour="submit"
            color="primary"
            :loading="saving"
            :disabled="saving || isDuplicatingQuote || !!duplicateLoadError"
            @click="submit"
          >
            Guardar
          </VBtn>
        </div>
      </div>
    </div>
    <div class="quote-content pa-sm-12 pa-6">
      <!-- ========================================================= -->
      <!-- SIN EMPRESA -->
      <!-- ========================================================= -->

      <template v-if="!hasCustomer">
        <VCardText class="text-center py-12">
          <VAvatar color="primary" variant="tonal" size="72" class="mb-5">
            <VIcon icon="tabler-building" size="36" />
          </VAvatar>

          <h2 class="text-h5 mb-2">Empresa no registrada</h2>

          <p class="text-body-1 text-medium-emphasis mb-6">
            Debes registrar los datos de tu empresa antes de generar una
            solicitud de cotización.
          </p>

          <VBtn color="primary" to="/customer"> Registrar empresa </VBtn>
        </VCardText>
      </template>

      <!-- ========================================================= -->
      <!-- CON EMPRESA -->
      <!-- ========================================================= -->

      <template v-else>
        <!-- ======================================================= -->
        <!-- EMPRESA + DATOS DE SOLICITUD -->
        <!-- ======================================================= -->

        <VRow class="mb-2">
          <VCol cols="12" md="5">
            <VCard variant="tonal" height="100%" data-quote-tour="company">
              <VCardText class="d-flex align-center py-6">
                <VAvatar color="primary" variant="tonal" size="56" class="me-4">
                  <VIcon icon="tabler-building" size="28" />
                </VAvatar>

                <div>
                  <div class="text-h6 font-weight-medium">
                    {{ userData?.customer?.trade_name }}
                  </div>

                  <div class="text-body-1 text-medium-emphasis mt-1">
                    RUC {{ userData?.customer?.tax_number }}
                  </div>

                  <div class="text-body-2 text-medium-emphasis">
                    {{ userData?.customer?.district }},
                    {{ userData?.customer?.province }}
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VCol>

          <!-- Datos de la solicitud -->
          <VCol cols="12" md="7" data-quote-tour="request-info">
            <VRow>
              <VCol cols="12">
                <VTextField
                  v-model="subject"
                  label="Asunto"
                  placeholder="Ej. Cotización de vidrios para proyecto"
                  :error-messages="subjectError"
                />
              </VCol>

              <VCol cols="12">
                <VTextarea
                  v-model="observations"
                  label="Observaciones"
                  placeholder="Agrega cualquier información adicional"
                  rows="2"
                  hide-details
                />
              </VCol>
            </VRow>
          </VCol>
        </VRow>

        <VDivider class="my-6 border-dashed" />

        <!-- ======================================================= -->
        <!-- PRODUCTOS -->
        <!-- ======================================================= -->

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

        <VAlert
          v-if="duplicateLoadError"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ duplicateLoadError }}
        </VAlert>

        <VAlert
          v-if="isDuplicatingQuote"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          Cargando la cotización para duplicarla...
        </VAlert>

        <VAlert
          v-else-if="duplicateLoaded"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          Se copiaron los productos y las observaciones. Los archivos adjuntos no se duplican; agrégalos nuevamente si los necesitas.
        </VAlert>

        <div class="overflow-x-auto">
          <QuoteRequestProductTable
            :catalog="catalog"
            :details="details"
            :loading-catalog="loadingCatalog"
            drawer-mode
            @remove-detail="requestDeleteProduct"
            @open-duplicate-product="openDuplicateProduct"
            @open-add-product="openAddProduct"
            @open-edit-product="openEditProduct"
          />
        </div>

        <VDivider class="my-6 border-dashed" />

        <VCardItem>
          <template #append>
            <h6 class="text-h6 text-primary cursor-pointer">
              Adjuntar Archivos
            </h6>
          </template>
        </VCardItem>

        <VCardText data-quote-tour="attachments">
          <DropZone v-model="attachedFiles" />
        </VCardText>
      </template>
    </div>
  </VCard>
  <VSnackbar
    v-model="snackbar"
    :color="snackbarColor"
    location="top"
    :timeout="4000"
  >
    {{ snackbarMessage }}

    <template #actions>
      <VBtn icon size="small" variant="text" @click="snackbar = false">
        <VIcon icon="tabler-x" />
      </VBtn>
    </template>
  </VSnackbar>

  <QuoteRequestProductDrawer
    v-model="showProductDrawer"
    :catalog="catalog"
    :detail="editingDetail"
    :duplicate-detail="duplicateDetail"
    :refresh-catalog="() => loadCatalog(true)"
    @save="saveProduct"
  />

  <VDialog v-model="showDeleteDialog" max-width="440">
    <VCard>
      <VCardText class="pa-6">
        <div class="d-flex align-start ga-4">
          <VAvatar color="error" variant="tonal" size="48">
            <VIcon icon="ri-delete-bin-line" />
          </VAvatar>
          <div>
            <div class="text-h6">¿Eliminar producto?</div>
            <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
              El producto se quitará de esta solicitud. Puedes volver a
              agregarlo antes de guardar.
            </p>
          </div>
        </div>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="text" @click="cancelDeleteProduct">
          Conservar producto
        </VBtn>
        <VBtn
          color="error"
          variant="flat"
          prepend-icon="ri-delete-bin-line"
          @click="confirmDeleteProduct"
        >
          Eliminar
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
<style lang="scss">
.sticky-header {
  position: sticky;
  z-index: 9;
  transition: all 0.3s ease-in-out;
}

.quote-header-copy {
  min-width: 0;
}

.quote-header-actions {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .quote-header {
    align-items: stretch !important;
    gap: 0.75rem !important;
    padding: 1rem !important;
  }

  .quote-header-copy,
  .quote-header-actions {
    width: 100%;
  }

  .quote-header-actions {
    align-items: stretch;
  }

  .quote-header-actions .v-btn {
    flex: 1 1 auto;
    min-width: 0;
  }

  .quote-content {
    padding: 1rem !important;
  }

  .quote-content .v-card-text {
    padding-inline: 1rem;
  }
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

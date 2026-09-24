<script setup lang="ts">
import { useQuoteRequest } from "@/composables/useQuoteRequest";
import { createQuoteRequest } from "@/services/quoteRequestService";
import type { UserData } from "@/types/user";
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import Shepherd from "shepherd.js";
import "@core/scss/template/libs/shepherd.scss";
import quoteWelcomeIllustration from "@images/illustrations/faq-illustration.png";
import QuoteRequestProductTable from "./QuoteRequestProductTable.vue";
import QuoteRequestProductDrawer from "./QuoteRequestProductDrawer.vue";
import type { FileData } from "@/types/file";
import type { QuoteRequestDetail } from "@/composables/useQuoteRequest";

const QUOTE_TOUR_STORAGE_KEY = "quote-request-tour-completed";
const QUOTE_WELCOME_STORAGE_KEY = "quote-request-tour-welcome-seen";

const userData = useCookie<UserData | null>("userData");

const hasCustomer = computed(() => {
  return !!userData.value?.customer_id && !!userData.value?.customer;
});

const subject = ref("");
const observations = ref("");
const snackbar = ref(false);
const subjectError = ref("");
const snackbarMessage = ref("");
const showTourWelcome = ref(false);
const router = useRouter();
const {
 catalog,
 details,
 loadingCatalog,
 saving,
 loadCatalog,
 updateType,
 updateField,
 addDetail,
 removeDetail,
 validate,
 validationErrors,
} = useQuoteRequest();

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
  details.value.find((detail) => detail.id === editingDetailId.value) ?? null,
);

const saveProduct = (
  draft: Omit<
    QuoteRequestDetail,
    "id" | "product_type" | "product" | "length" | "finish"
  >,
  detailId: number | null,
) => {
  let detail = detailId === null
    ? details.value.find((item) => !item.product_type_id && !item.product_id)
    : details.value.find((item) => item.id === detailId);

  if (!detail) {
    addDetail();
    detail = details.value[details.value.length - 1];
  }

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
onMounted(() => {
  loadCatalog();

  if (
    hasCustomer.value &&
    localStorage.getItem(QUOTE_WELCOME_STORAGE_KEY) !== "true"
  ) {
    showTourWelcome.value = true;
  }
});

const attachedFiles = ref<FileData[]>([]);

const startQuoteTour = () => {
  Shepherd.activeTour?.cancel();

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: {
        enabled: true,
      },
      scrollTo: {
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      },
    },
  });

  const nextButton = {
    text: "Siguiente",
    action: tour.next,
  };

  const backButton = {
    text: "Atrás",
    action: tour.back,
    classes: "shepherd-button-secondary",
  };

  tour.addStep({
    id: "quote-company",
    title: "1. Tu empresa",
    text: "Esta es la empresa vinculada a tu cuenta. La solicitud se registrará a nombre de esta empresa.",
    attachTo: {
      element: "[data-quote-tour='company']",
      on: "right",
    },
    buttons: [nextButton],
  });

  tour.addStep({
    id: "quote-subject",
    title: "2. Describe tu solicitud",
    text: "Escribe un asunto claro y agrega observaciones que ayuden a entender lo que necesitas cotizar.",
    attachTo: {
      element: "[data-quote-tour='request-info']",
      on: "left",
    },
    buttons: [backButton, nextButton],
  });

  tour.addStep({
    id: "quote-products",
    title: "3. Agrega productos",
    text: "Presiona “Agregar ítem” para añadir productos. Completa sus medidas, cantidad, acabado y características.",
    attachTo: {
      element: "[data-quote-tour='products']",
      on: "top",
    },
    buttons: [backButton, nextButton],
  });

  tour.addStep({
    id: "quote-attachments",
    title: "4. Adjunta documentos",
    text: "Agrega planos, medidas o documentos de referencia para revisar tu solicitud con mayor precisión.",
    attachTo: {
      element: "[data-quote-tour='attachments']",
      on: "top",
    },
    buttons: [backButton, nextButton],
  });

  tour.addStep({
    id: "quote-submit",
    title: "5. Envía la solicitud",
    text: "Revisa la información y presiona “Enviar solicitud”. Luego podrás consultar el estado y el historial.",
    attachTo: {
      element: "[data-quote-tour='submit']",
      on: "bottom",
    },
    buttons: [
      backButton,
      {
        text: "Finalizar",
        action: tour.complete,
      },
    ],
  });

  tour.on("complete", () => {
    localStorage.setItem(QUOTE_TOUR_STORAGE_KEY, "true");
  });
  tour.start();
};

const closeTourWelcome = () => {
  showTourWelcome.value = false;
  localStorage.setItem(QUOTE_WELCOME_STORAGE_KEY, "true");
};

const acceptTourWelcome = async () => {
  showTourWelcome.value = false;
  localStorage.setItem(QUOTE_WELCOME_STORAGE_KEY, "true");
  await nextTick();
  window.setTimeout(() => startQuoteTour(), 250);
};

const submit = async () => {
  subjectError.value = "";

  if (!subject.value.trim()) {
    subjectError.value = "Debe ingresar el asunto de la solicitud.";
    return;
  }

  if (!details.value.some((detail) => detail.product_id !== null)) {
    snackbarMessage.value =
      "Debes agregar al menos un producto antes de enviar la solicitud.";
    snackbar.value = true;
    return;
  }

  if (!validate()) return;

  saving.value = true;

  try {
    console.log(
      "Archivos a enviar al crear:",
      attachedFiles.value.map(({ file }) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    );

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
    console.error("Error al crear la solicitud:", error);
    snackbarMessage.value =
      "No se pudo crear la solicitud. Inténtalo nuevamente.";
    snackbar.value = true;
  } finally {
    saving.value = false;
  }
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
            @click="startQuoteTour"
          >
            Ver guía
          </VBtn>

          <VBtn variant="tonal" @click="router.back()"> Cancelar </VBtn>

          <VBtn
            data-quote-tour="submit"
            color="primary"
            :loading="saving"
            :disabled="saving"
            @click="submit"
          >
            Enviar solicitud
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

        <div class="overflow-x-auto">
          <QuoteRequestProductTable
            :catalog="catalog"
            :details="details"
            :loading-catalog="loadingCatalog"
            drawer-mode
            @remove-detail="removeDetail"
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
  <VDialog v-model="showTourWelcome" max-width="760" persistent>
    <VCard class="quote-welcome-dialog" rounded="xl" elevation="12">
      <VRow no-gutters align="stretch">
        <VCol cols="12" md="5" class="quote-welcome-visual">
          <VCardText
            class="quote-welcome-visual-content d-flex flex-column align-center justify-space-between ga-4 pa-5"
          >
            <VChip
              color="white"
              variant="tonal"
              size="small"
              prepend-icon="ri-sparkling-2-line"
            >
              Guía rápida
            </VChip>
            <VImg
              :src="quoteWelcomeIllustration"
              width="100%"
              max-width="180"
              height="200"
              contain
              eager
              alt="Ilustración de una solicitud de cotización"
              class="quote-welcome-image"
            />
            <div class="text-body-2 text-white text-center">
              Solicita lo que necesitas de forma simple y ordenada.
            </div>
          </VCardText>
        </VCol>

        <VCol cols="12" md="7" class="quote-welcome-content">
          <VCardText class="pa-6 pa-md-10">
            <div class="text-overline text-primary mb-2">HPD Cotizaciones</div>
            <h2 class="text-h4 text-wrap mb-3">
              Bienvenido a tu nueva cotización
              <span>👋</span>
            </h2>
            <p class="text-body-1 text-medium-emphasis mb-5">
              Te mostraremos en menos de un minuto cómo crear y enviar tu
              solicitud para que recibas una cotización precisa.
            </p>

            <div class="d-flex flex-column ga-3 mb-6">
              <div class="d-flex align-center ga-3">
                <VAvatar color="primary" variant="tonal" size="34">
                  <VIcon icon="ri-file-list-3-line" size="18" />
                </VAvatar>
                <span class="text-body-2">Describe lo que necesitas.</span>
              </div>
              <div class="d-flex align-center ga-3">
                <VAvatar color="primary" variant="tonal" size="34">
                  <VIcon icon="ri-add-box-line" size="18" />
                </VAvatar>
                <span class="text-body-2">Agrega productos y medidas.</span>
              </div>
              <div class="d-flex align-center ga-3">
                <VAvatar color="primary" variant="tonal" size="34">
                  <VIcon icon="ri-send-plane-line" size="18" />
                </VAvatar>
                <span class="text-body-2">Envía tu solicitud al equipo.</span>
              </div>
            </div>

            <VCardActions class="justify-end flex-wrap ga-2 pa-0">
              <VBtn variant="text" @click="closeTourWelcome"> Ahora no </VBtn>
              <VBtn
                color="primary"
                prepend-icon="ri-play-line"
                @click="acceptTourWelcome"
              >
                Ver el recorrido
              </VBtn>
            </VCardActions>
          </VCardText>
        </VCol>
      </VRow>
    </VCard>
  </VDialog>
  <VSnackbar v-model="snackbar" color="error" location="top" :timeout="5000">
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
    @save="saveProduct"
  />
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

.quote-welcome-dialog {
  overflow: hidden;
}

.quote-welcome-visual {
  display: flex;
  align-items: center;
  min-block-size: 360px;
  background: linear-gradient(145deg, rgb(var(--v-theme-primary)), #173b63);
}

.quote-welcome-image {
  flex: 0 0 190px;
  filter: drop-shadow(0 1rem 1.25rem rgba(0, 0, 0, 0.18));
}

.quote-welcome-visual-content {
  width: 100%;
}

.quote-welcome-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (max-width: 959px) {
  .quote-welcome-visual {
    min-block-size: 260px;
  }
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

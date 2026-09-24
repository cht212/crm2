<script setup lang="ts">
import type { UserData } from "@/types/user";
import type {
  QuoteRequestListResponse,
  QuoteRequestSummary,
} from "@/types/quoteRequest";
import SumarySkeleton from "@/components/SumarySkeleton.vue";
import { computed } from "vue";

const userData = useCookie<UserData | null>("userData");
const router = useRouter();
const role = computed(() => userData.value?.roles?.[0] ?? "customer");
const isCustomer = computed(() => role.value === "customer");
const isCommercial = computed(() => role.value === "commercial");
const isAdmin = computed(() => role.value === "admin");
const customerName = computed(
  () => userData.value?.customer?.trade_name
    || userData.value?.customer?.company_name
    || userData.value?.name
    || "cliente",
);

const catalogSections = [
  { title: "Tipos de productos", resource: "types", icon: "ri-layout-grid-line" },
  { title: "Subtipos", resource: "subtypes", icon: "ri-node-tree" },
  { title: "Productos", resource: "products", icon: "ri-box-3-line" },
  { title: "Acabados", resource: "finishes", icon: "ri-palette-line" },
  { title: "Longitudes", resource: "lengths", icon: "ri-expand-width-line" },
  { title: "Características", resource: "additional-characteristics", icon: "ri-list-check-3" },
];

const { data: quoteRequestsData, isFetching } =
  useApi<QuoteRequestListResponse>(
    createUrl("quote-requests", {
      query: { page: 1, itemsPerPage: 1 },
    }),
  );

const summary = computed<QuoteRequestSummary>(
  () =>
    quoteRequestsData.value?.summary ?? {
      total: 0,
      pending: 0,
      inProcess: 0,
      reviewed: 0,
      quoted: 0,
    },
);

const dashboardStats = computed(() =>
  isCustomer.value
    ? [
        {
          title: "Total de solicitudes",
          value: summary.value.total,
          icon: "ri-file-list-3-line",
          color: "primary",
        },
        {
          title: "Pendientes",
          value: summary.value.pending,
          icon: "ri-time-line",
          color: "warning",
        },
        {
          title: "En proceso",
          value: summary.value.inProcess,
          icon: "ri-loader-4-line",
          color: "info",
        },
        {
          title: "Cotizadas",
          value: summary.value.quoted,
          icon: "ri-checkbox-circle-line",
          color: "success",
        },
      ]
    : [
        {
          title: "Total de solicitudes",
          value: summary.value.total,
          icon: "ri-file-list-3-line",
          color: "primary",
        },
        {
          title: "Pendientes de revisar",
          value: summary.value.pending,
          icon: "ri-time-line",
          color: "warning",
        },
        {
          title: "En proceso",
          value: summary.value.inProcess,
          icon: "ri-loader-4-line",
          color: "info",
        },
        {
          title: "Revisadas",
          value: summary.value.reviewed,
          icon: "ri-checkbox-circle-line",
          color: "success",
        },
      ],
);

const goToQuotations = () => {
  router.push({ name: "quotations-list" });
};

const goToNewQuotation = () => {
  router.push("/quotations/add");
};

const goToPromotions = () => {
  router.push({ name: "promotions" });
};
</script>

<template>
  <VRow class="match-height">
    <VCol cols="12" md="12" lg="12">
      <VCard>
        <VCardText class="pa-6 pa-md-8">
          <div class="text-h5 font-weight-medium">
            {{
              isCustomer
                ? `Hola, ${customerName}`
                : isCommercial
                  ? "Panel comercial"
                  : "Panel administrativo"
            }}
          </div>
          <div class="text-body-1 text-medium-emphasis mt-2">
            {{
              isCustomer
                ? "Gestiona tus solicitudes y cotizaciones desde un solo lugar."
                : isCommercial
                  ? "Consulta y da seguimiento a las cotizaciones."
                  : "Administra la operación del sistema."
            }}
          </div>

        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="12">
      <VCard>
        <VCardText class="px-2">
          <SumarySkeleton v-if="isFetching" :items="4" />

          <VRow v-else>
            <template v-for="(stat, index) in dashboardStats" :key="stat.title">
              <VCol cols="12" sm="6" md="3" class="px-6">
                <div class="d-flex justify-space-between">
                  <VCard
                    class="w-100 cursor-pointer dashboard-shortcut"
                    variant="text"
                    :aria-label="`Ver ${stat.title.toLowerCase()}`"
                    @click="goToQuotations"
                  >
                    <VCardText class="pa-0 d-flex align-center gap-x-4">
                    <VAvatar variant="tonal" :color="stat.color" rounded="lg">
                      <VIcon :icon="stat.icon" size="24" />
                    </VAvatar>
                    <div class="d-flex flex-column">
                      <span class="text-h4">{{ stat.value }}</span>
                      <span class="text-body-1">{{ stat.title }}</span>
                    </div>
                    </VCardText>
                  </VCard>
                </div>
              </VCol>

              <VDivider
                v-if="index !== dashboardStats.length - 1"
                vertical
                inset
                length="60"
              />
            </template>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VRow
    v-if="isCustomer"
    class="mt-2"
  >
    <VCol
      cols="12"
      md="8"
    >
      <VCard class="h-100">
        <VCardItem>
          <VCardTitle>¿Qué deseas hacer?</VCardTitle>
          <VCardSubtitle>Accede rápidamente a las opciones más utilizadas.</VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VRow>
            <VCol
              cols="12"
              sm="6"
            >
              <VCard
                variant="tonal"
                color="primary"
                class="h-100"
                hover
                @click="goToNewQuotation"
              >
                <VCardText class="d-flex align-center ga-4">
                  <VAvatar
                    color="primary"
                    variant="flat"
                    size="42"
                  >
                    <VIcon icon="ri-file-add-line" />
                  </VAvatar>
                  <div>
                    <div class="text-subtitle-1 font-weight-medium">
                      Solicitar cotización
                    </div>
                    <div class="text-body-2">
                      Crea una nueva solicitud.
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </VCol>

            <VCol
              cols="12"
              sm="6"
            >
              <VCard
                variant="tonal"
                color="success"
                class="h-100"
                hover
                @click="goToPromotions"
              >
                <VCardText class="d-flex align-center ga-4">
                  <VAvatar
                    color="success"
                    variant="flat"
                    size="42"
                  >
                    <VIcon icon="ri-mail-volume-line" />
                  </VAvatar>
                  <div>
                    <div class="text-subtitle-1 font-weight-medium">
                      Ver novedades
                    </div>
                    <div class="text-body-2">
                      Conoce nuestras promociones.
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <VCol
      cols="12"
      md="4"
    >
      <VCard
        class="h-100"
        variant="tonal"
      >
        <VCardText class="d-flex flex-column h-100">
          <VIcon
            icon="ri-customer-service-2-line"
            size="32"
            class="mb-4"
          />
          <div class="text-h6 mb-2">
            ¿Necesitas ayuda?
          </div>
          <div class="text-body-2 mb-5">
            Estamos disponibles para ayudarte con tu solicitud.
          </div>
          <VSpacer />
          <VBtn
            variant="flat"
            color="primary"
            to="/contact"
          >
            Contactarnos
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VRow v-if="isAdmin" class="mt-2">
    <VCol cols="12">
      <VCard>
        <VCardItem>
          <VCardTitle>Administración del catálogo</VCardTitle>
          <VCardSubtitle>Gestiona todos los elementos utilizados en las cotizaciones.</VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VRow>
            <VCol
              v-for="section in catalogSections"
              :key="section.resource"
              cols="12"
              sm="6"
              md="4"
            >
              <VCard
                :to="`/catalog/${section.resource}`"
                variant="tonal"
                color="primary"
                class="h-100"
                hover
              >
                <VCardText class="d-flex align-center ga-4">
                  <VAvatar
                    color="primary"
                    variant="flat"
                    size="42"
                  >
                    <VIcon :icon="section.icon" />
                  </VAvatar>
                  <span class="text-subtitle-1 font-weight-medium">
                    {{ section.title }}
                  </span>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";
.dashboard-shortcut {
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
}
</style>

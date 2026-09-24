<script setup lang="ts">
definePage({
  meta: {
    action: "read",
    subject: "QuoteRequest",
  },
});

import SumarySkeleton from "@/components/SumarySkeleton.vue";
import { useAbility } from "@/plugins/casl/composables/useAbility";
import type {
  QuoteRequestListItem,
  QuoteRequestHistory,
  QuoteRequestHistoryResponse,
  QuoteRequestListResponse,
  QuoteRequestStatusesResponse,
} from "@/types/quoteRequest";
import { Spanish } from "flatpickr/dist/l10n/es.js";

const ability = useAbility();
const canCreateQuote = computed(() => ability.can("create", "QuoteRequest"));
const canUpdateQuote = computed(() => ability.can("update", "QuoteRequest"));
const historyDrawer = ref(false);
const historyLoading = ref(false);
const selectedQuote = ref<QuoteRequestListItem | null>(null);
const quoteHistory = ref<QuoteRequestHistory[]>([]);

const searchInput = ref("");
const searchQuery = ref("");
const status = ref(null);

const itemsPerPage = ref(10);
const page = ref(1);
const sortBy = ref();
const orderBy = ref();

let searchTimeout: ReturnType<typeof setTimeout>;

const today = new Date();

const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const startDate = ref(formatDate(thirtyDaysAgo));
const endDate = ref(formatDate(today));

const dateRange = ref(
  `${formatDate(thirtyDaysAgo)} a ${formatDate(today)}`,
);

const {
  data: quoteRequestStatusesData,
  isFetching: isLoadingStatuses,
} = useApi<QuoteRequestStatusesResponse>(
  createUrl("quote-requests/statuses"),
  { immediate: true },
);

const statusOptions = computed(() => [
  { title: "Todos los estados", value: null },
  ...(quoteRequestStatusesData.value?.statuses ?? []).map(status => ({
    title: status.name,
    value: status.name,
  })),
]);

const hasActiveFilters = computed(() =>
  Boolean(searchInput.value || dateRange.value || status.value),
);

const clearFilters = () => {
  searchInput.value = "";
  dateRange.value = "";
  status.value = null;
};

watch(dateRange, (value) => {
  const [start = "", end = ""] = value.split(" a ");

  startDate.value = start;
  endDate.value = end || start;
}, { immediate: true });

watch(searchInput, (value) => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    searchQuery.value = value.trim();
    page.value = 1;
  }, 250);
});
const headers = [
  {
    title: "Código",
    key: "request_number",
    sortable: true,
  },
  {
    title: "Asunto",
    key: "subject",
    sortable: false,
  },
  {
    title: "Fecha Solicitud",
    key: "requested_at",
    sortable: true,
  },
  {
    title: "Estado",
    key: "status",
    sortable: false,
  },
  {
    title: "Acciones",
    key: "actions",
    sortable: false,
  },
];

const updateOptions = (options: any) => {
  page.value = options.page;
  sortBy.value = options.sortBy[0]?.key;
  orderBy.value = options.sortBy[0]?.order;
};

watch([startDate, endDate, status], () => {
  page.value = 1;
});

const {
  data: quoteRequestsData,
  isFetching,
  execute,
} = useApi<QuoteRequestListResponse>(
  createUrl("quote-requests", {
    query: {
      q: searchQuery,
      page,
      itemsPerPage,
      sortBy,
      orderBy,
      startDate,
      endDate,
      status,
    },
  }),
  { immediate: false },
);

watch(
  [
    searchQuery,
    page,
    itemsPerPage,
    sortBy,
    orderBy,
    startDate,
    endDate,
    status,
  ],
  () => execute(),
  {
    flush: "post",
    immediate: true,
  },
);

const quoteRequests = computed<QuoteRequestListItem[]>(() => {
  return quoteRequestsData.value?.quoteRequests ?? [];
});

const totalQuoteRequests = computed(() => {
  return quoteRequestsData.value?.totalQuoteRequests ?? 0;
});

const summary = computed(() => {
  return (
    quoteRequestsData.value?.summary ?? {
      total: 0,
      pending: 0,
      inProcess: 0,
      reviewed: 0,
      quoted: 0,
    }
  );
});

const widgetData = computed(() => [
  {
    title: "Total cotizaciones",
    value: summary.value.total,
    icon: "ri-file-list-3-line",
  },
  {
    title: "Pendientes",
    value: summary.value.pending,
    icon: "ri-time-line",
  },
  {
    title: "En proceso",
    value: summary.value.inProcess,
    icon: "ri-loader-4-line",
  },
]);

const openHistory = async (quoteRequest: QuoteRequestListItem) => {
  selectedQuote.value = quoteRequest;
  quoteHistory.value = [];
  historyDrawer.value = true;
  historyLoading.value = true;

  try {
    const response = await $api<QuoteRequestHistoryResponse>(
      `quote-requests/${quoteRequest.id}/history`,
    );

    quoteHistory.value = response.histories;
  } finally {
    historyLoading.value = false;
  }
};

const formatHistoryDate = (date: string) =>
  new Date(date).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
</script>

<template>
  <div>
    <!-- ========================================================= -->
    <!-- WIDGETS -->
    <!-- ========================================================= -->

    <VCard class="mb-6">
      <VCardText class="px-2">
        <SumarySkeleton :items="3" v-if="isFetching" />

        <VRow v-else>
          <template v-for="(data, index) in widgetData" :key="index">
            <VCol cols="12" sm="6" md="4" class="px-6">
              <div
                class="d-flex justify-space-between"
                :class="
                  $vuetify.display.xs
                    ? index !== widgetData.length - 1
                      ? 'border-b pb-4'
                      : ''
                    : $vuetify.display.sm
                      ? index < widgetData.length / 2
                        ? 'border-b pb-4'
                        : ''
                      : ''
                "
              >
                <div class="d-flex flex-column">
                  <h4 class="text-h4">
                    {{ data.value }}
                  </h4>

                  <span class="text-base text-capitalize">
                    {{ data.title }}
                  </span>
                </div>

                <VAvatar variant="tonal" rounded size="42">
                  <VIcon
                    :icon="data.icon"
                    size="26"
                    class="text-high-emphasis"
                  />
                </VAvatar>
              </div>
            </VCol>

            <VDivider
              v-if="
                $vuetify.display.mdAndUp
                  ? index !== widgetData.length - 1
                  : $vuetify.display.smAndUp
                    ? index % 2 === 0
                    : false
              "
              vertical
              inset
              length="60"
            />
          </template>
        </VRow>
      </VCardText>
    </VCard>

    <!-- ========================================================= -->
    <!-- TABLA -->
    <!-- ========================================================= -->

    <VCard class="quotation-list-card">
      <VCardTitle class="pa-6 pb-4 text-h5"> Lista Cotizaciones </VCardTitle>

      <VCardText class="px-6 pt-0 pb-6">
        <VRow class="d-flex justify-end align-center">
          <VCol cols="12" md="4" sm="7">
            <AppDateTimePicker
              v-model="dateRange"
              label="Rango de emisión"
              placeholder="Selecciona un rango"
              prepend-inner-icon="ri-calendar-line"
              :config="{ mode: 'range', dateFormat: 'Y-m-d', locale: Spanish }"
              clearable
              hide-details
            />
          </VCol>

          <VCol cols="12" md="3" sm="5">
            <VSelect
              v-model="status"
              :items="statusOptions"
              label="Estado"
              placeholder="Todos los estados"
              prepend-inner-icon="ri-price-tag-3-line"
              :loading="isLoadingStatuses"
              :disabled="isLoadingStatuses"
              loading-text="Cargando estados..."
              clearable
              hide-details
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardActions class="flex-wrap gap-3 pa-6">
        <VTextField
          v-model="searchInput"
          placeholder="Buscar cotización"
          prepend-inner-icon="ri-search-line"
          clearable
          density="compact"
          hide-details
          style="max-inline-size: 320px"
        />

        <VSpacer />

        <VBtn
          v-if="hasActiveFilters"
          color="secondary"
          variant="flat"
          prepend-icon="ri-filter-off-line"
          @click="clearFilters"
        >
          Limpiar
        </VBtn>

        <VBtn
          v-if="canCreateQuote"
          color="primary"
          variant="flat"
          prepend-icon="ri-file-add-line"
          @click="$router.push('/quotations/add')"
        >
          Nueva cotización
        </VBtn>
      </VCardActions>

      <div class="quotation-table-wrapper">
        <VDataTableServer
          v-model:items-per-page="itemsPerPage"
          v-model:page="page"
          :headers="headers"
          :items="quoteRequests"
          :items-length="totalQuoteRequests"
          :loading="isFetching"
          loading-text="Cargando cotizaciones..."
          class="text-no-wrap"
          @update:options="updateOptions"
        >
          <!-- CÓDIGO -->
          <template #item.request_number="{ item }">
            <RouterLink
              :to="{
                name: 'quotations-id',
                params: { id: item.id },
              }"
            >
              #{{ item.request_number }}
            </RouterLink>
          </template>

          <!-- ASUNTO -->
          <template #item.subject="{ item }">
            <div class="text-body-2">
              {{ item.subject }}
            </div>
          </template>

          <!-- FECHA -->
          <template #item.requested_at="{ item }">
            {{ new Date(item.requested_at).toLocaleDateString("es-PE") }}
          </template>

          <!-- ESTADO -->
          <template #item.status="{ item }">
            <VChip :color="item.status.color_hex">
              {{ item.status.name }}
            </VChip>
          </template>

          <!-- ACCIONES -->
          <template #item.actions="{ item }">
            <div class="text-no-wrap">
              <IconBtn
                size="small"
                :to="{
                  name: 'quotations-id',
                  params: { id: item.id },
                }"
              >
                <VIcon icon="ri-eye-line" />
                <VTooltip activator="parent">Ver cotización</VTooltip>
              </IconBtn>
              <IconBtn
                v-if="item.status.name === 'Borrador' && canUpdateQuote"
                size="small"
                :to="{
                  name: 'quotations-id',
                  params: { id: item.id },
                }"
              >
                <VIcon icon="ri-edit-line" />
                <VTooltip activator="parent">Editar cotización</VTooltip>
              </IconBtn>
              <IconBtn
                size="small"
                @click="openHistory(item)"
              >
                <VIcon icon="ri-history-line" />
                <VTooltip activator="parent">Ver historial</VTooltip>
              </IconBtn>
            </div>
          </template>

          <!-- PAGINACIÓN -->
          <template #bottom>
            <VDivider />

            <div class="d-flex justify-end flex-wrap gap-x-6 px-2 py-1">
              <div
                class="d-flex align-center gap-x-2 text-medium-emphasis text-base"
              >
                Filas por página:

                <VSelect
                  v-model="itemsPerPage"
                  class="per-page-select"
                  variant="plain"
                  :items="[10, 20, 25, 50, 100]"
                />
              </div>

              <p
                class="d-flex align-center text-base text-high-emphasis me-2 mb-0"
              >
                {{ paginationMeta({ page, itemsPerPage }, totalQuoteRequests) }}
              </p>

              <div class="d-flex gap-x-2 align-center me-2">
                <VBtn
                  class="flip-in-rtl"
                  icon="ri-arrow-left-s-line"
                  variant="text"
                  density="comfortable"
                  color="high-emphasis"
                  :disabled="page <= 1"
                  @click="page--"
                />

                <VBtn
                  class="flip-in-rtl"
                  icon="ri-arrow-right-s-line"
                  density="comfortable"
                  color="high-emphasis"
                  :disabled="
                    page >= Math.ceil(totalQuoteRequests / itemsPerPage)
                  "
                  @click="page++"
                />
              </div>
            </div>
          </template>
        </VDataTableServer>
      </div>
    </VCard>

    <VNavigationDrawer
      v-model="historyDrawer"
      location="end"
      temporary
      width="420"
    >
      <VToolbar flat>
        <VToolbarTitle>Historial</VToolbarTitle>
        <VSpacer />
        <IconBtn @click="historyDrawer = false">
          <VIcon icon="ri-close-line" />
        </IconBtn>
      </VToolbar>

      <VDivider />

      <div class="pa-5">
        <div v-if="selectedQuote" class="mb-5">
          <div class="text-subtitle-1 font-weight-medium">
            {{ selectedQuote.request_number }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ selectedQuote.subject }}
          </div>
        </div>

        <div v-if="historyLoading" class="d-flex justify-center py-8">
          <VProgressCircular indeterminate color="primary" />
        </div>

        <VTimeline
          v-else-if="quoteHistory.length"
          side="end"
          density="compact"
          align="start"
        >
          <VTimelineItem
            v-for="history in quoteHistory"
            :key="history.id"
            dot-color="primary"
            size="small"
          >
            <div class="text-subtitle-2">{{ history.comment || history.action }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ formatHistoryDate(history.created_at) }}
            </div>
            <div v-if="history.user" class="text-body-2 mt-1">
              Usuario: {{ history.user.name }}
            </div>
            <div v-if="history.previous_status || history.new_status" class="mt-2">
              <VChip
                v-if="history.previous_status"
                size="small"
                variant="tonal"
                class="me-1"
              >
                {{ history.previous_status.name }}
              </VChip>
              <VIcon icon="ri-arrow-right-line" size="16" class="me-1" />
              <VChip size="small" variant="tonal">
                {{ history.new_status.name }}
              </VChip>
            </div>
            <div
              v-if="
                history.changes?.details
                && (
                  history.changes.details.added?.length
                  || history.changes.details.removed?.length
                  || history.changes.details.updated?.length
                )
              "
              class="mt-3"
            >
              <div
                v-for="detail in history.changes.details.added ?? []"
                :key="`added-${history.id}-${detail.detail_id}`"
                class="text-body-2 text-success"
              >
                <VIcon icon="ri-add-line" size="16" />
                Agregado: {{ detail.product_name || `Producto #${detail.product_id}` }}
                <span v-if="detail.quantity">({{ detail.quantity }})</span>
              </div>
              <div
                v-for="detail in history.changes.details.updated ?? []"
                :key="`updated-${history.id}-${detail.detail_id}`"
                class="text-body-2 text-info"
              >
                <VIcon icon="ri-edit-line" size="16" />
                Modificado: {{ detail.product_name || `Producto #${detail.product_id}` }}
              </div>
              <div
                v-for="detail in history.changes.details.removed ?? []"
                :key="`removed-${history.id}-${detail.detail_id}`"
                class="text-body-2 text-error"
              >
                <VIcon icon="ri-delete-bin-line" size="16" />
                Eliminado: {{ detail.product_name || `Producto #${detail.product_id}` }}
                <span v-if="detail.quantity">({{ detail.quantity }})</span>
              </div>
            </div>
          </VTimelineItem>
        </VTimeline>

        <div v-else class="text-body-2 text-medium-emphasis text-center py-8">
          No hay historial disponible.
        </div>
      </div>
    </VNavigationDrawer>
  </div>
</template>

<style scoped>
.quotation-list-card {
  overflow: hidden;
}

.quotation-table-wrapper {
  overflow-x: auto;
}
</style>

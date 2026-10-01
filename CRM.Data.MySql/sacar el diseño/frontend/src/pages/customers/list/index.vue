<script setup lang="ts">
import { customerService } from "@/services/customerService";
import type { Customer } from "@/types/customer";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAbility } from "@/plugins/casl/composables/useAbility";

definePage({
  meta: {
    action: "read",
    subject: "Customer",
  },
});

const tableHeaders = [
  { title: "Razón social", key: "company_name" },
  { title: "RUC", key: "tax_number" },
  { title: "Nombre comercial", key: "trade_name" },
  { title: "Usuario", key: "user" },
  { title: "Distrito", key: "district" },
  { title: "Estado", key: "is_active" },
  { title: "Acciones", key: "actions", sortable: false },
];

const companies = ref<Customer[]>([]);
const companiesLoading = ref(false);
const companiesError = ref("");
const snackbar = ref(false);
const snackbarMessage = ref("");
const page = ref(1);
const itemsPerPage = ref(10);
const totalCompanies = ref(0);
const search = ref("");
const route = useRoute();
const router = useRouter();
const ability = useAbility();
const userData = useCookie<{ roles?: string[] } | null>("userData");
const canCreateCompany = computed(() =>
  userData.value?.roles?.includes("admin") === true
  && ability.can("create", "Customer"),
);
const canUpdateCompany = computed(() => ability.can("update", "Customer"));
let searchTimeout: ReturnType<typeof setTimeout> | undefined;
let latestLoadRequest = 0;

const loadCompanies = async () => {
  const requestId = ++latestLoadRequest;
  companiesLoading.value = true;
  companiesError.value = "";

  try {
    const response = await customerService.getCustomers(
      page.value,
      itemsPerPage.value,
      search.value,
    );

    if (requestId === latestLoadRequest) {
      companies.value = response.customers;
      totalCompanies.value = response.totalCustomers;
    }
  } catch (error) {
    console.error(error);
    if (requestId === latestLoadRequest)
      companiesError.value = "No se pudieron cargar las empresas.";
  } finally {
    if (requestId === latestLoadRequest)
      companiesLoading.value = false;
  }
};

onMounted(async () => {
  await loadCompanies();

  const successMessage = typeof route.query.success === "string"
    ? route.query.success
    : "";

  if (successMessage) {
    snackbarMessage.value = successMessage;
    snackbar.value = true;
    await router.replace({ query: { ...route.query, success: undefined } });
  }
});
watch([page, itemsPerPage], loadCompanies);
watch(search, () => {
  if (searchTimeout)
    clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    if (page.value === 1)
      void loadCompanies();
    else
      page.value = 1;
  }, 300);
});
onBeforeUnmount(() => {
  if (searchTimeout)
    clearTimeout(searchTimeout);
});

const createCompany = () => {
  router.push({ name: "customers-add" });
};

const editCompany = (company: Customer) => {
  router.push({
    name: "customers-edit-id",
    params: {
      id: company.id,
    },
  });
};

const viewCompany = (company: Customer) => {
  router.push({
    name: "customers-view-id",
    params: { id: company.id },
  });
};
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between gap-4 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 mb-1">Empresas</h4>

        <p class="text-body-1 mb-0">Gestiona las empresas registradas.</p>
      </div>

      <VBtn v-if="canCreateCompany" color="primary" @click="createCompany">
        <VIcon start icon="ri-add-line" />
        Nueva empresa
      </VBtn>
    </div>

    <VAlert v-if="companiesError" type="error" variant="tonal" class="mb-6">
      {{ companiesError }}
    </VAlert>

    <VCard>
      <VCardTitle> Empresas registradas </VCardTitle>

      <VCardText class="pt-0">
        <VTextField
          v-model="search"
          label="Buscar empresa"
          placeholder="Razón social, RUC, nombre comercial..."
          prepend-inner-icon="ri-search-line"
          clearable
          hide-details
          density="comfortable"
          class="company-search-field"
        />
      </VCardText>

      <VDataTableServer
        :headers="tableHeaders"
        :items="companies"
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :items-length="totalCompanies"
        :loading="companiesLoading"
        item-value="id"
        loading-text="Cargando empresas..."
        no-data-text="No se encontraron empresas"
      >
        <template #item.is_active="{ item }">
          <VChip :color="item.is_active ? 'success' : 'secondary'" size="small">
            {{ item.is_active ? "Activo" : "Inactivo" }}
          </VChip>
        </template>

        <template #item.user="{ item }">
          <div v-if="item.users?.[0]" class="py-1">
            <div class="text-body-2 font-weight-medium">
              {{ item.users[0].name }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ item.users[0].email }}
            </div>
          </div>
          <VChip v-else size="small" color="secondary" variant="tonal">
            Sin usuario
          </VChip>
        </template>

        <template #item.actions="{ item }">
          <VBtn icon size="small" variant="text" color="secondary" @click="viewCompany(item)">
            <VIcon icon="ri-eye-line" />
            <VTooltip activator="parent"> Ver empresa </VTooltip>
          </VBtn>
          <VBtn v-if="canUpdateCompany" icon size="small" variant="text" color="primary" @click="editCompany(item)">
            <VIcon icon="ri-edit-line" />

            <VTooltip activator="parent"> Editar </VTooltip>
          </VBtn>
        </template>
      </VDataTableServer>
    </VCard>

    <VSnackbar v-model="snackbar" color="success" location="top" :timeout="4000">
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.company-search-field {
  max-inline-size: 420px;
}
</style>

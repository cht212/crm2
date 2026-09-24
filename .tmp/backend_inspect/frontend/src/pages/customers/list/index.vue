<script setup lang="ts">
import { customerService } from "@/services/customerService";
import type { Customer } from "@/types/customer";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

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
const router = useRouter();

const loadCompanies = async () => {
  companiesLoading.value = true;
  companiesError.value = "";

  try {
    const response = await customerService.getCustomers();

    companies.value = response.customers;
  } catch (error) {
    console.error(error);
    companiesError.value = "No se pudieron cargar las empresas.";
  } finally {
    companiesLoading.value = false;
  }
};

onMounted(loadCompanies);

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
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between gap-4 mb-6">
      <div class="d-flex flex-column justify-center">
        <h4 class="text-h4 mb-1">Empresas</h4>

        <p class="text-body-1 mb-0">Gestiona las empresas registradas.</p>
      </div>

      <VBtn color="primary" @click="createCompany">
        <VIcon start icon="ri-add-line" />
        Nueva empresa
      </VBtn>
    </div>

    <VAlert v-if="companiesError" type="error" variant="tonal" class="mb-6">
      {{ companiesError }}
    </VAlert>

    <VCard>
      <VCardTitle> Empresas registradas </VCardTitle>

      <VDataTable
        :headers="tableHeaders"
        :items="companies"
        :loading="companiesLoading"
        item-value="id"
        loading-text="Cargando empresas..."
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
          <VBtn icon size="small" variant="text" color="primary" @click="editCompany(item)">
            <VIcon icon="ri-edit-line" />

            <VTooltip activator="parent"> Editar </VTooltip>
          </VBtn>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>

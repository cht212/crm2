<script setup lang="ts">
definePage({
  meta: {
    action: "read",
    subject: "Customer",
  },
});

import CustomerEditor from "@/components/customers/CustomerEditor.vue";
import { useCustomer } from "@/composables/useCustomer";
import { useRoute, useRouter } from "vue-router";
import { onMounted } from "vue";

const route = useRoute();
const router = useRouter();
const { loading, form, loadCustomerById, resetForm, validationErrors } = useCustomer();
const customerId = Number(route.params.id);

const loadCompany = async () => {
  try {
    await loadCustomerById(customerId);
  } catch {
    await router.push({ name: "customers-list" });
  }
};

const handleCancel = () => {
  resetForm();
  router.push({ name: "customers-list" });
};

onMounted(loadCompany);
</script>

<template>
  <CustomerEditor
    title="Ver empresa"
    description="Consulta toda la información registrada de la empresa."
    :form="form"
    :loading="loading"
    :saving="false"
    :validation-errors="validationErrors"
    :snackbar="false"
    snackbar-message=""
    snackbar-color="success"
    :read-only="true"
    @submit="handleCancel"
    @cancel="handleCancel"
    @update:snackbar="() => undefined"
  />
</template>

<script setup lang="ts">
definePage({
  meta: {
    action: "update",
    subject: "Customer",
  },
});

import CustomerEditor from "@/components/customers/CustomerEditor.vue";
import { useCustomer } from "@/composables/useCustomer";
import { useRoute, useRouter } from "vue-router";
import { onMounted } from "vue";

const route = useRoute();
const router = useRouter();

const {
  loading,
  saving,
  form,
  loadCustomerById,
  updateCustomer,
  resetForm,
  snackbar,
  snackbarMessage,
  snackbarColor,
  validationErrors,
} = useCustomer();

const customerId = Number(route.params.id);

const loadCompany = async () => {
  try {
    await loadCustomerById(customerId);
  } catch {
    router.push({ name: "customers" });
  }
};

const handleUpdate = async () => {
  try {
    await updateCustomer(customerId);

    router.push({ name: "customers" });
  } catch {
    // El composable ya muestra el error.
  }
};

const handleCancel = () => {
  resetForm();
  router.back();
};

onMounted(loadCompany);
</script>

<template>
  <CustomerEditor
    title="Editar empresa"
    description="Actualiza la información de la empresa."
    :form="form"
    :loading="loading"
    :saving="saving"
    :validation-errors="validationErrors"
    :snackbar="snackbar"
    :snackbar-message="snackbarMessage"
    :snackbar-color="snackbarColor"
    @submit="handleUpdate"
    @cancel="handleCancel"
    @update:snackbar="snackbar = $event"
  />
</template>

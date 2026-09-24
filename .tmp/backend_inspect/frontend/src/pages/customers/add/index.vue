<script setup lang="ts">
definePage({
  meta: {
    action: "create",
    subject: "Customer",
  },
});

import CustomerEditor from "@/components/customers/CustomerEditor.vue";
import { useCustomer } from "@/composables/useCustomer";
import { useRouter } from "vue-router";

const router = useRouter();

const {
  saving,
  form,
  createCustomer,
  resetForm,
  snackbar,
  snackbarMessage,
  snackbarColor,
  validationErrors,
} = useCustomer();

const handleCreate = async () => {
  try {
    await createCustomer();

    router.push({ name: "customers" });
  } catch {
    // El composable ya muestra el error.
  }
};

const handleCancel = () => {
  resetForm();
  router.back();
};
</script>

<template>
  <CustomerEditor
    title="Nueva empresa"
    description="Registra una nueva empresa."
    :form="form"
    :loading="false"
    :saving="saving"
    :validation-errors="validationErrors"
    :snackbar="snackbar"
    :snackbar-message="snackbarMessage"
    :snackbar-color="snackbarColor"
    @submit="handleCreate"
    @cancel="handleCancel"
    @update:snackbar="snackbar = $event"
  />
</template>

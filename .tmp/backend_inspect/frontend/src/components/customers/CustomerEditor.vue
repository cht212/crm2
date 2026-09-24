<script setup lang="ts">
import CustomerForm from "@/components/customers/CustomerForm.vue";
import CustomerFormSkeleton from "@/components/customers/FormSkeleton.vue";
import type { CustomerForm as CustomerFormData } from "@/types/customer";

defineProps<{
  title: string;
  description: string;
  form: CustomerFormData;
  loading: boolean;
  saving: boolean;
  validationErrors: Record<string, string[]>;
  snackbar: boolean;
  snackbarMessage: string;
  snackbarColor: "success" | "error";
}>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
  "update:snackbar": [value: boolean];
}>();
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-space-between gap-4 mb-6">
      <div>
        <h4 class="text-h4 mb-1">{{ title }}</h4>
        <p class="text-body-1 mb-0">{{ description }}</p>
      </div>
    </div>

    <CustomerFormSkeleton v-if="loading" />

    <CustomerForm
      v-else
      :form="form"
      :loading="loading"
      :saving="saving"
      :validation-errors="validationErrors"
      @submit="emit('submit')"
      @cancel="emit('cancel')"
    />

    <VSnackbar
      :model-value="snackbar"
      location="top"
      transition="scroll-y-reverse-transition"
      variant="flat"
      :color="snackbarColor"
      @update:model-value="emit('update:snackbar', $event)"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>

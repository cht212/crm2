import { computed, ref } from "vue";

type ValidationErrors = Record<string, string[]>;

export function useFormValidation() {
  const errors = ref<ValidationErrors>({});

  const setErrors = (validationErrors?: ValidationErrors) => {
    errors.value = validationErrors ?? {};
  };

  const clearErrors = () => {
    errors.value = {};
  };

  const clearFieldError = (field: string) => {
    delete errors.value[field];
  };

  const hasErrors = computed(() => {
    return Object.keys(errors.value).length > 0;
  });

  const errorCount = computed(() => {
    return Object.keys(errors.value).length;
  });

  const getFirstError = (fields: string[]) => {
    return (
      fields.find(
        field => errors.value[field]?.length,
      ) ?? null
    );
  };

  const getError = (field: string): string => {
    return errors.value[field]?.[0] ?? "";
  };

  return {
    errors,
    hasErrors,
    errorCount,
    setErrors,
    clearErrors,
    clearFieldError,
    getError,
    getFirstError,
  };
}

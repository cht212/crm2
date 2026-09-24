<script setup lang="ts">
import type { CustomerForm } from "@/types/customer";
import { computed, watch } from "vue";

const props = defineProps<{
  form: CustomerForm;
  loading: boolean;
  saving: boolean;
  validationErrors: Record<string, string[]>;
}>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();

const { setErrors, getError, getFirstError } = useFormValidation();

const fieldOrder = [
  "company_name",
  "tax_number",
  "trade_name",
  "email",
  "phone",
  "address",
  "department",
  "province",
  "district",
  "contact.name",
  "contact.position",
  "contact.email",
  "contact.phone",
];

watch(
  () => props.validationErrors,
  (errors) => {
    setErrors(errors);
  },
  {
    immediate: true,
  },
);

const firstErrorField = computed(() => getFirstError(fieldOrder));

const requiredRule = (value: unknown) =>
  Boolean(value) || "Este campo es obligatorio.";
const emailRule = (value: string) =>
  !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || "Ingresa un correo válido.";
const passwordConfirmationRule = (value: string) =>
  value === props.form.user?.password || "Las contraseñas no coinciden.";
</script>

<template>
  <VCard class="mb-6">
    <VCardTitle class="bg-primary text-white mb-4">
      Información de empresa
    </VCardTitle>

    <VCardText>
      <VForm @submit.prevent="emit('submit')">
        <VRow>
          <VCol cols="12" md="8">
            <VTextField
              v-model="form.company_name"
              label="Razón Social *"
              placeholder="HDP GROUP GLASS"
              required
              :disabled="loading || saving"
              :error-messages="getError('company_name')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="4">
            <VTextField
              v-model="form.tax_number"
              label="RUC *"
              placeholder="10727417473"
              required
              :disabled="loading || saving"
              :error-messages="getError('tax_number')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="form.trade_name"
              label="Nombre Comercial *"
              placeholder="HPD GROUP GLASS"
              required
              :disabled="loading || saving"
              :error-messages="getError('trade_name')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="3">
            <VTextField
              v-model="form.email"
              label="Correo *"
              placeholder="sistemas@example.com"
              type="email"
              required
              :disabled="loading || saving"
              :error-messages="getError('email')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="3">
            <VTextField
              v-model="form.phone"
              label="Teléfono *"
              placeholder="91447852"
              required
              :disabled="loading || saving"
              :error-messages="getError('phone')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="6">
            <VTextField
              v-model="form.address"
              label="Dirección *"
              placeholder="Av. Principal 123"
              required
              :disabled="loading || saving"
              :error-messages="getError('address')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="2">
            <VTextField
              v-model="form.department"
              label="Departamento *"
              placeholder="Lima"
              required
              :disabled="loading || saving"
              :error-messages="getError('department')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="2">
            <VTextField
              v-model="form.province"
              label="Provincia *"
              placeholder="Lima"
              required
              :disabled="loading || saving"
              :error-messages="getError('province')"
              density="compact"
            />
          </VCol>

          <VCol cols="12" md="2">
            <VTextField
              v-model="form.district"
              label="Distrito *"
              placeholder="Miraflores"
              required
              :disabled="loading || saving"
              :error-messages="getError('district')"
              density="compact"
            />
          </VCol>
        </VRow>

        <VExpansionPanels multiple variant="accordion" class="mt-6">
          <VExpansionPanel>
            <VExpansionPanelTitle>
              <div>
                <div class="text-subtitle-1 font-weight-medium">Contacto principal</div>
                <div class="text-caption text-medium-emphasis">
                  Persona de referencia de la empresa
                </div>
              </div>
            </VExpansionPanelTitle>
            <VExpansionPanelText>
              <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.contact.name"
                label="Nombre completo"
                placeholder="Nombre del contacto"
                :disabled="loading || saving"
                density="compact"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="form.contact.position"
                label="Cargo"
                placeholder="Cargo"
                :disabled="loading || saving"
                density="compact"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="form.contact.email"
                label="Correo electrónico"
                type="email"
                placeholder="correo@empresa.com"
                :disabled="loading || saving"
                :error-messages="getError('contact.email')"
                density="compact"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="form.contact.phone"
                label="Teléfono"
                placeholder="999999999"
                :disabled="loading || saving"
                density="compact"
              />
            </VCol>
              </VRow>
            </VExpansionPanelText>
          </VExpansionPanel>

          <VExpansionPanel>
            <VExpansionPanelTitle>
              <div>
                <div class="text-subtitle-1 font-weight-medium">Acceso de usuario</div>
                <div class="text-caption text-medium-emphasis">
                  {{
                    form.assigned_user
                      ? "Usuario asignado a esta empresa"
                      : "Opcional: crea el acceso junto con la empresa"
                  }}
                </div>
              </div>
            </VExpansionPanelTitle>
            <VExpansionPanelText>
              <VCard
                v-if="form.assigned_user"
                variant="tonal"
                color="primary"
                class="mb-2"
              >
                <VCardText class="d-flex align-center ga-4">
                  <VAvatar color="primary" variant="flat">
                    <VIcon icon="ri-user-line" />
                  </VAvatar>
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-medium">
                      {{ form.assigned_user.name }}
                    </div>
                    <div class="text-body-2">
                      {{ form.assigned_user.email }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ form.assigned_user.phone || "Sin teléfono" }}
                    </div>
                  </div>
                  <VChip
                    size="small"
                    :color="form.assigned_user.is_active ? 'success' : 'secondary'"
                  >
                    {{ form.assigned_user.is_active ? "Activo" : "Inactivo" }}
                  </VChip>
                </VCardText>
              </VCard>

              <template v-else>
                <VSwitch
                  v-model="form.create_user"
                  label="Crear acceso para esta empresa"
                  hint="El usuario podrá iniciar sesión y gestionar sus cotizaciones."
                  persistent-hint
                  :disabled="loading || saving"
                />

                <VAlert
                  v-if="form.create_user"
                  type="info"
                  variant="tonal"
                  class="mt-4 mb-4"
                >
                  Completa estos datos para crear el usuario cliente junto con la empresa.
                </VAlert>
              </template>

              <VRow v-if="!form.assigned_user && form.create_user">
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.user!.name"
                label="Nombre del usuario *"
                :rules="[requiredRule]"
                :error-messages="getError('user.name')"
                :disabled="loading || saving"
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.user!.email"
                label="Correo de acceso *"
                type="email"
                :rules="[requiredRule, emailRule]"
                :error-messages="getError('user.email')"
                :disabled="loading || saving"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="form.user!.phone"
                label="Teléfono"
                :disabled="loading || saving"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="form.user!.password"
                label="Contraseña *"
                type="password"
                :rules="[requiredRule]"
                :error-messages="getError('user.password')"
                :disabled="loading || saving"
              />
            </VCol>
            <VCol cols="12" md="4">
              <VTextField
                v-model="form.user!.password_confirmation"
                label="Confirmar contraseña *"
                type="password"
                :rules="[requiredRule, passwordConfirmationRule]"
                :error-messages="getError('user.password_confirmation')"
                :disabled="loading || saving"
              />
            </VCol>
              </VRow>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>

        <VCol cols="12">
          <div class="d-flex justify-center">
            <VBtn
              type="submit"
              class="me-4"
              color="success-darken-1"
              :loading="saving"
              :disabled="loading"
            >
              <VIcon start icon="ri-save-line" />
              Guardar
            </VBtn>

            <VBtn
              color="error"
              type="button"
              variant="outlined"
              :disabled="loading || saving"
              @click="emit('cancel')"
            >
              <VIcon start icon="ri-close-line" />
              Cancelar
            </VBtn>
          </div>
        </VCol>
      </VForm>
    </VCardText>
  </VCard>
</template>

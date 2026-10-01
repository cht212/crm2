<script setup lang="ts">
import type { UserData } from "@/types/user";
import type { VForm } from "vuetify/components/VForm";
import type { FileData } from "@/types/file";
import { ref, watch } from "vue";
import { sendContactMessage } from "@/services/contactMessageService";
import DropZone from "@core/components/DropZone.vue";

const userData = useCookie<UserData | null>("userData");
const nombreCompleto = ref(userData.value?.name ?? "");
const correo = ref(userData.value?.email ?? "");
const telefono = ref(userData.value?.phone ?? "");
const mensaje = ref("");
const attachedFiles = ref<FileData[]>([]);
const loading = ref(false);
const contactForm = ref<VForm>();
const isFormValid = ref(false);
const fieldErrors = ref<Record<string, string[]>>({});

watch(
  userData,
  (value) => {
    nombreCompleto.value = value?.name ?? "";
    correo.value = value?.email ?? "";
    telefono.value = value?.phone ?? "";
  },
  { deep: true },
);

const snackbar = ref(false);
const snackbarText = ref("");
const snackbarColor = ref<"success" | "error">("success");

const showMessage = (message: string, color: "success" | "error") => {
  snackbarText.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
};

const requiredRule = (value: unknown) =>
  Boolean(typeof value === "string" ? value.trim() : value) ||
  "Este campo es obligatorio.";

const emailRule = (value: string) =>
  !value ||
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
  "Ingresa un correo válido.";

const phoneRule = (value: string) =>
  !value || /^[+0-9()\s-]{7,20}$/.test(value) || "Ingresa un teléfono válido.";

const handleSubmit = async () => {
  fieldErrors.value = {};

  const validation = await contactForm.value?.validate();
  if (!validation?.valid) return;

  loading.value = true;

  try {
    await sendContactMessage({
      full_name: nombreCompleto.value.trim(),
      email: correo.value.trim(),
      phone: telefono.value.trim() || null,
      message: mensaje.value.trim(),
      attachments: attachedFiles.value.map((item) => item.file),
    });
    showMessage("Tu mensaje fue enviado correctamente.", "success");
    mensaje.value = "";
    attachedFiles.value = [];
  } catch (error) {
    console.error(error);
    const responseErrors = (
      error as {
        data?: { errors?: Record<string, string[]> };
      }
    )?.data?.errors;

    fieldErrors.value = responseErrors ?? {};
    showMessage(
      Object.keys(fieldErrors.value).length
        ? "Revisa los campos del formulario."
        : "No se pudo enviar el mensaje. Inténtalo nuevamente.",
      "error",
    );
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div>
    <section
      class="contact-cards-banner position-relative rounded-lg py-16 pb-4 pb-sm-4 px-4 px-sm-8"
    >
      <VRow class="align-center">
        <VCol cols="12" sm="3" lg="3">
          <VCard class="h-100" href="tel:+51999999999" rel="noopener">
            <VCardText class="text-center">
              <VIcon
                icon="ri-phone-line"
                color="primary"
                size="32"
                class="mb-2"
              />
              <h6 class="text-h6">Teléfono</h6>
              <span>+51 999 999 999</span>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="3" lg="3">
          <VCard
            class="h-100"
            href="https://wa.me/51999999999"
            rel="noopener noreferrer"
            target="_blank"
          >
            <VCardText class="text-center">
              <VIcon
                icon="ri-whatsapp-line"
                color="success"
                size="32"
                class="mb-2"
              />
              <h6 class="text-h6">WhatsApp</h6>
              <span>+51 999 999 999</span>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="3" lg="3">
          <VCard
            class="h-100"
            href="mailto:contacto@hpdglass.com"
            rel="noopener"
          >
            <VCardText class="text-center">
              <VIcon icon="ri-mail-line" color="info" size="32" class="mb-2" />
              <h6 class="text-h6">Correo</h6>
              <span>contacto@hpdglass.com</span>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="3" lg="3">
          <VCard
            class="h-100"
            href="https://www.hpdglass.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <VCardText class="text-center">
              <VIcon
                icon="ri-global-line"
                color="primary"
                size="32"
                class="mb-2"
              />
              <h6 class="text-h6">Página web</h6>
              <span>www.hpdglass.com</span>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <VCard class="mt-6">
      <VCardTitle>Contáctanos</VCardTitle>
      <VDivider />
      <VCardText>
        <VForm
          ref="contactForm"
          v-model="isFormValid"
          @submit.prevent="handleSubmit"
        >
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="nombreCompleto"
                label="Nombre completo"
                placeholder="Juan Pérez"
                required
                :rules="[requiredRule]"
                :error-messages="fieldErrors.full_name"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="correo"
                label="Correo electrónico"
                placeholder="correo@empresa.com"
                type="email"
                required
                :rules="[requiredRule, emailRule]"
                :error-messages="fieldErrors.email"
              />
            </VCol>

            <VCol cols="12" md="6">
              <VTextField
                v-model="telefono"
                label="Teléfono"
                placeholder="+51 999 999 999"
                type="tel"
                :rules="[phoneRule]"
                :error-messages="fieldErrors.phone"
              />
            </VCol>

            <VCol cols="12">
              <VTextarea
                v-model="mensaje"
                label="Mensaje"
                placeholder="Escribe tu consulta..."
                rows="4"
                required
                :rules="[requiredRule]"
                :error-messages="fieldErrors.message"
              />
            </VCol>

            <VCol cols="12">
              <DropZone
                v-model="attachedFiles"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                :allowed-extensions="['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']"
                formats-label="PNG, JPG, JPEG, Word o PDF"
              />
              <div
                v-if="fieldErrors.attachments?.length"
                class="text-error text-caption mt-2"
              >
                {{ fieldErrors.attachments[0] }}
              </div>
            </VCol>

            <VCol cols="12">
              <div class="d-flex justify-end">
                <VBtn
                  color="primary"
                  :loading="loading"
                  prepend-icon="ri-send-plane-line"
                  type="submit"
                >
                  Enviar mensaje
                </VBtn>
              </div>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      location="top right"
      timeout="4000"
    >
      <div class="d-flex align-center">
        <VIcon
          :icon="
            snackbarColor === 'success'
              ? 'ri-check-line'
              : 'ri-error-warning-line'
          "
          start
        />
        {{ snackbarText }}
      </div>
      <template #actions>
        <VBtn variant="text" @click="snackbar = false"> Cerrar </VBtn>
      </template>
    </VSnackbar>
  </div>
</template>

<style scoped>
.contact-cards-banner {
  isolation: isolate;
}

.contact-cards-banner::before {
  position: absolute;
  z-index: -1;
  inset: 0 0 auto;
  height: 200px;
  border-radius: 16px;
  background:
    linear-gradient(rgba(0, 50, 85, 0.7), rgba(0, 50, 85, 0.7)),
    url("https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=80")
      center / cover;
  content: "";
}

@media (max-width: 600px) {
  .contact-cards-banner::before {
    height: 144px;
  }
}
</style>

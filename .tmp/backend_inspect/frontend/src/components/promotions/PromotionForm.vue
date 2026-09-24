<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import TiptapEditor from "@core/components/TiptapEditor.vue";
import { customerService } from "@/services/customerService";
import type { Customer } from "@/types/customer";
import type {
  Promotion,
  PromotionEmbedForm,
  PromotionForm,
} from "@/types/promotion";
import SurveyBuilder from "@/components/surveys/SurveyBuilder.vue";

const props = withDefaults(defineProps<{
  saving: boolean;
  error?: string;
  validationErrors?: Record<string, string[]>;
}>(), {
  error: '',
  validationErrors: () => ({}),
});

const emit = defineEmits<{
  submit: [status: Promotion["status"]];
  cancel: [];
}>();

const form = defineModel<PromotionForm>("form", { required: true });
const generalValidationErrors = computed(() =>
  Object.entries(props.validationErrors)
    .filter(([field]) => ["questions", "survey", "promotion"].includes(field))
    .flatMap(([, messages]) => messages),
);
const embedPlatform = ref<PromotionEmbedForm["platform"]>("tiktok");
const embedUrl = ref("");
const imagePreviews = ref<string[]>([]);
const customers = ref<Customer[]>([]);
const loadingCustomers = ref(false);

const addEmbed = () => {
  if (!embedUrl.value.trim() || form.value.embeds.length >= 1) return;

  form.value.embeds.push({
    platform: embedPlatform.value,
    url: embedUrl.value.trim(),
  });
  embedUrl.value = "";
};

const removeExistingImage = (imageId: number) => {
  form.value.existingImages = form.value.existingImages.filter(
    (image) => image.id !== imageId,
  );
  form.value.deletedImageIds.push(imageId);
};

const removeExistingAttachment = (attachmentId: number) => {
  form.value.existingAttachments = form.value.existingAttachments.filter(
    (attachment) => attachment.id !== attachmentId,
  );
  form.value.deletedAttachmentIds.push(attachmentId);
};

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isPromotion = computed(() => form.value.type_post === "promotion");
const isSurvey = computed(() => form.value.type_post === "survey");

const refreshImagePreviews = (images: File[]) => {
  imagePreviews.value.forEach((url) => URL.revokeObjectURL(url));
  imagePreviews.value = images.map((image) => URL.createObjectURL(image));
};

watch(
  () => form.value.images,
  (images) => refreshImagePreviews(images),
  { immediate: true },
);

watch(isPromotion, (value) => {
  if (!value) {
    form.value.starts_at = null;
    form.value.ends_at = null;
  }
});

onBeforeUnmount(() => {
  imagePreviews.value.forEach((url) => URL.revokeObjectURL(url));
});

onMounted(async () => {
  loadingCustomers.value = true;
  try {
    const response = await customerService.getCustomers();
    customers.value = response.customers.filter(customer =>
      customer.is_active === true || customer.is_active === 1 || customer.is_active === '1',
    );
  }
  finally {
    loadingCustomers.value = false;
  }
});
</script>

<template>
  <VCard>
    <VCardText>
      <VForm @submit.prevent="emit('submit', form.status)">
        <VAlert
          v-if="props.error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ props.error }}
        </VAlert>
        <VAlert
          v-if="generalValidationErrors.length"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          <div v-for="message in generalValidationErrors" :key="message">
            {{ message }}
          </div>
        </VAlert>
        <VRow>
          <VCol cols="12" md="9">
            <div class="d-flex flex-column ga-4 promotion-form-sidebar">
              <VCard variant="outlined">
                <VCardItem>
                  <VCardTitle class="text-subtitle-1">
                    Información general
                  </VCardTitle>
                  <VCardSubtitle>
                    Define la información principal de la publicación.
                  </VCardSubtitle>
                </VCardItem>
                <VCardText class="d-flex flex-column ga-4">
                  <VTextField
                    v-model="form.title"
                    label="Título"
                    required
                    :error-messages="props.validationErrors.title"
                  />
                  <VTextarea
                    v-model="form.summary"
                    label="Resumen"
                    rows="3"
                    required
                    :error-messages="props.validationErrors.summary"
                  />
                </VCardText>
              </VCard>

              <SurveyBuilder
                v-if="isSurvey && form.survey"
                v-model="form.survey"
              />

              <VCard variant="outlined">
                <VCardItem>
                  <VCardTitle class="text-subtitle-1"> Contenido </VCardTitle>
                  <VCardSubtitle>
                    Escribe el contenido y agrega imágenes desde el editor.
                  </VCardSubtitle>
                </VCardItem>
                <VCard variant="outlined" class="overflow-hidden">
                  <TiptapEditor v-model="form.content" />
                </VCard>
                <div
                  v-if="props.validationErrors.content?.length"
                  class="text-error text-caption mt-2"
                >
                  {{ props.validationErrors.content[0] }}
                </div>
              </VCard>

              <VCard variant="outlined">
                <VCardItem>
                  <VCardTitle class="text-subtitle-1">
                    Galería principal
                  </VCardTitle>
                  <VCardSubtitle>
                    Hasta 3 imágenes para la portada o slider de la publicación.
                  </VCardSubtitle>
                </VCardItem>
                <VCardText>
                  <VTextField
                    v-model="form.image_url"
                    label="URL de portada externa (opcional)"
                    type="url"
                    class="mb-4"
                    :error-messages="props.validationErrors.image_url"
                  />
                  <div class="text-body-2 text-medium-emphasis mb-4">
                    La imagen de portada es opcional. Si no agregas una, se
                    mostrará un icono predeterminado.
                  </div>
                  <VFileInput
                    v-model="form.images"
                    label="Seleccionar imágenes"
                    accept="image/png, image/jpeg, image/webp"
                    multiple
                    show-size
                    counter
                    :max-files="3"
                    prepend-icon="ri-image-add-line"
                    :error-messages="props.validationErrors.images"
                  />
                  <VRow
                    v-if="form.existingImages.length || imagePreviews.length"
                    class="mt-2"
                  >
                    <VCol
                      v-for="image in form.existingImages"
                      :key="`existing-${image.id}`"
                      cols="4"
                    >
                      <VCard variant="outlined" class="overflow-hidden">
                        <VImg :src="image.url" height="110" cover />
                        <div
                          class="d-flex align-center justify-space-between pa-2"
                        >
                          <span class="text-caption text-medium-emphasis"
                            >Imagen guardada</span
                          >
                          <VBtn
                            icon="ri-delete-bin-line"
                            size="x-small"
                            variant="text"
                            color="error"
                            @click="removeExistingImage(image.id)"
                          />
                        </div>
                      </VCard>
                    </VCol>
                    <VCol
                      v-for="(preview, index) in imagePreviews"
                      :key="preview"
                      cols="4"
                    >
                      <VCard variant="outlined" class="overflow-hidden">
                        <VImg :src="preview" height="110" cover />
                        <div class="pa-2 text-caption text-medium-emphasis">
                          Imagen {{ index + 1 }}
                        </div>
                      </VCard>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>

              <VCard variant="outlined">
                <VCardItem>
                  <VCardTitle class="text-subtitle-1">
                    Archivos adjuntos
                  </VCardTitle>
                  <VCardSubtitle>
                    Agrega documentos para que el cliente pueda descargarlos.
                  </VCardSubtitle>
                </VCardItem>
                <VCardText>
                  <VFileInput
                    v-model="form.attachments"
                    label="Seleccionar archivos"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    multiple
                    show-size
                    counter
                    :max-files="5"
                    prepend-icon="ri-attachment-2"
                    hint="PDF, Word, Excel o PowerPoint. Máximo 10 MB por archivo."
                    persistent-hint
                    :error-messages="props.validationErrors.attachments"
                  />

                  <VList
                    v-if="form.existingAttachments.length"
                    density="compact"
                    class="mt-4"
                  >
                    <VListItem
                      v-for="attachment in form.existingAttachments"
                      :key="`existing-attachment-${attachment.id}`"
                      :title="attachment.name"
                      :subtitle="formatFileSize(attachment.size)"
                    >
                      <template #prepend>
                        <VIcon icon="ri-file-text-line" class="me-3" />
                      </template>
                      <template #append>
                        <VBtn
                          icon="ri-delete-bin-line"
                          size="small"
                          variant="text"
                          color="error"
                          @click="removeExistingAttachment(attachment.id)"
                        />
                      </template>
                    </VListItem>
                  </VList>
                </VCardText>
              </VCard>
            </div>
          </VCol>
          <VCol cols="12" md="3">
            <div class="d-flex flex-column ga-4">
              <VCol cols="12" class="d-flex justify-end ga-3">
                <VBtn variant="text" @click="emit('cancel')"> Cancelar </VBtn>
                <VBtn color="primary" type="submit" :loading="saving">
                  Guardar publicación
                </VBtn>
              </VCol>
              <VSelect
                v-model="form.type_post"
                label="Tipo de publicación"
                :items="[
                  { title: 'Novedad', value: 'news' },
                  { title: 'Promoción', value: 'promotion' },
                  { title: 'Encuesta', value: 'survey' },
                ]"
              />

              
              <VCard variant="outlined" class="pa-4">
                <div class="text-subtitle-2 mb-3">Estado</div>
                <VSelect
                  v-model="form.status"
                  label="Estado de la publicación"
                  :items="[
                    { title: 'Borrador', value: 'draft' },
                    { title: 'Publicada', value: 'published' },
                    { title: 'Archivada', value: 'archived' },
                  ]"
                  hide-details
                  :error-messages="props.validationErrors.status"
                />
              </VCard>

              <VCard variant="outlined" class="pa-4">
                <div class="text-subtitle-2 mb-1">Audiencia</div>
                <div class="text-body-2 text-medium-emphasis mb-3">
                  Define qué empresas podrán ver esta publicación.
                </div>
                <VSelect
                  v-model="form.audience_type"
                  label="Dirigida a"
                  :items="[
                    { title: 'Todas las empresas', value: 'all' },
                    { title: 'Empresas específicas', value: 'selected' },
                  ]"
                  :error-messages="props.validationErrors.audience_type"
                />
                <VAutocomplete
                  v-if="form.audience_type === 'selected'"
                  v-model="form.customer_ids"
                  class="mt-3"
                  label="Empresas destinatarias"
                  :items="customers"
                  item-title="company_name"
                  item-value="id"
                  multiple
                  chips
                  closable-chips
                  :loading="loadingCustomers"
                  :disabled="loadingCustomers"
                  :rules="[
                    value => value?.length ? true : 'Selecciona al menos una empresa',
                  ]"
                  :error-messages="props.validationErrors.customer_ids"
                />
              </VCard>

              <VTextField
                v-model="form.published_at"
                label="Fecha de publicación"
                type="datetime-local"
                hint="Déjalo vacío para publicar manualmente."
                persistent-hint
                :error-messages="props.validationErrors.published_at"
              />

              <template v-if="isPromotion">
                <VAlert type="info" variant="tonal" density="compact">
                  Define la vigencia de esta promoción.
                </VAlert>

                <VTextField
                  v-model="form.starts_at"
                  label="Inicio de la promoción"
                  type="datetime-local"
                  :error-messages="props.validationErrors.starts_at"
                />

                <VTextField
                  v-model="form.ends_at"
                  label="Fin de la promoción"
                  type="datetime-local"
                  :error-messages="props.validationErrors.ends_at"
                />
              </template>

              <VCard variant="outlined" class="pa-4">
                <div class="text-subtitle-2 mb-1">Contenido embebido</div>
                <div class="text-body-2 text-medium-emphasis mb-3">
                  Agrega un TikTok, Reel o video para mostrarlo junto a la
                  publicación.
                </div>
                <div class="d-flex flex-column ga-3">
                  <VSelect
                    v-model="embedPlatform"
                    label="Plataforma"
                    density="compact"
                    :items="[
                      { title: 'TikTok', value: 'tiktok' },
                      { title: 'Facebook Reel', value: 'facebook' },
                      { title: 'Instagram Reel', value: 'instagram' },
                      { title: 'YouTube', value: 'youtube' },
                    ]"
                  />
                  <VTextField
                    v-model="embedUrl"
                    label="URL del contenido"
                    placeholder="https://..."
                    density="compact"
                  />
                  <VBtn
                    variant="tonal"
                    prepend-icon="ri-add-line"
                    :disabled="form.embeds.length >= 1"
                    @click="addEmbed"
                  >
                    {{
                      form.embeds.length
                        ? "Ya agregaste un embed"
                        : "Agregar embed"
                    }}
                  </VBtn>
                </div>

                <VList v-if="form.embeds.length" density="compact" class="mt-3">
                  <VListItem
                    v-for="(embed, index) in form.embeds"
                    :key="`${embed.url}-${index}`"
                    :title="embed.platform"
                    :subtitle="embed.url"
                  >
                    <template #append>
                      <VBtn
                        icon="ri-delete-bin-line"
                        size="small"
                        variant="text"
                        color="error"
                        @click="form.embeds.splice(index, 1)"
                      />
                    </template>
                  </VListItem>
                </VList>
              </VCard>
            </div>
          </VCol>
        </VRow>
      </VForm>
    </VCardText>
  </VCard>
</template>

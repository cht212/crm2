<script setup lang="ts">
import { ref } from "vue";
import type { QuoteRequestAttachment } from "@/types/quoteRequest";
import type { FileData } from "@/types/file";

// 1. Definimos las propiedades y los eventos (v-model) usando TypeScript estricto
const props = defineProps<{
  attachments: QuoteRequestAttachment[];
  editing: boolean;
  newFiles: FileData[];
  deletedAttachments: number[];
}>();

const emit = defineEmits<{
  (e: "update:newFiles", value: FileData[]): void;
  (e: "update:deletedAttachments", value: number[]): void;
  (e: "error", message: string): void;
}>();

// 2. Estado local aislado para el control de descargas
const downloadingFileId = ref<number | null>(null);
const previewingFileIds = ref(new Set<number>());

// Helper para mapear extensiones visuales de archivos
const getFileIconInfo = (mimeType: string) => {
  if (mimeType.includes("pdf"))
    return { icon: "ri-file-pdf-2-fill", color: "error" };
  if (
    mimeType.includes("image/jpeg") ||
    mimeType.includes("image/png") ||
    mimeType.includes("image/jpg")
  ) {
    return { icon: "ri-image-line", color: "info" };
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return { icon: "ri-image-line", color: "success" };
  }
  return { icon: "ri-image-line", color: "secondary" };
};

// Control de Previsualizaciones Seguras
const previewAttachment = async (file: QuoteRequestAttachment) => {
  if (previewingFileIds.value.has(file.id)) return;

  try {
    previewingFileIds.value.add(file.id);
    const response = await $api.raw<Blob>(
      `/attachments/${file.id}/preview`,
      {
        method: "GET",
      },
    );

    if (!(response._data instanceof Blob))
      throw new Error("La respuesta del archivo no es válida.");

    const url = URL.createObjectURL(response._data);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    console.error(error);

    emit(
      "error",
      "No tienes permisos para visualizar este archivo o el documento no existe.",
    );
  } finally {
    previewingFileIds.value.delete(file.id);
  }
};

// Descarga Segura con Spinner por Ítem
const downloadAttachment = async (file: QuoteRequestAttachment) => {
  if (downloadingFileId.value === file.id) return;

  try {
    downloadingFileId.value = file.id;

    const response = await $api.raw<Blob>(
      `/attachments/${file.id}/download`,
      {
        method: "GET",
      },
    );

    if (!(response._data instanceof Blob))
      throw new Error("La respuesta del archivo no es válida.");

    const url = URL.createObjectURL(response._data);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.original_name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    console.error(error);

    emit(
      "error",
      "No se pudo descargar el archivo. Verifica tus permisos.",
    );
  } finally {
    downloadingFileId.value = null;
  }
};

const removeAttachment = (id: number) => {

  if (props.deletedAttachments.includes(id)) {
    return;
  }

  const updated = [...props.deletedAttachments, id];

  emit("update:deletedAttachments", updated);
};

const visibleAttachments = computed(() => {
  return props.attachments.filter(
    (file) => !props.deletedAttachments.includes(file.id),
  );
});

const canAddAttachments = computed(
  () => visibleAttachments.value.length + props.newFiles.length < 3,
);
</script>

<template>
  <div class="mt-8">
    <div class="d-flex align-center gap-2 mb-5">
      <VIcon icon="ri-attachment-2" class="text-medium-emphasis" size="22" />
      <div class="text-subtitle-1 font-weight-bold">Documentos adjuntos</div>
      <VChip size="x-small" color="secondary" variant="flat" class="ms-1">
        {{ visibleAttachments.length }}
      </VChip>
    </div>

    <!-- Listado de archivos si existen -->
    <VRow v-if="visibleAttachments.length > 0" class="attachments-grid">
      <VCard
        v-for="file in visibleAttachments"
        :key="file.id"
        variant="outlined"
        class="attachment-card pa-4 d-flex align-center justify-space-between rounded-lg"
      >
        <div class="attachment-file-info d-flex align-center overflow-hidden me-2">
          <VAvatar
            :color="getFileIconInfo(file.mime_type).color"
            variant="tonal"
            rounded="lg"
            size="40"
            class="me-3"
          >
            <VIcon :icon="getFileIconInfo(file.mime_type).icon" size="22" />
          </VAvatar>

          <div class="overflow-hidden">
            <div
              class="text-body-2 font-weight-medium text-truncate"
              :title="file.original_name"
            >
              {{ file.original_name }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ (file.size / 1024 / 1024).toFixed(2) }} MB
            </div>
          </div>
        </div>

        <!-- Acciones del archivo -->
        <div class="attachment-actions d-flex align-center">
          <VBtn
            icon
            variant="text"
            color="secondary"
            size="small"
            :aria-label="`Previsualizar ${file.original_name}`"
            :disabled="previewingFileIds.has(file.id)"
            @click="previewAttachment(file)"
          >
            <VProgressCircular
              v-if="previewingFileIds.has(file.id)"
              indeterminate
              size="18"
              width="2"
              color="secondary"
            />
            <VIcon v-else icon="ri-eye-fill" size="18" />
            <VTooltip activator="parent" location="top">
              {{ previewingFileIds.has(file.id) ? "Cargando vista previa..." : "Previsualizar" }}
            </VTooltip>
          </VBtn>

          <VBtn
            icon
            variant="text"
            color="primary"
            size="small"
            :aria-label="`Descargar ${file.original_name}`"
            :disabled="downloadingFileId !== null"
            @click="downloadAttachment(file)"
          >
            <VProgressCircular
              v-if="downloadingFileId === file.id"
              indeterminate
              size="18"
              width="2"
              color="primary"
            />
            <VIcon v-else icon="ri-download-cloud-fill" size="18" />
            <VTooltip activator="parent" location="top">
              {{
                downloadingFileId === file.id ? "Descargando..." : "Descargar"
              }}
            </VTooltip>
          </VBtn>
          <VBtn
            v-if="editing"
            icon
            variant="text"
            color="error"
            size="small"
            :aria-label="`Eliminar ${file.original_name}`"
            @click="removeAttachment(file.id)"
          >
            <VIcon icon="ri-delete-bin-line" size="18" />

            <VTooltip activator="parent" location="top"> Eliminar </VTooltip>
          </VBtn>
        </div>
      </VCard>
    </VRow>

    <!-- Estado vacío -->
    <VSheet
      v-else-if="!editing"
      border
      rounded
      class="pa-4 text-center py-6 bg-var-theme-background"
    >
      <VIcon icon="tabler-file-off" class="text-disabled mb-2" size="28" />
      <div class="text-body-2 text-medium-emphasis">
        No se adjuntaron archivos a esta solicitud de cotización.
      </div>
    </VSheet>

    <!-- DropZone adicional en modo Edición -->
    <div
      v-if="editing && (canAddAttachments || newFiles.length > 0)"
      class="attachment-upload mt-4"
    >
      <div class="text-caption text-warning mb-2 d-flex align-center gap-1">
        <VIcon icon="tabler-alert-circle" size="16" />
        Se agregarán a los existentes (máximo 3 en total).
      </div>
      <DropZone
        compact
        :existing-count="visibleAttachments.length"
        :model-value="newFiles"
        @update:model-value="emit('update:newFiles', $event)"
      />
    </div>
  </div>
</template>

<style lang="scss">
.attachments-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 600px) {
  .attachments-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .attachment-card {
    padding: 0.75rem !important;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .attachment-file-info {
    flex: 1 1 100%;
    min-width: 0;
    margin-inline-end: 0 !important;
  }

  .attachment-actions {
    justify-content: flex-end;
    width: 100%;
  }

  .attachment-upload {
    margin-top: 0.75rem !important;
  }
}
</style>

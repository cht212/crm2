<script setup lang="ts">
import { useDropZone, useFileDialog, useObjectUrl } from "@vueuse/core";
import type { FileData } from "@/types/file";

const props = defineProps<{
  existingCount?: number; // archivos ya adjuntos en la cotización, si se está editando
}>();

const MAX_FILES =3;
const MAX_SIZE_MB = 3;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const VALID_FORMATS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "application/pdf": ["pdf"],
};

function isDuplicateFile(file: File):boolean{
  return fileData.value.some(
    item =>
      item.file.name.toLowerCase() === file.name.toLocaleLowerCase() &&
      item.file.size === file.size &&
      item.file.lastModified === file.lastModified,
  );
}

const dropZoneRef = ref<HTMLDivElement>();
const fileData = defineModel<FileData[]>({ default: () => [] });
const errorMessage = ref("");
const { open, onChange } = useFileDialog({
  accept: ".pdf,.jpg,.jpeg,.png",
  multiple: true,
});

function remainingSlots() {
  return MAX_FILES - (props.existingCount ?? 0) - fileData.value.length;
}

function validateFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();

  const validFormats: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "application/pdf": ["pdf"],
  };

  const allowedExtensions = validFormats[file.type];

  if (!allowedExtensions || !allowedExtensions.includes(extension ?? "")) {
    return `"${file.name}" no es un formato permitido (solo PDF, JPG, JPEG o PNG).`;
  }

  if(isDuplicateFile(file)){
    return `${file.name} ya fue agregado anteriormente.`;
  }

  if (file.size > MAX_SIZE_BYTES) {
    return `"${file.name}" supera el tamaño máximo de ${MAX_SIZE_MB} MB.`;
  }

  return null;
}
``;

function addFiles(files: File[]) {
  errorMessage.value = "";

  for (const file of files) {
    if (remainingSlots() <= 0) {
      errorMessage.value = `Solo se permiten ${MAX_FILES} archivos por cotización.`;
      break;
    }

    const error = validateFile(file);
    if (error) {
      errorMessage.value = error;
      continue;
    }

    fileData.value.push({
      file,
      url: file.type.startsWith("image/")
        ? (useObjectUrl(file).value ?? "")
        : "",
    });
  }
}

function onDrop(droppedFiles: File[] | null) {
  if (!droppedFiles) return;
  addFiles(droppedFiles);
}

onChange((selectedFiles: FileList | null) => {
  if (!selectedFiles) return;
  addFiles(Array.from(selectedFiles));
});

function removeFile(index: number) {
  fileData.value.splice(index, 1);
  errorMessage.value = "";
}

useDropZone(dropZoneRef, onDrop);
</script>

<template>
  <div class="flex">
    <div class="w-full h-auto relative">
      <div
        ref="dropZoneRef"
        class="drop-zone-wrapper"
        :class="{
          'cursor-pointer': remainingSlots() > 0,
          'cursor-not-allowed': remainingSlots() <= 0,
          'drop-zone-disabled': remainingSlots() <= 0,
        }"
        @click="() => remainingSlots() > 0 && open()"
      >
        <!-- SIN ARCHIVOS -->
        <div
          v-if="fileData.length === 0"
          class="drop-zone drop-zone-empty"
        >
          <VAvatar
            variant="tonal"
            color="secondary"
            rounded
            size="48"
          >
            <VIcon icon="ri-upload-cloud-2-line" size="24" />
          </VAvatar>

          <div class="drop-zone-content">
            <h4 class="drop-zone-title">
              Arrastra y suelta tus archivos aquí
            </h4>

            <span class="drop-zone-subtitle">
              PDF, JPG, JPEG o PNG
            </span>

            <span class="drop-zone-info">
              Máx. {{ MAX_FILES }} archivos ·
              {{ MAX_SIZE_MB }} MB por archivo
            </span>

            <VBtn
              variant="tonal"
              color="primary"
              size="small"
              class="mt-2"
              @click.stop="remainingSlots() > 0 && open()"
            >
              Seleccionar archivos
            </VBtn>
          </div>
        </div>

        <!-- CON ARCHIVOS -->
        <div
          v-else
          class="drop-zone drop-zone-files"
        >
          <div class="files-grid">
            <VCard
              v-for="(item, index) in fileData"
              :key="index"
              :ripple="false"
              class="file-card"
            >
              <VCardText
                class="file-card-content"
                @click.stop
              >
                <VImg
                  v-if="item.file.type.startsWith('image/')"
                  :src="item.url"
                  class="file-preview"
                  cover
                />

                <div
                  v-else
                  class="file-preview file-preview-pdf"
                >
                  <VIcon
                    icon="ri-file-pdf-2-line"
                    size="36"
                    color="error"
                  />
                </div>

                <div class="file-info">
                  <span class="file-name">
                    {{ item.file.name }}
                  </span>

                  <span class="file-size">
                    {{
                      (item.file.size / 1024 / 1024).toFixed(2)
                    }}
                    MB
                  </span>
                </div>
              </VCardText>

              <VCardActions class="pa-2">
                <VBtn
                  variant="text"
                  size="small"
                  block
                  color="error"
                  @click.stop="removeFile(index)"
                >
                  <VIcon
                    icon="ri-delete-bin-line"
                    size="16"
                    class="me-1"
                  />
                  Remover
                </VBtn>
              </VCardActions>
            </VCard>
          </div>

          <!-- AGREGAR MÁS -->
          <VBtn
            v-if="remainingSlots() > 0"
            variant="tonal"
            color="primary"
            size="small"
            class="mt-4"
            @click.stop="open()"
          >
            <VIcon
              icon="ri-add-line"
              class="me-1"
            />
            Agregar archivos
          </VBtn>
        </div>
      </div>

      <!-- ERROR -->
      <VAlert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-2"
        closable
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </VAlert>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.drop-zone-wrapper {
  width: 100%;
}

.drop-zone {
  width: 100%;
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.25);
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.drop-zone-empty {
  min-height: 260px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.drop-zone-title {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.4;
  font-weight: 600;
}

.drop-zone-subtitle {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.drop-zone-info {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.drop-zone-files {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.files-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(150px, 1fr)
  );
  gap: 12px;
}

.file-card {
  width: 100%;
  min-width: 0;
}

.file-card-content {
  padding: 10px;
}

.file-preview {
  width: 100%;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.file-preview-pdf {
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
  min-width: 0;
}

.file-name {
  font-size: 0.8rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.drop-zone-disabled {
  opacity: 0.7;
}

/* TABLET */
@media (max-width: 768px) {
  .drop-zone-empty {
    min-height: 220px;
    padding: 28px 16px;
  }

  .drop-zone-title {
    font-size: 1rem;
  }

  .drop-zone-files {
    padding: 14px;
  }

  .files-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .file-preview {
    height: 90px;
  }
}

@media (max-width: 480px) {
  .files-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .file-card-content {
    padding: 6px;
  }

  .file-preview {
    height: 55px;
  }

  .file-name {
    font-size: 0.68rem;
  }

  .file-size {
    font-size: 0.6rem;
  }

  .file-card :deep(.v-card-actions) {
    padding: 4px !important;
  }

  .file-card :deep(.v-btn) {
    min-width: 0;
    font-size: 0.65rem;
    padding-inline: 4px;
  }
}
@media (max-width: 360px) {
  .files-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .file-preview {
    height: 65px;
  }
}
</style>

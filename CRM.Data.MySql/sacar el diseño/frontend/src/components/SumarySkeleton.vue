<script setup lang="ts">
const props = defineProps<{
  items: number;
}>();

const colSize = computed(() => {
  return 12 / props.items;
});
</script>

<template>
  <VRow>
    <template v-for="index in items" :key="index">
      <VCol cols="12" sm="6" :md="colSize" class="px-6">
        <div class="d-flex justify-space-between">
          <div class="d-flex flex-column gap-2">
            <VSkeletonLoader type="text" width="60" height="10" />

            <VSkeletonLoader type="text" width="140" />
          </div>

          <VSkeletonLoader type="avatar" width="52" height="40" />
        </div>
      </VCol>

      <VDivider v-if="index !== items" vertical inset length="60" />
    </template>
  </VRow>
</template>

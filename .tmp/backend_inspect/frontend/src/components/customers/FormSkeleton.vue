<template>
  <VCard class="mb-6">
    <VCardTitle class="bg-primary text-white mb-4">
      <VSkeletonLoader
        type="text"
        width="180"
      />
    </VCardTitle>

    <VCardText>
      <VRow>
        <VCol cols="12" md="8">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="4">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="6">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="3">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="3">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="6">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="2">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="2">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="2">
          <VSkeletonLoader type="text" />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <VCardTitle class="bg-primary text-white mb-4">
        <VSkeletonLoader
          type="text"
          width="180"
        />
      </VCardTitle>

      <VRow>
        <VCol cols="12" md="6">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="6">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="6">
          <VSkeletonLoader type="text" />
        </VCol>

        <VCol cols="12" md="6">
          <VSkeletonLoader type="text" />
        </VCol>
      </VRow>

      <VRow class="mt-4">
        <VCol cols="12">
          <div class="d-flex justify-center gap-4">
            <VSkeletonLoader
              type="button"
              width="100"
            />

            <VSkeletonLoader
              type="button"
              width="100"
            />
          </div>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

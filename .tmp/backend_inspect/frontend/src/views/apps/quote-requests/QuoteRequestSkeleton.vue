<template>
  <VCard class="quotation-document">
    <VCardText class="pa-8">
      <!-- HEADER -->
      <div class="d-flex justify-space-between align-start flex-wrap gap-4">
        <!-- Empresa -->
        <div class="w-50">
          <VSkeletonLoader type="heading" class="mb-2" />

          <VSkeletonLoader type="text" width="180" />

          <VSkeletonLoader type="text" width="250" />
        </div>

        <!-- Cotización -->
        <div class="d-flex flex-column align-end">
          <VSkeletonLoader type="text" width="100" />

          <VSkeletonLoader type="heading" width="140" />

          <VSkeletonLoader type="chip" width="100" class="mt-2" />
        </div>
      </div>

      <VDivider class="my-6" />

      <!-- INFORMACIÓN -->
      <VRow>
        <VCol cols="12" md="8">
          <VSkeletonLoader type="text" width="70" class="mb-2" />

          <VSkeletonLoader type="text" width="350" />
        </VCol>

        <VCol cols="12" md="4">
          <VSkeletonLoader type="text" width="130" class="mb-2" />

          <VSkeletonLoader type="text" width="120" />
        </VCol>
      </VRow>

      <!-- CLIENTE -->
      <div class="mt-8">
        <VSkeletonLoader type="heading" width="160" class="mb-3" />

        <VSheet border rounded class="pa-4">
          <VRow>
            <VCol cols="12" md="6">
              <VSkeletonLoader type="text" width="100" />

              <VSkeletonLoader type="text" width="220" />
            </VCol>

            <VCol cols="12" md="3">
              <VSkeletonLoader type="text" width="50" />

              <VSkeletonLoader type="text" width="100" />
            </VCol>

            <VCol cols="12" md="3">
              <VSkeletonLoader type="text" width="70" />

              <VSkeletonLoader type="text" width="110" />
            </VCol>

            <VCol cols="12">
              <VSkeletonLoader type="text" width="80" />

              <VSkeletonLoader type="text" width="300" />
            </VCol>
          </VRow>
        </VSheet>
      </div>

      <!-- DETALLE DE PRODUCTOS -->
      <div class="mt-8">
        <VSkeletonLoader type="heading" width="180" />

        <VSkeletonLoader type="text" width="120" class="mb-3" />

        <VTable density="comfortable">
          <thead>
            <tr>
              <th v-for="column in 9" :key="column">
                <VSkeletonLoader type="text" />
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in 3" :key="row">
              <td v-for="column in 9" :key="column">
                <VSkeletonLoader type="text" />
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <!-- OBSERVACIONES -->
      <div class="mt-8">
        <VSkeletonLoader type="heading" width="130" class="mb-3" />

        <VSheet border rounded class="pa-4">
          <VSkeletonLoader type="text" width="80%" />

          <VSkeletonLoader type="text" width="60%" />
        </VSheet>
      </div>
    </VCardText>
  </VCard>
</template>

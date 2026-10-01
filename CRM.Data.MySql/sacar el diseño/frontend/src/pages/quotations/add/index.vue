<script setup lang="ts">
definePage({
  meta: {
    action: "create",
    subject: "QuoteRequest",
  },
});

import QuoteRequestCreate from "@/views/apps/quote-requests/QuoteRequestCreate.vue";
</script>

<template>
  <VRow>
    <VCol cols="12" md="12">
      <QuoteRequestCreate />
    </VCol>
  </VRow>
</template>

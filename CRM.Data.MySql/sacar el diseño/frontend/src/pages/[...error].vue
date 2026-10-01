<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGenerateImageVariant } from '@/@core/composable/useGenerateImageVariant'
import pages404 from '@images/pages/404.png'

import miscMaskDark from '@images/misc/misc-mask-dark.png'
import miscMaskLight from '@images/misc/misc-mask-light.png'
import miscObj from '@images/pages/misc-404-object.png'

const authThemeMask = useGenerateImageVariant(miscMaskLight, miscMaskDark)
const route = useRoute()
const errorPage = computed(() => route.path === '/not-authorized'
  ? {
      statusCode: 403,
      title: 'Acceso no autorizado',
      description: 'No tienes permiso para acceder a esta página.',
    }
  : {
      statusCode: 404,
      title: 'Página no encontrada',
      description: 'La página que buscas no existe o fue movida.',
    })

definePage({
  alias: '/pages/misc/not-found/:error(.*)',
  meta: {
    layout: 'blank',
    public: true,
  },
})
</script>

<template>
  <div class="misc-wrapper">
    <ErrorHeader
      :status-code="errorPage.statusCode"
      :title="errorPage.title"
      :description="errorPage.description"
      class="mb-10"
    />

    <!-- 👉 Image -->
    <div class="misc-avatar w-100 text-center">
      <VImg
        :src="pages404"
        :alt="errorPage.title"
        :height="$vuetify.display.xs ? 400 : 500"
        class="my-sm-5"
      />

      <VBtn
        to="/"
        class="mt-10"
      >
        Volver al inicio
      </VBtn>

      <VImg
        :src="authThemeMask"
        class="d-none d-md-block footer-coming-soon flip-in-rtl"
        cover
      />

      <VImg
        :src="miscObj"
        class="d-none d-md-block footer-coming-soon-obj"
        :max-width="177"
        height="160"
      />
    </div>
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/misc.scss";
</style>

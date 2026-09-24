<script setup lang="ts">
import { useGenerateImageVariant } from "@/@core/composable/useGenerateImageVariant";
import { useLogin } from "@/composables/useLogin";
import authV2LoginIllustrationBorderedDark from "@images/pages/auth-v2-login-illustration-bordered-dark.png";
import authV2LoginIllustrationBorderedLight from "@images/pages/auth-v2-login-illustration-bordered-light.png";
import authV2LoginIllustrationDark from "@images/pages/Asesor_Web.webp";
import authV2LoginIllustrationLight from "@images/pages/Asesor_Web.webp";
import authV2LoginMaskDark from "@images/pages/auth-v2-login-mask-dark.png";
import authV2LoginMaskLight from "@images/pages/auth-v2-login-mask-light.png";
import authV2LoginLogoLigth from "@images/logo.svg?url";
import authV2LoginLogoDark from "@images/cards/illustration-3.png";
import { themeConfig } from "@themeConfig";

definePage({
  meta: {
    layout: "blank",
    public: true,
  },
});

const route = useRoute();
const { form, errors, isLoading, genericError, isPasswordVisible, login } =
  useLogin();

const submitLogin = () => {
  const redirectTo = route.query.to ? String(route.query.to) : "/";

  return login(redirectTo);
};
const authV2LoginMask = useGenerateImageVariant(
  authV2LoginMaskLight,
  authV2LoginMaskDark,
);
const authV2LoginIllustration = useGenerateImageVariant(
  authV2LoginIllustrationLight,
  authV2LoginIllustrationDark,
  authV2LoginIllustrationBorderedLight,
  authV2LoginIllustrationBorderedDark,
  true,
);

const authV2LoginLogo = useGenerateImageVariant(
  authV2LoginLogoLigth,
  authV2LoginLogoDark,
);
</script>

<template>
  <a
    href="/"
    class="auth-logo-link"
    aria-label="Ir al inicio de HPD Cotizaciones"
  >
    <div class="app-logo auth-logo">
      <img :src="authV2LoginLogo" alt="HPD Cotizaciones" />
    </div>
  </a>

  <VRow no-gutters class="auth-wrapper">
    <VCol
      md="8"
      class="d-none d-md-flex align-center justify-center position-relative"
    >
      <div class="d-flex align-center justify-center">
        <img
          :src="authV2LoginIllustration"
          class="auth-illustration w-100"
          alt="auth-illustration"
        />
      </div>
      <VImg
        :src="authV2LoginMask"
        class="d-none d-md-flex auth-footer-mask"
        alt="auth-mask"
      />
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="auth-card-v2 login-surface d-flex align-center justify-center"
    >
      <VThemeProvider
        theme="light"
        with-background
        class="login-theme w-100 h-100 d-flex align-center justify-center"
      >
        <div class="login-form mt-12 mt-sm-0 pa-5 pa-lg-7">
          <div class="login-kicker mb-3">
            <VIcon icon="ri-login-box-line" size="18" />
            <span>Acceso al sistema</span>
          </div>
          <h1 class="text-h4 mb-1">
            Bienvenido a
            <span class="text-capitalize">{{ themeConfig.app.title }}! 👋🏻</span>
          </h1>
          <p class="login-description mb-6">
            Inicia sesión en tu cuenta para continuar
          </p>

          <!-- Error genérico (no ligado a un campo) -->
          <VAlert
            v-if="genericError"
            type="error"
            variant="tonal"
            role="alert"
            class="mb-4"
            closable
            @click:close="genericError = ''"
          >
            {{ genericError }}
          </VAlert>

          <VForm @submit.prevent="submitLogin">
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <VTextField
                  v-model="form.email"
                  autofocus
                  label="Correo electrónico"
                  variant="outlined"
                  density="comfortable"
                  type="email"
                  autocomplete="off"
                  placeholder="nombre@empresa.com"
                  prepend-inner-icon="ri-mail-line"
                  hide-details="auto"
                  :error-messages="errors.email"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <VTextField
                  v-model="form.password"
                  label="Contraseña"
                  variant="outlined"
                  density="comfortable"
                  placeholder="············"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="current-password"
                  prepend-inner-icon="ri-lock-line"
                  :append-inner-icon="
                    isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'
                  "
                  hide-details="auto"
                  :error-messages="errors.password"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div
                  class="d-flex align-center justify-space-between flex-wrap my-6 gap-x-2"
                >
                  <VCheckbox
                    v-model="form.remember"
                    label="Recordarme"
                    density="comfortable"
                    hide-details
                  />
                  <a class="text-primary login-recovery-link" href="#forgot-password">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <VBtn
                  block
                  type="submit"
                  size="large"
                  prepend-icon="ri-login-box-line"
                  :loading="isLoading"
                  :disabled="isLoading"
                >
                  Iniciar sesión
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
        </div>
      </VThemeProvider>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";

.auth-logo-link {
  text-decoration: none;
}

.login-theme {
  min-block-size: 100%;
  background-color: rgb(var(--v-theme-surface));
}

.login-surface {
  background-color: rgb(var(--v-theme-surface));
}

.login-form {
  inline-size: min(100%, 500px);
}

.login-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-description {
  color: rgb(var(--v-theme-on-surface) / 68%);
}

.login-recovery-link {
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
}

.login-recovery-link:hover,
.login-recovery-link:focus-visible {
  text-decoration: underline;
}

</style>

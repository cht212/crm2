<script setup lang="ts">
import { useGenerateImageVariant } from "@/@core/composable/useGenerateImageVariant";
import { useLogin } from "@/composables/useLogin";
import authV2LoginIllustrationBorderedDark from "@images/pages/auth-v2-login-illustration-bordered-dark.png";
import authV2LoginIllustrationBorderedLight from "@images/pages/auth-v2-login-illustration-bordered-light.png";
import authV2LoginIllustrationDark from "@images/pages/fondo_login.png";
import authV2LoginIllustrationLight from "@images/pages/fondo_login.png";
import loginMobileBackground from "@images/pages/fondo-mobile.png";
import authV2LoginMaskDark from "@images/pages/auth-v2-login-mask-dark.png";
import authV2LoginMaskLight from "@images/pages/auth-v2-login-mask-light.png";
import authV2LoginLogoLight from "@images/logodark.svg?url";
import authV2LoginLogoDark from "@images/logodark.svg?url";
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
  authV2LoginLogoLight,
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

  <VRow no-gutters class="auth-wrapper login-wrapper">
    <div
      class="login-mobile-background d-md-none"
      :style="{ backgroundImage: `url(${loginMobileBackground})` }"
    />

    <VCol
      md="8"
      class="d-none d-md-flex align-center justify-center position-relative login-visual"
      :style="{ backgroundImage: `url(${authV2LoginIllustration})` }"
    >
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
.login-visual {
  background-position: right;
  background-repeat: no-repeat;
  background-size: cover;
}

.login-wrapper {
  position: relative;
}

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

@media (max-width: 959px) {
  .login-mobile-background {
    position: absolute;
    z-index: 0;
    inset: 0;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
  }

  .login-surface,
  .login-theme {
    position: relative;
    z-index: 1;
    background-color: transparent;
  }

  .login-form {
    inline-size: min(100%, 390px);
    border-radius: 0.2rem;
    background-color: rgb(255 255 255 / 94%);
    box-shadow: 0 1rem 3rem rgb(0 0 0 / 22%);
  }
}

</style>

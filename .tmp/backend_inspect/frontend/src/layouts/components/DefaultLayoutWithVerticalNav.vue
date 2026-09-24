<script lang="ts" setup>
import navItems from "@/navigation/vertical";
import { useConfigStore } from "@core/stores/config";
import { themeConfig } from "@themeConfig";

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavBarNotifications from "@/layouts/components/NavBarNotifications.vue";
import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";
import UserProfile from "@/layouts/components/UserProfile.vue";
import NavBarI18n from "@core/components/I18n.vue";

// @layouts plugin
import { VerticalNavLayout } from "@layouts";

const configStore = useConfigStore();
const route = useRoute();

const pageTitles: Record<string, string> = {
  root: "Inicio",
  "customers-list": "Empresas",
  "customers-add": "Nueva empresa",
  "customers-edit-id": "Editar empresa",
  "quotations-list": "Cotizaciones",
  "quotations-add": "Nueva solicitud de cotización",
  "quotations-id": "Detalle de cotización",
  contact: "Contacto",
  promotions: "Novedades y promociones",
  "promotions-id": "Detalle del comunicado",
  "promotions-manage": "Gestionar publicaciones",
  "promotions-add": "Nueva publicación",
  "promotions-edit-id": "Editar publicación",
};

const pageIcons: Record<string, string> = {
  root: "ri-home-smile-2-line",
  "customers-list": "ri-building-line",
  "customers-add": "ri-building-line",
  "customers-edit-id": "ri-building-line",
  "quotations-list": "ri-bill-line",
  "quotations-add": "ri-file-add-line",
  "quotations-id": "ri-file-text-line",
  contact: "ri-contacts-line",
  promotions: "ri-mail-volume-line",
  "promotions-id": "ri-mail-volume-line",
  "promotions-manage": "ri-file-edit-line",
  "promotions-add": "ri-file-add-line",
  "promotions-edit-id": "ri-file-edit-line",
};

const currentPageTitle = computed(() => {
  const routeName = String(route.name ?? "");

  return pageTitles[routeName] ?? "HPD Glass Group";
});

const breadcrumbItems = computed(() => {
  const routeName = String(route.name ?? "");

  if (currentPageTitle.value === "Inicio") {
    return [{
      title: "Inicio",
      disabled: true,
      icon: pageIcons.root,
    }];
  }

  return [
    {
      title: "Inicio",
      to: { name: "root" },
      icon: pageIcons.root,
    },
    {
      title: currentPageTitle.value,
      disabled: true,
      icon: pageIcons[routeName] ?? "ri-file-text-line",
    },
  ];
});
 
// ℹ️ Provide animation name for vertical nav collapse icon.
const verticalNavHeaderActionAnimationName = ref<
  "rotate-180" | "rotate-back-180" | null
>(null);

watch(
  [() => configStore.isVerticalNavCollapsed, () => configStore.isAppRTL],
  (val) => {
    if (configStore.isAppRTL)
      verticalNavHeaderActionAnimationName.value = val[0]
        ? "rotate-back-180"
        : "rotate-180";
    else
      verticalNavHeaderActionAnimationName.value = val[0]
        ? "rotate-180"
        : "rotate-back-180";
  },
  { immediate: true },
);
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <template #after-nav-items />

    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n2 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon icon="ri-menu-line" />
        </IconBtn>

        <div class="page-breadcrumb text-truncate mx-4">
          <VBreadcrumbs
            :items="breadcrumbItems"
            class="pa-0"
            divider="/"
          >
            <template #item="{ item, index }">
              <div class="d-flex align-center ga-2">
                <VIcon
                  :icon="breadcrumbItems[index]?.icon ?? 'ri-file-text-line'"
                  size="20"
                  :color="item.disabled ? undefined : 'primary'"
                />
                <span
                  class="text-h6 font-weight-medium"
                  :class="{ 'text-primary': !item.disabled }"
                >
                  {{ item.title }}
                </span>
              </div>
            </template>
          </VBreadcrumbs>
        </div>

        <VSpacer />

        <NavBarI18n
          v-if="
            themeConfig.app.i18n.enable &&
            themeConfig.app.i18n.langConfig?.length
          "
          :languages="themeConfig.app.i18n.langConfig"
        />

        <NavbarThemeSwitcher />
        <NavBarNotifications class="me-2" />
        <UserProfile class="me-1" />
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </VerticalNavLayout>
</template>

<style lang="scss">
@keyframes rotate-180 {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(180deg);
  }
}

@keyframes rotate-back-180 {
  from {
    transform: rotate(180deg);
  }
  to {
    transform: rotate(0deg);
  }
}

.layout-vertical-nav {
  .nav-header {
    .header-action {
      animation-duration: 0.35s;
      animation-fill-mode: forwards;
      animation-name: v-bind(verticalNavHeaderActionAnimationName);
      transform: rotate(0deg);
    }
  }
}

.page-breadcrumb {
  min-width: 0;
}
</style>

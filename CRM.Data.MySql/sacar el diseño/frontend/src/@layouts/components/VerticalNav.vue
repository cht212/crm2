<script lang="ts" setup>
import type { Component } from "vue";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import { VNodeRenderer } from "./VNodeRenderer";
import { layoutConfig } from "@layouts";
import { useTheme } from "vuetify";
import logoLight from "@images/logodark.svg?url";
import logoDark from "@images/logodark.svg?url";
import {
  VerticalNavGroup,
  VerticalNavLink,
  VerticalNavSectionTitle,
} from "@layouts/components";
import { useLayoutConfigStore } from "@layouts/stores/config";
import { injectionKeyIsVerticalNavHovered } from "@layouts/symbols";
import type {
  NavGroup,
  NavLink,
  NavSectionTitle,
  VerticalNavItems,
} from "@layouts/types";
import isotipo from "@images/isotipo.svg?url";

interface Props {
  tag?: string | Component;
  navItems: VerticalNavItems;
  isOverlayNavActive: boolean;
  toggleIsOverlayNavActive: (value: boolean) => void;
}

const props = withDefaults(defineProps<Props>(), {
  tag: "aside",
});

const refNav = ref();

const isHovered = useElementHover(refNav);

provide(injectionKeyIsVerticalNavHovered, isHovered);

const configStore = useLayoutConfigStore();

const resolveNavItemComponent = (
  item: NavLink | NavSectionTitle | NavGroup,
): unknown => {
  if ("heading" in item) return VerticalNavSectionTitle;
  if ("children" in item) return VerticalNavGroup;

  return VerticalNavLink;
};

const socialLinks = [
  {
    icon: "ri-facebook-fill",
    label: "Facebook",
    href: "#",
  },
  {
    icon: "ri-instagram-fill",
    label: "Instagram",
    href: "#",
  },
  {
    icon: "ri-tiktok-fill",
    label: "TikTok",
    href: "#",
  },
  {
    icon: "ri-youtube-fill",
    label: "YouTube",
    href: "#",
  },
  {
    icon: "ri-global-line",
    label: "Web",
    href: "https://www.hpdglass.com/",
  },
];

/*
  ℹ️ Close overlay side when route is changed
  Close overlay vertical nav when link is clicked
*/
const route = useRoute();

watch(
  () => route.name,
  () => {
    props.toggleIsOverlayNavActive(false);
  },
);

const isVerticalNavScrolled = ref(false);
const updateIsVerticalNavScrolled = (val: boolean) =>
  (isVerticalNavScrolled.value = val);

const handleNavScroll = (evt: Event) => {
  isVerticalNavScrolled.value = (evt.target as HTMLElement).scrollTop > 0;
};

const theme = useTheme();
const isDarkTheme = computed(() => theme.global.current.value.dark);

const hideTitleAndIcon = configStore.isVerticalNavMini(isHovered);
</script>

<template>
  <Component
    :is="props.tag"
    ref="refNav"
    data-allow-mismatch
    class="layout-vertical-nav"
    :class="[
      {
        'overlay-nav': configStore.isLessThanOverlayNavBreakpoint,
        hovered: isHovered,
        visible: isOverlayNavActive,
        scrolled: isVerticalNavScrolled,
      },
    ]"
  >
    <!-- 👉 Header -->
    <div class="nav-header">
      <slot name="nav-header">
        <RouterLink to="/" class="app-logo app-title-wrapper">
          <!-- MODO MINI: Muestra siempre el isotipo original (no cambia) -->
          <img
            v-if="hideTitleAndIcon"
            :src="isotipo"
            alt="HPD Glass"
            class="app-isotipo"
          />

          <!-- MODO EXPANDIDO: Intercambia el logo completo según el tema -->
          <img
            v-else
            :src="isDarkTheme ? logoDark : logoLight"
            alt="HPD GlassGroup"
            class="app-logo-completo"
          />
        </RouterLink>
        <!-- 👉 Vertical nav actions -->
        <div class="header-action">
          <Component
            :is="layoutConfig.app.iconRenderer || 'div'"
            v-show="configStore.isVerticalNavCollapsed"
            class="d-none nav-unpin"
            :class="configStore.isVerticalNavCollapsed && 'd-lg-block'"
            v-bind="layoutConfig.icons.verticalNavUnPinned"
            @click="
              configStore.isVerticalNavCollapsed =
                !configStore.isVerticalNavCollapsed
            "
          />
          <Component
            :is="layoutConfig.app.iconRenderer || 'div'"
            v-show="!configStore.isVerticalNavCollapsed"
            class="d-none nav-pin"
            :class="!configStore.isVerticalNavCollapsed && 'd-lg-block'"
            v-bind="layoutConfig.icons.verticalNavPinned"
            @click="
              configStore.isVerticalNavCollapsed =
                !configStore.isVerticalNavCollapsed
            "
          />
          <Component
            :is="layoutConfig.app.iconRenderer || 'div'"
            class="d-lg-none"
            v-bind="layoutConfig.icons.close"
            @click="toggleIsOverlayNavActive(false)"
          />
        </div>
      </slot>
    </div>

    <slot name="before-nav-items">
      <div class="vertical-nav-items-shadow" />
    </slot>
    <slot
      name="nav-items"
      :update-is-vertical-nav-scrolled="updateIsVerticalNavScrolled"
    >
      <PerfectScrollbar
        :key="String(configStore.isAppRTL)"
        tag="ul"
        class="nav-items"
        :options="{ wheelPropagation: false }"
        @ps-scroll-y="handleNavScroll"
      >
        <Component
          :is="resolveNavItemComponent(item)"
          v-for="(item, index) in navItems"
          :key="index"
          :item="item"
        />
      </PerfectScrollbar>
    </slot>
    <slot name="after-nav-items">
      <div class="nav-social-links">
        <VTooltip
          v-for="social in socialLinks"
          :key="social.label"
          :text="social.label"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <IconBtn
              v-bind="tooltipProps"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              class="nav-social-link"
              :aria-label="social.label"
            >
              <VIcon :icon="social.icon" />
            </IconBtn>
          </template>
        </VTooltip>
      </div>
    </slot>
  </Component>
</template>

<style lang="scss" scoped>
.app-logo {
  display: flex;
  align-items: center;
  column-gap: 0.5rem;

  .app-logo-title {
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.75rem;
    text-transform: capitalize;
    transition: color 0.2s ease;
  }

  // Aplica el cambio de color solo a las letras del logotipo completo
  &.logo-dark-mode {
    .app-logo-title {
      color: #ffffff !important;
    }

    // Si usas código SVG directo, esto pintará las letras de blanco sin tocar tus tres colores corporativos
    svg path:not([fill="#007DC3"]):not([fill="#B5D5F0"]):not([fill="#C8DF8E"]) {
      fill: #ffffff !important;
    }
  }
}

// CORRECCIÓN: Separamos las dimensiones para que el isotipo no se estire demasiado
.app-logo-completo {
  display: block;
  max-width: 160px; // Tamaño ideal para el logo largo completo con texto
  height: auto;
  object-fit: contain;

  /* SOLUCIÓN AL PIXELEADO EN BORDES SVG */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.app-isotipo {
  display: block;
  width: 40px; // Mantiene el tamaño original de tu barra colapsada
  height: 40px;
  object-fit: contain;

  /* SOLUCIÓN AL PIXELEADO EN BORDES SVG */
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
  transform: translateZ(0);
  backface-visibility: hidden;
}
</style>

<style lang="scss">
@use "@configured-variables" as variables;
@use "@layouts/styles/mixins";

// 👉 Vertical Nav
.layout-vertical-nav {
  position: fixed;
  z-index: variables.$layout-vertical-nav-z-index;
  display: flex;
  flex-direction: column;
  block-size: 100%;
  inline-size: variables.$layout-vertical-nav-width;
  inset-block-start: 0;
  inset-inline-start: 0;
  transition:
    inline-size 0.25s ease-in-out,
    box-shadow 0.25s ease-in-out;
  will-change: transform, inline-size;

  .nav-header {
    display: flex;
    align-items: center;

    .header-action {
      cursor: pointer;

      @at-root {
        #{variables.$selector-vertical-nav-mini} .nav-header .header-action {
          &.nav-pin,
          &.nav-unpin {
            display: none !important;
          }
        }
      }
    }
  }

  .app-title-wrapper {
    margin-inline-end: auto;
  }

  .nav-items {
    block-size: 100%;

    // ℹ️ We no loner needs this overflow styles as perfect scrollbar applies it
    // overflow-x: hidden;

    // // ℹ️ We used `overflow-y` instead of `overflow` to mitigate overflow x. Revert back if any issue found.
    // overflow-y: auto;
  }

  .nav-item-title {
    overflow: hidden;
    margin-inline-end: auto;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 👉 Collapsed
  .layout-vertical-nav-collapsed & {
    &:not(.hovered) {
      inline-size: variables.$layout-vertical-nav-collapsed-width;
      .nav-social-links {
        display: none;
      }
    }
  }
}

// Small screen vertical nav transition
@media (max-width: 1279px) {
  .layout-vertical-nav {
    &:not(.visible) {
      transform: translateX(-#{variables.$layout-vertical-nav-width});

      @include mixins.rtl {
        transform: translateX(variables.$layout-vertical-nav-width);
      }
    }

    transition: transform 0.25s ease-in-out;
  }
}

.nav-social-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  border-block-start: 1px solid rgba(var(--v-border-color), 0.08);
}

.nav-social-link {
  font-size: 20px;
}

</style>

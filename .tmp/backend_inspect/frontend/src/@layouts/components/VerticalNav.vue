<script lang="ts" setup>
import type { Component } from "vue";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import { VNodeRenderer } from "./VNodeRenderer";
import { layoutConfig } from "@layouts";
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
import isotipo from '@images/isotipo.svg?url'

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
          <img
            v-if="hideTitleAndIcon"
            :src="isotipo"
            alt="HPD Glass"
            class="app-isotipo"
          />

          <VNodeRenderer v-else :nodes="layoutConfig.app.logo" />
        </RouterLink>
        <!-- 👉 Vertical nav actions -->
        <!-- Show toggle collapsible in >md and close button in <md -->
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
  }
}
.app-isotipo {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: contain;
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

.nav-social-link:nth-child(1) {
  color: #1877f2;
}

.nav-social-link:nth-child(2) .ri-instagram-fill::before {
  background: linear-gradient(
    45deg,
    #feda75,
    #fa7e1e,
    #d62976,
    #962fbf,
    #4f5bd5
  );

  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.nav-social-link:nth-child(3) {
  color: #000;
}

.nav-social-link:nth-child(4) {
  color: #ff0000;
}
</style>

import { setupLayouts } from "virtual:meta-layouts";
import type { App } from "vue";

import { useCookie } from "@/@core/composable/useCookie";
import { canNavigate } from "@layouts/plugins/casl";
import type { RouteRecordRaw } from "vue-router/auto";

import { createRouter, createWebHistory } from "vue-router/auto";

function recursiveLayouts(route: RouteRecordRaw): RouteRecordRaw {
  if (route.children) {
    for (let i = 0; i < route.children.length; i++)
      route.children[i] = recursiveLayouts(route.children[i]);

    return route;
  }

  return setupLayouts([route])[0];
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: "smooth", top: 60 };

    return { top: 0 };
  },
  extendRoutes: (pages) => [
    ...[...pages].map((route) => recursiveLayouts(route)),
  ],
});

router.beforeEach((to) => {
  const accessToken = useCookie("accessToken").value;
  const isPublicRoute = to.meta.public === true;

  if (!accessToken && !isPublicRoute) {
    return {
      path: "/login",
      query: { to: to.fullPath },
    };
  }

  if (accessToken && to.name === "login") return { path: "/" };

  const hasAbilityMeta = to.matched.some(
    (route) => route.meta.action && route.meta.subject,
  );

  if (accessToken && hasAbilityMeta && !canNavigate(to)) {
    return { path: "/not-authorized" };
  }
});

export { router };

export default function (app: App) {
  app.use(router);
}

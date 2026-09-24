import { router } from "@/plugins/1.router";
import { ofetch } from "ofetch";

export const $api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  async onRequest({ options }) {
    const accessToken = useCookie("accessToken").value;
    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    options.headers = headers;
  },

  async onResponseError({ response }) {
    if (response.status !== 401) return;

    useCookie("accessToken").value = null;
    useCookie("userData").value = null;
    useCookie("userAbilityRules").value = null;

    if (router.currentRoute.value.name !== "login") {
      await router.replace({
        path: "/login",
        query: { to: router.currentRoute.value.fullPath },
      });
    }
  },
});

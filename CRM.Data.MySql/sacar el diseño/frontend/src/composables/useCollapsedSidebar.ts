import { useConfigStore } from "@core/stores/config";
import { onBeforeUnmount } from "vue";

export const useCollapsedSidebar = () => {
  const configStore = useConfigStore();
  let previousCollapsedState: boolean | null = null;

  const collapseSidebar = () => {
    if (previousCollapsedState === null)
      previousCollapsedState = configStore.isVerticalNavCollapsed;

    configStore.isVerticalNavCollapsed = true;
  };

  onBeforeUnmount(() => {
    if (previousCollapsedState !== null)
      configStore.isVerticalNavCollapsed = previousCollapsedState;
  });

  return collapseSidebar;
};

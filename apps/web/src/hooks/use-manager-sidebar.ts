import { useCallback, useEffect, useSyncExternalStore } from "react";

export const MANAGER_SIDEBAR_EXPANDED_WIDTH = 240;
export const MANAGER_SIDEBAR_COLLAPSED_WIDTH = 72;

const STORAGE_KEY = "timeclock:manager-sidebar";
const LG_MEDIA_QUERY = "(min-width: 1024px)";
const SIDEBAR_CHANGE_EVENT = "timeclock:manager-sidebar";

export type ManagerSidebarMode = "expanded" | "collapsed";

function readStoredMode(): ManagerSidebarMode {
  if (typeof window === "undefined") {
    return "expanded";
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "collapsed" || stored === "expanded") {
    return stored;
  }
  return "expanded";
}

function getServerSnapshot(): ManagerSidebarMode {
  return "expanded";
}

function subscribe(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };
  const onLocalChange = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, onLocalChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, onLocalChange);
  };
}

function writeMode(mode: ManagerSidebarMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
}

export function useManagerSidebar(): {
  mode: ManagerSidebarMode;
  isExpanded: boolean;
  isCollapsed: boolean;
  expandedWidth: typeof MANAGER_SIDEBAR_EXPANDED_WIDTH;
  collapsedWidth: typeof MANAGER_SIDEBAR_COLLAPSED_WIDTH;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
} {
  const mode = useSyncExternalStore(subscribe, readStoredMode, getServerSnapshot);

  const setMode = useCallback((next: ManagerSidebarMode) => {
    if (typeof window === "undefined") {
      return;
    }
    if (readStoredMode() === next) {
      return;
    }
    writeMode(next);
  }, []);

  const toggle = useCallback(() => {
    const current = readStoredMode();
    setMode(current === "expanded" ? "collapsed" : "expanded");
  }, [setMode]);

  const expand = useCallback(() => setMode("expanded"), [setMode]);
  const collapse = useCallback(() => setMode("collapsed"), [setMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(LG_MEDIA_QUERY);

    const onKeyDown = (event: KeyboardEvent) => {
      if (!mediaQuery.matches) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== "b" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      toggle();
    };

    const syncListener = () => {
      if (mediaQuery.matches) {
        window.addEventListener("keydown", onKeyDown);
      } else {
        window.removeEventListener("keydown", onKeyDown);
      }
    };

    syncListener();
    mediaQuery.addEventListener("change", syncListener);

    return () => {
      mediaQuery.removeEventListener("change", syncListener);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toggle]);

  return {
    mode,
    isExpanded: mode === "expanded",
    isCollapsed: mode === "collapsed",
    expandedWidth: MANAGER_SIDEBAR_EXPANDED_WIDTH,
    collapsedWidth: MANAGER_SIDEBAR_COLLAPSED_WIDTH,
    toggle,
    expand,
    collapse,
  };
}

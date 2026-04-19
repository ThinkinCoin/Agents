import { getMemoryStore } from "./memory-store.ts";

type PluginConfig = {
  storage?: "memory" | "notion" | "database";
};

export function resolveStorageMode(config?: PluginConfig) {
  return config?.storage ?? "memory";
}

export function getStorage(config?: PluginConfig) {
  const mode = resolveStorageMode(config);

  if (mode === "memory") {
    return {
      mode,
      store: getMemoryStore(),
    };
  }

  throw new Error(`Storage backend '${mode}' is not implemented yet`);
}

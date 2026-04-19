import { randomUUID } from "node:crypto";

import { createTaskSchema } from "../schemas/create-task.ts";
import { logEvent } from "../services/logger.ts";
import { getStorage } from "../services/storage.ts";

export default async function createTaskHandler(
  toolCallId: string,
  input: Record<string, unknown>,
  config?: { storage?: "memory" | "notion" | "database" },
  _signal?: AbortSignal,
) {
  const payload = createTaskSchema.parse(input);
  const { mode, store } = getStorage(config);

  const task = {
    id: randomUUID(),
    ...payload,
    status: "pending" as const,
    created_at: new Date().toISOString(),
  };

  store.tasks.push(task);

  logEvent("create_task", {
    toolCallId,
    storage: mode,
    taskId: task.id,
    brand: task.brand,
    area: task.area,
  });

  return {
    success: true,
    tool: "create_task",
    storage: mode,
    task,
  };
}

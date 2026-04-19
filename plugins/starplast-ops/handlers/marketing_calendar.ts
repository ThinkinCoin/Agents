import { randomUUID } from "node:crypto";

import { marketingCalendarSchema } from "../schemas/marketing-calendar.ts";
import { logEvent } from "../services/logger.ts";
import { getStorage } from "../services/storage.ts";

export default async function marketingCalendarHandler(
  toolCallId: string,
  input: Record<string, unknown>,
  config?: { storage?: "memory" | "notion" | "database" },
  _signal?: AbortSignal,
) {
  const payload = marketingCalendarSchema.parse(input);
  const { mode, store } = getStorage(config);

  if (payload.action === "create") {
    const item = {
      id: randomUUID(),
      brand: payload.brand,
      date: payload.date!,
      content_type: payload.content_type!,
      description: payload.description!,
      status: payload.status ?? "planned",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.calendarItems.push(item);

    logEvent("marketing_calendar_create", {
      toolCallId,
      storage: mode,
      itemId: item.id,
      brand: item.brand,
    });

    return {
      success: true,
      tool: "marketing_calendar",
      action: "create",
      storage: mode,
      item,
    };
  }

  if (payload.action === "list") {
    const items = store.calendarItems.filter((item) => item.brand === payload.brand);

    logEvent("marketing_calendar_list", {
      toolCallId,
      storage: mode,
      brand: payload.brand,
      count: items.length,
    });

    return {
      success: true,
      tool: "marketing_calendar",
      action: "list",
      storage: mode,
      items,
    };
  }

  const item = store.calendarItems.find((entry) => entry.id === payload.item_id);

  if (!item) {
    return {
      success: false,
      tool: "marketing_calendar",
      action: "update",
      storage: mode,
      error: {
        code: "NOT_FOUND",
        message: "Calendar item not found",
      },
    };
  }

  if (payload.date) item.date = payload.date;
  if (payload.content_type) item.content_type = payload.content_type;
  if (payload.description) item.description = payload.description;
  if (payload.status) item.status = payload.status;
  item.updated_at = new Date().toISOString();

  logEvent("marketing_calendar_update", {
    toolCallId,
    storage: mode,
    itemId: item.id,
  });

  return {
    success: true,
    tool: "marketing_calendar",
    action: "update",
    storage: mode,
    item,
  };
}

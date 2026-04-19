import { randomUUID } from "node:crypto";

import { eventManagerSchema } from "../schemas/event-manager.ts";
import { logEvent } from "../services/logger.ts";
import { getStorage } from "../services/storage.ts";

function buildChecklist() {
  return {
    pre_event: ["Briefing", "Materiais", "Equipe"],
    during: ["Cobertura", "Fotos"],
    post: ["Relatorio", "Follow-up"],
  };
}

export default async function eventManagerHandler(
  toolCallId: string,
  input: Record<string, unknown>,
  config?: { storage?: "memory" | "notion" | "database" },
  _signal?: AbortSignal,
) {
  const payload = eventManagerSchema.parse(input);
  const { mode, store } = getStorage(config);

  if (payload.action === "checklist") {
    const checklist = buildChecklist();

    logEvent("event_manager_checklist", {
      toolCallId,
      storage: mode,
      eventName: payload.event_name ?? null,
    });

    return {
      success: true,
      tool: "event_manager",
      action: "checklist",
      storage: mode,
      checklist,
    };
  }

  if (payload.action === "create") {
    const event = {
      id: randomUUID(),
      event_name: payload.event_name!,
      brand: payload.brand!,
      date: payload.date!,
      location: payload.location!,
      status: payload.status ?? "planned",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.events.push(event);

    logEvent("event_manager_create", {
      toolCallId,
      storage: mode,
      eventId: event.id,
      brand: event.brand,
    });

    return {
      success: true,
      tool: "event_manager",
      action: "create",
      storage: mode,
      event,
    };
  }

  const event = store.events.find(
    (entry) => entry.id === payload.event_id || entry.event_name === payload.event_name,
  );

  if (!event) {
    return {
      success: false,
      tool: "event_manager",
      action: "status",
      storage: mode,
      error: {
        code: "NOT_FOUND",
        message: "Event not found",
      },
    };
  }

  logEvent("event_manager_status", {
    toolCallId,
    storage: mode,
    eventId: event.id,
  });

  return {
    success: true,
    tool: "event_manager",
    action: "status",
    storage: mode,
    event,
    checklist: buildChecklist(),
  };
}

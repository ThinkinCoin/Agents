import createTaskHandler from "./handlers/create_task.ts";
import eventManagerHandler from "./handlers/event_manager.ts";
import marketingCalendarHandler from "./handlers/marketing_calendar.ts";

type ToolResult = Record<string, unknown>;

function toToolResponse(payload: ToolResult) {
  return {
    ...payload,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

const starplastOpsPlugin = {
  id: "starplast-ops",
  name: "Starplast Operations",
  description: "Operations plugin for communication, marketing and events",
  register(api: any) {
    api.registerTool({
      name: "create_task",
      label: "Create Task",
      description: "Create a task for Starplast communication team.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "Task title" },
          brand: {
            type: "string",
            enum: ["Peels", "Polisport", "Bieffe"],
          },
          area: {
            type: "string",
            enum: ["social", "eventos", "branding"],
          },
          assigned_to: { type: "string", description: "Assignee name" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          due_date: {
            type: "string",
            description: "Due date in ISO 8601 format",
          },
          context: {
            type: "string",
            description: "Optional operational context",
          },
        },
        required: ["title", "brand", "area", "assigned_to", "priority", "due_date"],
      },
      async execute(toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal) {
        const result = await createTaskHandler(toolCallId, params, api?.config, signal);
        return toToolResponse(result);
      },
    } as any);

    api.registerTool({
      name: "marketing_calendar",
      label: "Marketing Calendar",
      description: "Manage Starplast's marketing calendar by brand.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: {
            type: "string",
            enum: ["create", "list", "update"],
          },
          brand: {
            type: "string",
            enum: ["Peels", "Polisport", "Bieffe"],
          },
          date: {
            type: "string",
            description: "Planned date in ISO 8601 format",
          },
          content_type: {
            type: "string",
            enum: ["post", "campanha", "evento"],
          },
          description: {
            type: "string",
            description: "Content or campaign description",
          },
          item_id: {
            type: "string",
            description: "Existing item id for update actions",
          },
          status: {
            type: "string",
            enum: ["planned", "scheduled", "published", "cancelled"],
          },
        },
        required: ["action", "brand"],
      },
      async execute(toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal) {
        const result = await marketingCalendarHandler(toolCallId, params, api?.config, signal);
        return toToolResponse(result);
      },
    } as any);

    api.registerTool({
      name: "event_manager",
      label: "Event Manager",
      description: "Manage events and trade shows for Starplast brands.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: {
            type: "string",
            enum: ["create", "checklist", "status"],
          },
          event_name: { type: "string", description: "Event name" },
          brand: {
            type: "string",
            enum: ["Peels", "Polisport", "Bieffe"],
          },
          date: {
            type: "string",
            description: "Event date in ISO 8601 format",
          },
          location: { type: "string", description: "Event location" },
          event_id: {
            type: "string",
            description: "Existing event id for status queries",
          },
          status: {
            type: "string",
            enum: ["planned", "active", "completed", "cancelled"],
          },
        },
        required: ["action"],
      },
      async execute(toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal) {
        const result = await eventManagerHandler(toolCallId, params, api?.config, signal);
        return toToolResponse(result);
      },
    } as any);
  },
};

export default starplastOpsPlugin;

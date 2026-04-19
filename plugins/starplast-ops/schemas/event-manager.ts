import { z } from "zod";

export const eventManagerSchema = z
  .object({
    action: z.enum(["create", "checklist", "status"]),
    event_name: z.string().optional(),
    brand: z.enum(["Peels", "Polisport", "Bieffe"]).optional(),
    date: z.string().datetime({ offset: true }).optional(),
    location: z.string().optional(),
    event_id: z.string().uuid().optional(),
    status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "create") {
      for (const key of ["event_name", "brand", "date", "location"] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required for create`,
            path: [key],
          });
        }
      }
    }

    if (value.action === "status" && !value.event_id && !value.event_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "event_id or event_name is required for status",
        path: ["event_id"],
      });
    }
  });

export type EventManagerInput = z.infer<typeof eventManagerSchema>;

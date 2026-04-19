import { z } from "zod";

export const marketingCalendarSchema = z
  .object({
    action: z.enum(["create", "list", "update"]),
    brand: z.enum(["Peels", "Polisport", "Bieffe"]),
    date: z.string().datetime({ offset: true }).optional(),
    content_type: z.enum(["post", "campanha", "evento"]).optional(),
    description: z.string().optional(),
    item_id: z.string().uuid().optional(),
    status: z.enum(["planned", "scheduled", "published", "cancelled"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "create") {
      if (!value.date) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "date is required for create", path: ["date"] });
      }
      if (!value.content_type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "content_type is required for create",
          path: ["content_type"],
        });
      }
      if (!value.description) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "description is required for create",
          path: ["description"],
        });
      }
    }

    if (value.action === "update" && !value.item_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "item_id is required for update", path: ["item_id"] });
    }
  });

export type MarketingCalendarInput = z.infer<typeof marketingCalendarSchema>;

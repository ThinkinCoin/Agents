import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1),
  brand: z.enum(["Peels", "Polisport", "Bieffe"]),
  area: z.enum(["social", "eventos", "branding"]),
  assigned_to: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.string().datetime({ offset: true }),
  context: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

type TaskRecord = {
  id: string;
  title: string;
  brand: "Peels" | "Polisport" | "Bieffe";
  area: "social" | "eventos" | "branding";
  assigned_to: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  context?: string;
  status: "pending";
  created_at: string;
};

type CalendarRecord = {
  id: string;
  brand: "Peels" | "Polisport" | "Bieffe";
  date: string;
  content_type: "post" | "campanha" | "evento";
  description: string;
  status: "planned" | "scheduled" | "published" | "cancelled";
  created_at: string;
  updated_at: string;
};

type EventRecord = {
  id: string;
  event_name: string;
  brand: "Peels" | "Polisport" | "Bieffe";
  date: string;
  location: string;
  status: "planned" | "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
};

type StoreState = {
  tasks: TaskRecord[];
  calendarItems: CalendarRecord[];
  events: EventRecord[];
};

declare global {
  var __starplastOpsStore__: StoreState | undefined;
}

function createState(): StoreState {
  return {
    tasks: [],
    calendarItems: [],
    events: [],
  };
}

export function getMemoryStore() {
  if (!globalThis.__starplastOpsStore__) {
    globalThis.__starplastOpsStore__ = createState();
  }

  return globalThis.__starplastOpsStore__;
}

export type { CalendarRecord, EventRecord, TaskRecord };

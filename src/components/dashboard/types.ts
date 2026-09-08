export type DeliverableStatus =
  | "not_started"
  | "in_progress"
  | "on_hold"
  | "in_review"
  | "done";

export const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  "not_started",
  "in_progress",
  "on_hold",
  "in_review",
  "done",
];

export type CellAggregateStatus =
  | "not_applicable"
  | "partially_delayed"
  | "done"
  | "not_started"
  | "in_progress";

export type Project = {
  id: string;
  name: string;
  designDocFolderPath: string;
  isArchived: boolean;
  createdAt: string;
};

export type TrashedProject = Project & {
  deletedAt: string;
  remainingDays: number;
};

export type Phase = {
  id: string;
  projectId: string;
  name: string;
  order: number;
};

export type GlobalPhase = {
  id: string;
  name: string;
  order: number;
};

export type Feature = {
  id: string;
  projectId: string;
  name: string;
  order: number;
};

export type DeliverableType = {
  id: string;
  projectId: string;
  name: string;
  defaultPhaseId: string | null;
  order: number;
  deliverableCount: number;
};

export type GlobalDeliverableType = {
  id: string;
  name: string;
  defaultPhaseName: string;
  order: number;
};

export type Deliverable = {
  id: string;
  projectId: string;
  featureId: string;
  phaseId: string;
  typeId: string | null;
  name: string;
  assignee: string;
  link: string;
  status: DeliverableStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  progress: number;
  memo: string;
  order: number;
};

export type DesignDocument = {
  id: string;
  projectId: string;
  title: string;
  filePath: string;
  indexStatus: "pending" | "processing" | "indexed" | "failed";
  indexedAt: string | null;
  updatedAt: string;
};

export type QaSource = {
  documentId: string;
  documentTitle: string;
  sectionLabel: string;
  filePath: string;
  snippet: string;
};

export type QaHistoryItem = {
  id: string;
  question: string;
  answer: string;
  sources: QaSource[];
  createdAt: string;
};

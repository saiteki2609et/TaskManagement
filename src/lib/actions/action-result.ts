export type ActionError =
  | { code: "DUPLICATE_PROJECT_NAME"; message: string }
  | { code: "DELIVERABLE_TYPE_IN_USE"; message: string; count: number }
  | { code: "UNKNOWN"; message: string };

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

import type { BulkTaskInput } from "@/components/todo/types";
import { TASK_TITLE_MAX_LENGTH } from "@/lib/constants";

export function parseBulkTaskText(text: string): BulkTaskInput[] {
  const roots: BulkTaskInput[] = [];
  const stack: { depth: number; node: BulkTaskInput }[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const depth = rawLine.match(/^\t*/)?.[0].length ?? 0;
    const title = rawLine.slice(depth).trim();
    if (!title) continue;

    const node: BulkTaskInput = {
      title: title.slice(0, TASK_TITLE_MAX_LENGTH),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ depth, node });
  }

  return roots;
}

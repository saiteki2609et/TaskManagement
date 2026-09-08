"use client";

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { TaskListItem } from "@/components/todo/task-list-item";
import type { Priority, TodoTask } from "@/components/todo/types";

type SortableTaskListProps = {
  tasks: TodoTask[];
  selectedId: string | null;
  expandedIds: Set<string>;
  showActions: boolean;
  dragEnabled: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onExpandSubtree: (task: TodoTask) => void;
  onCollapseSubtree: (task: TodoTask) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangePriority: (id: string, priority: Priority | null) => void;
  onRequestAddChild: (parentId: string) => void;
};

// dnd-kitはドラッグ可能要素に module-level カウンタから生成する
// aria-describedby="DndDescribedBy-N" を付与するが、この値はサーバー描画時と
// クライアント初回描画時とでカウンタの状態が一致せず、Reactのハイドレーション
// エラーになる。この一覧全体をクライアント専用(ssr:false)で描画することで回避する
// (進捗ダッシュボードのProgressMatrixViewと同様の対処)。
export function SortableTaskList({
  tasks,
  selectedId,
  expandedIds,
  showActions,
  dragEnabled,
  onDragEnd,
  onSelect,
  onToggleExpand,
  onExpandSubtree,
  onCollapseSubtree,
  onDelete,
  onDuplicate,
  onChangePriority,
  onRequestAddChild,
}: SortableTaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            parentId={null}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            showActions={showActions}
            dragEnabled={dragEnabled}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            onExpandSubtree={onExpandSubtree}
            onCollapseSubtree={onCollapseSubtree}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onChangePriority={onChangePriority}
            onRequestAddChild={onRequestAddChild}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

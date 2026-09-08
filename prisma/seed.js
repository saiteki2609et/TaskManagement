const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.task.count();
  if (existing > 0) return;

  const planning = await prisma.task.create({
    data: { title: "企画資料をまとめる", priority: 1, order: 0 },
  });
  await prisma.task.create({
    data: {
      title: "アジェンダを作成する",
      status: "done",
      order: 0,
      parentId: planning.id,
    },
  });
  const slides = await prisma.task.create({
    data: {
      title: "スライドを作成する",
      priority: 2,
      order: 1,
      parentId: planning.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "デザインを確認してもらう",
      memo: "レビューは金曜までに依頼する。参考資料はDriveのフォルダを共有済み。",
      order: 0,
      parentId: slides.id,
    },
  });

  await prisma.task.create({
    data: { title: "チームメンバーにメールを返信する", priority: 3, order: 1 },
  });

  const weekly = await prisma.task.create({
    data: { title: "週次ミーティングの準備", order: 2 },
  });
  await prisma.task.create({
    data: {
      title: "先週の進捗をまとめる",
      order: 0,
      parentId: weekly.id,
    },
  });
  await prisma.task.create({
    data: {
      title: "今週のタスクを洗い出す",
      priority: 2,
      order: 1,
      parentId: weekly.id,
    },
  });
}

const DEFAULT_GLOBAL_PHASES = [
  "要件定義",
  "基本設計",
  "詳細設計",
  "実装",
  "単体テスト",
  "結合テスト",
  "総合テスト",
  "リリース",
];

const DEFAULT_GLOBAL_DELIVERABLE_TYPES = [
  { name: "要件定義書", defaultPhaseName: "要件定義" },
  { name: "基本設計書", defaultPhaseName: "基本設計" },
  { name: "詳細設計書", defaultPhaseName: "詳細設計" },
  { name: "単体テスト仕様書", defaultPhaseName: "単体テスト" },
  { name: "結合テスト仕様書", defaultPhaseName: "結合テスト" },
  { name: "総合テスト仕様書", defaultPhaseName: "総合テスト" },
  { name: "テスト報告書", defaultPhaseName: "総合テスト" },
  { name: "操作マニュアル", defaultPhaseName: "リリース" },
];

async function seedGlobalPhases() {
  const existing = await prisma.globalPhase.count();
  if (existing > 0) return;
  await prisma.globalPhase.createMany({
    data: DEFAULT_GLOBAL_PHASES.map((name, order) => ({ name, order })),
  });
}

async function seedGlobalDeliverableTypes() {
  const existing = await prisma.globalDeliverableType.count();
  if (existing > 0) return;
  await prisma.globalDeliverableType.createMany({
    data: DEFAULT_GLOBAL_DELIVERABLE_TYPES.map((type, order) => ({
      name: type.name,
      defaultPhaseName: type.defaultPhaseName,
      order,
    })),
  });
}

main()
  .then(() => seedGlobalPhases())
  .then(() => seedGlobalDeliverableTypes())
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

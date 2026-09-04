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
      done: true,
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

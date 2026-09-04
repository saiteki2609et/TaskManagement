# TaskFlow

Next.js + TypeScript + Tailwind CSS + shadcn/ui + Prisma(SQLite)で構築したタスク管理アプリです。階層型のTodo管理、優先度・進捗・タグ・期間の設定、検索/絞り込み、論理削除とゴミ箱、JSON/CSVのエクスポート・インポートなどの機能を備えています。

## 必要環境

- Node.js **v20.11 以上**(推奨: v20.19+ または v22.12+）
- npm

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

> **うまくいかない場合**: `npm install` 実行時に `Cannot read properties of null (reading 'edgesOut')` のようなエラーが出ることがあります(npm自体の既知の不具合)。その場合はもう一度 `npm install` を実行すると解消することが多いです。

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、SQLiteデータベースの接続先を指定します。

```bash
echo 'DATABASE_URL="file:./dev.db"' > .env
```

### 3. データベースのセットアップ

Prismaのマイグレーションを適用してSQLiteデータベースを作成します。

```bash
npx prisma migrate dev
```

- 初回実行時はデータベースファイル(`prisma/dev.db`)が作成され、既存のマイグレーションが適用されます。
- `package.json` の `prisma.seed` 設定により、初回マイグレーション時にサンプルタスクが自動投入されます。手動でシードを実行したい場合は以下を実行してください。

```bash
npx prisma db seed
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くとトップページが、[http://localhost:3000/todo](http://localhost:3000/todo) を開くとTodo管理画面が表示されます。

## 主な技術スタック

- [Next.js](https://nextjs.org)(App Router) / TypeScript
- [Tailwind CSS](https://tailwindcss.com) / [shadcn/ui](https://ui.shadcn.com)(base-ui)
- [Prisma](https://www.prisma.io) + SQLite
- [sonner](https://sonner.emilkowal.ski)(トースト通知) / [next-themes](https://github.com/pacocoursey/next-themes)(ダークモード)

## npm scripts

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動(Turbopack) |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番ビルドの起動 |
| `npm run lint` | ESLintの実行 |

## Prisma関連コマンド

| コマンド | 説明 |
| --- | --- |
| `npx prisma migrate dev --name <任意の名前>` | スキーマ変更後に新しいマイグレーションを作成・適用 |
| `npx prisma studio` | データベースの内容をGUIで確認 |
| `npx prisma generate` | Prisma Clientの再生成(通常は`migrate dev`実行時に自動実行) |

`prisma/dev.db` および `.env` はGit管理対象外(`.gitignore`)です。

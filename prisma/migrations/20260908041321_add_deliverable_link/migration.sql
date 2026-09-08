-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deliverable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "typeId" TEXT,
    "name" TEXT NOT NULL,
    "assignee" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "plannedStartDate" DATETIME,
    "plannedEndDate" DATETIME,
    "actualStartDate" DATETIME,
    "actualEndDate" DATETIME,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deliverable_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deliverable_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deliverable_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DeliverableType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deliverable" ("actualEndDate", "actualStartDate", "assignee", "createdAt", "featureId", "id", "memo", "name", "order", "phaseId", "plannedEndDate", "plannedStartDate", "progress", "projectId", "status", "typeId", "updatedAt") SELECT "actualEndDate", "actualStartDate", "assignee", "createdAt", "featureId", "id", "memo", "name", "order", "phaseId", "plannedEndDate", "plannedStartDate", "progress", "projectId", "status", "typeId", "updatedAt" FROM "Deliverable";
DROP TABLE "Deliverable";
ALTER TABLE "new_Deliverable" RENAME TO "Deliverable";
CREATE INDEX "Deliverable_projectId_idx" ON "Deliverable"("projectId");
CREATE INDEX "Deliverable_featureId_phaseId_idx" ON "Deliverable"("featureId", "phaseId");
CREATE INDEX "Deliverable_typeId_idx" ON "Deliverable"("typeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

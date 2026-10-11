-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "text" TEXT NOT NULL,
    "codeLanguage" TEXT,
    "code" TEXT,
    "type" TEXT NOT NULL DEFAULT 'THEORY',
    "timeSeconds" INTEGER,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCode" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "questions_externalId_key" ON "questions"("externalId");

-- CreateIndex
CREATE INDEX "questions_included_position_idx" ON "questions"("included", "position");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_questionId_label_key" ON "question_options"("questionId", "label");

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('CREDIT_ADDED', 'CLASS_ATTENDED', 'CLASS_MISSED', 'MANUAL_ADJUSTMENT');

-- CreateTable
CREATE TABLE "class_logs" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "change" INTEGER NOT NULL,
    "type" "LogType" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "class_logs" ADD CONSTRAINT "class_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

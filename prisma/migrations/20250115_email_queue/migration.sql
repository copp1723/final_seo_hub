-- CreateTable
CREATE TABLE "email_queue" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_queue_user_id_idx" ON "email_queue"("user_id");
CREATE INDEX "email_queue_status_idx" ON "email_queue"("status");
CREATE INDEX "email_queue_scheduled_for_idx" ON "email_queue"("scheduled_for");
CREATE INDEX "email_queue_type_idx" ON "email_queue"("type");
CREATE INDEX "email_queue_created_at_idx" ON "email_queue"("created_at");

-- Add foreign key constraint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add check constraints
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_attempts_check" CHECK ("attempts" >= 0);
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_max_attempts_check" CHECK ("max_attempts" > 0);
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_status_check" CHECK ("status" IN ('pending', 'sent', 'failed', 'cancelled'));

-- Create function to automatically set gen_random_uuid() for id
CREATE OR REPLACE FUNCTION generate_email_queue_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id IS NULL THEN
        NEW.id = gen_random_uuid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating IDs
CREATE TRIGGER email_queue_id_trigger
    BEFORE INSERT ON email_queue
    FOR EACH ROW
    EXECUTE FUNCTION generate_email_queue_id();
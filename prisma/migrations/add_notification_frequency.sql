-- Add notification frequency fields to user_preferences table
ALTER TABLE "user_preferences" 
ADD COLUMN "notificationFrequency" TEXT DEFAULT 'INSTANT',
ADD COLUMN "taskCompletedFrequency" TEXT DEFAULT 'INSTANT',
ADD COLUMN "statusChangedFrequency" TEXT DEFAULT 'INSTANT',
ADD COLUMN "digestHour" INTEGER DEFAULT 9,
ADD COLUMN "digestDayOfWeek" INTEGER DEFAULT 1,
ADD COLUMN "lastDigestSent" TIMESTAMP(3);

-- Add check constraints for valid frequency values
ALTER TABLE "user_preferences" 
ADD CONSTRAINT "notification_frequency_check" 
CHECK ("notificationFrequency" IN ('INSTANT', 'DAILY', 'WEEKLY', 'NEVER'));

ALTER TABLE "user_preferences" 
ADD CONSTRAINT "task_completed_frequency_check" 
CHECK ("taskCompletedFrequency" IS NULL OR "taskCompletedFrequency" IN ('INSTANT', 'DAILY', 'WEEKLY', 'NEVER'));

ALTER TABLE "user_preferences" 
ADD CONSTRAINT "status_changed_frequency_check" 
CHECK ("statusChangedFrequency" IS NULL OR "statusChangedFrequency" IN ('INSTANT', 'DAILY', 'WEEKLY', 'NEVER'));

-- Add check constraints for hour and day of week
ALTER TABLE "user_preferences" 
ADD CONSTRAINT "digest_hour_check" 
CHECK ("digestHour" IS NULL OR ("digestHour" >= 0 AND "digestHour" <= 23));

ALTER TABLE "user_preferences" 
ADD CONSTRAINT "digest_day_check" 
CHECK ("digestDayOfWeek" IS NULL OR ("digestDayOfWeek" >= 0 AND "digestDayOfWeek" <= 6));

-- Create index for efficient batch processing
CREATE INDEX "user_preferences_frequency_idx" ON "user_preferences" ("notificationFrequency", "lastDigestSent");
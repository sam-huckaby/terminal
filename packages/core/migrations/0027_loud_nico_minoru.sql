ALTER TABLE `link` MODIFY COLUMN `id` char(8) NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription` ADD `schedule` json;
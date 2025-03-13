DROP TABLE `gift_card`;--> statement-breakpoint
ALTER TABLE `cart` DROP COLUMN `gift_card_id`;--> statement-breakpoint
ALTER TABLE `cart` DROP COLUMN `gift_card_amount`;--> statement-breakpoint
ALTER TABLE `order` DROP COLUMN `gift_card_id`;--> statement-breakpoint
ALTER TABLE `order` DROP COLUMN `gift_card_amount`;
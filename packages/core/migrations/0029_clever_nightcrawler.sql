CREATE TABLE `gift_card` (
	`id` char(30) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`order_id` char(30) NOT NULL,
	`value` bigint NOT NULL,
	`balance` bigint NOT NULL,
	`recipient_email` text NOT NULL,
	CONSTRAINT `gift_card_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cart` ADD `gift_card_id` char(30);--> statement-breakpoint
ALTER TABLE `cart` ADD `gift_card_amount` bigint;--> statement-breakpoint
ALTER TABLE `order` ADD `gift_card_id` char(30);--> statement-breakpoint
ALTER TABLE `order` ADD `gift_card_amount` bigint;--> statement-breakpoint
ALTER TABLE `gift_card` ADD CONSTRAINT `gift_card_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product` DROP COLUMN `filters`;
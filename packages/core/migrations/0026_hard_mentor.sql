CREATE TABLE `link` (
	`id` char(10) NOT NULL,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`time_deleted` timestamp(3),
	`time_expired` timestamp(3) NOT NULL,
	`url` text NOT NULL,
	`user_id` char(30),
	CONSTRAINT `link_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `link` ADD CONSTRAINT `link_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;

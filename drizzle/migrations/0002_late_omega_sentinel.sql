CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`edited_at` integer,
	`deleted_at` integer,
	`client_message_id` text,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "messages_body_len" CHECK(length("messages"."body") <= 4000)
);
--> statement-breakpoint
CREATE INDEX `messages_conv_cursor` ON `messages` (`conversation_id`,`created_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_idempotency` ON `messages` (`sender_id`,`client_message_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_conversation_members` (
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL,
	`last_read_message_id` text,
	`left_at` integer,
	PRIMARY KEY(`conversation_id`, `user_id`),
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_read_message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_conversation_members`("conversation_id", "user_id", "role", "joined_at", "last_read_message_id", "left_at") SELECT "conversation_id", "user_id", "role", "joined_at", "last_read_message_id", "left_at" FROM `conversation_members`;--> statement-breakpoint
DROP TABLE `conversation_members`;--> statement-breakpoint
ALTER TABLE `__new_conversation_members` RENAME TO `conversation_members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `conversation_members_userId_idx` ON `conversation_members` (`user_id`);
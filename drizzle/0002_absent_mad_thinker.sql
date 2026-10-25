CREATE TABLE `game_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `game_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `game_sessions` (`expires_at`);--> statement-breakpoint
ALTER TABLE `players` ADD `recovery_hash` text;
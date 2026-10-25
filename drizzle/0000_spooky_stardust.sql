CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`low_id` text NOT NULL,
	`high_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`low_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`high_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friendship_pair` ON `friendships` (`low_id`,`high_id`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guest_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`username_key` text NOT NULL,
	`pet_kind` integer DEFAULT 0 NOT NULL,
	`pet_shiny` integer DEFAULT 0 NOT NULL,
	`seen_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_username_unique` ON `players` (`username_key`);--> statement-breakpoint
CREATE TABLE `friend_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`from_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_request_pair` ON `friend_requests` (`from_id`,`to_id`);
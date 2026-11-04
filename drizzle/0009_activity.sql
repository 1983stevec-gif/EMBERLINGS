CREATE TABLE `activity_cheers` (
	`event_id` text NOT NULL,
	`player_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`event_id`, `player_id`)
);
--> statement-breakpoint
CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`type` text NOT NULL,
	`dedupe` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_events_dedupe` ON `activity_events` (`player_id`,`dedupe`);--> statement-breakpoint
CREATE INDEX `activity_events_player_time` ON `activity_events` (`player_id`,`created_at`);
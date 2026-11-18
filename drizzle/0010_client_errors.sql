CREATE TABLE `client_errors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hash` text NOT NULL,
	`message` text NOT NULL,
	`stack` text,
	`view` text,
	`ua` text,
	`count` integer DEFAULT 1 NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_errors_hash` ON `client_errors` (`hash`);--> statement-breakpoint
CREATE INDEX `client_errors_last_seen` ON `client_errors` (`last_seen`);
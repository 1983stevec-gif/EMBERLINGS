CREATE TABLE `trade_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`origin_user_id` text NOT NULL,
	`origin_local_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`data` text NOT NULL,
	`eligible` integer DEFAULT 1 NOT NULL,
	`locked_trade_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`origin_user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trade_assets_origin` ON `trade_assets` (`origin_user_id`,`origin_local_id`);--> statement-breakpoint
CREATE INDEX `trade_assets_owner` ON `trade_assets` (`owner_id`);--> statement-breakpoint
CREATE INDEX `trade_assets_lock` ON `trade_assets` (`locked_trade_id`);--> statement-breakpoint
CREATE TABLE `trade_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`trade_id` text NOT NULL,
	`user_id` text NOT NULL,
	`outgoing_asset` text NOT NULL,
	`incoming_asset` text NOT NULL,
	`outgoing_local_id` text NOT NULL,
	`creature` text NOT NULL,
	`acknowledged` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trade_receipt_player` ON `trade_receipts` (`trade_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `trade_receipts_pending` ON `trade_receipts` (`user_id`,`acknowledged`);--> statement-breakpoint
CREATE TABLE `trades` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text NOT NULL,
	`guest_id` text NOT NULL,
	`status` text NOT NULL,
	`host_offer` text,
	`guest_offer` text,
	`host_accepted` integer DEFAULT 0 NOT NULL,
	`guest_accepted` integer DEFAULT 0 NOT NULL,
	`offer_revision` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`change_token` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guest_id`) REFERENCES `players`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trades_host_status` ON `trades` (`host_id`,`status`);--> statement-breakpoint
CREATE INDEX `trades_guest_status` ON `trades` (`guest_id`,`status`);
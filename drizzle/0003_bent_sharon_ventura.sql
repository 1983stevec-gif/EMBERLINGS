ALTER TABLE `players` ADD `pet_rarity` text DEFAULT 'Common' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `pet_secret` integer DEFAULT 0 NOT NULL;
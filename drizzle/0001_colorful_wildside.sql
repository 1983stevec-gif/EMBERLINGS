CREATE INDEX `friendship_high` ON `friendships` (`high_id`);--> statement-breakpoint
CREATE INDEX `matches_host_status` ON `matches` (`host_id`,`status`);--> statement-breakpoint
CREATE INDEX `matches_guest_status` ON `matches` (`guest_id`,`status`);--> statement-breakpoint
CREATE INDEX `friend_requests_incoming` ON `friend_requests` (`to_id`,`status`);
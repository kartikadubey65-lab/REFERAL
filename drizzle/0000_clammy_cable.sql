CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_code_unique` ON `members` (`code`);--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrer` text NOT NULL,
	`referee` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	FOREIGN KEY (`referrer`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`referee`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referrals_referee_unique` ON `referrals` (`referee`);--> statement-breakpoint
CREATE INDEX `idx_referrals_referrer` ON `referrals` (`referrer`);--> statement-breakpoint
CREATE INDEX `idx_referrals_status` ON `referrals` (`status`);--> statement-breakpoint
CREATE TABLE `vouchers` (
	`code` text PRIMARY KEY NOT NULL,
	`member` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	`redeemed_at` text,
	`booking` text,
	FOREIGN KEY (`member`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_vouchers_member` ON `vouchers` (`member`);
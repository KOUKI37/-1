CREATE TABLE `exercise_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `set_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_entry_id` integer NOT NULL,
	`weight` real NOT NULL,
	`reps` integer NOT NULL,
	`set_number` integer NOT NULL,
	FOREIGN KEY (`exercise_entry_id`) REFERENCES `exercise_entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workout` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`memo` text
);

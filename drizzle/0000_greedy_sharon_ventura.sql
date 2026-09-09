CREATE TABLE "check_in_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid,
	"raw_token" text NOT NULL,
	"result" text NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_scanned_at" timestamp with time zone,
	"staff_label" text,
	"device_info" text,
	"synced_offline" boolean DEFAULT false NOT NULL,
	CONSTRAINT "check_in_logs_result_valid" CHECK ("check_in_logs"."result" in ('ok', 'already_used', 'not_found', 'cancelled', 'wrong_event'))
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"venue_name" text NOT NULL,
	"venue_address" text,
	"venue_map_url" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"registration_opens_at" timestamp with time zone DEFAULT now() NOT NULL,
	"registration_closes_at" timestamp with time zone NOT NULL,
	"capacity" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"contact_whatsapp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_status_valid" CHECK ("events"."status" in ('draft', 'published', 'closed', 'archived')),
	CONSTRAINT "events_capacity_positive" CHECK ("events"."capacity" is null or "events"."capacity" > 0),
	CONSTRAINT "events_time_order" CHECK ("events"."ends_at" > "events"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"token" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"notes" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_in_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text,
	"sheet_row" integer,
	"sheet_synced_at" timestamp with time zone,
	CONSTRAINT "registrations_token_unique" UNIQUE("token"),
	CONSTRAINT "registrations_status_valid" CHECK ("registrations"."status" in ('confirmed', 'waitlist', 'cancelled')),
	CONSTRAINT "registrations_name_length" CHECK (char_length("registrations"."full_name") between 3 and 80),
	CONSTRAINT "registrations_phone_format" CHECK ("registrations"."phone" ~ '^62[0-9]{8,13}$'),
	CONSTRAINT "registrations_notes_length" CHECK ("registrations"."notes" is null or char_length("registrations"."notes") <= 300)
);
--> statement-breakpoint
ALTER TABLE "check_in_logs" ADD CONSTRAINT "check_in_logs_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_in_logs_reg_idx" ON "check_in_logs" USING btree ("registration_id","scanned_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "check_in_logs_time_idx" ON "check_in_logs" USING btree ("scanned_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_event_phone_uniq" ON "registrations" USING btree ("event_id","phone") WHERE "registrations"."status" <> 'cancelled';--> statement-breakpoint
CREATE INDEX "registrations_event_idx" ON "registrations" USING btree ("event_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "registrations_status_idx" ON "registrations" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "registrations_unsynced_idx" ON "registrations" USING btree ("sheet_synced_at") WHERE "registrations"."sheet_synced_at" is null;
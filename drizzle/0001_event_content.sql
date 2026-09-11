ALTER TABLE "events" ADD COLUMN "details" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "rundown" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_details_array" CHECK (jsonb_typeof("events"."details") = 'array');--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_rundown_array" CHECK (jsonb_typeof("events"."rundown") = 'array');
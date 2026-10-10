CREATE TABLE "api_key" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prefix" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);

CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_topic_unique" UNIQUE("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_user_topic_unique" UNIQUE("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "path_topics" (
	"path_slug" text NOT NULL,
	"topic_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "path_topics_path_slug_topic_id_pk" PRIMARY KEY("path_slug","topic_id")
);
--> statement-breakpoint
CREATE TABLE "paths" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"audience" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"difficulty" text NOT NULL,
	"icon" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "read_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "read_progress_user_topic_unique" UNIQUE("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" text NOT NULL,
	"lang" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"question" text NOT NULL,
	"answer" jsonb NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb,
	"scripture" jsonb DEFAULT '[]'::jsonb,
	"catechism" jsonb DEFAULT '[]'::jsonb,
	"church_fathers" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" text NOT NULL,
	"related_topics" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp with time zone NOT NULL,
	"last_reviewed" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_id_lang_pk" PRIMARY KEY("id","lang")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"font_size" text DEFAULT 'medium' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "view_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic_id" text NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "view_history_user_topic_unique" UNIQUE("user_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "path_topics" ADD CONSTRAINT "path_topics_path_slug_paths_slug_fk" FOREIGN KEY ("path_slug") REFERENCES "public"."paths"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorites_user_id_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_user_id_idx" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "path_topics_slug_pos_idx" ON "path_topics" USING btree ("path_slug","position");--> statement-breakpoint
CREATE INDEX "read_progress_user_id_idx" ON "read_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "topics_category_idx" ON "topics" USING btree ("category");--> statement-breakpoint
CREATE INDEX "topics_lang_idx" ON "topics" USING btree ("lang");--> statement-breakpoint
CREATE INDEX "topics_difficulty_idx" ON "topics" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "view_history_user_viewed_at_idx" ON "view_history" USING btree ("user_id","viewed_at");
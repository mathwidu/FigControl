CREATE TYPE "SectionKind" AS ENUM ('TEAM', 'ALBUM_EXTRA', 'COCA_COLA');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "collections" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "base_sticker_count" INTEGER NOT NULL,
  "tracked_sticker_count" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sticker_sections" (
  "id" TEXT NOT NULL,
  "collection_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "SectionKind" NOT NULL,
  "order" INTEGER NOT NULL,
  CONSTRAINT "sticker_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stickers" (
  "id" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "local_number" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "is_base_album" BOOLEAN NOT NULL,
  "special" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL,
  CONSTRAINT "stickers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_sticker_quantities" (
  "user_id" TEXT NOT NULL,
  "sticker_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_sticker_quantities_pkey" PRIMARY KEY ("user_id", "sticker_id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");
CREATE UNIQUE INDEX "sticker_sections_collection_id_slug_key" ON "sticker_sections"("collection_id", "slug");
CREATE INDEX "sticker_sections_collection_id_idx" ON "sticker_sections"("collection_id");
CREATE UNIQUE INDEX "stickers_code_key" ON "stickers"("code");
CREATE INDEX "stickers_section_id_idx" ON "stickers"("section_id");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sticker_sections"
  ADD CONSTRAINT "sticker_sections_collection_id_fkey"
  FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stickers"
  ADD CONSTRAINT "stickers_section_id_fkey"
  FOREIGN KEY ("section_id") REFERENCES "sticker_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_sticker_quantities"
  ADD CONSTRAINT "user_sticker_quantities_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_sticker_quantities"
  ADD CONSTRAINT "user_sticker_quantities_sticker_id_fkey"
  FOREIGN KEY ("sticker_id") REFERENCES "stickers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

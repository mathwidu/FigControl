-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" TEXT NOT NULL,
    "nickname" TEXT,
    "nickname_normalized" TEXT,
    "city_name" TEXT,
    "state_code" TEXT,
    "exchange_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "leaderboard_joined_at" TIMESTAMP(3),
    "profile_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_collection_stats" (
    "user_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "tracked_have" INTEGER NOT NULL DEFAULT 0,
    "tracked_missing" INTEGER NOT NULL DEFAULT 0,
    "base_have" INTEGER NOT NULL DEFAULT 0,
    "base_missing" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "last_progress_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_collection_stats_pkey" PRIMARY KEY ("user_id","collection_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_nickname_normalized_key" ON "user_profiles"("nickname_normalized");

-- CreateIndex
CREATE INDEX "user_profiles_leaderboard_joined_at_idx" ON "user_profiles"("leaderboard_joined_at");

-- CreateIndex
CREATE INDEX "user_profiles_state_code_city_name_idx" ON "user_profiles"("state_code", "city_name");

-- CreateIndex
CREATE INDEX "user_collection_stats_collection_id_tracked_have_tracked_missing_idx" ON "user_collection_stats"("collection_id", "tracked_have", "tracked_missing");

-- CreateIndex
CREATE INDEX "user_collection_stats_last_progress_at_idx" ON "user_collection_stats"("last_progress_at");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_collection_stats" ADD CONSTRAINT "user_collection_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_collection_stats" ADD CONSTRAINT "user_collection_stats_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

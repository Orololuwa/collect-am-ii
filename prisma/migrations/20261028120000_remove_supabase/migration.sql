-- Auth moved from Supabase to Auth0 + app-managed cookie sessions. Users are
-- identified by their verified email, so the Supabase user id is no longer
-- needed, and the Supabase mock-session table used by E2E tests is obsolete.

-- DropIndex
DROP INDEX IF EXISTS "UserAccount_supabaseUserId_key";

-- AlterTable
ALTER TABLE "UserAccount" DROP COLUMN IF EXISTS "supabaseUserId";

-- DropTable
DROP TABLE IF EXISTS "MockAccessTokenSession";

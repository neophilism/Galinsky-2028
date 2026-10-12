-- Better Auth 1.7.7 core + username/admin schema, scoped to public-page previews.
-- Separate from g28 account/session/grant tables. No volunteer or treasury grants.
CREATE TABLE IF NOT EXISTS public.g28_review_user (
 "id" text PRIMARY KEY,"name" text NOT NULL,"email" text NOT NULL UNIQUE,
 "emailVerified" boolean NOT NULL,"image" text,"createdAt" timestamptz NOT NULL,
 "updatedAt" timestamptz NOT NULL,"username" text UNIQUE,"role" text,
 "banned" boolean,"banReason" text,"banExpires" timestamptz,"previewExpiresAt" timestamptz,
 CONSTRAINT g28_review_role CHECK ("role" IN ('admin','user'))
);
CREATE TABLE IF NOT EXISTS public.g28_review_session (
 "id" text PRIMARY KEY,"expiresAt" timestamptz NOT NULL,"token" text NOT NULL UNIQUE,
 "createdAt" timestamptz NOT NULL,"updatedAt" timestamptz NOT NULL,
 "ipAddress" text,"userAgent" text,"userId" text NOT NULL REFERENCES public.g28_review_user("id") ON DELETE CASCADE,"impersonatedBy" text
);
CREATE TABLE IF NOT EXISTS public.g28_review_account (
 "id" text PRIMARY KEY,"accountId" text NOT NULL,"providerId" text NOT NULL,
 "userId" text NOT NULL REFERENCES public.g28_review_user("id") ON DELETE CASCADE,
 "accessToken" text,"refreshToken" text,"idToken" text,
 "accessTokenExpiresAt" timestamptz,"refreshTokenExpiresAt" timestamptz,
 "scope" text,"password" text,"createdAt" timestamptz NOT NULL,"updatedAt" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.g28_review_verification (
 "id" text PRIMARY KEY,"identifier" text NOT NULL,"value" text NOT NULL,
 "expiresAt" timestamptz NOT NULL,"createdAt" timestamptz NOT NULL,"updatedAt" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.g28_review_rate_limit (
 "id" text PRIMARY KEY,"key" text NOT NULL UNIQUE,"count" integer NOT NULL,"lastRequest" bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS public.g28_review_setup (
 id integer PRIMARY KEY CHECK(id=1),state text NOT NULL CHECK(state IN ('unclaimed','claiming','claimed')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.g28_review_setup(id,state) VALUES(1,'unclaimed') ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.g28_review_audit (
 id uuid PRIMARY KEY,actor_id text NOT NULL,action text NOT NULL,subject_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS g28_review_session_user_idx ON public.g28_review_session("userId");
CREATE INDEX IF NOT EXISTS g28_review_account_user_idx ON public.g28_review_account("userId");
CREATE INDEX IF NOT EXISTS g28_review_verification_identifier_idx ON public.g28_review_verification("identifier");
CREATE INDEX IF NOT EXISTS g28_review_audit_created_idx ON public.g28_review_audit(created_at);
INSERT INTO g28.schema_migrations(version) VALUES ('011_private_review_accounts') ON CONFLICT DO NOTHING;

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: rylie_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO rylie_user;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: rylie_user
--

COMMENT ON SCHEMA public IS '';


--
-- Name: PackageType; Type: TYPE; Schema: public; Owner: rylie_user
--

CREATE TYPE public."PackageType" AS ENUM (
    'SILVER',
    'GOLD',
    'PLATINUM'
);


ALTER TYPE public."PackageType" OWNER TO rylie_user;

--
-- Name: RequestPriority; Type: TYPE; Schema: public; Owner: rylie_user
--

CREATE TYPE public."RequestPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE public."RequestPriority" OWNER TO rylie_user;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: rylie_user
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."RequestStatus" OWNER TO rylie_user;

--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: rylie_user
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."TaskStatus" OWNER TO rylie_user;

--
-- Name: TaskType; Type: TYPE; Schema: public; Owner: rylie_user
--

CREATE TYPE public."TaskType" AS ENUM (
    'PAGE',
    'BLOG',
    'GBP_POST',
    'IMPROVEMENT'
);


ALTER TYPE public."TaskType" OWNER TO rylie_user;

--
-- Name: UserDealershipAccessLevel; Type: TYPE; Schema: public; Owner: rylie_user
--

CREATE TYPE public."UserDealershipAccessLevel" AS ENUM (
    'READ',
    'WRITE',
    'ADMIN'
);


ALTER TYPE public."UserDealershipAccessLevel" OWNER TO rylie_user;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: rylie_user
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'ADMIN',
    'AGENCY_ADMIN',
    'SUPER_ADMIN',
    'DEALERSHIP_ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO rylie_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public.accounts OWNER TO rylie_user;

--
-- Name: agencies; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.agencies (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    domain text,
    "primaryColor" text DEFAULT '#3b82f6'::text NOT NULL,
    "secondaryColor" text DEFAULT '#1e40af'::text NOT NULL,
    logo text,
    plan text DEFAULT 'starter'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "maxUsers" integer DEFAULT 5 NOT NULL,
    "maxConversations" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ga4PropertyId" text,
    "ga4PropertyName" text,
    "ga4RefreshToken" text
);


ALTER TABLE public.agencies OWNER TO rylie_user;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "userEmail" text NOT NULL,
    "userId" text,
    details jsonb,
    resource text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO rylie_user;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.conversations (
    id text NOT NULL,
    title text NOT NULL,
    model text DEFAULT 'gpt-4-turbo'::text NOT NULL,
    "agencyId" text NOT NULL,
    "userId" text NOT NULL,
    "messageCount" integer DEFAULT 0 NOT NULL,
    "lastMessage" text,
    "lastMessageAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.conversations OWNER TO rylie_user;

--
-- Name: dealership_onboardings; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.dealership_onboardings (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "businessName" text NOT NULL,
    package text NOT NULL,
    "mainBrand" text NOT NULL,
    "otherBrand" text,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    "zipCode" text NOT NULL,
    "contactName" text NOT NULL,
    "contactTitle" text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "websiteUrl" text NOT NULL,
    "billingEmail" text NOT NULL,
    "siteAccessNotes" text,
    "targetVehicleModels" text[],
    "targetCities" text[],
    "targetDealers" text[],
    "submittedBy" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "seoworksResponse" jsonb,
    "submittedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.dealership_onboardings OWNER TO rylie_user;

--
-- Name: dealerships; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.dealerships (
    id text NOT NULL,
    name text NOT NULL,
    "agencyId" text NOT NULL,
    website text,
    address text,
    phone text,
    "activePackageType" public."PackageType",
    "currentBillingPeriodStart" timestamp(3) without time zone,
    "currentBillingPeriodEnd" timestamp(3) without time zone,
    "pagesUsedThisPeriod" integer DEFAULT 0 NOT NULL,
    "blogsUsedThisPeriod" integer DEFAULT 0 NOT NULL,
    "gbpPostsUsedThisPeriod" integer DEFAULT 0 NOT NULL,
    "improvementsUsedThisPeriod" integer DEFAULT 0 NOT NULL,
    settings jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "clientId" text,
    "ga4PropertyId" text,
    "searchConsoleSiteUrl" text
);


ALTER TABLE public.dealerships OWNER TO rylie_user;

--
-- Name: escalations; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.escalations (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "userId" text NOT NULL,
    "userEmail" text NOT NULL,
    "conversationId" text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    category text,
    "chatContext" jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    "assignedTo" text,
    "assignedAt" timestamp(3) without time zone,
    resolution text,
    "resolvedBy" text,
    "resolvedAt" timestamp(3) without time zone,
    "internalNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.escalations OWNER TO rylie_user;

--
-- Name: feature_flag_overrides; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.feature_flag_overrides (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "flagKey" text NOT NULL,
    enabled boolean NOT NULL,
    "rolloutPercentage" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.feature_flag_overrides OWNER TO rylie_user;

--
-- Name: ga4_connections; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.ga4_connections (
    id text NOT NULL,
    "userId" text NOT NULL,
    "dealershipId" text,
    "accessToken" text NOT NULL,
    "refreshToken" text,
    "expiresAt" timestamp(3) without time zone,
    "propertyId" text,
    "propertyName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    email text
);


ALTER TABLE public.ga4_connections OWNER TO rylie_user;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.messages (
    id text NOT NULL,
    content text NOT NULL,
    role text NOT NULL,
    model text,
    "agencyId" text NOT NULL,
    "conversationId" text NOT NULL,
    "userId" text NOT NULL,
    "tokenCount" integer,
    "responseTime" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.messages OWNER TO rylie_user;

--
-- Name: monthly_usage; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.monthly_usage (
    id text NOT NULL,
    "userId" text,
    "dealershipId" text,
    month integer NOT NULL,
    year integer NOT NULL,
    "packageType" public."PackageType" NOT NULL,
    "pagesUsed" integer NOT NULL,
    "blogsUsed" integer NOT NULL,
    "gbpPostsUsed" integer NOT NULL,
    "improvementsUsed" integer NOT NULL,
    "archivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.monthly_usage OWNER TO rylie_user;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.orders (
    id text NOT NULL,
    "agencyId" text,
    "userEmail" text NOT NULL,
    "taskType" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "assignedTo" text,
    "estimatedHours" double precision,
    "actualHours" double precision,
    deliverables jsonb,
    "completionNotes" text,
    "qualityScore" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "seoworksTaskId" text
);


ALTER TABLE public.orders OWNER TO rylie_user;

--
-- Name: orphaned_tasks; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.orphaned_tasks (
    id text NOT NULL,
    "clientId" text,
    "clientEmail" text,
    "taskType" text NOT NULL,
    "externalId" text NOT NULL,
    status text NOT NULL,
    "completionDate" timestamp(3) without time zone,
    deliverables jsonb DEFAULT '[]'::jsonb,
    "rawPayload" jsonb NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "eventType" text,
    "linkedRequestId" text,
    notes text
);


ALTER TABLE public.orphaned_tasks OWNER TO rylie_user;

--
-- Name: report_schedules; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.report_schedules (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "cronPattern" text NOT NULL,
    "ga4PropertyId" text NOT NULL,
    "userId" text NOT NULL,
    "reportType" text NOT NULL,
    "emailRecipients" text[],
    "brandingOptionsJson" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastRun" timestamp(3) without time zone,
    "nextRun" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.report_schedules OWNER TO rylie_user;

--
-- Name: requests; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.requests (
    id text NOT NULL,
    "userId" text NOT NULL,
    "agencyId" text,
    title text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    priority public."RequestPriority" DEFAULT 'MEDIUM'::public."RequestPriority" NOT NULL,
    status public."RequestStatus" DEFAULT 'PENDING'::public."RequestStatus" NOT NULL,
    "packageType" public."PackageType",
    "pagesCompleted" integer DEFAULT 0 NOT NULL,
    "blogsCompleted" integer DEFAULT 0 NOT NULL,
    "gbpPostsCompleted" integer DEFAULT 0 NOT NULL,
    "improvementsCompleted" integer DEFAULT 0 NOT NULL,
    keywords jsonb,
    "targetUrl" text,
    "targetCities" jsonb,
    "targetModels" jsonb,
    "completedTasks" jsonb,
    "contentUrl" text,
    "pageTitle" text,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dealershipId" text,
    "seoworksTaskId" text
);


ALTER TABLE public.requests OWNER TO rylie_user;

--
-- Name: search_console_connections; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.search_console_connections (
    id text NOT NULL,
    "userId" text NOT NULL,
    "dealershipId" text,
    "accessToken" text NOT NULL,
    "refreshToken" text,
    "expiresAt" timestamp(3) without time zone,
    "siteUrl" text,
    "siteName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    email text
);


ALTER TABLE public.search_console_connections OWNER TO rylie_user;

--
-- Name: seoworks_task_mappings; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.seoworks_task_mappings (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "seoworksTaskId" text NOT NULL,
    "taskType" text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.seoworks_task_mappings OWNER TO rylie_user;

--
-- Name: seoworks_tasks; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.seoworks_tasks (
    id text NOT NULL,
    "externalId" text NOT NULL,
    "taskType" text NOT NULL,
    status text NOT NULL,
    "completionDate" timestamp(3) without time zone,
    "postTitle" text NOT NULL,
    "postUrl" text,
    "completionNotes" text,
    "isWeekly" boolean DEFAULT false NOT NULL,
    payload jsonb,
    "orderId" text,
    "agencyId" text,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(3) without time zone
);


ALTER TABLE public.seoworks_tasks OWNER TO rylie_user;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO rylie_user;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.system_settings (
    id text DEFAULT 'default'::text NOT NULL,
    "maintenanceMode" boolean DEFAULT false NOT NULL,
    "newUserRegistration" boolean DEFAULT true NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "auditLogging" boolean DEFAULT true NOT NULL,
    "maxUsersPerAgency" integer DEFAULT 50 NOT NULL,
    "maxRequestsPerUser" integer DEFAULT 1000 NOT NULL,
    "maxFileUploadSize" integer DEFAULT 10 NOT NULL,
    "smtpHost" text DEFAULT ''::text NOT NULL,
    "smtpPort" integer DEFAULT 587 NOT NULL,
    "smtpUser" text DEFAULT ''::text NOT NULL,
    "smtpFromEmail" text DEFAULT ''::text NOT NULL,
    "maintenanceMessage" text DEFAULT 'The system is currently under maintenance. Please try again later.'::text NOT NULL,
    "welcomeMessage" text DEFAULT 'Welcome to our SEO management platform! Get started by exploring your dashboard.'::text NOT NULL,
    "rateLimitPerMinute" integer DEFAULT 60 NOT NULL,
    "sessionTimeoutMinutes" integer DEFAULT 480 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.system_settings OWNER TO rylie_user;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.tasks (
    id text NOT NULL,
    "userId" text NOT NULL,
    "dealershipId" text,
    "agencyId" text,
    type public."TaskType" NOT NULL,
    status public."TaskStatus" DEFAULT 'PENDING'::public."TaskStatus" NOT NULL,
    title text NOT NULL,
    description text,
    priority public."RequestPriority" DEFAULT 'MEDIUM'::public."RequestPriority" NOT NULL,
    "targetUrl" text,
    keywords jsonb,
    "requestId" text,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tasks OWNER TO rylie_user;

--
-- Name: themes; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.themes (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "companyName" text NOT NULL,
    "primaryColor" text NOT NULL,
    "secondaryColor" text NOT NULL,
    logo text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.themes OWNER TO rylie_user;

--
-- Name: usage_metrics; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.usage_metrics (
    id text NOT NULL,
    "agencyId" text NOT NULL,
    "metricType" text NOT NULL,
    value integer NOT NULL,
    model text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    period text DEFAULT 'daily'::text NOT NULL
);


ALTER TABLE public.usage_metrics OWNER TO rylie_user;

--
-- Name: user_dealership_access; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.user_dealership_access (
    id text NOT NULL,
    "userId" text NOT NULL,
    "dealershipId" text NOT NULL,
    "accessLevel" public."UserDealershipAccessLevel" DEFAULT 'READ'::public."UserDealershipAccessLevel" NOT NULL,
    "grantedBy" text,
    "grantedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_dealership_access OWNER TO rylie_user;

--
-- Name: user_ga4_tokens; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.user_ga4_tokens (
    id text NOT NULL,
    "userId" text NOT NULL,
    "encryptedAccessToken" text NOT NULL,
    "encryptedRefreshToken" text,
    "expiryDate" timestamp(3) without time zone,
    scope text,
    "tokenType" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_ga4_tokens OWNER TO rylie_user;

--
-- Name: user_invites; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.user_invites (
    id text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    "isSuperAdmin" boolean DEFAULT false NOT NULL,
    "agencyId" text,
    "invitedBy" text NOT NULL,
    token text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "acceptedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_invites OWNER TO rylie_user;

--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.user_preferences (
    id text NOT NULL,
    "userId" text NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "requestCreated" boolean DEFAULT true NOT NULL,
    "statusChanged" boolean DEFAULT true NOT NULL,
    "taskCompleted" boolean DEFAULT true NOT NULL,
    "weeklySummary" boolean DEFAULT true NOT NULL,
    "marketingEmails" boolean DEFAULT false NOT NULL,
    timezone text DEFAULT 'America/New_York'::text,
    language text DEFAULT 'en'::text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_preferences OWNER TO rylie_user;

--
-- Name: user_search_console_tokens; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.user_search_console_tokens (
    id text NOT NULL,
    "userId" text NOT NULL,
    "encryptedAccessToken" text NOT NULL,
    "encryptedRefreshToken" text,
    "expiryDate" timestamp(3) without time zone,
    scope text,
    "verifiedSites" text[],
    "primarySite" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_search_console_tokens OWNER TO rylie_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text,
    email text NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "agencyId" text,
    "dealershipId" text,
    "currentDealershipId" text,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    theme text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isSuperAdmin" boolean DEFAULT false NOT NULL,
    "onboardingCompleted" boolean DEFAULT false NOT NULL,
    "invitationToken" text,
    "invitationTokenExpires" timestamp(3) without time zone,
    "apiKey" text,
    "apiKeyCreatedAt" timestamp(3) without time zone,
    password text
);


ALTER TABLE public.users OWNER TO rylie_user;

--
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: rylie_user
--

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.verification_tokens OWNER TO rylie_user;

--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.accounts (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: agencies; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.agencies (id, name, slug, domain, "primaryColor", "secondaryColor", logo, plan, status, "maxUsers", "maxConversations", "createdAt", "updatedAt", "ga4PropertyId", "ga4PropertyName", "ga4RefreshToken") FROM stdin;
agency-seoworks	SEOWORKS	seoworks	\N	#3b82f6	#1e40af	\N	starter	active	5	100	2025-08-19 04:36:06.567	2025-08-19 04:36:06.566	\N	\N	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.audit_logs (id, action, "entityType", "entityId", "userEmail", "userId", details, resource, "createdAt") FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.conversations (id, title, model, "agencyId", "userId", "messageCount", "lastMessage", "lastMessageAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: dealership_onboardings; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.dealership_onboardings (id, "agencyId", "businessName", package, "mainBrand", "otherBrand", address, city, state, "zipCode", "contactName", "contactTitle", email, phone, "websiteUrl", "billingEmail", "siteAccessNotes", "targetVehicleModels", "targetCities", "targetDealers", "submittedBy", status, "seoworksResponse", "submittedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: dealerships; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.dealerships (id, name, "agencyId", website, address, phone, "activePackageType", "currentBillingPeriodStart", "currentBillingPeriodEnd", "pagesUsedThisPeriod", "blogsUsedThisPeriod", "gbpPostsUsedThisPeriod", "improvementsUsedThisPeriod", settings, "createdAt", "updatedAt", "clientId", "ga4PropertyId", "searchConsoleSiteUrl") FROM stdin;
dealer-brown-motors	Brown Motors	agency-seoworks	https://brownmotors.com	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@brownmotors.com"}	2025-08-19 21:16:36.686	2025-08-19 21:16:36.686	dealer-brown-motors	\N	\N
dealer-aeo-powersports	AEO Powersports	agency-seoworks	https://aeopowersports.com/	\N	\N	PLATINUM	\N	\N	0	0	0	0	{"clientEmail": "manager@aeopowersports.com"}	2025-08-19 04:36:15.259	2025-08-19 04:36:35.022	user_aeopowersports_aeopowersports_2024	\N	\N
dealer-columbus-auto-group	Columbus Auto Group	agency-seoworks	https://columbusautogroup.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@columbusautogroup.com"}	2025-08-19 04:36:15.622	2025-08-19 04:36:35.253	user_columbusautogroup_columbusautogroup_2024	\N	\N
dealer-genesis-wichita	Genesis of Wichita	agency-seoworks	https://www.genesisofwichita.com/	\N	\N	PLATINUM	\N	\N	0	0	0	0	{"clientEmail": "manager@genesisofwichita.com", "ga4PropertyId": "323502411"}	2025-08-19 04:36:11.737	2025-08-19 04:36:33.123	user_genesisofwichita_www_2024	\N	\N
dealer-hatchett-hyundai-east	Hatchett Hyundai East	agency-seoworks	https://www.hatchetthyundaieast.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@hatchetthyundaieast.com", "ga4PropertyId": "323448557"}	2025-08-19 04:36:13.021	2025-08-19 04:36:33.826	user_hatchetthyundaieast_www_2024	\N	\N
dealer-hatchett-hyundai-west	Hatchett Hyundai West	agency-seoworks	https://www.hatchetthyundaiwest.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@hatchetthyundaiwest.com", "ga4PropertyId": "323465145"}	2025-08-19 04:36:13.45	2025-08-19 04:36:34.131	user_hatchetthyundaiwest_www_2024	\N	\N
dealer-jhc-columbus	Jay Hatfield Chevrolet of Columbus	agency-seoworks	https://www.jayhatfieldchevy.net/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldchevy.net", "ga4PropertyId": "323480238"}	2025-08-19 04:36:06.718	2025-08-19 04:36:30.09	user_jayhatfieldchevroletofcolumbus_www_2024	\N	\N
dealer-jhc-chanute	Jay Hatfield Chevrolet GMC of Chanute	agency-seoworks	https://www.jayhatfieldchanute.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldchanute.com", "ga4PropertyId": "323404832"}	2025-08-19 04:36:07.238	2025-08-19 04:36:30.463	user_jayhatfieldchevroletgmcofchanute_www_2024	\N	\N
dealer-jhc-pittsburg	Jay Hatfield Chevrolet GMC of Pittsburg	agency-seoworks	https://www.jayhatfieldchevroletgmc.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldchevroletgmc.com", "ga4PropertyId": "371672738"}	2025-08-19 04:36:07.695	2025-08-19 04:36:30.682	user_jayhatfieldchevroletgmcofpittsburg_www_2024	\N	\N
dealer-jhc-vinita	Jay Hatfield Chevrolet of Vinita	agency-seoworks	https://www.jayhatfieldchevroletvinita.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldchevroletvinita.com", "ga4PropertyId": "320759942"}	2025-08-19 04:36:08.135	2025-08-19 04:36:30.986	user_jayhatfieldchevroletofvinita_www_2024	\N	\N
dealer-jhdjr-frontenac	Jay Hatfield CDJR of Frontenac	agency-seoworks	https://www.jayhatfieldchryslerdodgejeepram.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldchryslerdodgejeepram.com", "ga4PropertyId": "323415736"}	2025-08-19 04:36:08.588	2025-08-19 04:36:31.212	user_jayhatfieldcdjroffrontenac_www_2024	\N	\N
dealer-jhhp-wichita	Jay Hatfield Honda Powerhouse	agency-seoworks	https://www.jayhatfieldhondawichita.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldhondawichita.com", "ga4PropertyId": "336729443"}	2025-08-19 04:36:09.49	2025-08-19 04:36:31.732	user_jayhatfieldhonda_www_2024	\N	\N
dealer-jhm-frontenac	Jay Hatfield Motorsports of Frontenac	agency-seoworks	https://www.jayhatfieldkawasaki.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldkawasaki.com", "ga4PropertyId": "317608467"}	2025-08-19 04:36:10.306	2025-08-19 04:36:32.255	user_jayhatfieldmotorsoffrontenac_www_2024	\N	\N
dealer-jhm-joplin	Jay Hatfield Motorsports of Joplin	agency-seoworks	https://www.jhmofjoplin.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jhmofjoplin.com", "ga4PropertyId": "317578343"}	2025-08-19 04:36:10.762	2025-08-19 04:36:32.559	user_jayhatfieldmotorsofjoplin_www_2024	\N	\N
dealer-jhm-ottawa	Jay Hatfield Motorsports Ottawa	agency-seoworks	https://www.jayhatfieldottawa.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldottawa.com", "ga4PropertyId": "472110523"}	2025-08-19 04:36:12.636	2025-08-19 04:36:33.606	user_jayhatfieldmotorsottawa_www_2024	\N	\N
dealer-jhm-wichita	Jay Hatfield Motorsports of Wichita	agency-seoworks	https://www.kansasmotorsports.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@kansasmotorsports.com", "ga4PropertyId": "317592148", "ga4MeasurementId": "G-DBMQEB1TM0"}	2025-08-19 04:36:09.858	2025-08-19 04:36:32.035	user_jayhatfieldmotorsofwichita_www_2024	\N	\N
dealer-jhm-portal	Jay Hatfield Motorsports Portal	agency-seoworks	http://jayhatfieldmotorsports.com/	\N	\N	PLATINUM	\N	\N	0	0	0	0	{"clientEmail": "manager@jayhatfieldmotorsports.com", "ga4PropertyId": "461644624"}	2025-08-19 04:36:12.185	2025-08-19 04:36:33.34	user_jayhatfieldmotorsportal_jayhatfieldmotorsports_2024	\N	\N
dealer-premier-auto-tucson	Premier Auto Center - Tucson	agency-seoworks	https://scottsaysyes.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@scottsaysyes.com", "ga4PropertyId": "470694371"}	2025-08-19 04:36:14.358	2025-08-19 04:36:34.655	user_premierautocentertucson_scottsaysyes_2024	\N	\N
dealer-premier-mitsubishi	Premier Mitsubishi	agency-seoworks	https://premiermitsubishi.com/	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@premiermitsubishi.com", "ga4PropertyId": "473660351"}	2025-08-19 04:36:13.933	2025-08-19 04:36:34.348	user_premiermitsubishi_premiermitsubishi_2024	\N	\N
dealer-sarcoxie-ford	Sarcoxie Ford	agency-seoworks	https://www.sarcoxieford.com	\N	\N	SILVER	\N	\N	0	0	0	0	{"clientEmail": "manager@sarcoxieford.com", "ga4PropertyId": "452793966"}	2025-08-19 04:36:09.044	2025-08-19 04:36:31.511	user_sarcoxieford_www_2024	\N	\N
dealer-winnebago-rockford	Winnebago of Rockford	agency-seoworks	https://www.winnebagomotorhomes.com/	\N	\N	PLATINUM	\N	\N	0	0	0	0	{"clientEmail": "manager@winnebagomotorhomes.com"}	2025-08-19 04:36:16.088	2025-08-19 04:36:35.401	user_winnebagoofrockford_www_2024	\N	\N
dealer-world-kia	World Kia	agency-seoworks	https://www.worldkiajoliet.com/	\N	\N	PLATINUM	\N	\N	0	0	0	0	{"clientEmail": "manager@worldkiajoliet.com"}	2025-08-19 04:36:14.807	2025-08-19 04:36:34.877	user_worldkia_www_2024	\N	\N
dealer-acura-columbus	Acura of Columbus	agency-seoworks	https://www.acuracolumbus.com/	\N	\N	SILVER	\N	\N	0	0	1	0	{"clientEmail": "manager@acuracolumbus.com", "ga4PropertyId": "284944578"}	2025-08-19 04:36:11.328	2025-08-19 04:36:32.778	user_acuraofcolumbus_www_2024	\N	\N
\.


--
-- Data for Name: escalations; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.escalations (id, "agencyId", "userId", "userEmail", "conversationId", subject, description, priority, category, "chatContext", status, "assignedTo", "assignedAt", resolution, "resolvedBy", "resolvedAt", "internalNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: feature_flag_overrides; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.feature_flag_overrides (id, "agencyId", "flagKey", enabled, "rolloutPercentage", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ga4_connections; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.ga4_connections (id, "userId", "dealershipId", "accessToken", "refreshToken", "expiresAt", "propertyId", "propertyName", "createdAt", "updatedAt", email) FROM stdin;
cmej7ybkr0005m93dyw7uy04c	e059f9dc-c013-4997-b14a-07ee528953b0	dealer-acura-columbus	3057607574a24613f352121e95a80b05:17235a73a466a007b00a49c529ec53d6:e5494573683345c6798979cf4e7c7fcc469ba368aa2787dce95e20494fe38f8a6fba6b9fd30a0c934d004e21d92b5207130ffee02a97cf1057a9eeb54f06045d97adc0aac874ae30c6f59871de70cc70bb97c0d6123c9d1cba9e2039fc87035615bdd78b3a3981af5c8b83010a40b4b4b1eacb284c5b19b7b6a7b9f05fec555a1d2777a88c1e9ea3a34208fa2d735d70e281f65cdae8c819c28731089340523e7d31009651b9d02b614c60b1e6bb86820a8824303ae073b9c0639c5bb6d11c7f68b3ca1ec3d243c62331cf47dfce7028644821fd3a9078d9a0c817a9105d5490658d0a8d729529efe2c637cd81a641af6843e0e9896b19d6643a0723dd	956c74b1bba8cce70bcaa252ae3f98e3:358ceace6f2c49e6669f0ef08e42eb45:a1512b6a11dacd29f45a12e9086860e9aae08e3cc20512fe04a8f1bdf7f8c3882f2589f963a75ada94d6445609ae6d43e87d64777a3ca47839f2c8719142060c64b0be36f994157a69d06210dc08052b396037ed26b05f5b90cade3e53bcfbea8554542a874a5b	2025-08-20 02:12:33.59	284944578	AcuraColumbus.com - GA4	2025-08-20 00:12:58.779	2025-08-20 00:12:58.778	josh.copp@onekeel.ai
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.messages (id, content, role, model, "agencyId", "conversationId", "userId", "tokenCount", "responseTime", "createdAt") FROM stdin;
\.


--
-- Data for Name: monthly_usage; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.monthly_usage (id, "userId", "dealershipId", month, year, "packageType", "pagesUsed", "blogsUsed", "gbpPostsUsed", "improvementsUsed", "archivedAt") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.orders (id, "agencyId", "userEmail", "taskType", title, description, status, "assignedTo", "estimatedHours", "actualHours", deliverables, "completionNotes", "qualityScore", "createdAt", "updatedAt", "completedAt", "seoworksTaskId") FROM stdin;
\.


--
-- Data for Name: orphaned_tasks; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.orphaned_tasks (id, "clientId", "clientEmail", "taskType", "externalId", status, "completionDate", deliverables, "rawPayload", processed, "processedAt", "createdAt", "updatedAt", "eventType", "linkedRequestId", notes) FROM stdin;
\.


--
-- Data for Name: report_schedules; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.report_schedules (id, "agencyId", "cronPattern", "ga4PropertyId", "userId", "reportType", "emailRecipients", "brandingOptionsJson", "isActive", "lastRun", "nextRun", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.requests (id, "userId", "agencyId", title, description, type, priority, status, "packageType", "pagesCompleted", "blogsCompleted", "gbpPostsCompleted", "improvementsCompleted", keywords, "targetUrl", "targetCities", "targetModels", "completedTasks", "contentUrl", "pageTitle", "completedAt", "createdAt", "updatedAt", "dealershipId", "seoworksTaskId") FROM stdin;
req_test_task_acura_67890	test-user-acura	agency-seoworks	Acura New Inventory - Columbus Location	Task created directly in SEOWorks\n\nTask ID: test_task_acura_67890\nCompleted: 2025-08-19T22:02:00.000Z	page	MEDIUM	COMPLETED	\N	2	0	0	0	\N	\N	\N	\N	[{"url": "https://acuraofcolumbus.com/new-inventory", "type": "page", "title": "Acura New Inventory - Columbus Location"}, {"url": "https://acuraofcolumbus.com/new-inventory", "type": "PAGE", "title": "Acura New Inventory - Columbus Location", "completedAt": "2025-08-19T22:02:00.000Z"}]	\N	\N	2025-08-19 22:02:58.006	2025-08-19 22:02:57.363	2025-08-19 22:02:57.361	dealer-acura-columbus	test_task_acura_67890
test-request-acura	test-user-acura	agency-seoworks	Test Acura SEO Request	Testing webhook integration	page	MEDIUM	PENDING	SILVER	1	0	0	0	\N	\N	\N	\N	[{"url": "https://acuraofcolumbus.com/service", "type": "PAGE", "title": "Acura Service Center - Columbus", "completedAt": "2025-08-19T22:03:00.000Z"}]	\N	\N	\N	2025-08-19 22:02:48.101	2025-08-19 22:02:48.1	dealer-acura-columbus	test_task_acura_email
req_test-task-123	test-user-acura	agency-seoworks	Test Page for Acura of Columbus	Task created directly in SEOWorks\n\nTask ID: test-task-123\nCompleted: 2025-08-19T22:00:00Z	page	MEDIUM	COMPLETED	\N	2	0	0	0	\N	\N	\N	\N	[{"url": "https://example.com/test-page", "type": "page", "title": "Test Page for Acura of Columbus"}, {"url": "https://example.com/test-page", "type": "PAGE", "title": "Test Page for Acura of Columbus", "completedAt": "2025-08-19T22:00:00Z"}]	\N	\N	2025-08-19 22:29:00.465	2025-08-19 22:28:59.876	2025-08-19 22:28:59.873	dealer-acura-columbus	test-task-123
req_test-task-456	test-user-acura	agency-seoworks	Test Blog Post for Acura of Columbus	Task created directly in SEOWorks\n\nTask ID: test-task-456\nCompleted: 2025-08-19T22:30:00Z	blog	MEDIUM	COMPLETED	\N	0	2	0	0	\N	\N	\N	\N	[{"url": "https://example.com/test-blog", "type": "blog", "title": "Test Blog Post for Acura of Columbus"}, {"url": "https://example.com/test-blog", "type": "BLOG", "title": "Test Blog Post for Acura of Columbus", "completedAt": "2025-08-19T22:30:00Z"}]	\N	\N	2025-08-19 22:30:58.244	2025-08-19 22:30:57.847	2025-08-19 22:30:57.845	dealer-acura-columbus	test-task-456
req_test-task-789	test-user-acura	agency-seoworks	Test GBP Post for Acura of Columbus	Task created directly in SEOWorks\n\nTask ID: test-task-789\nCompleted: 2025-08-19T22:32:00Z	gbp_post	MEDIUM	COMPLETED	\N	0	0	2	0	\N	\N	\N	\N	[{"url": "https://example.com/test-gbp-post", "type": "gbp_post", "title": "Test GBP Post for Acura of Columbus"}, {"url": "https://example.com/test-gbp-post", "type": "GBP_POST", "title": "Test GBP Post for Acura of Columbus", "completedAt": "2025-08-19T22:32:00Z"}]	\N	\N	2025-08-19 22:31:47.926	2025-08-19 22:31:47.538	2025-08-19 22:31:47.536	dealer-acura-columbus	test-task-789
4dc35b8f-87f4-43e2-8643-88eec45c58b2	e059f9dc-c013-4997-b14a-07ee528953b0	agency-seoworks	Why the 2026 Ram 1500 Is the Ultimate Pickup Upgrade in Columbus, IN	Why the 2026 Ram 1500 Is the Ultimate Pickup Upgrade in Columbus, IN	BLOG	MEDIUM	COMPLETED	\N	0	0	0	0	\N	\N	\N	\N	\N	\N	\N	2025-08-19 20:25:00.899	2025-08-19 20:25:00.899	2025-08-20 00:40:09.085	dealer-jhc-columbus	task-b-67136
\.


--
-- Data for Name: search_console_connections; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.search_console_connections (id, "userId", "dealershipId", "accessToken", "refreshToken", "expiresAt", "siteUrl", "siteName", "createdAt", "updatedAt", email) FROM stdin;
cmej7ygly0007m93d1v3hwabl	e059f9dc-c013-4997-b14a-07ee528953b0	dealer-acura-columbus	a7b5a2bee4ca2ad6733f94e6ab6bb617:11af2ce2403ad11c7c84462f6c1382f9:02955647096f9467385cd0b29317ac458afdc033e89413a14ef82f9628f65e0aac73e47188d50f0c3f4db886937a2bbbe364d1b5609d3a2529a71b4119fb2360e85f065ed391f4409e15122d8660fd09566a02a67aef04b7e51cd6bc5f6d2bc8ec79be100986045a119644fd1f7b3ac816b85c8aedb41769b9f19a27d84655632c7a120b54d3594900ed995ed568288a1fa90cb183830239176817c04b7baeb208e00d9f343afd77942d049a33ce3690eee8fb32c436bf12a8a41bcbc2a948c9d698489173bf63fa2f1d43915aed1c1d5b92c60efc3fe1514808145229b940418cbb75bd425b605619572bde4032e6af06b81370cd426df460f420f0c7	1f3270af771d8298eea4799219195e47:85bea36d68739a04f19a1fd7f743b1d8:d7aea9f34a78da4dfebffb9927d6cf8972fd8997b9d3ab0bdae5bba71a34930d3201453b214a76c9427a815ddabe2912fe1d7b954eb167e74dde4db02e8646e324de6c00cbf7c3ee72d2eb327af5f3454467849eaaef7498647c77fd720840ce124cc366938c3b	2025-08-20 02:12:34.895	https://www.jhmofjoplin.com/	www.jhmofjoplin.com	2025-08-20 00:13:05.302	2025-08-20 01:12:35.896	josh.copp@onekeel.ai
\.


--
-- Data for Name: seoworks_task_mappings; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.seoworks_task_mappings (id, "requestId", "seoworksTaskId", "taskType", metadata, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: seoworks_tasks; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.seoworks_tasks (id, "externalId", "taskType", status, "completionDate", "postTitle", "postUrl", "completionNotes", "isWeekly", payload, "orderId", "agencyId", "receivedAt", "processedAt") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.sessions (id, "sessionToken", "userId", expires) FROM stdin;
cmej77qji0001hs5mcnp9blr0	session_1755647538461_3f1fo5oq7	e059f9dc-c013-4997-b14a-07ee528953b0	2025-09-18 23:52:18.461
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.system_settings (id, "maintenanceMode", "newUserRegistration", "emailNotifications", "auditLogging", "maxUsersPerAgency", "maxRequestsPerUser", "maxFileUploadSize", "smtpHost", "smtpPort", "smtpUser", "smtpFromEmail", "maintenanceMessage", "welcomeMessage", "rateLimitPerMinute", "sessionTimeoutMinutes", "createdAt", "updatedAt") FROM stdin;
default	f	t	t	t	50	1000	10		587			The system is currently under maintenance.Please try again later.	Welcome to our SEO management platform! Get started by exploring your dashboard.	60	480	2025-08-19 04:36:05.608	2025-08-19 04:36:05.608
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.tasks (id, "userId", "dealershipId", "agencyId", type, status, title, description, priority, "targetUrl", keywords, "requestId", "completedAt", "createdAt", "updatedAt") FROM stdin;
task_test-task-789_1755642708167	test-user-acura	dealer-acura-columbus	agency-seoworks	GBP_POST	COMPLETED	Test GBP Post for Acura of Columbus	Auto-created from SEOWorks webhook test-task-789	MEDIUM	https://example.com/test-gbp-post	\N	req_test-task-789	2025-08-19 22:32:00	2025-08-19 22:31:48.167	2025-08-19 22:31:48.167
\.


--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.themes (id, "agencyId", "companyName", "primaryColor", "secondaryColor", logo, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: usage_metrics; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.usage_metrics (id, "agencyId", "metricType", value, model, date, period) FROM stdin;
\.


--
-- Data for Name: user_dealership_access; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.user_dealership_access (id, "userId", "dealershipId", "accessLevel", "grantedBy", "grantedAt", "expiresAt", "isActive", "createdAt", "updatedAt") FROM stdin;
cmej3awp70001hsav8pdr2rji	test-user-acura	dealer-acura-columbus	ADMIN	\N	2025-08-19 22:02:47.946	\N	t	2025-08-19 22:02:47.946	2025-08-19 22:02:47.945
cmej76nse0001hswoiptqhzmk	e059f9dc-c013-4997-b14a-07ee528953b0	dealer-acura-columbus	ADMIN	e059f9dc-c013-4997-b14a-07ee528953b0	2025-08-19 23:51:28.236	\N	t	2025-08-19 23:51:28.239	2025-08-19 23:51:28.236
\.


--
-- Data for Name: user_ga4_tokens; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.user_ga4_tokens (id, "userId", "encryptedAccessToken", "encryptedRefreshToken", "expiryDate", scope, "tokenType", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_invites; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.user_invites (id, email, role, "isSuperAdmin", "agencyId", "invitedBy", token, status, "acceptedAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.user_preferences (id, "userId", "emailNotifications", "requestCreated", "statusChanged", "taskCompleted", "weeklySummary", "marketingEmails", timezone, language, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_search_console_tokens; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.user_search_console_tokens (id, "userId", "encryptedAccessToken", "encryptedRefreshToken", "expiryDate", scope, "verifiedSites", "primarySite", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.users (id, name, email, "emailVerified", image, "agencyId", "dealershipId", "currentDealershipId", role, theme, "createdAt", "updatedAt", "isSuperAdmin", "onboardingCompleted", "invitationToken", "invitationTokenExpires", "apiKey", "apiKeyCreatedAt", password) FROM stdin;
test-user-acura	Test User Acura	test@acuraofcolumbus.com	\N	\N	agency-seoworks	dealer-acura-columbus	dealer-acura-columbus	USER	\N	2025-08-19 22:02:47.788	2025-08-19 22:02:47.255	f	t	\N	\N	\N	\N	\N
e059f9dc-c013-4997-b14a-07ee528953b0	Josh Copp	josh.copp@onekeel.ai	2025-08-20 00:07:35.884	\N	agency-seoworks	dealer-acura-columbus	dealer-acura-columbus	SUPER_ADMIN	\N	2025-08-19 04:36:01.628	2025-08-19 04:36:00.834	t	t	\N	\N	\N	\N	\N
602cacbc-2cd3-41be-8dae-193facb07594	Amanda Harris	amanda@localwerks.com	\N	\N	\N	\N	\N	SUPER_ADMIN	\N	2025-08-20 00:21:44.907	2025-08-20 00:21:44.907	f	t	39f30a9c03a684dc1843b590e97ea544540af01ed07bda3e80e852ed1a987bd2	2025-08-23 00:21:44.907	\N	\N	\N
5747cf82-7aaf-4a69-b8a2-a7f1fdb620d0	Access	access@seowerks.ai	2025-08-20 00:22:25.801	\N	agency-seoworks	dealer-acura-columbus	\N	AGENCY_ADMIN	\N	2025-08-20 00:21:59.895	2025-08-20 00:21:59.895	f	t	\N	\N	\N	\N	\N
\.


--
-- Data for Name: verification_tokens; Type: TABLE DATA; Schema: public; Owner: rylie_user
--

COPY public.verification_tokens (identifier, token, expires) FROM stdin;
\.


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: agencies agencies_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.agencies
    ADD CONSTRAINT agencies_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: dealership_onboardings dealership_onboardings_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.dealership_onboardings
    ADD CONSTRAINT dealership_onboardings_pkey PRIMARY KEY (id);


--
-- Name: dealerships dealerships_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.dealerships
    ADD CONSTRAINT dealerships_pkey PRIMARY KEY (id);


--
-- Name: escalations escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT escalations_pkey PRIMARY KEY (id);


--
-- Name: feature_flag_overrides feature_flag_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.feature_flag_overrides
    ADD CONSTRAINT feature_flag_overrides_pkey PRIMARY KEY (id);


--
-- Name: ga4_connections ga4_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.ga4_connections
    ADD CONSTRAINT ga4_connections_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: monthly_usage monthly_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.monthly_usage
    ADD CONSTRAINT monthly_usage_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orphaned_tasks orphaned_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.orphaned_tasks
    ADD CONSTRAINT orphaned_tasks_pkey PRIMARY KEY (id);


--
-- Name: report_schedules report_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT report_schedules_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: search_console_connections search_console_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.search_console_connections
    ADD CONSTRAINT search_console_connections_pkey PRIMARY KEY (id);


--
-- Name: seoworks_task_mappings seoworks_task_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.seoworks_task_mappings
    ADD CONSTRAINT seoworks_task_mappings_pkey PRIMARY KEY (id);


--
-- Name: seoworks_tasks seoworks_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.seoworks_tasks
    ADD CONSTRAINT seoworks_tasks_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (id);


--
-- Name: usage_metrics usage_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.usage_metrics
    ADD CONSTRAINT usage_metrics_pkey PRIMARY KEY (id);


--
-- Name: user_dealership_access user_dealership_access_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_dealership_access
    ADD CONSTRAINT user_dealership_access_pkey PRIMARY KEY (id);


--
-- Name: user_ga4_tokens user_ga4_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_ga4_tokens
    ADD CONSTRAINT user_ga4_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_invites user_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT user_invites_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_search_console_tokens user_search_console_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_search_console_tokens
    ADD CONSTRAINT user_search_console_tokens_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accounts_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");


--
-- Name: agencies_domain_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX agencies_domain_key ON public.agencies USING btree (domain);


--
-- Name: agencies_slug_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX agencies_slug_key ON public.agencies USING btree (slug);


--
-- Name: audit_logs_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "audit_logs_entityType_entityId_idx" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: audit_logs_userEmail_createdAt_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "audit_logs_userEmail_createdAt_idx" ON public.audit_logs USING btree ("userEmail", "createdAt");


--
-- Name: conversations_agencyId_updatedAt_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "conversations_agencyId_updatedAt_idx" ON public.conversations USING btree ("agencyId", "updatedAt");


--
-- Name: conversations_agencyId_userId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "conversations_agencyId_userId_idx" ON public.conversations USING btree ("agencyId", "userId");


--
-- Name: dealership_onboardings_agencyId_createdAt_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "dealership_onboardings_agencyId_createdAt_idx" ON public.dealership_onboardings USING btree ("agencyId", "createdAt");


--
-- Name: dealership_onboardings_agencyId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "dealership_onboardings_agencyId_status_idx" ON public.dealership_onboardings USING btree ("agencyId", status);


--
-- Name: dealerships_agencyId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "dealerships_agencyId_idx" ON public.dealerships USING btree ("agencyId");


--
-- Name: dealerships_clientId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "dealerships_clientId_key" ON public.dealerships USING btree ("clientId");


--
-- Name: escalations_agencyId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "escalations_agencyId_status_idx" ON public.escalations USING btree ("agencyId", status);


--
-- Name: escalations_assignedTo_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "escalations_assignedTo_status_idx" ON public.escalations USING btree ("assignedTo", status);


--
-- Name: escalations_conversationId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "escalations_conversationId_idx" ON public.escalations USING btree ("conversationId");


--
-- Name: escalations_userId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "escalations_userId_status_idx" ON public.escalations USING btree ("userId", status);


--
-- Name: feature_flag_overrides_agencyId_flagKey_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "feature_flag_overrides_agencyId_flagKey_key" ON public.feature_flag_overrides USING btree ("agencyId", "flagKey");


--
-- Name: ga4_connections_dealershipId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "ga4_connections_dealershipId_idx" ON public.ga4_connections USING btree ("dealershipId");


--
-- Name: ga4_connections_userId_dealershipId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "ga4_connections_userId_dealershipId_key" ON public.ga4_connections USING btree ("userId", "dealershipId");


--
-- Name: ga4_connections_userId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "ga4_connections_userId_idx" ON public.ga4_connections USING btree ("userId");


--
-- Name: idx_accounts_provider_account; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_accounts_provider_account ON public.accounts USING btree (provider, "providerAccountId");


--
-- Name: idx_accounts_user_id; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree ("userId");


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: idx_audit_logs_user_created; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_audit_logs_user_created ON public.audit_logs USING btree ("userEmail", "createdAt");


--
-- Name: idx_conversations_agency_updated; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_conversations_agency_updated ON public.conversations USING btree ("agencyId", "updatedAt");


--
-- Name: idx_conversations_agency_user; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_conversations_agency_user ON public.conversations USING btree ("agencyId", "userId");


--
-- Name: idx_messages_agency_conversation; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_messages_agency_conversation ON public.messages USING btree ("agencyId", "conversationId");


--
-- Name: idx_messages_agency_created; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_messages_agency_created ON public.messages USING btree ("agencyId", "createdAt");


--
-- Name: idx_orders_agency_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_orders_agency_status ON public.orders USING btree ("agencyId", status);


--
-- Name: idx_orders_user_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_orders_user_status ON public.orders USING btree ("userEmail", status);


--
-- Name: idx_requests_agency_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_requests_agency_status ON public.requests USING btree ("agencyId", status);


--
-- Name: idx_requests_status_created; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_requests_status_created ON public.requests USING btree (status, "createdAt");


--
-- Name: idx_requests_user_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_requests_user_status ON public.requests USING btree ("userId", status);


--
-- Name: idx_seoworks_mappings_request; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_seoworks_mappings_request ON public.seoworks_task_mappings USING btree ("requestId");


--
-- Name: idx_seoworks_mappings_task; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_seoworks_mappings_task ON public.seoworks_task_mappings USING btree ("seoworksTaskId");


--
-- Name: idx_seoworks_tasks_agency_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_seoworks_tasks_agency_status ON public.seoworks_tasks USING btree ("agencyId", status);


--
-- Name: idx_seoworks_tasks_external_id; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_seoworks_tasks_external_id ON public.seoworks_tasks USING btree ("externalId");


--
-- Name: idx_seoworks_tasks_type_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_seoworks_tasks_type_status ON public.seoworks_tasks USING btree ("taskType", status);


--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree ("sessionToken");


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree ("userId");


--
-- Name: idx_tasks_agency_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_tasks_agency_status ON public.tasks USING btree ("agencyId", status);


--
-- Name: idx_tasks_status_created; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_tasks_status_created ON public.tasks USING btree (status, "createdAt");


--
-- Name: idx_tasks_user_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_tasks_user_status ON public.tasks USING btree ("userId", status);


--
-- Name: idx_user_invites_email_status; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_user_invites_email_status ON public.user_invites USING btree (email, status);


--
-- Name: idx_user_invites_token; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_user_invites_token ON public.user_invites USING btree (token);


--
-- Name: idx_user_preferences_user_id; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree ("userId");


--
-- Name: messages_agencyId_conversationId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "messages_agencyId_conversationId_idx" ON public.messages USING btree ("agencyId", "conversationId");


--
-- Name: messages_agencyId_createdAt_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "messages_agencyId_createdAt_idx" ON public.messages USING btree ("agencyId", "createdAt");


--
-- Name: monthly_usage_dealershipId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "monthly_usage_dealershipId_idx" ON public.monthly_usage USING btree ("dealershipId");


--
-- Name: monthly_usage_dealershipId_month_year_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "monthly_usage_dealershipId_month_year_key" ON public.monthly_usage USING btree ("dealershipId", month, year);


--
-- Name: monthly_usage_userId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "monthly_usage_userId_idx" ON public.monthly_usage USING btree ("userId");


--
-- Name: monthly_usage_userId_month_year_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "monthly_usage_userId_month_year_key" ON public.monthly_usage USING btree ("userId", month, year);


--
-- Name: orders_agencyId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "orders_agencyId_status_idx" ON public.orders USING btree ("agencyId", status);


--
-- Name: orders_userEmail_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "orders_userEmail_status_idx" ON public.orders USING btree ("userEmail", status);


--
-- Name: orphaned_tasks_clientEmail_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "orphaned_tasks_clientEmail_idx" ON public.orphaned_tasks USING btree ("clientEmail");


--
-- Name: orphaned_tasks_clientId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "orphaned_tasks_clientId_idx" ON public.orphaned_tasks USING btree ("clientId");


--
-- Name: orphaned_tasks_externalId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "orphaned_tasks_externalId_idx" ON public.orphaned_tasks USING btree ("externalId");


--
-- Name: orphaned_tasks_externalId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "orphaned_tasks_externalId_key" ON public.orphaned_tasks USING btree ("externalId");


--
-- Name: orphaned_tasks_processed_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX orphaned_tasks_processed_idx ON public.orphaned_tasks USING btree (processed);


--
-- Name: report_schedules_agencyId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "report_schedules_agencyId_idx" ON public.report_schedules USING btree ("agencyId");


--
-- Name: report_schedules_isActive_nextRun_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "report_schedules_isActive_nextRun_idx" ON public.report_schedules USING btree ("isActive", "nextRun");


--
-- Name: report_schedules_userId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "report_schedules_userId_idx" ON public.report_schedules USING btree ("userId");


--
-- Name: requests_agencyId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "requests_agencyId_status_idx" ON public.requests USING btree ("agencyId", status);


--
-- Name: requests_status_createdAt_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "requests_status_createdAt_idx" ON public.requests USING btree (status, "createdAt");


--
-- Name: requests_userId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "requests_userId_status_idx" ON public.requests USING btree ("userId", status);


--
-- Name: search_console_connections_dealershipId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "search_console_connections_dealershipId_idx" ON public.search_console_connections USING btree ("dealershipId");


--
-- Name: search_console_connections_userId_dealershipId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "search_console_connections_userId_dealershipId_key" ON public.search_console_connections USING btree ("userId", "dealershipId");


--
-- Name: search_console_connections_userId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "search_console_connections_userId_idx" ON public.search_console_connections USING btree ("userId");


--
-- Name: seoworks_task_mappings_requestId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "seoworks_task_mappings_requestId_idx" ON public.seoworks_task_mappings USING btree ("requestId");


--
-- Name: seoworks_task_mappings_seoworksTaskId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "seoworks_task_mappings_seoworksTaskId_idx" ON public.seoworks_task_mappings USING btree ("seoworksTaskId");


--
-- Name: seoworks_task_mappings_seoworksTaskId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "seoworks_task_mappings_seoworksTaskId_key" ON public.seoworks_task_mappings USING btree ("seoworksTaskId");


--
-- Name: seoworks_tasks_agencyId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "seoworks_tasks_agencyId_status_idx" ON public.seoworks_tasks USING btree ("agencyId", status);


--
-- Name: seoworks_tasks_externalId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "seoworks_tasks_externalId_idx" ON public.seoworks_tasks USING btree ("externalId");


--
-- Name: seoworks_tasks_externalId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "seoworks_tasks_externalId_key" ON public.seoworks_tasks USING btree ("externalId");


--
-- Name: seoworks_tasks_orderId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "seoworks_tasks_orderId_key" ON public.seoworks_tasks USING btree ("orderId");


--
-- Name: seoworks_tasks_taskType_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "seoworks_tasks_taskType_status_idx" ON public.seoworks_tasks USING btree ("taskType", status);


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: tasks_agencyId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "tasks_agencyId_status_idx" ON public.tasks USING btree ("agencyId", status);


--
-- Name: tasks_status_createdAt_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "tasks_status_createdAt_idx" ON public.tasks USING btree (status, "createdAt");


--
-- Name: tasks_userId_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "tasks_userId_status_idx" ON public.tasks USING btree ("userId", status);


--
-- Name: themes_agencyId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "themes_agencyId_key" ON public.themes USING btree ("agencyId");


--
-- Name: usage_metrics_agencyId_date_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "usage_metrics_agencyId_date_idx" ON public.usage_metrics USING btree ("agencyId", date);


--
-- Name: usage_metrics_agencyId_metricType_date_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "usage_metrics_agencyId_metricType_date_idx" ON public.usage_metrics USING btree ("agencyId", "metricType", date);


--
-- Name: user_dealership_access_dealershipId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "user_dealership_access_dealershipId_idx" ON public.user_dealership_access USING btree ("dealershipId");


--
-- Name: user_dealership_access_isActive_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "user_dealership_access_isActive_idx" ON public.user_dealership_access USING btree ("isActive");


--
-- Name: user_dealership_access_userId_dealershipId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "user_dealership_access_userId_dealershipId_key" ON public.user_dealership_access USING btree ("userId", "dealershipId");


--
-- Name: user_dealership_access_userId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "user_dealership_access_userId_idx" ON public.user_dealership_access USING btree ("userId");


--
-- Name: user_ga4_tokens_userId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "user_ga4_tokens_userId_key" ON public.user_ga4_tokens USING btree ("userId");


--
-- Name: user_invites_email_agencyId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "user_invites_email_agencyId_key" ON public.user_invites USING btree (email, "agencyId");


--
-- Name: user_invites_email_status_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX user_invites_email_status_idx ON public.user_invites USING btree (email, status);


--
-- Name: user_invites_token_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX user_invites_token_idx ON public.user_invites USING btree (token);


--
-- Name: user_invites_token_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX user_invites_token_key ON public.user_invites USING btree (token);


--
-- Name: user_preferences_userId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "user_preferences_userId_idx" ON public.user_preferences USING btree ("userId");


--
-- Name: user_preferences_userId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "user_preferences_userId_key" ON public.user_preferences USING btree ("userId");


--
-- Name: user_search_console_tokens_userId_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX "user_search_console_tokens_userId_key" ON public.user_search_console_tokens USING btree ("userId");


--
-- Name: users_currentDealershipId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "users_currentDealershipId_idx" ON public.users USING btree ("currentDealershipId");


--
-- Name: users_dealershipId_idx; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE INDEX "users_dealershipId_idx" ON public.users USING btree ("dealershipId");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: verification_tokens_identifier_token_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX verification_tokens_identifier_token_key ON public.verification_tokens USING btree (identifier, token);


--
-- Name: verification_tokens_token_key; Type: INDEX; Schema: public; Owner: rylie_user
--

CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token);


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_userEmail_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES public.users(email) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dealership_onboardings dealership_onboardings_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.dealership_onboardings
    ADD CONSTRAINT "dealership_onboardings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dealerships dealerships_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.dealerships
    ADD CONSTRAINT "dealerships_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: escalations escalations_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT "escalations_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: escalations escalations_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT "escalations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: escalations escalations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.escalations
    ADD CONSTRAINT "escalations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ga4_connections ga4_connections_dealershipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.ga4_connections
    ADD CONSTRAINT "ga4_connections_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES public.dealerships(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ga4_connections ga4_connections_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.ga4_connections
    ADD CONSTRAINT "ga4_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: monthly_usage monthly_usage_dealershipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.monthly_usage
    ADD CONSTRAINT "monthly_usage_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES public.dealerships(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: monthly_usage monthly_usage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.monthly_usage
    ADD CONSTRAINT "monthly_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_userEmail_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "orders_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES public.users(email) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_schedules report_schedules_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT "report_schedules_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: report_schedules report_schedules_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.report_schedules
    ADD CONSTRAINT "report_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: requests requests_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT "requests_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: requests requests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT "requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: search_console_connections search_console_connections_dealershipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.search_console_connections
    ADD CONSTRAINT "search_console_connections_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES public.dealerships(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: search_console_connections search_console_connections_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.search_console_connections
    ADD CONSTRAINT "search_console_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seoworks_task_mappings seoworks_task_mappings_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.seoworks_task_mappings
    ADD CONSTRAINT "seoworks_task_mappings_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public.requests(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seoworks_tasks seoworks_tasks_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.seoworks_tasks
    ADD CONSTRAINT "seoworks_tasks_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: seoworks_tasks seoworks_tasks_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.seoworks_tasks
    ADD CONSTRAINT "seoworks_tasks_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tasks tasks_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: themes themes_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT "themes_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usage_metrics usage_metrics_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.usage_metrics
    ADD CONSTRAINT "usage_metrics_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_dealership_access user_dealership_access_dealershipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_dealership_access
    ADD CONSTRAINT "user_dealership_access_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES public.dealerships(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_dealership_access user_dealership_access_grantedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_dealership_access
    ADD CONSTRAINT "user_dealership_access_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_dealership_access user_dealership_access_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_dealership_access
    ADD CONSTRAINT "user_dealership_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_ga4_tokens user_ga4_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_ga4_tokens
    ADD CONSTRAINT "user_ga4_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_invites user_invites_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT "user_invites_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_invites user_invites_invitedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_invites
    ADD CONSTRAINT "user_invites_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_preferences user_preferences_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_search_console_tokens user_search_console_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.user_search_console_tokens
    ADD CONSTRAINT "user_search_console_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_agencyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES public.agencies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_currentDealershipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_currentDealershipId_fkey" FOREIGN KEY ("currentDealershipId") REFERENCES public.dealerships(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_dealershipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: rylie_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_dealershipId_fkey" FOREIGN KEY ("dealershipId") REFERENCES public.dealerships(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: rylie_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO rylie_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO rylie_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO rylie_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO rylie_user;


--
-- PostgreSQL database dump complete
--


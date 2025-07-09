# SEO Hub Platform

## Introduction

SEO Hub is an AI-powered, multi-tenant SaaS platform designed to streamline SEO operations for agencies and their dealership clients. It provides a comprehensive suite of tools for managing SEO tasks, tracking progress, and generating insightful reports by integrating with Google Analytics 4 and Google Search Console.

Built with Next.js, Prisma, Tailwind CSS, and TypeScript, SEO Hub offers a modern, robust, and scalable solution for enhancing SEO workflows and client management.

## Features

- **Multi-Tenant Architecture:** Securely manage multiple agencies, each with their own dealership clients and users.
- **Role-Based Access Control (RBAC):** Predefined user roles (SUPER_ADMIN, ADMIN, USER) with specific permissions ensure data security and proper access levels.
- **Client Onboarding & Package Management:** Streamlined process for onboarding new dealerships and managing their SEO service packages.
- **AI-Powered SEO Task Management:** Create, assign, and track various SEO tasks such as content creation (pages, blogs), Google Business Profile (GBP) posts, and technical SEO improvements.
- **Enhanced Task Visibility:** Dedicated task views, status tracking (Pending, In Progress, Completed, Cancelled), filtering, and sorting capabilities.
- **Unified Reporting Dashboard:** Integrates Google Analytics 4 (GA4) and Google Search Console data into a single dashboard, providing comprehensive insights into traffic, search performance, and key SEO metrics.
- **Automated Usage Tracking:** Monitors package quotas and task completion, with monthly resets and progress visualizations.
- **SEOWorks Integration:** Seamlessly connects with SEOWorks for extended functionality and data synchronization (details in `docs/SEOWORKS_INTEGRATION.md`).
- **Notification System:** Keep users informed with email notifications for request updates, task completions, and weekly summaries.

## User Roles

The platform defines three primary user roles:

- **`SUPER_ADMIN`**:
    - Manages agencies and has system-wide access.
    - Can view all data across agencies and users.
    - Responsible for system settings and promoting users to SUPER_ADMIN.
- **`ADMIN`**:
    - Agency-level administrator.
    - Manages users, requests, and settings within their assigned agency.
- **`USER`**:
    - Standard client user (e.g., dealership personnel).
    - Submits SEO requests, tracks progress, views reports, and manages their profile.

## Getting Started

This section provides a brief overview of how to set up the project for local development. For more detailed instructions, please refer to `docs/DEVELOPER_SETUP.md`.

### Prerequisites

- Node.js (version 18 or higher, as specified in `package.json` and `DEVELOPER_SETUP.md`)
- PostgreSQL (version 14 or higher recommended)
- Git
- A Google Cloud account (for Google OAuth and GA4 integration)

### Setup Steps

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:USERNAME/final_seo_hub.git # Replace with your fork or the main repo URL
    # OR for HTTPS:
    # git clone https://github.com/USERNAME/final_seo_hub.git
    cd final_seo_hub
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up the database:**
    - Ensure PostgreSQL is running.
    - Create a new database (e.g., `rylie_seo_hub_dev`).
    - Instructions for database creation can be found in `docs/DEVELOPER_SETUP.md`.
4.  **Configure environment variables:**
    - Copy the example environment file:
      ```bash
      cp .env.example .env
      ```
    - Update `.env` with your database connection string (`DATABASE_URL`), Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), and other necessary API keys as outlined in `.env.example`.
    - `NEXTAUTH_SECRET` is crucial for authentication; generate a strong secret.
    - Refer to `docs/DEVELOPER_SETUP.md` for details on setting up Google OAuth and other services.
5.  **Run database migrations:**
    ```bash
    npx prisma generate
    npx prisma db push
    ```
    (Note: `DEVELOPER_SETUP.md` uses `db push`, while `package.json` also shows `migrate dev` and `migrate deploy`. `db push` is generally for development.)

For a complete setup guide, including Google OAuth, GA4 integration, and troubleshooting, please see `docs/DEVELOPER_SETUP.md`.

## Running the Application

Once the setup is complete, you can start the development server:

```bash
npm run dev
```

This will typically start the application on `http://localhost:3000` (or `http://localhost:3001` as mentioned in `DEVELOPER_SETUP.md` - check your `.env` or `next.config.js` if different).

## Running Tests

The project uses Jest for testing. You can run tests using the following npm scripts:

-   **Run all tests:**
    ```bash
    npm test
    ```
-   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```
-   **Run tests with coverage report:**
    ```bash
    npm run test:coverage
    ```

Refer to `package.json` for other test-related scripts (e.g., `test:redis`).

## Deployment

This project is configured for deployment on [Render](https://render.com/).

-   **Build Command:** `npm install && npm run build && npx prisma generate` (as per `deployment/DEPLOYMENT.md`) or `npm ci && npm run build` (as per `render.yaml`). Ensure Prisma client is generated after build.
-   **Start Command:** `npm start`
-   **Environment Variables:** All necessary environment variables listed in `.env.example` must be configured in the deployment environment.
-   **Database:** The application requires a PostgreSQL database. Migrations should be run as part of the deployment process (e.g., `npm run db:migrate`).

For detailed deployment steps, refer to `deployment/DEPLOYMENT.md` and the `deployment/render.yaml` configuration file.

The `package.json` also includes a `build:production` script: `prisma generate && prisma migrate deploy && npm run type-check && next build`. This might be relevant for production builds.

## Directory Structure

Here's a high-level overview of the key directories:

```
/
├── app/                # Next.js App Router: Pages, API routes, layouts
│   ├── (authenticated)/ # Routes requiring authentication
│   ├── api/             # Backend API endpoint handlers
│   └── lib/             # Server-side helper functions, AI logic
├── components/         # Shared React components
│   └── ui/              # Base UI elements (buttons, cards, etc.)
├── config/             # Configuration files (Jest, Sentry)
├── constants/          # Application-wide constants
├── docs/               # Project documentation and guides
├── hooks/              # Custom React hooks
├── lib/                # Client-side libraries, utilities, Prisma client, validation schemas
├── middleware/         # Next.js middleware
├── prisma/             # Prisma schema, migrations, and seed scripts
├── public/             # Static assets (images, fonts, etc.)
├── scripts/            # Utility scripts (DB setup, tests)
# Note: Global styles (globals.css) and Tailwind config are typically in `app/` and the root respectively.
```
(Note: The `DEVELOPER_SETUP.md` provides a similar structure. This is a general interpretation based on common Next.js patterns and observed folders like `app/globals.css` and `tailwind.config.ts`.)

## Contributing

Contributions are welcome! Please follow these general guidelines:

1.  **Branching:** Create a feature branch for your work (e.g., `ticket-001-fix-login-bug` or `feature/new-reporting-widget`).
2.  **Commits:** Write clear and concise commit messages.
3.  **Testing:** Ensure your changes are well-tested. Run relevant tests (`npm test`) and add new tests for new features or bug fixes.
4.  **Pull Requests:**
    -   Use the pull request template provided in `.github/pull_request_template.md`.
    -   Clearly describe the changes made, the problem solved, and any relevant context.
    -   Include screenshots for UI changes.
    -   Outline testing steps for reviewers.
5.  **Code Style:** Follow the existing code style and conventions. Run linters and formatters if configured (e.g., ESLint, Prettier - check `package.json` scripts).
6.  **Documentation:** Update any relevant documentation if your changes affect existing features or add new ones.

For more details on the development workflow, such as working on tickets, refer to the "Working on Tickets" section in `docs/DEVELOPER_SETUP.md`.

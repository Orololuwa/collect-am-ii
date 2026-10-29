# Welcome to CollectAm!

A modern, production-ready template for building full-stack B2B & B2C SaaS
applications using React Router.

[![YouTbe thumbnail](https://i.ytimg.com/vi/5p45AbpL4bo/maxresdefault.jpg)](https://www.youtube.com/watch?v=5p45AbpL4bo)

You can
[click here to watch the video](https://www.youtube.com/watch?v=5p45AbpL4bo)
explaining the template.

## Tech Stack

- 📖 [React Router](https://reactrouter.com/)
- 🔒 [TypeScript](https://www.typescriptlang.org/) by default
- 🎉 [TailwindCSS](https://tailwindcss.com/) for styling
- 🎨 [Shadcn UI](https://ui.shadcn.com/) components
- 🗄️ [Postgres](https://www.postgresql.org/) (Docker) with
  [Prisma](https://www.prisma.io/)
- 🧹 [Biome](https://biomejs.dev/) for linting and formatting
- ⚡️ [Vitest](https://vitest.dev/) for testing
- 🎭 [Playwright](https://playwright.dev/) for E2E testing
- 🛠️ [Commitizen](https://commitizen-tools.github.io/commitizen/),
  [Commitlint](https://commitlint.js.org/), and
  [Husky](https://typicode.github.io/husky/) for enforced commit conventions.

## Features

- 🔒 Authentication with [Auth0](https://auth0.com/) (email sign-in code
  delivered through Resend, Google OAuth) and app-managed cookie sessions
- 📦 Postgres in Docker (`docker compose`)
- 🗃️ Image uploads with [Cloudinary](https://cloudinary.com/)
- 💳 Billing with [Stripe](https://stripe.com/)
- 📧 Emails with [Resend](https://resend.com/)
- 👥 Multi-tenant organizations with role-based memberships
- 🌙 Dark mode
- 🔔 Notifications
- 🔍 [Axe](https://www.npmjs.com/package/@axe-core/playwright) for accessibility
  testing
- 🌐 Internationalization with [i18next](https://www.i18next.com/) and
  [remix-i18next](https://github.com/sergiodxa/remix-i18next)
- 📦 And much more...

All the services this template uses have generous free tiers, so you can get
started at any budget.

## General

This template is tens of thousands of lines of code. It can be scary to navigate
such a big foreign project. Luckily this template has good test coverage.

Why is good test coverage important for a template? For the same reason why it's
good for your own code base. You want to avoid accidentally breaking something
when you update the template and change or ammend its code.

## Getting Started

Get the code:

```bash
npx create-react-router@latest --template Orololuwa/react-router-saas-template
```

### Installation

Install the dependencies:

```bash
npm install
```

#### Quick Start

For the fastest way to get started with local development using mocks (no external services required):

```bash
npm run quickstart
```

This command will:
1. Copy `.env.example` to `.env`
2. Start the Postgres container (`docker compose up -d db`) and set up Prisma
   (generate client, run migrations, push schema)
3. Seed the database with demo data
4. Start the development server with mocks enabled

You can then log in with any of the demo accounts:
- `hobby@example.com` - Hobby Plan (1 seat, monthly)
- `startup@example.com` - Startup Plan (5 seats, annual)  
- `business@example.com` - Business Plan (25 seats, monthly)

For more details on working with mocks, see ["Local Development with Mocks"](#local-development-with-mocks).

#### Manual Setup

For a quick start, see ["Local Development with Mocks"](#local-development-with-mocks). Just copy `.env.example` to `.env` and start developing.

Create `.env` file. You can find the `.env.example` file in the root of the
project to see all the variables you need to set.

Start by setting the environment variables that you can configure without
setting up a service:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` – Credentials for the
  Postgres container. Start it with `npm run db:up` (data lives in the `pgdata`
  Docker volume).
- `DATABASE_URL` – The URL of that database, e.g.
  `postgresql://postgres:postgres@localhost:5433/app` (Postgres is published on
  host port `POSTGRES_PORT`, default 5433).
- `APP_URL` – The URL of your app, e.g. `http://localhost:3001`.
- `COOKIE_SECRET` – A random string of characters. This is used for signing
  cookies including sessions, toast notifications, and other cookie-based data.
- `HONEYPOT_SECRET` – A random string of characters. This is used for the
  honeypot field in the contact sales form.

To run the app, you'll need to obtain the remaining environment variables by
setting up the required services.

### Database (Docker)

Postgres runs as the `db` service in `docker-compose.yml`, with its data in the
named `pgdata` volume.

```bash
npm run db:up    # start Postgres (waits until it is healthy)
npm run db:down  # stop it (data is kept)
```

In production, `docker compose up -d` starts `db`, then a one-off `migrate`
service that runs `prisma migrate deploy`, then the `app`.

#### Migrating data from Supabase

`scripts/migrate-supabase-db.sh` copies an existing Supabase database into the
container: it dumps the `public` schema, restores it, applies the remaining
Prisma migrations and compares row counts per table.

```bash
SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres" \
  npm run db:migrate-from-supabase
```

Use the session pooler (port 5432) or the direct connection string. Pass
`-- --force` to wipe a non-empty local database first. The dump is kept in
`backups/` (git-ignored).

### Auth0

Sign-in uses Auth0, but the UI stays in the app: for email sign-in the server
asks Auth0 to email a 6-digit code (passwordless) and the user types it in;
Google sign-in redirects to Auth0's `/authorize` with the `google-oauth2`
connection. After either flow the app sets its own signed `__session` cookie
(`app/features/user-authentication/auth-session.server.ts`). Users are matched
to their `UserAccount` by verified email.

1. Create a tenant and a **Regular Web Application**. Set:
   - `AUTH0_DOMAIN` – e.g. `your-tenant.eu.auth0.com` (or a custom domain).
   - `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`.
2. In the application's settings:
   - **Allowed Callback URLs**: `${APP_URL}/auth/callback`.
   - **Advanced Settings → Grant Types**: enable _Authorization Code_,
     _Passwordless OTP_ and _Client Credentials_.
3. **Authentication → Passwordless → Email**: enable it, choose **Code**
   (OTP length 6), customize the email template, and enable the connection for
   your application.
4. **Authentication → Social → Google**: add your Google OAuth client ID and
   secret (create them in the Google Cloud console with the authorized
   redirect URI `https://<AUTH0_DOMAIN>/login/callback`), and enable the
   connection for your application.
5. **Branding → Email Provider**: use a custom SMTP provider so the codes are
   sent through Resend:
   - Host `smtp.resend.com`, port `465`, username `resend`, password: your
     Resend API key.
   - From: an address on a domain verified in Resend (same as `EMAIL_FROM`).
6. **Applications → APIs → Auth0 Management API → Machine to Machine
   Applications**: authorize your application with the `read:users` and
   `delete:users` scopes. This is used to delete a user's Auth0 identities
   when they delete their account.

### Cloudinary

Avatars and organization logos are uploaded server-side to Cloudinary
(`app/utils/storage.server.ts`) into the `user-avatars` and
`organization-logos` folders.

1. Create a [Cloudinary](https://cloudinary.com/) account.
2. Copy the **API environment variable** from the dashboard into
   `CLOUDINARY_URL` (`cloudinary://<api_key>:<api_secret>@<cloud_name>`).

Static images (brand logo, template placeholder logos, seed data) are
referenced from `app/utils/static-assets.ts`; point `STATIC_ASSETS_BASE_URL`
at wherever you host them.

The upload is parsed with `parseFormData` from
[`@remix-run/form-data-parser`](https://github.com/remix-run/form-data-parser).
This function is under the hood in `validateFormData` in
`app/utils/validate-form-data.server.ts`.

### Resend

1. Create a new project at [Resend](https://resend.com/).
2. Got your project's [API keys](https://resend.com/api-keys) and click on
   "Create API key".
3. Set the `RESEND_API_KEY` environment variable to the API key you just
   created.

### Stripe

Install the Stripe CLI:

```bash
brew install stripe/stripe-cli/stripe
```

or

```bash
npm install -g stripe/stripe-cli
```

Confirm the installation:

```bash
stripe --version
```

Learn more about Stripe testing [here](https://docs.stripe.com/testing).

In a new terminal, forward webhooks to your local server:

```bash
stripe listen --forward-to http://localhost:3001/api/v1/stripe/webhooks
```

Keep this terminal open. This will print out your local webhook secret. You'll
need to set the `STRIPE_WEBHOOK_SECRET` environment variable to this value.

#### Stripe Dashboard

You can manage your products and prices in the Stripe Dashboard.

1. Create a new Stripe account.
2. In your [test mode dashboard](https://dashboard.stripe.com/test/dashboard),
   grab the API keys:

- `STRIPE_SECRET_KEY` - The secret key of your Stripe account.

#### Pricing

This project comes with a specific pricing pre-configured:

3 paid tiers, and one enterprise (custom) tier. All paid tiers have a free
trial. The free trial is 14 days and always for the highest plan.

If you need different pricing structures (e.g. freemium, one-time payments,
etc.) you'll have to write that code yourself. But this template's structure
makes it easy to customize the pricing page, the web hook handlers, etc. (NOTE:
the public `/pricing` page has a free tier, but that's just to show you how to
do it in the UI. The actual app has no free tier.)

For each price, set the "Product tax code" to "SaaS" and the "Unit label" to
"seat".

#### 1. Create your products & prices

CollectAm is set up to listen to product & prices webhooks.
This also allows your account managers to create and manage products & prices in
the Stripe Dashboard, and have them automatically reflected in your app.

By default, it uses three plans with seat limits of:

- low (Hobby): 1 seat
- mid (Startup): 10 seats
- high (Business): 25 seats

You might need to tweak a bit of test code if you want to change these limits.
Do a fuzzy search for these limits.

For local development, run your app with `npm run dev` and forward webhooks to
your local server with
`stripe listen --forward-to http://localhost:3001/api/v1/stripe/webhooks`.

For production, follow the same instructions, but us the production URL of your
app and make sure your app is deployed so it will accept the webhooks of the
product creation. If you messed this up, you can always retrigger the webhooks
using the Stripe CLI.

1. Go to the
   [Stripe Dashboard for products](https://dashboard.stripe.com/test/products)
2. Click on "Create Product" (or "Add a product" if you have none).
3. In the modal:

- Enter the name of the product, e.g.: "Hobby Plan"
- (Optional) Enter a description of the product, e.g.: "Hobby Plan for 1 user",
  and upload an image.
- In the "Product Tax Code" dropdown, select "Software as a Service (SaaS) -
  business use".
- Click on "More Options" and set the "Unit label" to "seat".
- Enter a monhtly recurring price, e.g.: "$17". Make sure you set the currenty
  to USD in case its NOT the default.
- Click on "More pricing options" and enter a lookup key, e.g.:
  "monthly_hobby_planv2".
- Click on "Next".

4. Click on "Add another price" and this time choose "Yearly" as the billing
   period. Make sure you enter the correct yearly price, e.g.: "$180". And
   remember to set the lookup key to "annual_hobby_planv2".
5. **Important:** Now enter the value: "max_seats" in the metadata field and set
   it to "1". This app is set up to handle ALL limits via metadata. This allows
   you to easily change the limits for a product without having to change the
   code.
6. Finally, click "Add Product".
7. Now write your lookup keys in the `priceLookupKeysByTierAndInterval` object
   in `app/features/billing/billing-constants.ts`.

##### For Local Development: Replay the Events

After you’ve created your products and prices locally (with `npm run dev` and
`stripe listen` forwarding to your webhook endpoint), you’ll see lines in your
terminal like:

```
2025-05-10 17:58:56   --> product.created \[evt\_XXXXXXXXXXXXXXXXXXXXXXXX]
2025-05-10 17:58:58   --> price.created   \[evt\_YYYYYYYYYYYYYYYYYYYYYYYY]
2025-05-10 17:59:00   --> price.created   \[evt\_ZZZZZZZZZZZZZZZZZZZZZZZZ]
…etc.
```

1. **Copy the event IDs**  
   Whenever you see a line ending with `[evt_…]`, copy that ID (everything
   inside the brackets, for example `evt_XXXXXXXXXXXXXXXXXXXXXXXX`).

2. **Save them for later**  
   Put all your event IDs into a file (e.g. `stripe-events.txt`) or an
   environment variable. For example, in a Unix-style shell you might do:

   ```bash
   # stripe-events.txt
   evt_XXXXXXXXXXXXXXXXXXXXXXXX
   evt_YYYYYYYYYYYYYYYYYYYYYYYY
   evt_ZZZZZZZZZZZZZZZZZZZZZZZZ
   # …etc.
   ```

3. **Replay (resend) the events** When you need to wipe your local database and
   re-seed via webhooks, you can replay all those events at once. For example,
   if you saved them in `stripe-events.txt`:

   ```bash
   xargs -n1 stripe events resend < stripe-events.txt
   ```

   This command is also available via `npm run stripe:resend-events`.

> **Tip:** Keep `stripe-events.txt` checked into your repo (or in a safe place)
> so you can easily replay your entire setup whenever you rebuild your local
> database.

#### 2. Seed Stripe Data for Tests (Local vs. CI)

Your test suite relies on having Stripe products & prices in your database.
Here’s how it works in each environment:

##### Local

1. **Replay your real events** (see “For Local Development: Replay the Events”
   above) so your DB contains the exact products, prices, metadata, and lookup
   keys you configured in Stripe.
2. **Run Vitest**:
   ```bash
   npm test
   ```

The global setup (`app/test/vitest.global-setup.ts`) will detect your existing
products/prices and simply verify they’re present.

#### CI

In CI you won’t have webhook events or a populated database, so we automatically
seed dummy data:

- **Global setup file**: `app/test/vitest.global-setup.ts`
- **Seeding helper**: `ensureStripeProductsAndPricesExist()` in
  `app/test/server-test-utils.ts`

What it does before your tests run:

1. Looks up each lookup key defined in `priceLookupKeysByTierAndInterval`.
2. If no product exists yet, creates one via `createPopulatedStripeProduct()` +
   `saveStripeProductToDatabase()`.
3. Creates both monthly & annual prices for that product with the right lookup
   keys & intervals.
4. Logs success or exits on error, ensuring your tests always see exactly the
   pricing rows they expect.

You don’t need to replay webhooks or manage `stripe-events.txt` in CI—this
script handles everything. Just push your code and let your CI pipeline run
`npm test`.

#### Checkout Session

You need to configure tax collection. You must have a valid origin address to
enable automatic tax calculation in test mode. Visit
[your tax dashboard](https://dashboard.stripe.com/test/settings/tax) to update
it.

#### Customer Portal

Add the prices you created to your customer portal. Provide a configuration or
create your default by saving your
[customer portal settings in test mode](https://dashboard.stripe.com/test/settings/billing/portal).
You'll also need to set proration and enable the ability to cancel a
subscription via the portal.

#### Intentional Design Decisions for Stripe

- Downgrading a subscription does **not** deactivate existing members. The
  reasoning is simple: more active users typically means more revenue.
  Automatically removing members would work against that. If your plan has other
  limits, you should handle those restrictions yourself - but since
  subscriptions are billed per user per month, it’s in your interest to avoid
  limiting user count unnecessarily.
- Users can still be added even if the subscription is cancelled. This allows
  you to generate more revenue if the customer decides to subscribe again -
  since pricing is per user, more added users means a higher monthly total once
  they reactivate.

### Misc

Here are a few miscellaneous things you might want to change:

1. Give it your own name! Fuzzy search for `CollectAm` to find
   all the places you need to change the name.
2. The current theme violates color contrast. It's best for you to pick a theme
   that is accessible and configure it in your `app.css` file. Then you can
   enable contrast checks in your E2E tests again.

## Development

With all the envorinment variables set, you can run the app.

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:3001`.

If you haven't done it yet, with both your dev server and webhook forwarding
terminal open, replay the Stripe events in a third terminal.

```bash
npm run stripe:resend-events
```

### Security Configuration

This application implements Content Security Policy (CSP) with nonces for XSS
protection and provides control over search engine indexing.

#### ALLOW_INDEXING Environment Variable

Controls whether search engines can index your site. The application uses two
mechanisms to prevent indexing:

- **HTTP Header:** `X-Robots-Tag: noindex, nofollow`
- **HTML Meta Tag:** `<meta name="robots" content="noindex, nofollow">`

**Values:**

- `"true"` - Allow search engine indexing (recommended for production)
- `"false"` - Prevent search engine indexing (recommended for
  staging/dev/preview environments)
- Omitted - Defaults to allowing indexing

**Example:**

```bash
# Production
ALLOW_INDEXING=true

# Staging/Development/Preview
ALLOW_INDEXING=false
```

**When to Use:**

| Environment         | Recommended Value | Reason                                                       |
| ------------------- | ----------------- | ------------------------------------------------------------ |
| **Production**      | `"true"` or omit  | Allow search engines to index your public site               |
| **Staging**         | `"false"`         | Prevent duplicate content and indexing of test environments  |
| **Development**     | `"false"`         | Prevent local development sites from being indexed           |
| **Preview/PR**      | `"false"`         | Prevent temporary preview deployments from being indexed     |

#### Content Security Policy (CSP)

The application uses nonces for CSP compliance. All inline scripts are protected
by cryptographically random nonces that are generated on each request.

**Configuration:**

- CSP is in **report-only mode** in development and test environments
- CSP is **enforced** in production
- All inline scripts require a valid nonce attribute
- WebSocket connections are allowed in development for Hot Module Replacement
  (HMR)

### Project helper scripts

- `"build"` - Compiles the application using React Router's build process.
- `"build-with-mocks"` - Builds the app and initializes MSW in the client build
  directory without saving it to `package.json`.
- `"check"` - Runs Biome checks and automatically applies safe fixes with
  formatting across the codebase.
- `"dev"` - Starts the development server using React Router's dev mode.
- `"dev-with-mocks"` - Starts the dev server with both client and server mocks
  enabled via `VITE_CLIENT_MOCKS=true` and `SERVER_MOCKS=true`.
- `"dev-with-server-mocks"` - Starts the dev server with only server-side mocks
  enabled.
- `"lint"` - Runs Biome in CI mode to check for linting and formatting errors
  across the codebase, including Tailwind directives in CSS.
- `"prepare"` - Sets up Git hooks via Husky.
- `"start"` - Serves the production build using `react-router-serve`.
- `"start-with-server-mocks"` - Serves the production build with server mocks
  enabled.
- `"stripe:resend-events"` - Resends Stripe events listed in `stripe-events.txt`
  using the Stripe CLI.
- `"test"` - Runs unit, integration, and component tests using Vitest with a
  verbose reporter in watch mode.
- `"test:e2e"` - Executes end-to-end tests using Playwright.
- `"test:e2e:ui"` - Launches Playwright Test Runner UI for interactive
  debugging.
- `"typecheck"` - Runs type generation for routes and performs TypeScript type
  checking.
- `"typegen"` - Generates type-safe route definitions for React Router.

### Prisma Helper Scripts

- `"prisma:deploy"` - Applies all pending migrations from the
  `prisma/migrations` directory to the database, then regenerates the Prisma
  Client. Typically used in production.
- `"prisma:migrate"` - Run via `npm run prisma:migrate -- my_migration_name` to
  create a new migration based on schema changes and apply it to the dev
  database.
- `"prisma:push"` - Pushes the current Prisma schema to the database without
  generating a migration, then regenerates the Prisma Client. Useful for
  prototyping.
- `"prisma:reset-dev"` - Wipes the database, seeds it, and starts the
  development server. Use this for a clean local dev environment.
- `"prisma:seed"` - Executes the seed script defined in `./prisma/seed.ts` to
  populate the database with initial data.
- `"prisma:setup"` - Regenerates Prisma Client, applies pending migrations, and
  pushes any remaining schema changes. Ideal for fresh environments.
- `"prisma:studio"` - Opens Prisma Studio, a GUI for exploring and editing your
  database.
- `"prisma:wipe"` - Resets the database by applying all migrations from scratch
  (`migrate reset`), then pushes the schema without requiring confirmation.

### Running E2E Tests

When you run the E2E tests locally, we recommend you do it in production mode
and with mocks enabled. This resembles how your tests will run in CI. So your
steps should be:

1. Run `npm run build-with-mocks`.
2. Run `npm run start-with-server-mocks`.
3. In another terminal, run `npm run test:e2e` UI.
4. Visit `localhost:3001` in your browser once. You should see
   `🔶 MSW mock server running ...` in the terminal running your app.
5. (Optionally) In a new terminal, run `npm run prisma:wipe` and
   `npm run stripe:resend-events` to reset the database and replay the Stripe
   events. (Anohter terminal that forwards the webhooks must already be
   running.)

### Local Development with Mocks

For local development without connecting to real external services (Stripe,
Auth0, Cloudinary, Resend), you can use the mock mode. This uses
[MSW (Mock Service Worker)](https://mswjs.io/) to intercept API calls.

**Setup:**

1. First, seed your database with demo data:
   ```bash
   npm run prisma:seed
   ```
   This creates three demo organizations with subscriptions:
   - `hobby@example.com` - Hobby Plan (1 seat, monthly)
   - `startup@example.com` - Startup Plan (5 seats, annual)
   - `business@example.com` - Business Plan (25 seats, monthly)

   Each organization also has 2-4 random team members added.

2. Start the development server with mocks enabled:
   ```bash
   npm run dev:mocks
   ```

**Logging In:**

When running with `MOCKS=true`, authentication is handled by mocked Auth0
endpoints. To log in as one of the seeded users:

1. Navigate to the login page
2. Enter one of the demo email addresses (e.g., `hobby@example.com`)
3. Enter the code `123456` (the mock also writes the email to
   `app/tests/mocks/fixtures/email/<address>.json`)

**Resetting Data:**

To start fresh with a clean database:

```bash
npm run prisma:wipe  # Resets the database
npm run prisma:seed  # Re-seeds demo data
npm run dev:mocks    # Start dev server
```

Or use the combined command:

```bash
npm run prisma:reset-dev  # Wipes, seeds, and starts dev server
```

**Note:** The seed script creates demo users with subscriptions that include
seats, Stripe customer IDs, and all necessary billing data. This allows you to
test billing flows, team management, and subscription features without
connecting to real Stripe or Auth0 instances.

### Routing

This template uses [flat routes](https://github.com/kiliman/remix-flat-routes).

### i18n

CollectAm comes with localization support through
[remix-i18next](https://github.com/sergiodxa/remix-i18next).

The namespaces live in `public/locales/`.

### Toasts

CollectAm includes utilities for toast notifications based
on flash sessions.

**Flash Data:** Temporary session values, ideal for transferring data to the
next request without persisting in the session.

**Redirect with Toast:**

- Utility: `redirectWithToast` (Path: `app/utils/toast.server.ts`)
- Use for redirecting with toast notifications.
- Example:
  ```tsx
  return redirectWithToast(`/organizations/${newOrganizations.slug}/home`, {
    title: 'Organization created',
    description: 'Your organization has been created.',
  });
  ```
- Accepts extra arguments for `ResponseInit` to set headers.

**Direct Toast Headers:**

- Utility: `createToastHeaders` (Path: `app/utils/toast.server.ts`)
- Use for non-redirect scenarios.
- Example:
  ```tsx
  return json(
    { success: true },
    {
      headers: await createToastHeaders({
        description: 'Organization updated',
        type: 'success',
      }),
    },
  );
  ```

**Combining Multiple Headers:**

- Utility: `combineHeaders` (Path: `app/utils/toast.server.tsx`)
- Combine toast headers with additional headers.
- Example:
  ```tsx
  return json(
    { success: true },
    {
      headers: combineHeaders(
        await createToastHeaders({ title: 'Profile updated' }),
        { 'x-foo': 'bar' },
      ),
    },
  );
  ```

### Playwright 🎭

> **Note:** make sure you've run `npm run dev` at least one time before you run
> the E2E tests!

We use Playwright for our End-to-End tests in this project. You'll find those in
the `playwright/` directory. As you make changes to your app, add to an existing
file or create a new file in the `playwright/e2e` directory to test your
changes.

[Playwright natively features testing library selectors](https://playwright.dev/docs/release-notes#locators)
for selecting elements on the page semantically.

To run these tests in development, run `npm run test:e2e` which will start the
dev server for the app as well as the Playwright client.

> **Note:** You might need to run `npx playwright install` to install the
> Playwright browsers before running your tests for the first time.

#### Problems with ShadcnUI

Some of the colors of ShadcnUI's components are lacking the necessary contrast.

You can deactivate those elements in checks like this:

```ts
const accessibilityScanResults = await new AxeBuilder({ page })
  .disableRules('color-contrast')
  .analyze();

// or

const accessibilityScanResults = await new AxeBuilder({ page })
  .disableRules('color-contrast')
  .analyze();
```

or pick a color scheme like "purple" that has good contrast.

#### VSCode Extension

If you're using VSCode, you can install the
[Playwright extension](https://github.com/microsoft/playwright-vscode) for a
better developer experience.

#### Utilities

We have a utility for testing authenticated features without having to go
through the login flow:

```ts
test('something that requires an authenticated user', async ({ page }) => {
  await loginByCookie({ page });
  // ... your tests ...
});
```

Check out the `playwright/utils.ts` file for other utility functions.

#### Miscellaneous

To mark a test as todo in Playwright,
[you have to use `.fixme()`](https://github.com/microsoft/playwright/issues/10918).

```ts
test('something that should be done later', ({}, testInfo) => {
  testInfo.fixme();
});

test.fixme('something that should be done later', async ({ page }) => {
  // ...
});

test('something that should be done later', ({ page }) => {
  test.fixme();
  // ...
});
```

The version using `testInfo.fixme()` is the "preferred" way and can be picked up
by the VSCode extension.

### Vitest ⚡️

For lower level tests of utilities and individual components, we use `vitest`.
We have DOM-specific assertion helpers via
[`@testing-library/jest-dom`](https://testing-library.com/jest-dom).

By default, Vitest runs tests in the
[`"happy-dom"` environment](https://vitest.dev/config/#environment). However,
test files that have `.server` in the name will be run in the `"node"`
environment.

### Test Scripts

- `npm run test` - Runs all Vitest tests.
- `npm run test:e2e` - Runs all E2E tests with Playwright.
- `npm run test:e2e:ui` - Runs all E2E tests with Playwright in UI mode.

### Type Checking

This project uses TypeScript. It's recommended to get TypeScript set up for your
editor to get a really great in-editor experience with type checking and
auto-complete. To run type checking across the whole project, run
`npm run type-check`.

### Linting and Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. That
is configured in `biome.json`.

It's recommended to install the
[Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
to get auto-formatting on save and inline linting feedback. You can also run
`npm run check` to format and fix linting issues across all files in the
project, or `npm run lint` to check for errors without making changes (useful
for CI).

### AI-Driven Development

This template leverages and was written with **AI-Driven Development (AIDD)**,
where you steer high-level design and let AI generate the bulk of your
implementation via
[**SudoLang**](https://github.com/paralleldrive/sudolang-llm-support), a
natural-language-style pseudocode that advanced LLMs already understand.

With AIDD you can:

- Define requirements and architecture in plain pseudocode.
- Let AI produce 90%+ of your source code (tests, UIs, state layers, etc.).
- Iterate and refactor faster, keeping consistency across your codebase.

#### Cursor AI Commands

Under `.cursor/commands/`, you'll find ready-to-use commands that automate
common workflows:

- **better-writer** – Improves writing clarity and engagement using Scott Adams'
  rules.
- **brainstorm** – Helps ideate solutions with clear trade-offs and
  recommendations.
- **commit** – Commits changes using conventional commit format.
- **debug** – Provides systematic debugging with root cause analysis.
- **documentation** – Creates clear, example-first documentation.
- **log** – Logs changes to CHANGELOG.md with conventional commit format.
- **plan** – Breaks down complex requests into manageable, sequential tasks.
- **svg-to-react** – Converts SVG files into optimized React components.
- **unit-tests** – Generates thorough, readable unit tests using Vitest.
- **write** – Produces clear, concise business writing with specific style
  guidelines.

#### Cursor AI Rules

Under `.cursor/rules/`, you'll find coding standards that AI follows:

- **js-and-ts.mdc** – JavaScript and TypeScript best practices including
  functional programming patterns, naming conventions, and code organization.
- **jsx-and-tsx.mdc** – React best practices including component patterns, form
  handling, accessibility, and internationalization.

Learn more about AIDD and SudoLang in
[The Art of Effortless Programming](https://leanpub.com/effortless-programming)
by [Eric Elliott](https://www.threads.com/@__ericelliott).

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

This template includes three Dockerfiles optimized for different package
managers:

- `Dockerfile` - for npm
- `Dockerfile.pnpm` - for pnpm
- `Dockerfile.bun` - for bun

To build and run using Docker:

```bash
# For npm
docker build -t my-app .

# For pnpm
docker build -f Dockerfile.pnpm -t my-app .

# For bun
docker build -f Dockerfile.bun -t my-app .

# Run the container
docker run -p 3001:3001 my-app
```

The containerized application can be deployed to any platform that supports
Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is
production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Maintenance

You can use

```
npx npm-check-updates -u
```

to check for updates and install the latest versions.

It should be easy to upgrade all packages since your static analysis checks and
your tests will tell you if anything is broken.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more information.

## Check Out the Epic Stack

Some of the code of this starter template was taken from or inspired by the
[Epic Stack](https://github.com/epicweb-dev/epic-stack) from
[Kent C. Dodds](http://kentcdodds.com/). His template has different defaults, so
check it out if you're looking for a different opinionated starter template.

## Built with ❤️ by [ReactSquad](https://reactsquad.io/)

If you want to hire senior React developers to augment your team, or build your
entire product from scratch,
[schedule a call with us](https://www.reactsquad.io/schedule-a-call).

## [Buidl!](https://www.urbandictionary.com/define.php?term=%23BUIDL)

Now go out there make some magic! 🧙‍♂️

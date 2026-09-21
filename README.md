# ANYwork

ANYwork is a modern two-sided service marketplace where customers discover providers, compare quotes, schedule work, and track jobs from request to completion.

## Authentication

ANYwork is connected to the Supabase **project-app** project for authentication and profile data.

- Customer and Provider use the public /signin flow.
- Admin uses the direct /admin/signin route and is intentionally not shown on the public login screen.
- Supabase Auth stores credentials in auth.users.
- AnyWork application profile data lives in public.anywork_profiles.
- New users receive a profile automatically from an Auth trigger.
- Profile RLS allows users to read/update their own profile while admins can read profiles for operations.
- The public client cannot promote itself to admin.

## Naming convention

AnyWork application tables use the anywork_ prefix:

    anywork_profiles
    anywork_service_requests
    anywork_quotes
    anywork_jobs
    anywork_messages
    anywork_reviews

Only anywork_profiles is created in the current authentication integration. The other tables are reserved for the marketplace data migration.

## Product structure

- Public marketplace: home, services, provider profiles, quote request flow
- Customer workspace: dashboard, requests, quote comparison, messages, profile
- Provider workspace: dashboard, incoming requests, quote responses, jobs, services, earnings, messages
- Admin workspace: operations dashboard, requests, providers, services, customers, settings

## Core lifecycle

Request -> Quote -> Schedule -> In Progress -> Completed

## Frontend

- React 19
- TypeScript
- Vite
- Lucide React
- CSS-based design system with reusable marketplace components
- Supabase JavaScript SDK
- Custom browser-history router for deep-linkable routes
- Responsive design system with reusable marketplace components

## Routes

    /                         Public marketplace
    /services                 Service discovery
    /providers/:id            Provider profile
    /signin                   Customer / Provider authentication
    /admin/signin             Private operations authentication

    /customer                 Customer dashboard
    /customer/requests        Customer requests
    /customer/requests/:id    Request + quote comparison
    /customer/messages        Customer messages
    /customer/profile        Customer profile

    /provider                 Provider dashboard
    /provider/requests       Provider request queue
    /provider/requests/:id   Provider quote response
    /provider/jobs           Provider jobs
    /provider/services       Provider service catalog
    /provider/earnings       Provider earnings
    /provider/messages       Provider messages
    /provider/profile        Provider profile

    /admin                    Operations dashboard
    /admin/requests           Request operations
    /admin/providers          Provider directory
    /admin/services           Service catalog
    /admin/customers         Customer management
    /admin/settings           Marketplace controls

## Guest request and quote flow

Guests can submit a service request without creating an account.

    Public request -> guest email -> provider quote -> secure quote link -> accept quote

Guest quote access uses a signed, expiring token and the request/quote portal at:

    /request/:token

Public request creation is rate-limited server-side. Provider quote emails are sent through the Supabase Edge Function and tracked in anywork_email_jobs.

## Realtime

The customer/provider workspaces use Supabase Realtime for:

- requests
- quotes
- messages
- persistent notifications
- request activity events

Notifications are stored in public.anywork_notifications so they survive refreshes and browser restarts.

## Environment

Supabase Edge Functions require these secrets:

    RESEND_API_KEY=...
    ANYWORK_EMAIL_FROM=ANYwork Services <quotes@your-domain.com>
    ANYWORK_PUBLIC_URL=https://your-domain.com
    ANYWORK_ACCESS_TOKEN_SECRET=<long-random-secret>

Keep these values in Supabase Edge Function secrets. Do not commit them.

## Local development

    npm install
    npm run dev

## Quality checks

    npm run lint
    npm run build

The public service catalog now comes from public.anywork_services with a mock-data fallback. Provider performance/review data is still sourced from the existing mock catalog until the corresponding production tables are added.
## UI system

ANYwork uses the existing marketplace design layer with reusable CSS components, responsive layouts, and shared motion/effects for page entrance, hover states, floating visuals, and image shine effects. No Tailwind/PostCSS dependency is required for the current branch.

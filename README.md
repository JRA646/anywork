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
- Tailwind CSS 4 with the Vite plugin
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

## Local development

    npm install
    npm run dev

## Quality checks

    npm run lint
    npm run build

The marketplace pages still use mock data from src/data/mockData.ts; authentication and profiles now use Supabase.
## UI system

ANYwork combines Tailwind CSS utilities with the existing marketplace design layer. Tailwind is enabled through `@tailwindcss/vite`, with shared motion utilities for page entrance, floating hero elements and image shine effects. After pulling the branch, run `npm install` once to refresh the lockfile before `npm run dev`.

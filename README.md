# ANYwork

ANYwork is a modern two-sided service marketplace where customers discover providers, compare quotes, schedule work, and track jobs from request to completion.

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
- Custom browser-history router for deep-linkable routes
- Responsive design system with reusable marketplace components

## Demo access

The sign-in screen provides demo role access for Customer, Provider, and Admin. Replace the demo session storage implementation in `src/app/App.tsx` with Supabase/Auth0/Clerk or your preferred authentication provider before production.

## Routes

```
/                         Public marketplace
/services                  Service discovery
/providers/:id             Provider profile
/signin                    Authentication / demo role selection

/customer                  Customer dashboard
/customer/requests         Customer requests
/customer/requests/:id     Request + quote comparison
/customer/messages         Customer messages
/customer/profile          Customer profile

/provider                  Provider dashboard
/provider/requests         Provider request queue
/provider/requests/:id     Provider quote response
/provider/jobs             Provider jobs
/provider/services         Provider service catalog
/provider/earnings         Provider earnings
/provider/messages         Provider messages

/admin                     Operations dashboard
/admin/requests            Request operations
/admin/providers           Provider directory
/admin/services            Service catalog
/admin/customers           Customer management
/admin/settings            Marketplace controls
```

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

The current UI uses mock data from `src/data/mockData.ts`. The next backend integration should map those types to users, providers, services, service requests, quotes, appointments, messages, reviews, payments, and invoices.

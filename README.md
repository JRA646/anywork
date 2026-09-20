# ANYwork Services

**Print. Build. Install. Maintain.**  
*Literally any work.*

This branch contains the recommended ANYwork customer and operations web app concept.

## Customer experience
- Public homepage with clear **Request a Quote** CTA
- Service discovery: Print, Build, Install, Maintain, Site, Custom
- Service detail cards with descriptions and service lists
- Quote request wizard:
  - service selection
  - job description
  - preferred date and location
  - photo/reference upload UI
  - contact details
  - confirmation/request number
- Customer portal:
  - My Jobs
  - job detail and timeline
  - progress tracking
  - quote review
  - quote approval / request changes
  - job photos
  - messages
  - profile and saved address
- Portfolio/project showcase
- Responsive mobile navigation

## Operations
- Dashboard
- Jobs
- Quotes
- Customers
- Schedule
- Projects
- Invoices
- Messages
- Job pipeline
- Daily schedule
- Recent requests
- Customer/job/quote/invoice workspaces

## UX principle
Customers do not need to understand internal operations. They should always know:
**what they requested → what ANYwork quoted → what happens next → when the work is scheduled → whether it is in progress → when it is complete → invoice/review.**

## Run
```bash
npm install
npm run dev
npm run build
```

The current branch is a frontend prototype with local/mock data. Production persistence, authentication, real file uploads, notifications, payments, and database APIs are intentionally separated as the next integration layer.
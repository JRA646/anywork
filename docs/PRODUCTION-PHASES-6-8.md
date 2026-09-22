# ANYwork production checklist — Phases 6–8

## Phase 6 — Admin intelligence
- Live dashboard KPIs use Supabase RPCs.
- Service performance reporting is database-backed.
- Reports support 7/30/90/365-day ranges.

## Phase 7 — Notifications, email and messaging
- In-app notifications are persisted in `anywork_notifications`.
- Transactional emails are queued in `anywork_email_queue`.
- Templates are editable in Admin → Email.
- `send-notification-email` sends queued messages through Resend.
- Configure `RESEND_API_KEY` and `ANYWORK_EMAIL_FROM` as Supabase Edge Function secrets.

## Phase 8 — Production hardening
- Keep Supabase keys and provider secrets in environment/secret storage.
- Never put service-role keys in Vite client variables.
- Validate upload MIME type and size before storage.
- Keep privileged mutations behind RPCs/RLS.
- Run `npm run build` in CI before deployment.
- Review RLS policies after every schema change.
- Configure Google/Apple OAuth secrets only in Supabase Auth.
- Configure payment gateway credentials and webhooks separately.

## Deployment
1. Apply migrations with `supabase db push`.
2. Deploy Edge Functions.
3. Set Edge Function secrets.
4. Set Vercel environment variables.
5. Run the production build.
6. Verify customer, provider and admin routing.
7. Test request → quote → accept → schedule → complete → invoice → payment → review.
8. Test notification and email delivery with a verified sender domain.

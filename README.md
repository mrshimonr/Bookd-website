# Bookd

Bookd is an all-in-one booking platform for service businesses, appointment businesses, events, and transportation/reservations.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase and Stripe test credentials.
3. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
4. Run `npm install` and `npm run dev`.

## Deployment

Import this repository into Vercel, add the environment variables from `.env.example`, and deploy.

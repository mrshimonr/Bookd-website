alter table public.bookings add column if not exists custom_data jsonb not null default '{}';

update public.businesses
set crm_settings = coalesce(crm_settings, '{}'::jsonb) || jsonb_build_object(
  'accent_color', coalesce(crm_settings->>'accent_color', theme->>'color', '#4f46e5'),
  'display_style', coalesce(crm_settings->>'display_style', 'comfortable')
)
where crm_settings is null
   or not (crm_settings ? 'accent_color')
   or not (crm_settings ? 'display_style');

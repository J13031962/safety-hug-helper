SOS Alerta - Emergency security system with monitoring central (renamed from TeleGuardia)

## Design System
- Theme: Dark by default (no .dark class needed, :root IS dark)
- Fonts: Inter (body), Space Grotesk (headings)
- Emergency colors: panic=red, medical=blue, fire=orange, disaster=yellow
- CSS vars: --emergency-panic, --emergency-medical, --emergency-fire, --emergency-disaster
- Tailwind: emergency-panic, emergency-medical, emergency-fire, emergency-disaster
- Animations: emergency-pulse, ripple, shake, blink-red

## Architecture
- Roles stored in user_roles table (app_role enum: admin, operator, director_monitoreo, supervisor_central)
- has_role() security definer function for RLS
- Tables: alarms, profiles, user_roles, registered_numbers, gps_devices
- Auth: Supabase Auth with auto-profile creation trigger
- Edge functions: send-whatsapp, create-user, update-user
- localStorage key: sosalerta_settings

TeleGuardia - Emergency security system with monitoring central

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
- Tables: alarms (realtime), profiles, user_roles, registered_numbers, gps_devices, parcels
- parcels table: name (unique), whatsapp_group_id — each parcel has its own WhatsApp group
- Auth: Supabase Auth with auto-profile creation trigger
- Edge functions: send-whatsapp (per-parcel group + individual), create-user, update-user, delete-user
- Admin user: admin@teleguardia.com / Admin2026*
- WhatsApp: TextMeBot API, group messages use recipient=GROUP_ID@g.us

## Pages
- / = Emergency buttons (public)
- /login = Auth login
- /plataforma = Role-based router
- /admin = Admin panel (7 tabs: Users, WhatsApp, Parcels, GPS, Alarms History, Reports, Settings)
- /operador = Operator dashboard (realtime alarms with process/resolve flow)

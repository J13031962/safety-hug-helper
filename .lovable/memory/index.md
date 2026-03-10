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
- Tables: alarms (realtime enabled), profiles, user_roles, registered_numbers, gps_devices
- Auth: Supabase Auth with auto-profile creation trigger
- Edge functions: send-whatsapp, create-user, update-user, delete-user
- Admin user: admin@teleguardia.com / Admin2026*

## Pages
- / = Emergency buttons (public)
- /login = Auth login
- /plataforma = Role-based router
- /admin = Admin panel (5 tabs: Users, WhatsApp Numbers, GPS, Alarms History, Settings)
- /operador = Operator dashboard (realtime alarms with process/resolve flow)
- /configuracion = Settings (legacy, moved to admin)

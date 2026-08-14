# Project Memory

## Core
TeleGuardia emergency system. Supabase (DB, Auth, Edge Functions, RLS via `has_role()`).
Roles: admin, operator, director_monitoreo (acts as admin), supervisor_central.
Dark theme default (inline head script to prevent flash), Inter & Space Grotesk fonts.
Emergency colors: Panic(Red), Medical(Blue), Fire(Orange), Disaster(Yellow). Critical animations.
Multi-parcel users must explicitly select parcel before confirming alarm.
GPS devices linked to parcels via gps_device_parcels (many-to-many).

## Memories
- [TeleGuardia Architecture](mem://project/architecture) — Supabase schema, roles, and high-level structure
- [Design System](mem://style/design-system) — Theming, colors, fonts, and critical state animations
- [GPS Relay System](mem://features/gps-relay-system) — Traccar integration for sirens/relays via process-relay-jobs edge function
- [WhatsApp Alerts](mem://features/whatsapp-alerts) — Message formatting and group-only delivery rules
- [Multi-Parcel Flow](mem://features/multi-parcel-flow) — Handling users registered in multiple parcels
- [SIA-DCS CRA](mem://features/sia-dcs) — SIA-DCS protocol, event codes (PA/FA/MA/BA/OP), test button, multi-parcel GPS
- [BLE Gateway](mem://features/ble-gateway) — Endpoint ble-button-event, ble_devices/ble_events, token x-ble-token, dedup en BD

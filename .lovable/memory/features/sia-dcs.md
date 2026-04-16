---
name: SIA-DCS CRA Integration
description: SIA-DCS protocol for sending alarm events to CRA via TCP, including test (OP) events and multi-parcel GPS
type: feature
---
# SIA-DCS Integration with CRA

## Protocol
- SIA-DCS over TCP with CRLF line ending
- Server: 51.79.66.148:9558
- Message format: `"SIA-DCS"0001L0#ACCOUNT[#ACCOUNT|XXZONE]_\r\n`

## Event Codes
- PA = Pánico (panic)
- FA = Incendio (fire)
- MA = Médica (medical)
- BA = Robo/Desastre (disaster)
- OP = Apertura/Prueba (test) — sent without zone suffix

## Data Model
- `parcels.account_number` — CRA subscriber number (e.g. "9999")
- `registered_numbers.user_number` — CRA zone number per user+parcel (e.g. "001")
- `registered_numbers.is_parcel_admin` — enables test siren button for user
- `gps_device_parcels` — many-to-many: device_id + parcel_name (replaced single parcel_name on gps_devices)

## Edge Functions
- `send-sia-event` — receives alarm_type, parcel_name, phone_number; sends SIA-DCS via TCP
- `send-gps-command` — queries gps_device_parcels for devices; supports mode="test" for single IMEI activation

## Test Button
- Users with is_parcel_admin see 5th "PRUEBA DE SIRENAS" button
- Lists all sirens (GPS devices) for their parcels
- Activates individually: engineStop via send-gps-command (mode=test) + SIA OP event
- Auto-off after relay_duration via scheduled engineResume job

## Test Data
- Parcela "Teleguardia" → account_number: 9999

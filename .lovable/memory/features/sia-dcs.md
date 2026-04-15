# SIA-DCS Integration with CRA

## Protocol
- SIA-DCS over TCP
- Server: 51.79.66.148:9558
- Message format: `"SIA-DCS"0001L0#ACCOUNT[#ACCOUNT|XXZONE]_`

## Event Codes
- PA = Pánico (panic)
- FA = Incendio (fire)
- MA = Médica (medical)
- BA = Robo/Desastre (disaster)

## Data Model
- `parcels.account_number` — CRA subscriber number (e.g. "9999")
- `registered_numbers.user_number` — CRA zone number per user+parcel (e.g. "001")

## Edge Function
- `send-sia-event` — receives alarm_type, parcel_name, phone_number
- Looks up account_number from parcels table
- Looks up user_number from registered_numbers (matching phone + parcel)
- Sends SIA-DCS message via TCP
- Called from ConfirmDialog after WhatsApp and GPS

## Test Data
- Parcela "Teleguardia" → account_number: 9999

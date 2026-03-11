

# Plan: Create `send-whatsapp` Edge Function using CallMeBot API

## Problem
The app calls `supabase.functions.invoke("send-whatsapp")` but this edge function doesn't exist, so WhatsApp messages never send.

## How CallMeBot Works
The CallMeBot API sends WhatsApp messages via a simple GET request:
```
https://api.callmebot.com/whatsapp.php?phone=<NUMBER>&text=<MESSAGE>&apikey=<KEY>
```

## Implementation

### 1. Create edge function `supabase/functions/send-whatsapp/index.ts`
- Receives alarm data (alarm_type, sender_name, phone_number, parcel_name, house_number, latitude, longitude, address)
- Queries `registered_numbers` table to get all contacts with their `callmebot_apikey`
- If `parcel_name` is provided in the alarm, filters contacts to that parcel only
- For each contact, sends a GET request to CallMeBot API with a formatted emergency message
- Returns success/failure summary

### 2. Update `supabase/config.toml`
- Add `[functions.send-whatsapp]` with `verify_jwt = false` (called from public alarm insert flow)

### 3. Message format
The WhatsApp message will include:
- Emergency type (Pánico, Médica, Incendio, Desastre)
- Sender name, house number, parcel
- Google Maps link if coordinates available
- Address if available

### Notes
- The `callmebot_apikey` is already stored as `"zjuu3vP3HD6Z"` for all numbers — this will be used per-contact from the DB
- No new secrets needed; CallMeBot uses per-number API keys stored in the table
- Messages are sent in parallel for speed


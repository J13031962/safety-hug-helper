

## Plan: Enviar mensaje WhatsApp en pruebas de sirena

### Resumen
Cuando un admin de parcelación activa una prueba de sirena, enviar un mensaje WhatsApp al grupo de la parcela usando el mismo formato actual pero indicando que es una prueba e incluyendo el nombre de la sirena disparada.

### Cambios

#### 1. `send-whatsapp/index.ts` — Soporte para tipo "test"
- Agregar `test` al mapa `ALARM_LABELS`: `test: "🔔 PRUEBA DE SIRENA"`
- Leer un nuevo campo opcional `siren_name` del body
- Si `siren_name` está presente, agregarlo al mensaje: `📡 Sirena: {siren_name}`

#### 2. `TestSirenDialog.tsx` — Invocar send-whatsapp tras activar
- Después de activar la sirena y enviar el evento SIA, llamar `send-whatsapp` para cada parcela de la sirena con:
  - `alarm_type: "test"`
  - `sender_name`: nombre del usuario
  - `parcel_name`: parcela
  - `siren_name`: nombre/modelo/IMEI de la sirena activada

### Formato del mensaje WhatsApp
```
*SmartSOS informa:*

🔔 PRUEBA DE SIRENA

👤 Juan Pérez
📡 Sirena: Entrada Principal
📍 Parcela: Teleguardia

🌐 www.teleguardia.com
```

### Archivos a modificar
- `supabase/functions/send-whatsapp/index.ts` — agregar label "test" y campo `siren_name`
- `src/components/TestSirenDialog.tsx` — invocar `send-whatsapp` en `handleActivate`



Cambio simple: ajustar el mensaje de WhatsApp cuando `alarm_type === "test"` para no mostrar el nombre del usuario y usar un texto genérico.

### Cambio en `supabase/functions/send-whatsapp/index.ts`

Cuando `alarm_type === "test"`, el mensaje será:

```
*SmartSOS informa:*

🔔 PRUEBA DE SIRENA

La sirena "{siren_name}" fue activada en modo de prueba por un administrador de la comunidad.

📍 Parcela: {parcel_name}

💬 Chat en grupo: {invite_link}

🌐 www.teleguardia.com
```

Lógica:
- Si `alarm_type === "test"`: omitir la línea `👤 {sender_name}` y la línea `📡 Sirena: ...`, y en su lugar agregar la frase descriptiva con el nombre de la sirena.
- Para el resto de alarmas, mantener el formato actual sin cambios.

### Archivo a modificar
- `supabase/functions/send-whatsapp/index.ts` — bifurcar la construcción del mensaje según `alarm_type === "test"`.

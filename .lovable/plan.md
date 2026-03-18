

## Plan: Reemplazar número de teléfono por enlace "💬 Chat en grupo" en el mensaje de WhatsApp

### Problema actual
El mensaje de emergencia muestra `📞 3331234567` (el número del remitente). El usuario quiere que en su lugar aparezca un enlace al grupo de WhatsApp de la parcela, para que las personas puedan entrar al grupo y comunicarse allí.

### Cambios necesarios

#### 1. Agregar columna `whatsapp_invite_link` a la tabla `parcels`
- Migración SQL para añadir `whatsapp_invite_link TEXT` a `parcels`
- Este campo almacenará el enlace de invitación del grupo (ej: `https://chat.whatsapp.com/AbCdEfGhIjK`)

#### 2. Actualizar el edge function `send-whatsapp`
- Al construir el mensaje, en vez de `📞 {phone_number}`, consultar el `whatsapp_invite_link` de la parcela
- Si existe el invite link: mostrar `💬 Chat en grupo: {link}`
- Si no existe: no mostrar nada (o mantener el número como fallback)

#### 3. Actualizar el panel admin `ParcelsTab`
- Agregar campo de entrada para el enlace de invitación de WhatsApp en el formulario de crear/editar parcela
- Mostrar el enlace en la tabla de parcelas

### Resultado esperado del mensaje
```text
*SmartSOS informa:*

🚨 PÁNICO

👤 Juan Pérez
🏠 Casa: 12
📍 Parcela: teleguardia
📌 Calle 50 #30-20
🗺️ https://maps.google.com/?q=6.18,-75.56

💬 Chat en grupo: https://chat.whatsapp.com/AbCdEfGhIjK

🌐 www.teleguardia.com
```


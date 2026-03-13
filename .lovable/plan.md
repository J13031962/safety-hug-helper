
## Plan: Enviar alertas solo al grupo de WhatsApp, no individual

### Problema actual
La función `send-whatsapp` envía el mensaje al grupo de WhatsApp **y además** a cada contacto individual uno por uno. Esto causa mensajes duplicados y consume el rate-limit de TextMeBot.

### Cambio propuesto
Eliminar la sección 2 de la función (`Send to individual contacts`, líneas 139-189) para que solo se envíe al grupo de WhatsApp de la parcela. Los miembros del grupo recibirán el mensaje dentro del grupo.

### Archivo a modificar
- `supabase/functions/send-whatsapp/index.ts`: Remover todo el bloque de envío individual (líneas 139 hasta el final del loop) y retornar directamente después del envío al grupo.

### Resultado
- Una sola llamada a TextMeBot por alerta (al grupo)
- Sin duplicados
- Sin problemas de rate-limit

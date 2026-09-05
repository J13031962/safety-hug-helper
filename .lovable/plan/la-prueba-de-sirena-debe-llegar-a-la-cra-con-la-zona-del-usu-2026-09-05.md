# La prueba de sirena debe llegar a la CRA con la zona del usuario que la envió

## Situación actual (verificada)

- Cuando alguien pulsa "Prueba de sirenas", la app avisa a la CRA indicando solo la parcelación, sin decir quién fue. Por eso la CRA siempre recibe la zona por defecto `001`.
- En la base de datos, Santiago Barrientos figura en Santa Paula con número de usuario (zona) `02`, así que el dato ya existe y solo falta enviarlo.

## Qué se va a cambiar

- Al activar una prueba de sirena, la app enviará también el teléfono de quien la activó. Con ese teléfono, el sistema busca su número de usuario en la parcelación correspondiente y lo manda a la CRA como zona.
- Ejemplo para Santa Paula (cuenta 9999), prueba enviada por Santiago (usuario 02):

```text
"SIA-DCS"0001L0#9999[#9999|TA002]_
```

- Si el teléfono no está registrado en esa parcelación, se sigue usando `001` como hasta ahora, para no dejar de avisar.
- WhatsApp no cambia: allí se mantiene sin identificar al administrador, tal como está hoy.

## Detalles técnicos

- `src/components/TestSirenDialog.tsx`: incluir `phone_number` (desde `sosalerta_settings.phoneNumber` en localStorage) en el cuerpo del `invoke("send-sia-event")`; pasarlo como prop desde `src/pages/Index.tsx`.
- `supabase/functions/send-sia-event/index.ts` ya resuelve la zona por `phone_number` contra `registered_numbers` (comparación por dígitos y `padStart(3,"0")`), así que no requiere cambios.
- El envío de WhatsApp de prueba queda igual (sin nombre del administrador).

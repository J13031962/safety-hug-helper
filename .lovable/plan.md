

# TeleGuardia - Plan de Implementación

Sistema integral de seguridad y emergencias con central de monitoreo.

## Fase 1: Fundación (Base de datos + Auth + Estilos)

1. **Configurar Lovable Cloud** con las tablas: `alarms`, `profiles`, `user_roles`, `registered_numbers`, `gps_devices`
2. **Crear enum `app_role`** (admin, operator, director_monitoreo, supervisor_central) y función `has_role()`
3. **Políticas RLS** para todas las tablas
4. **Tema oscuro** con paleta de emergencias (rojo/azul/naranja/amarillo), fuentes Inter + Space Grotesk, animaciones custom (pulse, ripple, shake)
5. **Hook `useAuth`** con Supabase Auth, roles desde `user_roles`, timeout de 5s

## Fase 2: Páginas principales

6. **Página principal (`/`)** - Cuadrícula de 4 botones de emergencia (Pánico, Médica, Incendio, Desastre) con animaciones, diálogo de confirmación con cuenta regresiva de 6s, geolocalización, inserción en BD
7. **Login (`/login`)** - Auth con email/contraseña + flujo de primer admin (si no hay admins, mostrar setup)
8. **Página de configuración** - Nombre del usuario, número de casa, parcela
9. **Plataforma (`/plataforma`)** - Router por rol: admin → AdminPanel, operador → OperatorDashboard

## Fase 3: Paneles

10. **AdminPanel (`/admin`)** - Tabs: Gestión de usuarios (crear/editar/eliminar con roles), gestión de números WhatsApp (con apikey CallMeBot), gestión de dispositivos GPS
11. **OperatorDashboard** - Lista de alarmas pendientes/procesadas, notificaciones en tiempo real (Supabase Realtime), sonido de alerta, procesamiento con observaciones obligatorias, exportación PDF

## Fase 4: Edge Functions

12. **`send-whatsapp`** - Envía alertas vía CallMeBot API a números registrados con rate limit de 2s
13. **`create-user`** - Crea usuario (auth + profile + role), validando que el caller sea admin
14. **`update-user`** - Actualiza contraseña/nombre/rol

## Fase 5: Monitoreo GPS

15. **MonitoringCenter (`/monitoreo`)** - UI para registro de dispositivos por IMEI, visualización de señales, control remoto de sirena, estado online/offline con auto-refresh cada 5s

> **Nota**: El servidor TCP (Node.js, puerto 9596) para GPS VT08F no puede ejecutarse en Lovable — requiere hosting externo. Se construirá la UI y la API HTTP que se conectará a ese servidor.

## Orden de implementación

Se construirá en este orden: Fase 1 → 2 → 3 → 4 → 5, dividido en múltiples iteraciones para mantener los cambios manejables.

## Componentes clave a crear

- `EmergencyGrid.tsx` - Cuadrícula con botones animados
- `ConfirmDialog.tsx` - Diálogo con countdown + geolocalización
- `SettingsPage.tsx` - Configuración de perfil
- `ReportsTab.tsx` - Informes con export PDF
- Reutilización extensiva de componentes shadcn/ui existentes


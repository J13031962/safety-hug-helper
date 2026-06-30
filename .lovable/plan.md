Plan para corregir el formulario de /admin:

1. Revisar el estado real del modal de edición de usuarios y confirmar por qué no aparece la sección de parcelaciones aunque el usuario sea operador.
2. Ajustar `UsersTab` para que la sección de “Parcelaciones asignadas” dependa de forma confiable del rol seleccionado/cargado y no desaparezca por un valor de rol inconsistente.
3. Mejorar la carga de parcelaciones asignadas al abrir un operador, dejando un estado claro si no hay parcelaciones creadas o si aún están cargando.
4. Mantener el guardado actual: al guardar un operador se enviarán las parcelaciones seleccionadas a la función de actualización.
5. Verificar en la vista `/admin` que al editar un operador aparezca la opción de asignarle parcelación.
Ajustar el centrado del botón **VIOLENCIA INTRAFAMILIAR** para que quede exactamente alineado con la mitad entre los botones **INCENDIO** y **DESASTRE**.

## Problema actual
En `EmergencyGrid.tsx` el botón verde está dentro de un contenedor flex con `w-[calc(50%-0.375rem)]` y `items-center`. Esto lo centra aproximadamente, pero no garantiza una alineación exacta con la línea media entre las dos celdas inferiores, lo que se nota en el preview.

## Cambio propuesto
Refactorizar el layout del grid para usar una sola grilla de 4 columnas:
- Los 4 botones principales ocupan 2 columnas cada uno (`col-span-2`), manteniendo sus mismas dimensiones.
- El botón **VIOLENCIA** ocupa las 2 columnas centrales (`col-start-2 col-span-2`), quedando así perfectamente centrado sobre el espacio entre **INCENDIO** y **DESASTRE**.

## Archivos a modificar
- `src/components/EmergencyGrid.tsx`: reemplazar el grid 2×2 + contenedor flex por un grid 4 columnas con `col-span-2` / `col-start-2 col-span-2`.

## Verificación
- Revisar visualmente en el preview que el botón verde queda centrado entre INCENDIO y DESASTRE.
- Probar en viewport móvil (≤390 px) para confirmar que no se desplaza hacia un lado.

No se requieren cambios en backend, SIA, WhatsApp ni en la base de datos; es solo un ajuste de layout CSS.
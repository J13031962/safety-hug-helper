export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alarma_tiempos: {
        Row: {
          alarma_id: string
          created_at: string
          detalles: Json | null
          evento_tipo: string
          id: string
          timestamp_evento: string
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          alarma_id: string
          created_at?: string
          detalles?: Json | null
          evento_tipo: string
          id?: string
          timestamp_evento?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          alarma_id?: string
          created_at?: string
          detalles?: Json | null
          evento_tipo?: string
          id?: string
          timestamp_evento?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alarma_tiempos_alarma_id_fkey"
            columns: ["alarma_id"]
            isOneToOne: false
            referencedRelation: "alarmas"
            referencedColumns: ["id"]
          },
        ]
      }
      alarmas: {
        Row: {
          asignador_supervisor_id: string | null
          asignador_supervisor_nombre: string | null
          attended_at: string | null
          cancelada_at: string | null
          cancelada_por: string | null
          cancelada_por_nombre: string | null
          cliente_id: string | null
          created_at: string | null
          descripcion: string | null
          despachador_id: string | null
          despachador_nombre: string | null
          direccion: string | null
          duracion_sitio_segundos: number | null
          empresa_contratada_id: string | null
          es_pro: boolean
          estado: string | null
          finalizacion_manual: boolean
          finalizada_manual_nombre: string | null
          finalizada_manual_por: string | null
          id: string
          motivo_cancelacion: string | null
          motivo_finalizacion_manual: string | null
          municipio: string | null
          nombre_zona: string | null
          numero_zona: string | null
          observaciones_count: number | null
          operador_id: string | null
          operador_nombre: string | null
          patrulla_asignada: string | null
          prioridad: string | null
          qr_llegada_data: Json | null
          qr_salida_data: Json | null
          reactivacion_motivo: string | null
          reactivada_at: string | null
          reactivada_por: string | null
          reactivada_por_nombre: string | null
          resolved_at: string | null
          supervisor: string | null
          supervisor_id: string | null
          supervisor_llegada: string | null
          supervisor_salida: string | null
          tiempo_aceptacion_supervisor: string | null
          tiempo_asignacion: string | null
          tiempo_asignacion_supervisor: string | null
          tiempo_atencion: string | null
          tiempo_llegada_sitio: string | null
          tiempo_primera_lectura_qr: string | null
          tiempo_respuesta_segundos: number | null
          tiempo_salida_sitio: string | null
          tiempo_segunda_lectura_qr: string | null
          tiempo_toma_despachador: string | null
          tipo: string
          tipo_sensor: string | null
          ubicacion_inicio_servicio: Json | null
          ubicacion_primer_qr: string | null
          ubicacion_segundo_qr: string | null
          ubicacion_supervisor_llegada: Json | null
          ubicacion_supervisor_salida: Json | null
        }
        Insert: {
          asignador_supervisor_id?: string | null
          asignador_supervisor_nombre?: string | null
          attended_at?: string | null
          cancelada_at?: string | null
          cancelada_por?: string | null
          cancelada_por_nombre?: string | null
          cliente_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          despachador_id?: string | null
          despachador_nombre?: string | null
          direccion?: string | null
          duracion_sitio_segundos?: number | null
          empresa_contratada_id?: string | null
          es_pro?: boolean
          estado?: string | null
          finalizacion_manual?: boolean
          finalizada_manual_nombre?: string | null
          finalizada_manual_por?: string | null
          id?: string
          motivo_cancelacion?: string | null
          motivo_finalizacion_manual?: string | null
          municipio?: string | null
          nombre_zona?: string | null
          numero_zona?: string | null
          observaciones_count?: number | null
          operador_id?: string | null
          operador_nombre?: string | null
          patrulla_asignada?: string | null
          prioridad?: string | null
          qr_llegada_data?: Json | null
          qr_salida_data?: Json | null
          reactivacion_motivo?: string | null
          reactivada_at?: string | null
          reactivada_por?: string | null
          reactivada_por_nombre?: string | null
          resolved_at?: string | null
          supervisor?: string | null
          supervisor_id?: string | null
          supervisor_llegada?: string | null
          supervisor_salida?: string | null
          tiempo_aceptacion_supervisor?: string | null
          tiempo_asignacion?: string | null
          tiempo_asignacion_supervisor?: string | null
          tiempo_atencion?: string | null
          tiempo_llegada_sitio?: string | null
          tiempo_primera_lectura_qr?: string | null
          tiempo_respuesta_segundos?: number | null
          tiempo_salida_sitio?: string | null
          tiempo_segunda_lectura_qr?: string | null
          tiempo_toma_despachador?: string | null
          tipo: string
          tipo_sensor?: string | null
          ubicacion_inicio_servicio?: Json | null
          ubicacion_primer_qr?: string | null
          ubicacion_segundo_qr?: string | null
          ubicacion_supervisor_llegada?: Json | null
          ubicacion_supervisor_salida?: Json | null
        }
        Update: {
          asignador_supervisor_id?: string | null
          asignador_supervisor_nombre?: string | null
          attended_at?: string | null
          cancelada_at?: string | null
          cancelada_por?: string | null
          cancelada_por_nombre?: string | null
          cliente_id?: string | null
          created_at?: string | null
          descripcion?: string | null
          despachador_id?: string | null
          despachador_nombre?: string | null
          direccion?: string | null
          duracion_sitio_segundos?: number | null
          empresa_contratada_id?: string | null
          es_pro?: boolean
          estado?: string | null
          finalizacion_manual?: boolean
          finalizada_manual_nombre?: string | null
          finalizada_manual_por?: string | null
          id?: string
          motivo_cancelacion?: string | null
          motivo_finalizacion_manual?: string | null
          municipio?: string | null
          nombre_zona?: string | null
          numero_zona?: string | null
          observaciones_count?: number | null
          operador_id?: string | null
          operador_nombre?: string | null
          patrulla_asignada?: string | null
          prioridad?: string | null
          qr_llegada_data?: Json | null
          qr_salida_data?: Json | null
          reactivacion_motivo?: string | null
          reactivada_at?: string | null
          reactivada_por?: string | null
          reactivada_por_nombre?: string | null
          resolved_at?: string | null
          supervisor?: string | null
          supervisor_id?: string | null
          supervisor_llegada?: string | null
          supervisor_salida?: string | null
          tiempo_aceptacion_supervisor?: string | null
          tiempo_asignacion?: string | null
          tiempo_asignacion_supervisor?: string | null
          tiempo_atencion?: string | null
          tiempo_llegada_sitio?: string | null
          tiempo_primera_lectura_qr?: string | null
          tiempo_respuesta_segundos?: number | null
          tiempo_salida_sitio?: string | null
          tiempo_segunda_lectura_qr?: string | null
          tiempo_toma_despachador?: string | null
          tipo?: string
          tipo_sensor?: string | null
          ubicacion_inicio_servicio?: Json | null
          ubicacion_primer_qr?: string | null
          ubicacion_segundo_qr?: string | null
          ubicacion_supervisor_llegada?: Json | null
          ubicacion_supervisor_salida?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "alarmas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmas_empresa_contratada_id_fkey"
            columns: ["empresa_contratada_id"]
            isOneToOne: false
            referencedRelation: "empresas_contratadas"
            referencedColumns: ["id"]
          },
        ]
      }
      archivado_ejecuciones: {
        Row: {
          bloque: string
          created_at: string
          fecha_corte: string
          filas_eliminadas: number
          id: string
          tabla: string
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          bloque: string
          created_at?: string
          fecha_corte: string
          filas_eliminadas?: number
          id?: string
          tabla: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          bloque?: string
          created_at?: string
          fecha_corte?: string
          filas_eliminadas?: number
          id?: string
          tabla?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: []
      }
      cable_compras: {
        Row: {
          cable_type_id: string
          costo_total: number
          created_at: string
          created_by: string | null
          created_by_nombre: string | null
          fecha_compra: string
          foto_factura_url: string | null
          id: string
          metros: number
          notas: string | null
          proveedor: string | null
          updated_at: string
        }
        Insert: {
          cable_type_id: string
          costo_total?: number
          created_at?: string
          created_by?: string | null
          created_by_nombre?: string | null
          fecha_compra?: string
          foto_factura_url?: string | null
          id?: string
          metros: number
          notas?: string | null
          proveedor?: string | null
          updated_at?: string
        }
        Update: {
          cable_type_id?: string
          costo_total?: number
          created_at?: string
          created_by?: string | null
          created_by_nombre?: string | null
          fecha_compra?: string
          foto_factura_url?: string | null
          id?: string
          metros?: number
          notas?: string | null
          proveedor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cable_compras_cable_type_id_fkey"
            columns: ["cable_type_id"]
            isOneToOne: false
            referencedRelation: "cable_types"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_consumos: {
        Row: {
          asignado_por: string | null
          asignado_por_nombre: string | null
          asignado_por_rol: string | null
          cable_type_id: string
          created_at: string
          factura_url: string | null
          fecha_asignacion: string
          id: string
          metros: number
          notas: string | null
          precio: number
          proyecto_id: string
        }
        Insert: {
          asignado_por?: string | null
          asignado_por_nombre?: string | null
          asignado_por_rol?: string | null
          cable_type_id: string
          created_at?: string
          factura_url?: string | null
          fecha_asignacion?: string
          id?: string
          metros: number
          notas?: string | null
          precio?: number
          proyecto_id: string
        }
        Update: {
          asignado_por?: string | null
          asignado_por_nombre?: string | null
          asignado_por_rol?: string | null
          cable_type_id?: string
          created_at?: string
          factura_url?: string | null
          fecha_asignacion?: string
          id?: string
          metros?: number
          notas?: string | null
          precio?: number
          proyecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cable_consumos_cable_type_id_fkey"
            columns: ["cable_type_id"]
            isOneToOne: false
            referencedRelation: "cable_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cable_consumos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      cable_types: {
        Row: {
          activo: boolean
          calibre: string | null
          color: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          calibre?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          calibre?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string | null
          dealer: string | null
          direccion: string | null
          email: string | null
          empresa_contratada_id: string | null
          estado: string | null
          fecha_contrato: string | null
          id: string
          latitud: number | null
          limite_acompanamientos_personalizado: number | null
          limite_patrullas_personalizado: number | null
          limite_revistas_personalizado: number | null
          longitud: number | null
          municipio: string | null
          nombre: string
          numero_cuenta: string | null
          observaciones: string | null
          servicios_contratados: Json | null
          telefono: string | null
          tipo_servicio: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dealer?: string | null
          direccion?: string | null
          email?: string | null
          empresa_contratada_id?: string | null
          estado?: string | null
          fecha_contrato?: string | null
          id?: string
          latitud?: number | null
          limite_acompanamientos_personalizado?: number | null
          limite_patrullas_personalizado?: number | null
          limite_revistas_personalizado?: number | null
          longitud?: number | null
          municipio?: string | null
          nombre: string
          numero_cuenta?: string | null
          observaciones?: string | null
          servicios_contratados?: Json | null
          telefono?: string | null
          tipo_servicio?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dealer?: string | null
          direccion?: string | null
          email?: string | null
          empresa_contratada_id?: string | null
          estado?: string | null
          fecha_contrato?: string | null
          id?: string
          latitud?: number | null
          limite_acompanamientos_personalizado?: number | null
          limite_patrullas_personalizado?: number | null
          limite_revistas_personalizado?: number | null
          longitud?: number | null
          municipio?: string | null
          nombre?: string
          numero_cuenta?: string | null
          observaciones?: string | null
          servicios_contratados?: Json | null
          telefono?: string | null
          tipo_servicio?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_contratada_id_fkey"
            columns: ["empresa_contratada_id"]
            isOneToOne: false
            referencedRelation: "empresas_contratadas"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_items: {
        Row: {
          cantidad: number
          cotizacion_id: string
          created_at: string
          descripcion: string
          id: string
          precio_unitario: number
          total: number
        }
        Insert: {
          cantidad?: number
          cotizacion_id: string
          created_at?: string
          descripcion: string
          id?: string
          precio_unitario?: number
          total?: number
        }
        Update: {
          cantidad?: number
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          precio_unitario?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          cliente_id: string | null
          cliente_nombre: string
          created_at: string
          descuento: number
          estado: string
          fecha_expiracion: string
          id: string
          numero_cotizacion: string
          subtotal: number
          terminos_pago: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id?: string | null
          cliente_nombre: string
          created_at?: string
          descuento?: number
          estado?: string
          fecha_expiracion: string
          id?: string
          numero_cotizacion: string
          subtotal?: number
          terminos_pago?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string | null
          cliente_nombre?: string
          created_at?: string
          descuento?: number
          estado?: string
          fecha_expiracion?: string
          id?: string
          numero_cotizacion?: string
          subtotal?: number
          terminos_pago?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones_servicios: {
        Row: {
          cliente_email: string | null
          cliente_nombre: string
          cliente_telefono: string | null
          completada_at: string | null
          completada_por: string | null
          created_at: string
          descripcion: string
          estado: string
          id: string
          observaciones: string | null
          servicio_id: string | null
          tecnico_id: string
          tecnico_nombre: string | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_nombre: string
          cliente_telefono?: string | null
          completada_at?: string | null
          completada_por?: string | null
          created_at?: string
          descripcion: string
          estado?: string
          id?: string
          observaciones?: string | null
          servicio_id?: string | null
          tecnico_id: string
          tecnico_nombre?: string | null
        }
        Update: {
          cliente_email?: string | null
          cliente_nombre?: string
          cliente_telefono?: string | null
          completada_at?: string | null
          completada_por?: string | null
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          observaciones?: string | null
          servicio_id?: string | null
          tecnico_id?: string
          tecnico_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_servicios_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_tecnicos_asignados"
            referencedColumns: ["id"]
          },
        ]
      }
      cotpro_aprobacion_comprobantes: {
        Row: {
          aprobacion_id: string
          created_at: string
          id: string
          nombre: string | null
          pago_id: string | null
          subido_por: string | null
          tipo: string | null
          url: string
        }
        Insert: {
          aprobacion_id: string
          created_at?: string
          id?: string
          nombre?: string | null
          pago_id?: string | null
          subido_por?: string | null
          tipo?: string | null
          url: string
        }
        Update: {
          aprobacion_id?: string
          created_at?: string
          id?: string
          nombre?: string | null
          pago_id?: string | null
          subido_por?: string | null
          tipo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotpro_aprobacion_comprobantes_aprobacion_id_fkey"
            columns: ["aprobacion_id"]
            isOneToOne: false
            referencedRelation: "cotpro_aprobaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotpro_aprobacion_comprobantes_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "cotpro_pagos"
            referencedColumns: ["id"]
          },
        ]
      }
      cotpro_aprobaciones: {
        Row: {
          adelanto_porcentaje: number | null
          adelanto_recibido_at: string | null
          adelanto_recibido_valor: number | null
          adelanto_registrado_por: string | null
          adelanto_valor: number | null
          aprobada_at: string
          aprobada_por: string | null
          aprobada_por_nombre: string | null
          cliente_nombre: string | null
          condiciones: string | null
          cotizacion_eliminada_at: string | null
          cotizacion_id: string
          cotizacion_numero: string | null
          created_at: string
          factura_fecha: string | null
          factura_generada_at: string | null
          factura_generada_por: string | null
          factura_generada_por_nombre: string | null
          factura_numero: string | null
          forma_pago: string | null
          id: string
          instalacion_finalizada_at: string | null
          instalacion_finalizada_por: string | null
          instalacion_finalizada_por_nombre: string | null
          instalacion_iniciada_at: string | null
          instalacion_iniciada_por: string | null
          instalacion_iniciada_por_nombre: string | null
          pagado_at: string | null
          pagado_nota: string | null
          pagado_por: string | null
          pagado_por_nombre: string | null
          pago_completo_at: string | null
          pasada_pago_parcial: boolean
          pasada_pago_parcial_faltante: number | null
          pasada_pago_parcial_motivo: string | null
          pasada_tecnico_at: string | null
          pasada_tecnico_por: string | null
          pasada_tecnico_por_nombre: string | null
          pendiente_facturacion_at: string | null
          requiere_adelanto: boolean
          revisada_at: string | null
          revisada_por: string | null
          revisada_por_nombre: string | null
          tiempo_entrega: string | null
          total_estimado: number | null
          updated_at: string
          validez_hasta: string | null
        }
        Insert: {
          adelanto_porcentaje?: number | null
          adelanto_recibido_at?: string | null
          adelanto_recibido_valor?: number | null
          adelanto_registrado_por?: string | null
          adelanto_valor?: number | null
          aprobada_at?: string
          aprobada_por?: string | null
          aprobada_por_nombre?: string | null
          cliente_nombre?: string | null
          condiciones?: string | null
          cotizacion_eliminada_at?: string | null
          cotizacion_id: string
          cotizacion_numero?: string | null
          created_at?: string
          factura_fecha?: string | null
          factura_generada_at?: string | null
          factura_generada_por?: string | null
          factura_generada_por_nombre?: string | null
          factura_numero?: string | null
          forma_pago?: string | null
          id?: string
          instalacion_finalizada_at?: string | null
          instalacion_finalizada_por?: string | null
          instalacion_finalizada_por_nombre?: string | null
          instalacion_iniciada_at?: string | null
          instalacion_iniciada_por?: string | null
          instalacion_iniciada_por_nombre?: string | null
          pagado_at?: string | null
          pagado_nota?: string | null
          pagado_por?: string | null
          pagado_por_nombre?: string | null
          pago_completo_at?: string | null
          pasada_pago_parcial?: boolean
          pasada_pago_parcial_faltante?: number | null
          pasada_pago_parcial_motivo?: string | null
          pasada_tecnico_at?: string | null
          pasada_tecnico_por?: string | null
          pasada_tecnico_por_nombre?: string | null
          pendiente_facturacion_at?: string | null
          requiere_adelanto?: boolean
          revisada_at?: string | null
          revisada_por?: string | null
          revisada_por_nombre?: string | null
          tiempo_entrega?: string | null
          total_estimado?: number | null
          updated_at?: string
          validez_hasta?: string | null
        }
        Update: {
          adelanto_porcentaje?: number | null
          adelanto_recibido_at?: string | null
          adelanto_recibido_valor?: number | null
          adelanto_registrado_por?: string | null
          adelanto_valor?: number | null
          aprobada_at?: string
          aprobada_por?: string | null
          aprobada_por_nombre?: string | null
          cliente_nombre?: string | null
          condiciones?: string | null
          cotizacion_eliminada_at?: string | null
          cotizacion_id?: string
          cotizacion_numero?: string | null
          created_at?: string
          factura_fecha?: string | null
          factura_generada_at?: string | null
          factura_generada_por?: string | null
          factura_generada_por_nombre?: string | null
          factura_numero?: string | null
          forma_pago?: string | null
          id?: string
          instalacion_finalizada_at?: string | null
          instalacion_finalizada_por?: string | null
          instalacion_finalizada_por_nombre?: string | null
          instalacion_iniciada_at?: string | null
          instalacion_iniciada_por?: string | null
          instalacion_iniciada_por_nombre?: string | null
          pagado_at?: string | null
          pagado_nota?: string | null
          pagado_por?: string | null
          pagado_por_nombre?: string | null
          pago_completo_at?: string | null
          pasada_pago_parcial?: boolean
          pasada_pago_parcial_faltante?: number | null
          pasada_pago_parcial_motivo?: string | null
          pasada_tecnico_at?: string | null
          pasada_tecnico_por?: string | null
          pasada_tecnico_por_nombre?: string | null
          pendiente_facturacion_at?: string | null
          requiere_adelanto?: boolean
          revisada_at?: string | null
          revisada_por?: string | null
          revisada_por_nombre?: string | null
          tiempo_entrega?: string | null
          total_estimado?: number | null
          updated_at?: string
          validez_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotpro_aprobaciones_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: true
            referencedRelation: "cotpro_cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotpro_clientes: {
        Row: {
          cargo: string | null
          celular: string | null
          ciudad: string | null
          contacto: string | null
          correo: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          id: string
          nit: string | null
          nombre: string
          notas: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          celular?: string | null
          ciudad?: string | null
          contacto?: string | null
          correo?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          id?: string
          nit?: string | null
          nombre: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          celular?: string | null
          ciudad?: string | null
          contacto?: string | null
          correo?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          id?: string
          nit?: string | null
          nombre?: string
          notas?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cotpro_cotizaciones: {
        Row: {
          autor_original_id: string | null
          cliente_cargo: string | null
          cliente_celular: string | null
          cliente_ciudad: string | null
          cliente_contacto: string | null
          cliente_correo: string | null
          cliente_direccion: string | null
          cliente_nit: string | null
          cliente_nombre: string | null
          config: Json
          cotpro_cliente_id: string | null
          created_at: string
          created_by: string | null
          eliminacion_motivo: string | null
          eliminada_at: string | null
          eliminada_por: string | null
          eliminada_por_nombre: string | null
          especificaciones: Json
          estado: string
          estado_previo: string | null
          id: string
          notas: string | null
          numero: string
          plantilla_origen: string | null
          prioridad: number
          quotation_template_type: string
          terminos: string | null
          titulo: string | null
          total_override: number | null
          updated_at: string
          updated_by: string | null
          validez_hasta: string | null
          version: number
        }
        Insert: {
          autor_original_id?: string | null
          cliente_cargo?: string | null
          cliente_celular?: string | null
          cliente_ciudad?: string | null
          cliente_contacto?: string | null
          cliente_correo?: string | null
          cliente_direccion?: string | null
          cliente_nit?: string | null
          cliente_nombre?: string | null
          config?: Json
          cotpro_cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          eliminacion_motivo?: string | null
          eliminada_at?: string | null
          eliminada_por?: string | null
          eliminada_por_nombre?: string | null
          especificaciones?: Json
          estado?: string
          estado_previo?: string | null
          id?: string
          notas?: string | null
          numero: string
          plantilla_origen?: string | null
          prioridad?: number
          quotation_template_type?: string
          terminos?: string | null
          titulo?: string | null
          total_override?: number | null
          updated_at?: string
          updated_by?: string | null
          validez_hasta?: string | null
          version?: number
        }
        Update: {
          autor_original_id?: string | null
          cliente_cargo?: string | null
          cliente_celular?: string | null
          cliente_ciudad?: string | null
          cliente_contacto?: string | null
          cliente_correo?: string | null
          cliente_direccion?: string | null
          cliente_nit?: string | null
          cliente_nombre?: string | null
          config?: Json
          cotpro_cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          eliminacion_motivo?: string | null
          eliminada_at?: string | null
          eliminada_por?: string | null
          eliminada_por_nombre?: string | null
          especificaciones?: Json
          estado?: string
          estado_previo?: string | null
          id?: string
          notas?: string | null
          numero?: string
          plantilla_origen?: string | null
          prioridad?: number
          quotation_template_type?: string
          terminos?: string | null
          titulo?: string | null
          total_override?: number | null
          updated_at?: string
          updated_by?: string | null
          validez_hasta?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotpro_cotizaciones_cotpro_cliente_id_fkey"
            columns: ["cotpro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cotpro_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotpro_filas: {
        Row: {
          cantidad: number
          codigo: string | null
          cotizacion_id: string
          created_at: string
          descripcion: string | null
          descuento_tipo: string | null
          descuento_valor: number | null
          ficha_tecnica_url: string | null
          id: string
          inventory_item_id: string | null
          marca: string | null
          modelo: string | null
          observaciones: string | null
          orden: number
          precio_actualizado_at: string | null
          precio_base: number
          precio_plus: number
          precio_vip: number
          quotable_item_id: string | null
          referencia: string | null
          seccion_id: string
          tipo_fila: string
          visible_base: boolean
          visible_plus: boolean
          visible_vip: boolean
        }
        Insert: {
          cantidad?: number
          codigo?: string | null
          cotizacion_id: string
          created_at?: string
          descripcion?: string | null
          descuento_tipo?: string | null
          descuento_valor?: number | null
          ficha_tecnica_url?: string | null
          id?: string
          inventory_item_id?: string | null
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          orden?: number
          precio_actualizado_at?: string | null
          precio_base?: number
          precio_plus?: number
          precio_vip?: number
          quotable_item_id?: string | null
          referencia?: string | null
          seccion_id: string
          tipo_fila?: string
          visible_base?: boolean
          visible_plus?: boolean
          visible_vip?: boolean
        }
        Update: {
          cantidad?: number
          codigo?: string | null
          cotizacion_id?: string
          created_at?: string
          descripcion?: string | null
          descuento_tipo?: string | null
          descuento_valor?: number | null
          ficha_tecnica_url?: string | null
          id?: string
          inventory_item_id?: string | null
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          orden?: number
          precio_actualizado_at?: string | null
          precio_base?: number
          precio_plus?: number
          precio_vip?: number
          quotable_item_id?: string | null
          referencia?: string | null
          seccion_id?: string
          tipo_fila?: string
          visible_base?: boolean
          visible_plus?: boolean
          visible_vip?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cotpro_filas_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotpro_cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotpro_filas_quotable_item_id_fkey"
            columns: ["quotable_item_id"]
            isOneToOne: false
            referencedRelation: "quotable_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotpro_filas_seccion_id_fkey"
            columns: ["seccion_id"]
            isOneToOne: false
            referencedRelation: "cotpro_secciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotpro_historial: {
        Row: {
          accion: string
          cotizacion_id: string
          created_at: string
          id: string
          payload: Json | null
          usuario_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          accion: string
          cotizacion_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          accion?: string
          cotizacion_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          usuario_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotpro_historial_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotpro_cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotpro_pagos: {
        Row: {
          aprobacion_id: string
          cotizacion_id: string
          created_at: string
          fecha: string
          id: string
          nota: string | null
          registrado_por: string | null
          registrado_por_nombre: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          aprobacion_id: string
          cotizacion_id: string
          created_at?: string
          fecha?: string
          id?: string
          nota?: string | null
          registrado_por?: string | null
          registrado_por_nombre?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          aprobacion_id?: string
          cotizacion_id?: string
          created_at?: string
          fecha?: string
          id?: string
          nota?: string | null
          registrado_por?: string | null
          registrado_por_nombre?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotpro_pagos_aprobacion_id_fkey"
            columns: ["aprobacion_id"]
            isOneToOne: false
            referencedRelation: "cotpro_aprobaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotpro_plantillas: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string | null
          estructura: Json
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estructura: Json
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          estructura?: Json
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      cotpro_secciones: {
        Row: {
          cotizacion_id: string
          created_at: string
          descuento: Json | null
          id: string
          nombre: string
          oculta: boolean
          orden: number
          tipo: string
        }
        Insert: {
          cotizacion_id: string
          created_at?: string
          descuento?: Json | null
          id?: string
          nombre: string
          oculta?: boolean
          orden?: number
          tipo?: string
        }
        Update: {
          cotizacion_id?: string
          created_at?: string
          descuento?: Json | null
          id?: string
          nombre?: string
          oculta?: boolean
          orden?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotpro_secciones_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotpro_cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      elementos_cotizables: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          descripcion: string
          estado: string
          id: string
          nombre: string
          observaciones: string | null
          precio: number
          unidad: string
          updated_at: string
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string
          descripcion: string
          estado?: string
          id?: string
          nombre: string
          observaciones?: string | null
          precio?: number
          unidad: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          nombre?: string
          observaciones?: string | null
          precio?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresas_contratadas: {
        Row: {
          contacto: string | null
          created_at: string
          descripcion: string | null
          email: string | null
          estado: string
          id: string
          nombre: string
          telefono: string | null
          tipo_servicio: string
          updated_at: string
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          descripcion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombre: string
          telefono?: string | null
          tipo_servicio?: string
          updated_at?: string
        }
        Update: {
          contacto?: string | null
          created_at?: string
          descripcion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombre?: string
          telefono?: string | null
          tipo_servicio?: string
          updated_at?: string
        }
        Relationships: []
      }
      estados_patrulla: {
        Row: {
          alarma_id: string
          created_at: string
          duracion_segundos: number | null
          estado: string
          id: string
          supervisor_id: string | null
          supervisor_nombre: string | null
          tiempo_fin: string | null
          tiempo_inicio: string | null
          updated_at: string
        }
        Insert: {
          alarma_id: string
          created_at?: string
          duracion_segundos?: number | null
          estado?: string
          id?: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          tiempo_fin?: string | null
          tiempo_inicio?: string | null
          updated_at?: string
        }
        Update: {
          alarma_id?: string
          created_at?: string
          duracion_segundos?: number | null
          estado?: string
          id?: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          tiempo_fin?: string | null
          tiempo_inicio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      eventos_sistema: {
        Row: {
          created_at: string | null
          descripcion: string
          id: string
          tipo_evento: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          id?: string
          tipo_evento: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          id?: string
          tipo_evento?: string
          user_id?: string | null
        }
        Relationships: []
      }
      historial_patrullas_despachador: {
        Row: {
          actividad: string
          created_at: string
          duracion_minutos: number | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          patrulla_numero: string
          supervisor_nombre: string | null
          ubicacion: string | null
        }
        Insert: {
          actividad: string
          created_at?: string
          duracion_minutos?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          patrulla_numero: string
          supervisor_nombre?: string | null
          ubicacion?: string | null
        }
        Update: {
          actividad?: string
          created_at?: string
          duracion_minutos?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          patrulla_numero?: string
          supervisor_nombre?: string | null
          ubicacion?: string | null
        }
        Relationships: []
      }
      historial_patrullas_operador: {
        Row: {
          actividad: string
          created_at: string
          duracion_minutos: number | null
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          patrulla_numero: string
          supervisor_nombre: string | null
          ubicacion: string | null
        }
        Insert: {
          actividad: string
          created_at?: string
          duracion_minutos?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          patrulla_numero: string
          supervisor_nombre?: string | null
          ubicacion?: string | null
        }
        Update: {
          actividad?: string
          created_at?: string
          duracion_minutos?: number | null
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          patrulla_numero?: string
          supervisor_nombre?: string | null
          ubicacion?: string | null
        }
        Relationships: []
      }
      incidentes: {
        Row: {
          created_at: string
          descripcion: string
          estado: string | null
          gravedad: string | null
          id: string
          resolved_at: string | null
          supervisor_id: string | null
          supervisor_nombre: string | null
          tipo_incidente: string
          ubicacion: string | null
        }
        Insert: {
          created_at?: string
          descripcion: string
          estado?: string | null
          gravedad?: string | null
          id?: string
          resolved_at?: string | null
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          tipo_incidente: string
          ubicacion?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string
          estado?: string | null
          gravedad?: string | null
          id?: string
          resolved_at?: string | null
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          tipo_incidente?: string
          ubicacion?: string | null
        }
        Relationships: []
      }
      inventario: {
        Row: {
          cantidad: number
          cantidad_minima: number
          categoria: string
          codigo: string
          created_at: string
          descripcion: string | null
          estado: string
          fecha_adquisicion: string | null
          id: string
          nombre: string
          observaciones: string | null
          proveedor: string | null
          responsable: string | null
          ubicacion: string | null
          updated_at: string
          valor_unitario: number
        }
        Insert: {
          cantidad?: number
          cantidad_minima?: number
          categoria: string
          codigo: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_adquisicion?: string | null
          id?: string
          nombre: string
          observaciones?: string | null
          proveedor?: string | null
          responsable?: string | null
          ubicacion?: string | null
          updated_at?: string
          valor_unitario?: number
        }
        Update: {
          cantidad?: number
          cantidad_minima?: number
          categoria?: string
          codigo?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_adquisicion?: string | null
          id?: string
          nombre?: string
          observaciones?: string | null
          proveedor?: string | null
          responsable?: string | null
          ubicacion?: string | null
          updated_at?: string
          valor_unitario?: number
        }
        Relationships: []
      }
      inventory_areas: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          nombre: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          nombre: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          nombre?: string
        }
        Relationships: []
      }
      inventory_brands: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          id: string
          nombre: string
          orden: number | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number | null
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          activo: boolean
          area_codigo: string
          codigo: string
          created_at: string
          id: string
          nombre: string
          orden: number | null
        }
        Insert: {
          activo?: boolean
          area_codigo: string
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          orden?: number | null
        }
        Update: {
          activo?: boolean
          area_codigo?: string
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          orden?: number | null
        }
        Relationships: []
      }
      inventory_documents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          mime: string | null
          nombre: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          mime?: string | null
          nombre: string
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          mime?: string | null
          nombre?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_documents_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          activo: boolean
          area_codigo: string
          brand_id: string
          category_id: string
          cliente_id: string | null
          cliente_nombre: string | null
          codigo: string
          consecutivo: number
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descripcion: string | null
          estado_codigo: string
          estado_operativo: string
          fecha_ingreso: string
          foto_principal: string | null
          id: string
          last_movement_at: string
          modelo: string | null
          notas_internas: string | null
          responsable_id: string | null
          responsable_nombre: string | null
          serial: string | null
          ubicacion: string | null
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          activo?: boolean
          area_codigo: string
          brand_id: string
          category_id: string
          cliente_id?: string | null
          cliente_nombre?: string | null
          codigo: string
          consecutivo: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado_codigo: string
          estado_operativo?: string
          fecha_ingreso?: string
          foto_principal?: string | null
          id?: string
          last_movement_at?: string
          modelo?: string | null
          notas_internas?: string | null
          responsable_id?: string | null
          responsable_nombre?: string | null
          serial?: string | null
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Update: {
          activo?: boolean
          area_codigo?: string
          brand_id?: string
          category_id?: string
          cliente_id?: string | null
          cliente_nombre?: string | null
          codigo?: string
          consecutivo?: number
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descripcion?: string | null
          estado_codigo?: string
          estado_operativo?: string
          fecha_ingreso?: string
          foto_principal?: string | null
          id?: string
          last_movement_at?: string
          modelo?: string | null
          notas_internas?: string | null
          responsable_id?: string | null
          responsable_nombre?: string | null
          serial?: string | null
          ubicacion?: string | null
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_area_codigo_fkey"
            columns: ["area_codigo"]
            isOneToOne: false
            referencedRelation: "inventory_areas"
            referencedColumns: ["codigo"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          motivo: string | null
          tipo: string
          user_id: string | null
          user_nombre: string | null
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          motivo?: string | null
          tipo: string
          user_id?: string | null
          user_nombre?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          motivo?: string | null
          tipo?: string
          user_id?: string | null
          user_nombre?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_photos: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          orden: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          orden?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          orden?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      llamadas_clientes: {
        Row: {
          cliente_id: string
          contacto_nombre: string
          created_at: string
          duracion_segundos: number | null
          estado: string | null
          id: string
          motivo: string | null
          numero_telefono: string
          observaciones: string | null
          operador_id: string | null
          tipo_llamada: string
        }
        Insert: {
          cliente_id: string
          contacto_nombre: string
          created_at?: string
          duracion_segundos?: number | null
          estado?: string | null
          id?: string
          motivo?: string | null
          numero_telefono: string
          observaciones?: string | null
          operador_id?: string | null
          tipo_llamada: string
        }
        Update: {
          cliente_id?: string
          contacto_nombre?: string
          created_at?: string
          duracion_segundos?: number | null
          estado?: string | null
          id?: string
          motivo?: string | null
          numero_telefono?: string
          observaciones?: string | null
          operador_id?: string | null
          tipo_llamada?: string
        }
        Relationships: []
      }
      minuta_despachadores: {
        Row: {
          contenido: string
          created_at: string
          empresa_contratada_id: string | null
          id: string
          prioridad: string | null
          tipo_entrada: string
          turno: string | null
          usuario_id: string | null
          usuario_nombre: string
        }
        Insert: {
          contenido: string
          created_at?: string
          empresa_contratada_id?: string | null
          id?: string
          prioridad?: string | null
          tipo_entrada?: string
          turno?: string | null
          usuario_id?: string | null
          usuario_nombre: string
        }
        Update: {
          contenido?: string
          created_at?: string
          empresa_contratada_id?: string | null
          id?: string
          prioridad?: string | null
          tipo_entrada?: string
          turno?: string | null
          usuario_id?: string | null
          usuario_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "minuta_despachadores_empresa_contratada_id_fkey"
            columns: ["empresa_contratada_id"]
            isOneToOne: false
            referencedRelation: "empresas_contratadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minuta_despachadores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      minuta_operaciones: {
        Row: {
          contenido: string
          created_at: string
          id: string
          prioridad: string | null
          tipo_entrada: string
          turno: string | null
          usuario_id: string | null
          usuario_nombre: string
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          prioridad?: string | null
          tipo_entrada?: string
          turno?: string | null
          usuario_id?: string | null
          usuario_nombre: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          prioridad?: string | null
          tipo_entrada?: string
          turno?: string | null
          usuario_id?: string | null
          usuario_nombre?: string
        }
        Relationships: []
      }
      observaciones_alarmas: {
        Row: {
          alarma_id: string
          created_at: string
          id: string
          observacion: string
          supervisor_id: string
          supervisor_nombre: string
        }
        Insert: {
          alarma_id: string
          created_at?: string
          id?: string
          observacion: string
          supervisor_id: string
          supervisor_nombre: string
        }
        Update: {
          alarma_id?: string
          created_at?: string
          id?: string
          observacion?: string
          supervisor_id?: string
          supervisor_nombre?: string
        }
        Relationships: []
      }
      observaciones_servicios_tecnicos: {
        Row: {
          created_at: string
          id: string
          observacion: string
          servicio_id: string
          tipo_observacion: string | null
          usuario_id: string
          usuario_nombre: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          observacion: string
          servicio_id: string
          tipo_observacion?: string | null
          usuario_id: string
          usuario_nombre?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          observacion?: string
          servicio_id?: string
          tipo_observacion?: string | null
          usuario_id?: string
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observaciones_servicios_tecnicos_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_tecnicos_asignados"
            referencedColumns: ["id"]
          },
        ]
      }
      operaciones_diarias: {
        Row: {
          created_at: string | null
          efectividad_porcentaje: number | null
          fecha: string
          id: string
          ingresos_dia: number | null
          tiempo_respuesta_promedio: number | null
        }
        Insert: {
          created_at?: string | null
          efectividad_porcentaje?: number | null
          fecha: string
          id?: string
          ingresos_dia?: number | null
          tiempo_respuesta_promedio?: number | null
        }
        Update: {
          created_at?: string | null
          efectividad_porcentaje?: number | null
          fecha?: string
          id?: string
          ingresos_dia?: number | null
          tiempo_respuesta_promedio?: number | null
        }
        Relationships: []
      }
      patrullas: {
        Row: {
          created_at: string | null
          estado: string | null
          id: string
          numero_patrulla: string
          supervisor_id: string | null
          supervisor_nombre: string | null
          ubicacion: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          id?: string
          numero_patrulla: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          id?: string
          numero_patrulla?: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          ubicacion?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patrullas_coraza: {
        Row: {
          acompanamientos_disponibles: number
          acompanamientos_usados: number
          cliente_id: string | null
          created_at: string
          empresa_contratada_id: string | null
          id: string
          month: number
          patrullas_disponibles: number
          patrullas_usadas: number
          revistas_disponibles: number
          revistas_usadas: number
          updated_at: string
          year: number
        }
        Insert: {
          acompanamientos_disponibles?: number
          acompanamientos_usados?: number
          cliente_id?: string | null
          created_at?: string
          empresa_contratada_id?: string | null
          id?: string
          month?: number
          patrullas_disponibles?: number
          patrullas_usadas?: number
          revistas_disponibles?: number
          revistas_usadas?: number
          updated_at?: string
          year?: number
        }
        Update: {
          acompanamientos_disponibles?: number
          acompanamientos_usados?: number
          cliente_id?: string | null
          created_at?: string
          empresa_contratada_id?: string | null
          id?: string
          month?: number
          patrullas_disponibles?: number
          patrullas_usadas?: number
          revistas_disponibles?: number
          revistas_usadas?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "patrullas_coraza_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrullas_coraza_empresa_contratada_id_fkey"
            columns: ["empresa_contratada_id"]
            isOneToOne: false
            referencedRelation: "empresas_contratadas"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          cargo: string | null
          created_at: string | null
          estado: string | null
          id: string
          nombre: string
          turno: string | null
          user_id: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nombre: string
          turno?: string | null
          user_id?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          nombre?: string
          turno?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string
          empresa_contratada_id: string | null
          foto_url: string | null
          full_name: string | null
          id: string
          last_login: string | null
          numero_documento: string | null
          placa_vehiculo: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          empresa_contratada_id?: string | null
          foto_url?: string | null
          full_name?: string | null
          id: string
          last_login?: string | null
          numero_documento?: string | null
          placa_vehiculo?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          empresa_contratada_id?: string | null
          foto_url?: string | null
          full_name?: string | null
          id?: string
          last_login?: string | null
          numero_documento?: string | null
          placa_vehiculo?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_contratada_id_fkey"
            columns: ["empresa_contratada_id"]
            isOneToOne: false
            referencedRelation: "empresas_contratadas"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_compras: {
        Row: {
          cantidad: number
          costo_unitario: number
          created_at: string
          fecha_compra: string
          foto_factura_url: string | null
          id: string
          nombre_material: string
          proveedor: string | null
          proyecto_id: string
          subtotal: number
          tecnico_id: string
          tecnico_nombre: string | null
        }
        Insert: {
          cantidad?: number
          costo_unitario?: number
          created_at?: string
          fecha_compra?: string
          foto_factura_url?: string | null
          id?: string
          nombre_material: string
          proveedor?: string | null
          proyecto_id: string
          subtotal?: number
          tecnico_id: string
          tecnico_nombre?: string | null
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          created_at?: string
          fecha_compra?: string
          foto_factura_url?: string | null
          id?: string
          nombre_material?: string
          proveedor?: string | null
          proyecto_id?: string
          subtotal?: number
          tecnico_id?: string
          tecnico_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_compras_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_equipos_inventario: {
        Row: {
          asignado_por: string | null
          asignado_por_nombre: string | null
          asignado_por_rol: string | null
          cantidad: number
          codigo_item: string | null
          created_at: string
          descripcion_item: string | null
          factura_url: string | null
          fecha_asignacion: string
          id: string
          inventory_item_id: string
          notas: string | null
          precio: number
          proyecto_id: string
          serial_item: string | null
        }
        Insert: {
          asignado_por?: string | null
          asignado_por_nombre?: string | null
          asignado_por_rol?: string | null
          cantidad?: number
          codigo_item?: string | null
          created_at?: string
          descripcion_item?: string | null
          factura_url?: string | null
          fecha_asignacion?: string
          id?: string
          inventory_item_id: string
          notas?: string | null
          precio?: number
          proyecto_id: string
          serial_item?: string | null
        }
        Update: {
          asignado_por?: string | null
          asignado_por_nombre?: string | null
          asignado_por_rol?: string | null
          cantidad?: number
          codigo_item?: string | null
          created_at?: string
          descripcion_item?: string | null
          factura_url?: string | null
          fecha_asignacion?: string
          id?: string
          inventory_item_id?: string
          notas?: string | null
          precio?: number
          proyecto_id?: string
          serial_item?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_equipos_inventario_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_equipos_inventario_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          created_at: string
          created_by: string | null
          estado: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          estado?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          estado?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotable_items: {
        Row: {
          activo: boolean
          area_codigo: string | null
          brand_codigo: string | null
          category_codigo: string | null
          codigo: string
          consecutivo: number | null
          costo: number
          created_at: string
          created_by: string | null
          descripcion: string
          divisor: number
          ficha_tecnica_url: string | null
          id: string
          precio_base: number
          price_updated_at: string
          proveedor: string | null
          referencia: string | null
          tipo: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          area_codigo?: string | null
          brand_codigo?: string | null
          category_codigo?: string | null
          codigo: string
          consecutivo?: number | null
          costo?: number
          created_at?: string
          created_by?: string | null
          descripcion: string
          divisor?: number
          ficha_tecnica_url?: string | null
          id?: string
          precio_base?: number
          price_updated_at?: string
          proveedor?: string | null
          referencia?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          area_codigo?: string | null
          brand_codigo?: string | null
          category_codigo?: string | null
          codigo?: string
          consecutivo?: number | null
          costo?: number
          created_at?: string
          created_by?: string | null
          descripcion?: string
          divisor?: number
          ficha_tecnica_url?: string | null
          id?: string
          precio_base?: number
          price_updated_at?: string
          proveedor?: string | null
          referencia?: string | null
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      quotable_items_price_history: {
        Row: {
          changed_by: string | null
          changed_by_nombre: string | null
          costo_anterior: number | null
          costo_nuevo: number | null
          created_at: string
          id: string
          precio_base_anterior: number | null
          precio_base_nuevo: number | null
          precio_plus_anterior: number | null
          precio_plus_nuevo: number | null
          precio_vip_anterior: number | null
          precio_vip_nuevo: number | null
          quotable_item_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_nombre?: string | null
          costo_anterior?: number | null
          costo_nuevo?: number | null
          created_at?: string
          id?: string
          precio_base_anterior?: number | null
          precio_base_nuevo?: number | null
          precio_plus_anterior?: number | null
          precio_plus_nuevo?: number | null
          precio_vip_anterior?: number | null
          precio_vip_nuevo?: number | null
          quotable_item_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_nombre?: string | null
          costo_anterior?: number | null
          costo_nuevo?: number | null
          created_at?: string
          id?: string
          precio_base_anterior?: number | null
          precio_base_nuevo?: number | null
          precio_plus_anterior?: number | null
          precio_plus_nuevo?: number | null
          precio_vip_anterior?: number | null
          precio_vip_nuevo?: number | null
          quotable_item_id?: string
        }
        Relationships: []
      }
      servicio_fotos: {
        Row: {
          created_at: string
          descripcion: string | null
          foto_url: string
          id: string
          servicio_id: string
          tecnico_id: string
          tipo_foto: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          foto_url: string
          id?: string
          servicio_id: string
          tecnico_id: string
          tipo_foto?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          foto_url?: string
          id?: string
          servicio_id?: string
          tecnico_id?: string
          tipo_foto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicio_fotos_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_tecnicos_asignados"
            referencedColumns: ["id"]
          },
        ]
      }
      servicio_tecnico_ciclos: {
        Row: {
          cerrado_en: string
          created_at: string
          duracion_segundos: number | null
          fecha_aceptacion: string | null
          fecha_asignacion: string | null
          fecha_finalizacion: string | null
          firma_cliente: string | null
          firma_tecnico: string | null
          id: string
          motivo_cierre: string
          numero_ciclo: number
          observaciones_tecnico: string | null
          servicio_id: string
          tecnico_id: string | null
          tecnico_nombre_snapshot: string | null
          tiempo_llegada: string | null
          tiempo_salida: string | null
          ubicacion_llegada: Json | null
          ubicacion_salida: Json | null
        }
        Insert: {
          cerrado_en?: string
          created_at?: string
          duracion_segundos?: number | null
          fecha_aceptacion?: string | null
          fecha_asignacion?: string | null
          fecha_finalizacion?: string | null
          firma_cliente?: string | null
          firma_tecnico?: string | null
          id?: string
          motivo_cierre?: string
          numero_ciclo: number
          observaciones_tecnico?: string | null
          servicio_id: string
          tecnico_id?: string | null
          tecnico_nombre_snapshot?: string | null
          tiempo_llegada?: string | null
          tiempo_salida?: string | null
          ubicacion_llegada?: Json | null
          ubicacion_salida?: Json | null
        }
        Update: {
          cerrado_en?: string
          created_at?: string
          duracion_segundos?: number | null
          fecha_aceptacion?: string | null
          fecha_asignacion?: string | null
          fecha_finalizacion?: string | null
          firma_cliente?: string | null
          firma_tecnico?: string | null
          id?: string
          motivo_cierre?: string
          numero_ciclo?: number
          observaciones_tecnico?: string | null
          servicio_id?: string
          tecnico_id?: string | null
          tecnico_nombre_snapshot?: string | null
          tiempo_llegada?: string | null
          tiempo_salida?: string | null
          ubicacion_llegada?: Json | null
          ubicacion_salida?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "servicio_tecnico_ciclos_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_tecnicos_asignados"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios_tecnicos: {
        Row: {
          cliente_id: string | null
          completed_at: string | null
          created_at: string | null
          descripcion: string | null
          estado: string | null
          id: string
          tecnico_id: string | null
          tipo_servicio: string | null
        }
        Insert: {
          cliente_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          tecnico_id?: string | null
          tipo_servicio?: string | null
        }
        Update: {
          cliente_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          estado?: string | null
          id?: string
          tecnico_id?: string | null
          tipo_servicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_tecnicos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios_tecnicos_asignados: {
        Row: {
          cancelado_por_id: string | null
          cancelado_por_nombre: string | null
          cliente_direccion: string
          cliente_email: string | null
          cliente_id: string
          cliente_razon_social: string
          cliente_telefono: string | null
          costo_estimado: number | null
          creado_por_id: string | null
          creado_por_nombre: string | null
          created_at: string
          descripcion_detallada: string | null
          duracion_servicio_segundos: number | null
          estado: string
          fecha_aceptacion: string | null
          fecha_asignacion: string
          fecha_cancelacion: string | null
          fecha_finalizacion: string | null
          fecha_inicio: string | null
          firma_cliente: string | null
          firma_tecnico: string | null
          id: string
          materiales_utilizados: Json | null
          motivo_cancelacion: string | null
          motivo_servicio: string
          numero_radicado: string | null
          observaciones_tecnico: string | null
          persona_encargada: string
          prioridad: string
          tecnico_id: string | null
          tecnico_tipo: string | null
          tiempo_estimado_horas: number | null
          tiempo_llegada: string | null
          tiempo_proceso: string | null
          tiempo_salida: string | null
          tipo_servicio: string
          ubicacion_llegada: Json | null
          ubicacion_proceso: Json | null
          ubicacion_salida: Json | null
          updated_at: string
        }
        Insert: {
          cancelado_por_id?: string | null
          cancelado_por_nombre?: string | null
          cliente_direccion: string
          cliente_email?: string | null
          cliente_id: string
          cliente_razon_social: string
          cliente_telefono?: string | null
          costo_estimado?: number | null
          creado_por_id?: string | null
          creado_por_nombre?: string | null
          created_at?: string
          descripcion_detallada?: string | null
          duracion_servicio_segundos?: number | null
          estado?: string
          fecha_aceptacion?: string | null
          fecha_asignacion?: string
          fecha_cancelacion?: string | null
          fecha_finalizacion?: string | null
          fecha_inicio?: string | null
          firma_cliente?: string | null
          firma_tecnico?: string | null
          id?: string
          materiales_utilizados?: Json | null
          motivo_cancelacion?: string | null
          motivo_servicio: string
          numero_radicado?: string | null
          observaciones_tecnico?: string | null
          persona_encargada: string
          prioridad?: string
          tecnico_id?: string | null
          tecnico_tipo?: string | null
          tiempo_estimado_horas?: number | null
          tiempo_llegada?: string | null
          tiempo_proceso?: string | null
          tiempo_salida?: string | null
          tipo_servicio?: string
          ubicacion_llegada?: Json | null
          ubicacion_proceso?: Json | null
          ubicacion_salida?: Json | null
          updated_at?: string
        }
        Update: {
          cancelado_por_id?: string | null
          cancelado_por_nombre?: string | null
          cliente_direccion?: string
          cliente_email?: string | null
          cliente_id?: string
          cliente_razon_social?: string
          cliente_telefono?: string | null
          costo_estimado?: number | null
          creado_por_id?: string | null
          creado_por_nombre?: string | null
          created_at?: string
          descripcion_detallada?: string | null
          duracion_servicio_segundos?: number | null
          estado?: string
          fecha_aceptacion?: string | null
          fecha_asignacion?: string
          fecha_cancelacion?: string | null
          fecha_finalizacion?: string | null
          fecha_inicio?: string | null
          firma_cliente?: string | null
          firma_tecnico?: string | null
          id?: string
          materiales_utilizados?: Json | null
          motivo_cancelacion?: string | null
          motivo_servicio?: string
          numero_radicado?: string | null
          observaciones_tecnico?: string | null
          persona_encargada?: string
          prioridad?: string
          tecnico_id?: string | null
          tecnico_tipo?: string | null
          tiempo_estimado_horas?: number | null
          tiempo_llegada?: string | null
          tiempo_proceso?: string | null
          tiempo_salida?: string | null
          tipo_servicio?: string
          ubicacion_llegada?: Json | null
          ubicacion_proceso?: Json | null
          ubicacion_salida?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      servicios_utilizados: {
        Row: {
          alarma_id: string
          cliente_id: string
          created_at: string
          empresa_contratada_id: string | null
          fecha_uso: string
          id: string
          month: number
          operador_id: string | null
          operador_nombre: string | null
          tipo_alarma: string
          tipo_servicio: string
          year: number
        }
        Insert: {
          alarma_id: string
          cliente_id: string
          created_at?: string
          empresa_contratada_id?: string | null
          fecha_uso?: string
          id?: string
          month?: number
          operador_id?: string | null
          operador_nombre?: string | null
          tipo_alarma: string
          tipo_servicio: string
          year?: number
        }
        Update: {
          alarma_id?: string
          cliente_id?: string
          created_at?: string
          empresa_contratada_id?: string | null
          fecha_uso?: string
          id?: string
          month?: number
          operador_id?: string | null
          operador_nombre?: string | null
          tipo_alarma?: string
          tipo_servicio?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicios_utilizados_empresa_contratada_id_fkey"
            columns: ["empresa_contratada_id"]
            isOneToOne: false
            referencedRelation: "empresas_contratadas"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_actividades: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          supervisor_id: string | null
          supervisor_nombre: string | null
          tipo_actividad: string
          ubicacion: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          tipo_actividad: string
          ubicacion?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          tipo_actividad?: string
          ubicacion?: string | null
        }
        Relationships: []
      }
      supervisor_disponibilidad: {
        Row: {
          created_at: string | null
          disponible: boolean
          id: string
          supervisor_id: string
          ultima_actualizacion: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          disponible?: boolean
          id?: string
          supervisor_id: string
          ultima_actualizacion?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          disponible?: boolean
          id?: string
          supervisor_id?: string
          ultima_actualizacion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_disponibilidad_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_observaciones_alarma: {
        Row: {
          alarma_id: string
          created_at: string
          foto_url: string | null
          id: string
          observacion_texto: string | null
          supervisor_id: string
          supervisor_nombre: string
          tipo_observacion: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          alarma_id: string
          created_at?: string
          foto_url?: string | null
          id?: string
          observacion_texto?: string | null
          supervisor_id: string
          supervisor_nombre: string
          tipo_observacion?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          alarma_id?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          observacion_texto?: string | null
          supervisor_id?: string
          supervisor_nombre?: string
          tipo_observacion?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      supervisor_ubicaciones_tiempo_real: {
        Row: {
          alarma_id: string | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          precision_meters: number | null
          supervisor_id: string
          tipo_evento: string | null
          tipo_tracking: string | null
          updated_at: string
        }
        Insert: {
          alarma_id?: string | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          precision_meters?: number | null
          supervisor_id: string
          tipo_evento?: string | null
          tipo_tracking?: string | null
          updated_at?: string
        }
        Update: {
          alarma_id?: string | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          precision_meters?: number | null
          supervisor_id?: string
          tipo_evento?: string | null
          tipo_tracking?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tecnico_ubicaciones_gps: {
        Row: {
          created_at: string
          id: string
          latitud: number
          longitud: number
          precision_metros: number | null
          servicio_id: string | null
          tecnico_id: string
          tipo_ubicacion: string | null
          velocidad: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          latitud: number
          longitud: number
          precision_metros?: number | null
          servicio_id?: string | null
          tecnico_id: string
          tipo_ubicacion?: string | null
          velocidad?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          latitud?: number
          longitud?: number
          precision_metros?: number | null
          servicio_id?: string | null
          tecnico_id?: string
          tipo_ubicacion?: string | null
          velocidad?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tecnico_ubicaciones_gps_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_tecnicos_asignados"
            referencedColumns: ["id"]
          },
        ]
      }
      tecnico_verificaciones: {
        Row: {
          created_at: string
          foto_url: string | null
          id: string
          observaciones: string | null
          servicio_id: string
          tecnico_id: string
          tipo_verificacion: string
          ubicacion: Json | null
        }
        Insert: {
          created_at?: string
          foto_url?: string | null
          id?: string
          observaciones?: string | null
          servicio_id: string
          tecnico_id: string
          tipo_verificacion: string
          ubicacion?: Json | null
        }
        Update: {
          created_at?: string
          foto_url?: string | null
          id?: string
          observaciones?: string | null
          servicio_id?: string
          tecnico_id?: string
          tipo_verificacion?: string
          ubicacion?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tecnico_verificaciones_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_tecnicos_asignados"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos_auditoria: {
        Row: {
          accion: string
          campo_modificado: string | null
          created_at: string | null
          fecha_turno: string
          id: string
          motivo: string
          operador_afectado_id: string | null
          operador_afectado_nombre: string | null
          turno_id: string
          turno_tipo: string
          usuario_id: string | null
          usuario_nombre: string | null
          usuario_rol: string | null
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          accion: string
          campo_modificado?: string | null
          created_at?: string | null
          fecha_turno: string
          id?: string
          motivo: string
          operador_afectado_id?: string | null
          operador_afectado_nombre?: string | null
          turno_id: string
          turno_tipo: string
          usuario_id?: string | null
          usuario_nombre?: string | null
          usuario_rol?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          accion?: string
          campo_modificado?: string | null
          created_at?: string | null
          fecha_turno?: string
          id?: string
          motivo?: string
          operador_afectado_id?: string | null
          operador_afectado_nombre?: string | null
          turno_id?: string
          turno_tipo?: string
          usuario_id?: string | null
          usuario_nombre?: string | null
          usuario_rol?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: []
      }
      turnos_cambios: {
        Row: {
          changed_by: string | null
          changed_by_nombre: string | null
          created_at: string
          descripcion: string | null
          detalles: Json | null
          fecha: string
          id: string
          turno_id: string | null
          turno_tipo: string
          usuario_afectado_id: string | null
          usuario_afectado_nombre: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_nombre?: string | null
          created_at?: string
          descripcion?: string | null
          detalles?: Json | null
          fecha: string
          id?: string
          turno_id?: string | null
          turno_tipo?: string
          usuario_afectado_id?: string | null
          usuario_afectado_nombre?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_nombre?: string | null
          created_at?: string
          descripcion?: string | null
          detalles?: Json | null
          fecha?: string
          id?: string
          turno_id?: string | null
          turno_tipo?: string
          usuario_afectado_id?: string | null
          usuario_afectado_nombre?: string | null
        }
        Relationships: []
      }
      turnos_historial_simple: {
        Row: {
          cambios: Json | null
          created_at: string | null
          id: string
          turno_id: string | null
          usuario_nombre: string | null
        }
        Insert: {
          cambios?: Json | null
          created_at?: string | null
          id?: string
          turno_id?: string | null
          usuario_nombre?: string | null
        }
        Update: {
          cambios?: Json | null
          created_at?: string | null
          id?: string
          turno_id?: string | null
          usuario_nombre?: string | null
        }
        Relationships: []
      }
      turnos_operador: {
        Row: {
          created_at: string | null
          fecha: string
          horario_fin: string | null
          horario_inicio: string | null
          id: string
          operador_id: string | null
          operador_nombre: string | null
          turno: string
        }
        Insert: {
          created_at?: string | null
          fecha: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: string
          operador_id?: string | null
          operador_nombre?: string | null
          turno: string
        }
        Update: {
          created_at?: string | null
          fecha?: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: string
          operador_id?: string | null
          operador_nombre?: string | null
          turno?: string
        }
        Relationships: []
      }
      turnos_simple: {
        Row: {
          created_at: string | null
          fecha: string
          horario_fin: string | null
          horario_inicio: string | null
          id: string
          notas: string | null
          operador_id: string | null
          operador_nombre: string | null
          turno: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fecha: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: string
          notas?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          turno: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: string
          notas?: string | null
          operador_id?: string | null
          operador_nombre?: string | null
          turno?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      turnos_supervisor: {
        Row: {
          created_at: string | null
          fecha: string
          horario_fin: string | null
          horario_inicio: string | null
          id: string
          supervisor_id: string | null
          supervisor_nombre: string | null
          turno: string
        }
        Insert: {
          created_at?: string | null
          fecha: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          turno: string
        }
        Update: {
          created_at?: string | null
          fecha?: string
          horario_fin?: string | null
          horario_inicio?: string | null
          id?: string
          supervisor_id?: string | null
          supervisor_nombre?: string | null
          turno?: string
        }
        Relationships: []
      }
      user_additional_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission_description: string | null
          permission_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_description?: string | null
          permission_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_description?: string | null
          permission_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          function_key: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          function_key: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          function_key?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string | null
        }
        Relationships: []
      }
      users_auth: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          password: string
          role: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          password: string
          role: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          password?: string
          role?: string
        }
        Relationships: []
      }
      usuarios_eliminados_auditoria: {
        Row: {
          created_at: string
          eliminado_por: string | null
          eliminado_por_email: string | null
          eliminado_por_nombre: string | null
          eliminado_por_role: string | null
          email: string | null
          empresa_contratada_id: string | null
          full_name: string | null
          id: string
          motivo: string | null
          role: string | null
          usuario_eliminado_id: string
        }
        Insert: {
          created_at?: string
          eliminado_por?: string | null
          eliminado_por_email?: string | null
          eliminado_por_nombre?: string | null
          eliminado_por_role?: string | null
          email?: string | null
          empresa_contratada_id?: string | null
          full_name?: string | null
          id?: string
          motivo?: string | null
          role?: string | null
          usuario_eliminado_id: string
        }
        Update: {
          created_at?: string
          eliminado_por?: string | null
          eliminado_por_email?: string | null
          eliminado_por_nombre?: string | null
          eliminado_por_role?: string | null
          email?: string | null
          empresa_contratada_id?: string | null
          full_name?: string | null
          id?: string
          motivo?: string | null
          role?: string | null
          usuario_eliminado_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role_safely: {
        Args: {
          target_email: string
          target_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      can_manage_cotpro: { Args: never; Returns: boolean }
      can_manage_user_roles: { Args: never; Returns: boolean }
      cleanup_gps_sin_evento: { Args: never; Returns: undefined }
      cleanup_old_gps_locations: { Args: never; Returns: undefined }
      cleanup_old_tecnico_gps_locations: { Args: never; Returns: undefined }
      cotpro_visible_facturacion: {
        Args: { _cotizacion_id: string }
        Returns: boolean
      }
      crear_observacion_supervisor:
        | {
            Args: {
              _alarma_id: string
              _foto_url?: string
              _supervisor_id: string
              _supervisor_nombre: string
              _texto: string
              _tipo?: string
            }
            Returns: {
              alarma_id: string
              created_at: string
              foto_url: string | null
              id: string
              observacion_texto: string | null
              supervisor_id: string
              supervisor_nombre: string
              tipo_observacion: string
              updated_at: string
              video_url: string | null
            }
            SetofOptions: {
              from: "*"
              to: "supervisor_observaciones_alarma"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _alarma_id: string
              _foto_url?: string
              _supervisor_id: string
              _supervisor_nombre: string
              _texto: string
              _tipo?: string
              _video_url?: string
            }
            Returns: {
              alarma_id: string
              created_at: string
              foto_url: string | null
              id: string
              observacion_texto: string | null
              supervisor_id: string
              supervisor_nombre: string
              tipo_observacion: string
              updated_at: string
              video_url: string | null
            }
            SetofOptions: {
              from: "*"
              to: "supervisor_observaciones_alarma"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      emergency_admin_access: { Args: never; Returns: boolean }
      emergency_admin_check: { Args: never; Returns: boolean }
      ensure_supervisor_data_integrity: { Args: never; Returns: undefined }
      ensure_supervisor_disponibilidad: {
        Args: { _supervisor_id: string }
        Returns: undefined
      }
      fix_users_without_roles: { Args: never; Returns: undefined }
      get_alarmas_por_empresa_realtime: {
        Args: { month_param?: number; year_param?: number }
        Returns: {
          alarmas_activas: number
          alarmas_resueltas: number
          empresa_id: string
          empresa_nombre: string
          tiempo_promedio_respuesta: number
          total_alarmas: number
        }[]
      }
      get_cliente_servicios_mes: {
        Args: {
          cliente_id_param: string
          month_param?: number
          year_param?: number
        }
        Returns: {
          acompanamientos_disponibles: number
          acompanamientos_restantes: number
          acompanamientos_usados: number
          patrullas_disponibles: number
          patrullas_restantes: number
          patrullas_usadas: number
          revistas_disponibles: number
          revistas_restantes: number
          revistas_usadas: number
        }[]
      }
      get_consolidated_user_data: {
        Args: { user_email: string }
        Returns: {
          active: boolean
          auth_source: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_historial_servicios_utilizados: {
        Args: { month_param?: number; year_param?: number }
        Returns: {
          cliente_nombre: string
          cliente_numero_cuenta: string
          fecha_uso: string
          id: string
          operador_nombre: string
          tipo_alarma: string
          tipo_servicio: string
        }[]
      }
      get_monthly_comparisons: {
        Args: never
        Returns: {
          alarmas_resueltas: number
          alarmas_total: number
          clientes_nuevos: number
          ingresos_estimados: number
          month: string
          servicios_tecnicos: number
        }[]
      }
      get_performance_supervisores: {
        Args: { month_param?: number; year_param?: number }
        Returns: {
          alarmas_resueltas: number
          empresa_id: string
          empresa_nombre: string
          porcentaje_efectividad: number
          supervisor_id: string
          supervisor_nombre: string
          tiempo_promedio_respuesta: number
          total_alarmas_atendidas: number
        }[]
      }
      get_resumen_global_empresas: {
        Args: { month_param?: number; year_param?: number }
        Returns: {
          acompanamientos_disponibles: number
          acompanamientos_restantes: number
          acompanamientos_usados: number
          empresa_id: string
          empresa_nombre: string
          patrullas_disponibles: number
          patrullas_restantes: number
          patrullas_usadas: number
          revistas_disponibles: number
          revistas_restantes: number
          revistas_usadas: number
        }[]
      }
      get_resumen_servicios_empresas: {
        Args: { month_param?: number; year_param?: number }
        Returns: {
          acompanamientos_disponibles: number
          acompanamientos_restantes: number
          acompanamientos_usados: number
          empresa_id: string
          empresa_nombre: string
          patrullas_disponibles: number
          patrullas_restantes: number
          patrullas_usadas: number
          porcentaje_uso: number
          revistas_disponibles: number
          revistas_restantes: number
          revistas_usadas: number
        }[]
      }
      get_service_tech_stats: {
        Args: never
        Returns: {
          completados: number
          costo_total_estimado: number
          en_proceso: number
          pendientes: number
          tiempo_promedio_resolucion: number
        }[]
      }
      get_servicios_globales_mes: {
        Args: { month_param?: number; year_param?: number }
        Returns: {
          acompanamientos_disponibles: number
          acompanamientos_restantes: number
          acompanamientos_usados: number
          patrullas_disponibles: number
          patrullas_restantes: number
          patrullas_usadas: number
          revistas_disponibles: number
          revistas_restantes: number
          revistas_usadas: number
        }[]
      }
      get_servicios_por_empresa: {
        Args: {
          empresa_id_param: string
          month_param?: number
          year_param?: number
        }
        Returns: {
          acompanamientos_disponibles: number
          acompanamientos_restantes: number
          acompanamientos_usados: number
          patrullas_disponibles: number
          patrullas_restantes: number
          patrullas_usadas: number
          revistas_disponibles: number
          revistas_restantes: number
          revistas_usadas: number
        }[]
      }
      get_tecnico_info: {
        Args: { tecnico_uuid: string }
        Returns: {
          email: string
          full_name: string
        }[]
      }
      get_top_clients_consumption:
        | {
            Args: never
            Returns: {
              cliente_nombre: string
              score: number
              total_alarmas: number
              total_servicios: number
            }[]
          }
        | {
            Args: { months_back?: number }
            Returns: {
              cliente_id: string
              cliente_nombre: string
              total_alarmas: number
              total_servicios: number
            }[]
          }
      get_user_empresa: { Args: { user_id_param: string }; Returns: string }
      get_user_roles: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_roles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_permission: {
        Args: { permission_key: string; target_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_user_access_to_data: {
        Args: { record_id: string; table_name: string; user_id: string }
        Returns: boolean
      }
      is_admin_email: { Args: never; Returns: boolean }
      is_admin_or_same_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_admin_user: { Args: { user_id_param: string }; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      is_cotpro_revisor: { Args: never; Returns: boolean }
      is_dispatcher: { Args: { _user_id: string }; Returns: boolean }
      is_facturacion: { Args: never; Returns: boolean }
      is_inventory_admin: { Args: never; Returns: boolean }
      puede_mantener_datos: { Args: never; Returns: boolean }
      purgar_alarmas_antes_de: { Args: { _fecha: string }; Returns: number }
      purgar_auditoria_turnos_antes_de: {
        Args: { _fecha: string }
        Returns: number
      }
      purgar_gps_supervisores_antes_de: {
        Args: { _fecha: string }
        Returns: number
      }
      purgar_gps_tecnicos_antes_de: {
        Args: { _fecha: string }
        Returns: number
      }
      purgar_minuta_antes_de: { Args: { _fecha: string }; Returns: number }
      purgar_precios_antes_de: { Args: { _fecha: string }; Returns: number }
      registrar_archivado: {
        Args: {
          _bloque: string
          _fecha_corte: string
          _filas: number
          _tabla: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_area_codigo: {
        Args: { _new_codigo: string; _old_codigo: string }
        Returns: undefined
      }
      update_brand_codigo: {
        Args: { _brand_id: string; _new_codigo: string }
        Returns: undefined
      }
      update_category_codigo: {
        Args: { _cat_id: string; _new_codigo: string }
        Returns: undefined
      }
      user_has_additional_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { check_role: string; check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "administrador"
        | "director"
        | "operador_alarmas"
        | "despachador_patrullas"
        | "supervisor_motorizado"
        | "tecnico"
        | "jefe_tecnicos"
        | "asesor_ventas"
        | "tecnico_propio"
        | "tecnico_externo"
        | "director_tecnico"
        | "coordinador_empresa"
        | "facturacion"
        | "servicio_cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: [
        "administrador",
        "director",
        "operador_alarmas",
        "despachador_patrullas",
        "supervisor_motorizado",
        "tecnico",
        "jefe_tecnicos",
        "asesor_ventas",
        "tecnico_propio",
        "tecnico_externo",
        "director_tecnico",
        "coordinador_empresa",
        "facturacion",
        "servicio_cliente",
      ],
    },
  },
} as const

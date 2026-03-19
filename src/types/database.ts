// src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      negocios: {
        Row: {
          id: string
          nombre: string
          tipo: 'basico' | 'local' | 'empresa' | null
          tier: 'free' | 'pro' | 'business'
          cuit: string | null
          condicion_iva: 'monotributo' | 'responsable_inscripto' | null
          telefono: string | null
          email: string | null
          direccion: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          tipo?: 'basico' | 'local' | 'empresa' | null
          tier?: 'free' | 'pro' | 'business'
          cuit?: string | null
          condicion_iva?: 'monotributo' | 'responsable_inscripto' | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          tipo?: 'basico' | 'local' | 'empresa' | null
          tier?: 'free' | 'pro' | 'business'
          cuit?: string | null
          condicion_iva?: 'monotributo' | 'responsable_inscripto' | null
          telefono?: string | null
          email?: string | null
          direccion?: string | null
          logo_url?: string | null
          created_at?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          negocio_id: string | null
          rol: 'owner' | 'empleado' | 'contador'
          nombre: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          negocio_id?: string | null
          rol?: 'owner' | 'empleado' | 'contador'
          nombre?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string | null
          rol?: 'owner' | 'empleado' | 'contador'
          nombre?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          telefono: string | null
          email: string | null
          dni: string | null
          direccion: string | null
          notas: string | null
          score_interno: number
          fecha_nacimiento: string | null
          latitud: number | null
          longitud: number | null
          zona_comercial: string | null
          es_moroso: boolean
          motivo_moroso: string | null
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          nombre: string
          telefono?: string | null
          email?: string | null
          dni?: string | null
          direccion?: string | null
          notas?: string | null
          score_interno?: number
          fecha_nacimiento?: string | null
          latitud?: number | null
          longitud?: number | null
          zona_comercial?: string | null
          es_moroso?: boolean
          motivo_moroso?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          nombre?: string
          telefono?: string | null
          email?: string | null
          dni?: string | null
          direccion?: string | null
          notas?: string | null
          score_interno?: number
          fecha_nacimiento?: string | null
          latitud?: number | null
          longitud?: number | null
          zona_comercial?: string | null
          es_moroso?: boolean
          motivo_moroso?: string | null
          created_at?: string
        }
      }
      productos: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          descripcion: string | null
          codigo: string | null
          precio_unitario: string
          costo_unitario: string | null
          costo_envio: string | null
          costo_embalaje: string | null
          tipo_producto: 'producto' | 'combo' | 'servicio' | null
          stock_actual: number
          stock_minimo: number
          unidad: string
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          nombre: string
          descripcion?: string | null
          codigo?: string | null
          precio_unitario: string
          costo_unitario?: string | null
          costo_envio?: string | null
          costo_embalaje?: string | null
          tipo_producto?: 'producto' | 'combo' | 'servicio' | null
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          nombre?: string
          descripcion?: string | null
          codigo?: string | null
          precio_unitario?: string
          costo_unitario?: string | null
          costo_envio?: string | null
          costo_embalaje?: string | null
          tipo_producto?: 'producto' | 'combo' | 'servicio' | null
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
          activo?: boolean
          created_at?: string
        }
      }
      combo_items: {
        Row: {
          id: string
          producto_id: string
          componente_id: string
          cantidad: number
          created_at: string
        }
        Insert: {
          id?: string
          producto_id: string
          componente_id: string
          cantidad: number
          created_at?: string
        }
        Update: {
          id?: string
          producto_id?: string
          componente_id?: string
          cantidad?: number
          created_at?: string
        }
      }
      ventas: {
        Row: {
          id: string
          negocio_id: string
          cliente_id: string | null
          usuario_id: string | null
          fecha: string
          total: string
          descuento: string
          tipo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'cuotas' | null
          estado: 'completada' | 'pendiente' | 'cancelada'
          notas: string | null
          numero_factura: string | null
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          cliente_id?: string | null
          usuario_id?: string | null
          fecha: string
          total: string
          descuento?: string
          tipo_pago?: 'efectivo' | 'transferencia' | 'tarjeta' | 'cuotas' | null
          estado?: 'completada' | 'pendiente' | 'cancelada'
          notas?: string | null
          numero_factura?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          cliente_id?: string | null
          usuario_id?: string | null
          fecha?: string
          total?: string
          descuento?: string
          tipo_pago?: 'efectivo' | 'transferencia' | 'tarjeta' | 'cuotas' | null
          estado?: 'completada' | 'pendiente' | 'cancelada'
          notas?: string | null
          numero_factura?: string | null
          created_at?: string
        }
      }
      venta_items: {
        Row: {
          id: string
          venta_id: string
          producto_id: string | null
          cantidad: number
          precio_unitario: string
          subtotal: string
          nombre_snapshot: string | null
          precio_snapshot: string | null
        }
        Insert: {
          id?: string
          venta_id: string
          producto_id?: string | null
          cantidad: number
          precio_unitario: string
          subtotal: string
          nombre_snapshot?: string | null
          precio_snapshot?: string | null
        }
        Update: {
          id?: string
          venta_id?: string
          producto_id?: string | null
          cantidad?: number
          precio_unitario?: string
          subtotal?: string
          nombre_snapshot?: string | null
          precio_snapshot?: string | null
        }
      }
      cobranzas: {
        Row: {
          id: string
          negocio_id: string
          cliente_id: string | null
          venta_id: string | null
          descripcion: string | null
          monto_total: string
          cant_cuotas: number
          cuotas_pagas: number
          fecha_inicio: string
          dia_vencimiento: number | null
          estado: 'activa' | 'completada' | 'vencida' | 'mora'
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          cliente_id?: string | null
          venta_id?: string | null
          descripcion?: string | null
          monto_total: string
          cant_cuotas: number
          cuotas_pagas?: number
          fecha_inicio: string
          dia_vencimiento?: number | null
          estado?: 'activa' | 'completada' | 'vencida' | 'mora'
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          cliente_id?: string | null
          venta_id?: string | null
          descripcion?: string | null
          monto_total?: string
          cant_cuotas?: number
          cuotas_pagas?: number
          fecha_inicio?: string
          dia_vencimiento?: number | null
          estado?: 'activa' | 'completada' | 'vencida' | 'mora'
          created_at?: string
        }
      }
      cuotas: {
        Row: {
          id: string
          cobranza_id: string
          numero_cuota: number
          monto: string
          fecha_vencimiento: string
          fecha_pago: string | null
          estado: 'pendiente' | 'pagada' | 'vencida'
          metodo_pago: string | null
          notas: string | null
          intentos_cobro: number
          ultima_notificacion_sent: string | null
        }
        Insert: {
          id?: string
          cobranza_id: string
          numero_cuota: number
          monto: string
          fecha_vencimiento: string
          fecha_pago?: string | null
          estado?: 'pendiente' | 'pagada' | 'vencida'
          metodo_pago?: string | null
          notas?: string | null
          intentos_cobro?: number
          ultima_notificacion_sent?: string | null
        }
        Update: {
          id?: string
          cobranza_id?: string
          numero_cuota?: number
          monto?: string
          fecha_vencimiento?: string
          fecha_pago?: string | null
          estado?: 'pendiente' | 'pagada' | 'vencida'
          metodo_pago?: string | null
          notas?: string | null
          intentos_cobro?: number
          ultima_notificacion_sent?: string | null
        }
      }
      gastos: {
        Row: {
          id: string
          negocio_id: string
          categoria: 'compras' | 'servicios' | 'sueldos' | 'impuestos' | 'otros' | 'materia_prima' | 'insumos' | 'alquiler' | null
          descripcion: string
          monto: string
          fecha: string
          comprobante_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          categoria?: 'compras' | 'servicios' | 'sueldos' | 'impuestos' | 'otros' | 'materia_prima' | 'insumos' | 'alquiler' | null
          descripcion: string
          monto: string
          fecha: string
          comprobante_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          categoria?: 'compras' | 'servicios' | 'sueldos' | 'impuestos' | 'otros' | 'materia_prima' | 'insumos' | 'alquiler' | null
          descripcion?: string
          monto?: string
          fecha?: string
          comprobante_url?: string | null
          created_at?: string
        }
      }
      pedidos: {
        Row: {
          id: string
          negocio_id: string
          cliente_id: string | null
          usuario_id: string | null
          descripcion: string
          detalle: Json | null
          monto_seña: string
          monto_entrega: string
          fecha_pedido: string
          fecha_entrega: string
          fecha_entrega_real: string | null
          estado: 'recibido' | 'en_elaboracion' | 'listo' | 'entregado' | 'cancelado'
          genera_cobranza: boolean
          cant_cuotas: number
          notas: string | null
          venta_id: string | null
          cobranza_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          cliente_id?: string | null
          usuario_id?: string | null
          descripcion: string
          detalle?: Json | null
          monto_seña?: string
          monto_entrega?: string
          fecha_pedido?: string
          fecha_entrega: string
          fecha_entrega_real?: string | null
          estado?: 'recibido' | 'en_elaboracion' | 'listo' | 'entregado' | 'cancelado'
          genera_cobranza?: boolean
          cant_cuotas?: number
          notas?: string | null
          venta_id?: string | null
          cobranza_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          cliente_id?: string | null
          usuario_id?: string | null
          descripcion?: string
          detalle?: Json | null
          monto_seña?: string
          monto_entrega?: string
          fecha_pedido?: string
          fecha_entrega?: string
          fecha_entrega_real?: string | null
          estado?: 'recibido' | 'en_elaboracion' | 'listo' | 'entregado' | 'cancelado'
          genera_cobranza?: boolean
          cant_cuotas?: number
          notas?: string | null
          venta_id?: string | null
          cobranza_id?: string | null
          created_at?: string
        }
      }
      materias_primas: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          unidad: string
          costo_por_unidad: string
          stock_actual: string
          stock_minimo: string
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          nombre: string
          unidad: string
          costo_por_unidad: string
          stock_actual?: string
          stock_minimo?: string
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          nombre?: string
          unidad?: string
          costo_por_unidad?: string
          stock_actual?: string
          stock_minimo?: string
          created_at?: string
        }
      }
      recetas: {
        Row: {
          id: string
          producto_id: string
          materia_prima_id: string
          cantidad: string
          created_at: string
        }
        Insert: {
          id?: string
          producto_id: string
          materia_prima_id: string
          cantidad: string
          created_at?: string
        }
        Update: {
          id?: string
          producto_id?: string
          materia_prima_id?: string
          cantidad?: string
          created_at?: string
        }
      }
      compras_materia_prima: {
        Row: {
          id: string
          negocio_id: string
          materia_prima_id: string
          cantidad: string
          costo_total: string
          costo_unitario: string
          fecha: string
          proveedor: string | null
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          materia_prima_id: string
          cantidad: string
          costo_total: string
          fecha: string
          proveedor?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          materia_prima_id?: string
          cantidad?: string
          costo_total?: string
          fecha?: string
          proveedor?: string | null
          created_at?: string
        }
      }
      ingresos_personales: {
        Row: {
          id: string
          usuario_id: string
          descripcion: string
          monto: string
          categoria: 'retiro_negocio' | 'sueldo' | 'freelance' | 'otros' | null
          fecha: string
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          descripcion: string
          monto: string
          categoria?: 'retiro_negocio' | 'sueldo' | 'freelance' | 'otros' | null
          fecha: string
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          descripcion?: string
          monto?: string
          categoria?: 'retiro_negocio' | 'sueldo' | 'freelance' | 'otros' | null
          fecha?: string
          created_at?: string
        }
      }
      gastos_personales: {
        Row: {
          id: string
          usuario_id: string
          descripcion: string
          monto: string
          categoria: 'vivienda' | 'alimentacion' | 'transporte' | 'salud' | 'educacion' | 'ocio' | 'otros' | null
          fecha: string
          recurrente: boolean
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          descripcion: string
          monto: string
          categoria?: 'vivienda' | 'alimentacion' | 'transporte' | 'salud' | 'educacion' | 'ocio' | 'otros' | null
          fecha: string
          recurrente?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          descripcion?: string
          monto?: string
          categoria?: 'vivienda' | 'alimentacion' | 'transporte' | 'salud' | 'educacion' | 'ocio' | 'otros' | null
          fecha?: string
          recurrente?: boolean
          created_at?: string
        }
      }
      notificaciones_log: {
        Row: {
          id: string
          usuario_id: string | null
          tipo: 'resumen_semanal' | 'recordatorio_1d' | 'vencimiento_hoy' | 'pago_confirmado' | null
          canal: 'whatsapp' | 'email' | 'push' | null
          estado: 'enviada' | 'fallida' | 'pendiente' | null
          contenido: Json | null
          enviada_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id?: string | null
          tipo?: 'resumen_semanal' | 'recordatorio_1d' | 'vencimiento_hoy' | 'pago_confirmado' | null
          canal?: 'whatsapp' | 'email' | 'push' | null
          estado?: 'enviada' | 'fallida' | 'pendiente' | null
          contenido?: Json | null
          enviada_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string | null
          tipo?: 'resumen_semanal' | 'recordatorio_1d' | 'vencimiento_hoy' | 'pago_confirmado' | null
          canal?: 'whatsapp' | 'email' | 'push' | null
          estado?: 'enviada' | 'fallida' | 'pendiente' | null
          contenido?: Json | null
          enviada_at?: string | null
          created_at?: string
        }
      }
      preferencias_notificaciones: {
        Row: {
          id: string
          usuario_id: string | null
          canal_whatsapp: boolean
          canal_email: boolean
          canal_push: boolean
          hora_resumen: string
          activo: boolean
        }
        Insert: {
          id?: string
          usuario_id?: string | null
          canal_whatsapp?: boolean
          canal_email?: boolean
          canal_push?: boolean
          hora_resumen?: string
          activo?: boolean
        }
        Update: {
          id?: string
          usuario_id?: string | null
          canal_whatsapp?: boolean
          canal_email?: boolean
          canal_push?: boolean
          hora_resumen?: string
          activo?: boolean
        }
      }
      activos_fijos: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          categoria: 'maquinaria' | 'vehiculo' | 'inmueble' | 'tecnologia' | 'mobiliario' | 'otros' | null
          descripcion: string | null
          valor_compra: string
          fecha_compra: string
          deprecia: boolean
          vida_util_meses: number | null
          valor_residual: string | null
          estado: 'activo' | 'vendido' | 'dado_de_baja'
          valor_venta: string | null
          fecha_baja: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          negocio_id: string
          nombre: string
          categoria?: 'maquinaria' | 'vehiculo' | 'inmueble' | 'tecnologia' | 'mobiliario' | 'otros' | null
          descripcion?: string | null
          valor_compra: string
          fecha_compra: string
          deprecia?: boolean
          vida_util_meses?: number | null
          valor_residual?: string | null
          estado?: 'activo' | 'vendido' | 'dado_de_baja'
          valor_venta?: string | null
          fecha_baja?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          nombre?: string
          categoria?: 'maquinaria' | 'vehiculo' | 'inmueble' | 'tecnologia' | 'mobiliario' | 'otros' | null
          descripcion?: string | null
          valor_compra?: string
          fecha_compra?: string
          deprecia?: boolean
          vida_util_meses?: number | null
          valor_residual?: string | null
          estado?: 'activo' | 'vendido' | 'dado_de_baja'
          valor_venta?: string | null
          fecha_baja?: string | null
          notas?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      v_salud_financiera_personal: {
        Row: {
          usuario_id: string
          ingresos_del_negocio: string | null
          ingresos_totales: string | null
          pct_dependencia_negocio: number | null
        }
      }
      v_pedidos_proximos: {
        Row: {
          id: string
          negocio_id: string
          cliente_id: string | null
          descripcion: string
          monto_seña: string
          monto_entrega: string
          fecha_pedido: string
          fecha_entrega: string
          fecha_entrega_real: string | null
          estado: 'recibido' | 'en_elaboracion' | 'listo' | 'entregado' | 'cancelado'
          genera_cobranza: boolean
          cant_cuotas: number
          notas: string | null
          venta_id: string | null
          cobranza_id: string | null
          created_at: string
          cliente_nombre: string
          cliente_telefono: string | null
          cliente_zona: string | null
          dias_restantes: number
        }
      }
      v_rentabilidad_productos: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          precio: string
          costo: string | null
          ganancia_unitaria: string
          margen_pct: number | null
          unidades_mes: number
          ganancia_mes: string
        }
      }
      v_balance_general: {
        Row: {
          negocio_id: string
          activos_corrientes: string | null
          activos_fijos_netos: string | null
          total_activos: string | null
          pasivos_corrientes: string | null
          total_pasivos: string | null
          patrimonio_neto: string | null
        }
      }
      v_estado_resultados: {
        Row: {
          negocio_id: string
          mes: string
          ingresos: string | null
          costo_ventas: string | null
          ganancia_bruta: string | null
          gastos_operativos: string | null
          resultado_operativo: string | null
        }
      }
      v_flujo_efectivo: {
        Row: {
          negocio_id: string
          mes: string
          ingresos_cobrados: string | null
          egresos_pagados: string | null
          flujo_neto: string | null
          saldo_acumulado: string | null
        }
      }
      v_libro_diario: {
        Row: {
          negocio_id: string
          fecha: string
          tipo: string
          descripcion: string | null
          debe: string | null
          haber: string | null
          referencia_id: string | null
        }
      }
      v_activos_fijos: {
        Row: {
          id: string
          negocio_id: string
          nombre: string
          categoria: string | null
          valor_compra: string
          fecha_compra: string
          deprecia: boolean
          vida_util_meses: number | null
          valor_residual: string | null
          estado: string
          depreciacion_acumulada: string | null
          valor_libro: string | null
          created_at: string
        }
      }
      v_gastos_mes: {
        Row: {
          negocio_id: string
          mes: string
          categoria: string | null
          total: string | null
        }
      }
    }
    Functions: {
      get_my_business_id: {
        Args: Record<string, never>
        Returns: string
      }
      incrementar_cuotas_pagas: {
        Args: { p_cuota_id: string }
        Returns: void
      }
      recalcular_costo_producto: {
        Args: { p_producto_id: string }
        Returns: void
      }
    }
  }
}

// ── Tipos derivados ───────────────────────────────────────────────────────────

export type Negocio      = Database['public']['Tables']['negocios']['Row']
export type Usuario      = Database['public']['Tables']['usuarios']['Row']
export type Cliente      = Database['public']['Tables']['clientes']['Row']
export type Producto     = Database['public']['Tables']['productos']['Row']
export type ComboItem    = Database['public']['Tables']['combo_items']['Row']
export type Venta        = Database['public']['Tables']['ventas']['Row']
export type VentaItem    = Database['public']['Tables']['venta_items']['Row']
export type Cobranza     = Database['public']['Tables']['cobranzas']['Row']
export type Cuota        = Database['public']['Tables']['cuotas']['Row']
export type Gasto        = Database['public']['Tables']['gastos']['Row']
export type Pedido       = Database['public']['Tables']['pedidos']['Row']
export type MateriaPrima = Database['public']['Tables']['materias_primas']['Row']
export type Receta       = Database['public']['Tables']['recetas']['Row']
export type CompraMp     = Database['public']['Tables']['compras_materia_prima']['Row']
export type ActivoFijo   = Database['public']['Tables']['activos_fijos']['Row']

export type MovimientoStock = {
  id: string
  negocio_id: string
  producto_id: string
  tipo: string
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  motivo: string | null
  referencia_id: string | null
  usuario_id: string | null
  created_at: string
  productos: { nombre: string } | null
}

export type PedidoConClienteBase = Pedido & {
  clientes: Pick<Cliente, 'nombre' | 'telefono' | 'zona_comercial'> | null
}

export type CuotaConCliente = Cuota & {
  cobranzas: {
    descripcion: string | null
    cant_cuotas: number
    clientes: Pick<Cliente, 'nombre' | 'telefono' | 'zona_comercial' | 'es_moroso' | 'motivo_moroso'> | null
  } | null
}

export type RentabilidadProducto =
  Database['public']['Views']['v_rentabilidad_productos']['Row']

export type PedidoProximo =
  Database['public']['Views']['v_pedidos_proximos']['Row']
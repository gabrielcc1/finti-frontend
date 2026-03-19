'use client'

// src/hooks/useComprobante.ts
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VentaConItems } from '@/hooks/useVentas'
import type { CobranzaConDetalle } from '@/hooks/useCobranzas'
import type { DatosPedidoComprobante, DatosNegocio } from '@/lib/generarComprobante'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (supabase: ReturnType<typeof createClient>) => supabase as any

export type { DatosNegocio, DatosPedidoComprobante }

export function useComprobante(negocio: DatosNegocio) {
  const [generando, setGenerando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const supabase = createClient()

  // ── Comprobante de venta — incluye cuotas si corresponde ──────────────────
  const descargarComprobanteVenta = useCallback(async (venta: VentaConItems) => {
    setGenerando(true)
    setError(null)
    try {
      let cuotasVenta = undefined

      // Si la venta fue en cuotas, buscar la cobranza vinculada y sus cuotas
      if (venta.tipo_pago === 'cuotas') {
        const { data: cobData } = await db(supabase)
          .from('cobranzas')
          .select('id, cuotas(numero_cuota, monto, fecha_vencimiento, fecha_pago, estado)')
          .eq('venta_id', venta.id)
          .single()

        if (cobData) {
          const cob = cobData as { cuotas: Array<{
            numero_cuota: number; monto: string
            fecha_vencimiento: string; fecha_pago: string | null; estado: string
          }> }
          cuotasVenta = [...(cob.cuotas ?? [])].sort((a, b) => a.numero_cuota - b.numero_cuota)
        }
      }

      const { generarComprobanteVenta } = await import('@/lib/generarComprobante')
      await generarComprobanteVenta(venta, negocio, cuotasVenta)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el comprobante'
      setError(msg)
      console.error('useComprobante.descargarComprobanteVenta:', err)
    } finally {
      setGenerando(false)
    }
  }, [negocio, supabase])

  // ── Comprobante de cobranza en cuotas ────────────────────────────────────────
  const descargarComprobanteCobranza = useCallback(async (cobranza: CobranzaConDetalle) => {
    setGenerando(true)
    setError(null)
    try {
      const { generarComprobanteCobranza } = await import('@/lib/generarComprobante')
      await generarComprobanteCobranza(cobranza, negocio)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el comprobante'
      setError(msg)
      console.error('useComprobante.descargarComprobanteCobranza:', err)
    } finally {
      setGenerando(false)
    }
  }, [negocio])

  // ── Comprobante de pedido/entrega ────────────────────────────────────────────
  const descargarComprobantePedido = useCallback(async (pedido: DatosPedidoComprobante) => {
    setGenerando(true)
    setError(null)
    try {
      const { generarComprobantePedido } = await import('@/lib/generarComprobante')
      await generarComprobantePedido(pedido, negocio)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el comprobante'
      setError(msg)
      console.error('useComprobante.descargarComprobantePedido:', err)
    } finally {
      setGenerando(false)
    }
  }, [negocio])

  return {
    generando, error,
    descargarComprobanteVenta,
    descargarComprobanteCobranza,
    descargarComprobantePedido,
  }
}
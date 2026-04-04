// src/app/api/push/test/route.ts
// Mismo patrón que subscribe/route.ts:
// creamos el cliente con el Bearer token para que auth.uid() funcione con RLS.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { enviarPushAUsuario } from '@/lib/push/sender'
import type { SubData, PushPayload } from '@/lib/push/sender'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any

function createClientFromToken(token: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

export async function POST(req: NextRequest) {
  try {
    // 1. Extraer token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // 2. Crear cliente con el token — auth.uid() funciona correctamente con RLS
    const supabase = createClientFromToken(token)

    // 3. Verificar usuario
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 4. Obtener suscripciones activas
    const { data: subs, error: subsErr } = await db(supabase)
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('usuario_id', user.id)
      .eq('activa', true)

    if (subsErr) {
      console.error('[push/test] Error suscripciones:', subsErr)
      return NextResponse.json({ error: subsErr.message }, { status: 500 })
    }

    if (!subs?.length) {
      return NextResponse.json(
        { error: 'No tenés dispositivos suscriptos. Activá las notificaciones primero.' },
        { status: 404 }
      )
    }

    const payload: PushPayload = {
      title: '🎉 ¡Funciona!',
      body:  'Finti te va a avisar de cobros y pedidos del día. ¡Todo listo! 🚀',
      type:  'general',
      url:   '/dashboard',
    }

    const { enviadas, expiradas } = await enviarPushAUsuario(subs as SubData[], payload)

    // Marcar expiradas como inactivas
    if (expiradas.length > 0) {
      await db(supabase)
        .from('push_subscriptions')
        .update({ activa: false })
        .in('endpoint', expiradas)
    }

    // Registrar en log
    await db(supabase)
      .from('notificaciones_log')
      .insert({
        usuario_id: user.id,
        tipo:       'pago_confirmado',
        canal:      'push',
        estado:     enviadas > 0 ? 'enviada' : 'fallida',
        contenido:  payload,
        enviada_at: new Date().toISOString(),
      })

    if (!enviadas) {
      return NextResponse.json(
        { error: 'No se pudo enviar. Intentá desactivar y volver a activar las notificaciones.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, enviadas })

  } catch (err) {
    console.error('[push/test] Error inesperado:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
// src/app/api/push/subscribe/route.ts
//
// El problema con RLS: cuando usamos createClient() del servidor (basado en cookies)
// y luego hacemos getUser(token), Supabase verifica el usuario pero las queries
// a la DB siguen usando el contexto de las cookies — NO el token Bearer.
// Por eso auth.uid() devuelve null en las políticas RLS y el INSERT falla.
//
// La solución: crear el cliente con createServerClient pasando el token
// directamente como global header, así auth.uid() funciona correctamente.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function createClientFromToken(token: string) {
  // Creamos un cliente Supabase que usa el JWT del usuario como Authorization header.
  // Esto hace que auth.uid() en las políticas RLS resuelva correctamente.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (s: any) => s as any

// ── POST: registrar suscripción ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // 1. Extraer el token del header Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // 2. Crear cliente con el token — esto asegura que auth.uid() funcione en RLS
    const supabase = createClientFromToken(token)

    // 3. Verificar que el token es válido
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      console.error('[push/subscribe] Auth error:', authErr?.message)
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // 4. Validar body
    const body = await req.json()
    const { subscription } = body
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Suscripción inválida — faltan campos' }, { status: 400 })
    }

    // 5. Verificar si ya existe este endpoint para este usuario
    const { data: existing } = await db(supabase)
      .from('push_subscriptions')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .limit(1)

    const yaExiste = Array.isArray(existing) && existing.length > 0

    if (yaExiste) {
      // Actualizar suscripción existente
      const { error: updateErr } = await db(supabase)
        .from('push_subscriptions')
        .update({
          p256dh:     subscription.keys.p256dh,
          auth:       subscription.keys.auth,
          user_agent: req.headers.get('user-agent') ?? null,
          activa:     true,
        })
        .eq('usuario_id', user.id)
        .eq('endpoint', subscription.endpoint)

      if (updateErr) {
        console.error('[push/subscribe] UPDATE error:', updateErr)
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }
    } else {
      // Insertar nueva suscripción
      const { error: insertErr } = await db(supabase)
        .from('push_subscriptions')
        .insert({
          usuario_id: user.id,
          endpoint:   subscription.endpoint,
          p256dh:     subscription.keys.p256dh,
          auth:       subscription.keys.auth,
          user_agent: req.headers.get('user-agent') ?? null,
          activa:     true,
        })

      if (insertErr) {
        console.error('[push/subscribe] INSERT error:', insertErr)
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[push/subscribe] Error inesperado:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}

// ── DELETE: eliminar suscripción ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    const supabase = createClientFromToken(token)

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    const { endpoint } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint requerido' }, { status: 400 })
    }

    const { error: dbErr } = await db(supabase)
      .from('push_subscriptions')
      .delete()
      .eq('usuario_id', user.id)
      .eq('endpoint', endpoint)

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[push/subscribe DELETE] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
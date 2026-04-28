'use client'

// src/hooks/useOnboarding.ts
// Maneja si el usuario ya completó el tutorial de inicio.
// Guarda el estado en localStorage para persistir entre sesiones.
// También expone el paso actual del tutorial para navegación programática.

import { useState, useCallback } from 'react'

const KEY_TUTORIAL    = 'finti_tutorial_completado'
const KEY_PASO_ACTUAL = 'finti_tutorial_paso'

export function useOnboarding() {
  const [completado, setCompletado] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(KEY_TUTORIAL) === 'true'
  })

  const [pasoActual, setPasoActualState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem(KEY_PASO_ACTUAL) ?? '0', 10)
  })

  const marcarCompletado = useCallback(() => {
    setCompletado(true)
    try {
      localStorage.setItem(KEY_TUTORIAL, 'true')
      localStorage.removeItem(KEY_PASO_ACTUAL)
    } catch (e) {}
  }, [])

  const setPasoActual = useCallback((paso: number) => {
    setPasoActualState(paso)
    try {
      localStorage.setItem(KEY_PASO_ACTUAL, String(paso))
    } catch (e) {}
  }, [])

  const reiniciarTutorial = useCallback(() => {
    setCompletado(false)
    setPasoActualState(0)
    try {
      localStorage.removeItem(KEY_TUTORIAL)
      localStorage.removeItem(KEY_PASO_ACTUAL)
    } catch (e) {}
  }, [])

  return {
    completado,
    pasoActual,
    setPasoActual,
    marcarCompletado,
    reiniciarTutorial,
  }
}
'use client'
import { useState, useEffect, useCallback } from 'react'

const KEY = 'finti_dark_mode'

export function useDarkMode(): [boolean, (v: boolean) => void] {
  // Inicializamos leyendo directamente si el HTML ya tiene la clase 'dark'
  const [dark, setDarkState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  const setDark = useCallback((value: boolean) => {
    setDarkState(value)
    document.documentElement.classList.toggle('dark', value)
    try {
      localStorage.setItem(KEY, String(value))
    } catch (e) {}
  }, [])

  return [dark, setDark]
}
// src/app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  // Forzamos la entrada al login. 
  // Si ya hay sesión, el Middleware te sacará de aquí hacia el dashboard automáticamente.
  redirect('/login')
}
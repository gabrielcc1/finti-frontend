// src/app/page.tsx
// La raíz redirige al middleware — él decide si va a /dashboard o /login
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
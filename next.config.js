/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 usa Turbopack por defecto
  // jsPDF y fflate usan Worker de Node — se excluyen del bundle del servidor
  serverExternalPackages: ['jspdf', 'fflate'],

  // Config vacía de turbopack para silenciar el warning
  turbopack: {},
}

module.exports = nextConfig
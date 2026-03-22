/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 16 usa Turbopack por defecto
  // jsPDF y fflate usan Worker de Node — se excluyen del bundle del servidor
  serverExternalPackages: ['jspdf', 'fflate'],

  // Config vacía de turbopack para silenciar el warning
  turbopack: {},

  // Ignorar errores de ESLint durante el build de producción
  // El conflicto eslint@10 vs eslint-plugin-import/jsx-a11y/react/react-hooks
  // es una incompatibilidad de versiones entre eslint-config-next@16 y eslint@10
  // No afecta el runtime — solo bloquea el deploy innecesariamente
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
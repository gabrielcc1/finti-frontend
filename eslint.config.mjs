import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'react/no-unescaped-entities':       'off',
      '@next/next/no-page-custom-font':    'off',
      'react-hooks/exhaustive-deps':       'off',
    },
  },
  {
    ignores: [
      'src/hooks/**/*.ts',
      'src/components/shared/BuscadorGlobal.tsx',
    ],
  },
]

export default eslintConfig
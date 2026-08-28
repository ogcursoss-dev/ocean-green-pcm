'use client'

// global-error.tsx - Componente cliente que captura erros não tratados
// Não pode usar hooks (useContext, useState, etc) pois é renderizado fora do AppTree

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', color: '#0A5C36', maxWidth: '600px', margin: '0 auto', marginTop: '4rem' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#0A5C36' }}>
            Ocean Green Treinamentos
          </h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Ocorreu um erro inesperado. Tente novamente.
          </p>
          <p style={{ color: '#999', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {error?.message || 'Erro desconhecido'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              backgroundColor: '#0A5C36',
              color: 'white',
              padding: '0.625rem 1.5rem',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}

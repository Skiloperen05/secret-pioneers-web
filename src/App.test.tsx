import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

import App from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Public pages', () => {
  it('renders the home page with hero and navigation', () => {
    renderAt('/')
    expect(
      screen.getByRole('heading', { name: /en ny generasjon/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Prosjekter')).toBeInTheDocument()
    expect(screen.getByText('Tjenester')).toBeInTheDocument()
    expect(screen.getByText('Innsikt')).toBeInTheDocument()
    expect(screen.getByText('Om oss')).toBeInTheDocument()
    expect(screen.getByText('Kontakt')).toBeInTheDocument()
  })

  it('renders the projects page', () => {
    renderAt('/prosjekter')
    expect(screen.getByRole('heading', { name: /prosjekter/i })).toBeInTheDocument()
  })

  it('renders the services page', () => {
    renderAt('/tjenester')
    expect(screen.getByRole('heading', { name: /tjenester/i })).toBeInTheDocument()
  })

  it('renders the insight page', () => {
    renderAt('/innsikt')
    expect(
      screen.getByRole('heading', { name: /artikler og analyser/i }),
    ).toBeInTheDocument()
  })

  it('renders the about page', () => {
    renderAt('/om-oss')
    expect(
      screen.getByRole('heading', { name: /om secret pioneers/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/norges handelshøyskole/i)).toBeInTheDocument()
  })

  it('renders the contact page with form', () => {
    renderAt('/kontakt')
    expect(
      screen.getByRole('heading', { level: 1, name: /kontakt/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/navn/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-post/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/melding/i)).toBeInTheDocument()
  })
})

describe('Studio', () => {
  it('shows unconfigured state when Supabase is not connected', () => {
    renderAt('/studio')
    expect(screen.getByText(/studio kobles til snart/i)).toBeInTheDocument()
  })
})

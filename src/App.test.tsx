import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

import App from './App'

describe('App', () => {
  it('viser Secret Pioneers sin grunnleggende posisjonering', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /en ny generasjon/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /medlemsinnlogging/i }),
    ).toBeInTheDocument()
  })

  it('åpner Studio uten å eksponere medlemsinnhold', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /medlemsinnlogging/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Studio kobles til snart/i)).toBeInTheDocument()
  })
})

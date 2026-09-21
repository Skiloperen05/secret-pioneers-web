import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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

  it('åpner en medlemsinnlogging uten å eksponere Studio-innhold', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /medlemsinnlogging/i }))

    expect(
      screen.getByRole('heading', { name: /medlemsinnlogging/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/e-post/i)).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
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
})

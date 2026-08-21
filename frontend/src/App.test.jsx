import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

describe('App routing shell', () => {
  it('shows the login screen when there is no active session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    render(<App />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /masuk ke sistem/i })).toBeInTheDocument())
  })
})

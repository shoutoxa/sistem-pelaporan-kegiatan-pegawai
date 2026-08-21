import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

describe('App health status', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows an actionable offline message when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    render(<App />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Backend tidak dapat dihubungi'))
    expect(screen.getByText(/pastikan backend berjalan/i)).toBeInTheDocument()
  })
})

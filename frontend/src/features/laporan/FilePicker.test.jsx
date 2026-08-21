import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FilePicker from './FilePicker.jsx'

function file(name, size, type = 'image/jpeg') {
  const result = new File([new Uint8Array(Math.min(size, 20))], name, { type })
  Object.defineProperty(result, 'size', { value: size })
  return result
}

describe('FilePicker', () => {
  it('rejects a sixth file and a file over 10 MB', () => {
    const onChange = vi.fn()
    render(<FilePicker files={[]} onChange={onChange} />)
    const input = screen.getByLabelText(/dokumentasi/i)

    fireEvent.change(input, { target: { files: [file('1.jpg', 1), file('2.jpg', 1), file('3.jpg', 1), file('4.jpg', 1), file('5.jpg', 1), file('6.jpg', 1)] } })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/maksimal 5/i)

    fireEvent.change(input, { target: { files: [file('big.jpg', 10_000_001)] } })
    expect(screen.getByRole('alert')).toHaveTextContent(/10 MB/i)
  })
})

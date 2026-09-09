import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no blob renderer or native top-layer dialog; browser smoke covers those.
if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => 'blob:test-preview')
if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn()
if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = function () { this.open = true }
if (!HTMLDialogElement.prototype.close) HTMLDialogElement.prototype.close = function () { this.open = false }

afterEach(() => cleanup())

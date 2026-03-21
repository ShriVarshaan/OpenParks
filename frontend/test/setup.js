import '@testing-library/jest-dom'
import {cleanup} from '@testing-library/react'
import {afterEach} from 'vitest'

afterEach(() => {
    cleanup()
})

const loaclStorageMock = (() => {
    let store = {}
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {store[key] = value.toString()},
        removeItem: (key) => {delete store[key]},
        clear: () => {store = {}}
    }
})()

Object.defineProperty(window, 'localStorage', {value: loaclStorageMock})

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})
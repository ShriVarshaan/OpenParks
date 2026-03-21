import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AccessibilityToggle from '../src/components/AccessibilityToggle'
import { useAccessibility } from '../src/context/AccessibilityContext'

vi.mock('../src/context/AccessibilityContext', () => ({
    useAccessibility: vi.fn(),
}))

describe('AccessibilityToggle', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('displays enable text and sun icon when highContrast is false', () => {
        useAccessibility.mockReturnValue({
            highContrast: false,
            toggleHighContrast: vi.fn(),
        })
    
        render(<AccessibilityToggle />)
    
        expect(screen.getByText('Enable High Contrast')).toBeInTheDocument()
        expect(screen.getByText('🌞')).toBeInTheDocument()
        expect(screen.queryByText('🌙')).not.toBeInTheDocument()
      })

    it('displays disable text and moon icon when highContrast is true', () => {
        useAccessibility.mockReturnValue({
            highContrast: true,
            toggleHighContrast: vi.fn(),
        })
    
        render(<AccessibilityToggle />)
    
        expect(screen.getByText('Disable High Contrast')).toBeInTheDocument()
        expect(screen.getByText('🌙')).toBeInTheDocument()
        expect(screen.queryByText('🌞')).not.toBeInTheDocument()
    })

    it('calls toggleHighContrast when button is clicked', () => {
        const mockToggle = vi.fn()
        useAccessibility.mockReturnValue({
            highContrast: false,
            toggleHighContrast: mockToggle,
        })
    
        render(<AccessibilityToggle />)
    
        const button = screen.getByRole('button')
        fireEvent.click(button)
    
        expect(mockToggle).toHaveBeenCalledTimes(1)
    })

    it('has aria-label attribute for accessibility', () => {
        useAccessibility.mockReturnValue({
            highContrast: false,
            toggleHighContrast: vi.fn(),
        })
    
        render(<AccessibilityToggle />)
    
        const button = screen.getByRole('button')
        expect(button).toHaveAttribute('aria-label', 'Toggle high contrast mode')
    })
})
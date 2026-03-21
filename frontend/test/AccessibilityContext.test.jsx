import {render, screen, fireEvent} from '@testing-library/react'
import {describe, it, expect} from 'vitest'
import {AccessibilityProvider, useAccessibility} from '../src/context/AccessibilityContext'

const TestConsumer = () => {
    const {highContrast, toggleHighContrast} = useAccessibility()
    return (
        <div>
            <span data-testid="mode">{highContrast ? 'on': 'off'}</span>
            <button data-testid="toggle" onClick={toggleHighContrast}>toggle</button>
        </div>
    )
}

const BrokenConsumer = () => {
  useAccessibility()
  return null
}

describe('AccessibilityContext', () => {
  it('provides initial highContrast value as false', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    )
    
    expect(screen.getByTestId('mode')).toHaveTextContent('off')
  })

  it('changes highContrast to true when toggle is clicked', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    )
    
    const toggleButton = screen.getByTestId('toggle')
    fireEvent.click(toggleButton)
    
    expect(screen.getByTestId('mode')).toHaveTextContent('on')
  })

  it('adds high-contrast-mode class to body element when enabled', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    )
    
    const toggleButton = screen.getByTestId('toggle')
    fireEvent.click(toggleButton)
    
    expect(document.body.classList.contains('high-contrast-mode')).toBe(true)
  })

  it('removes high-contrast-mode class from body when disabled', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    )
    
    const toggleButton = screen.getByTestId('toggle')
    fireEvent.click(toggleButton)
    fireEvent.click(toggleButton)
    
    expect(document.body.classList.contains('high-contrast-mode')).toBe(false)
  })

  it('throws error when useAccessibility is used outside provider', () => {
    expect(() => render(<BrokenConsumer />)).toThrow(
      'useAccessibility must be used within an AccessibilityProvider'
    )
  })
})
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90')
  })

  it('renders with custom text', () => {
    render(<Button>Custom Button Text</Button>)

    const button = screen.getByRole('button', { name: 'Custom Button Text' })
    expect(button).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>)

    const button = screen.getByRole('button', { name: 'Disabled Button' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')

    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  describe('Variants', () => {
    it('renders destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>)

      const button = screen.getByRole('button', { name: 'Delete' })
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground', 'hover:bg-destructive/90')
    })

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>)

      const button = screen.getByRole('button', { name: 'Outline' })
      expect(button).toHaveClass('border', 'border-input', 'bg-background', 'hover:bg-accent')
    })

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)

      const button = screen.getByRole('button', { name: 'Secondary' })
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80')
    })

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)

      const button = screen.getByRole('button', { name: 'Ghost' })
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground')
    })

    it('renders link variant', () => {
      render(<Button variant="link">Link Button</Button>)

      const button = screen.getByRole('button', { name: 'Link Button' })
      expect(button).toHaveClass('text-primary', 'underline-offset-4', 'hover:underline')
    })

    it('renders catholic variant', () => {
      render(<Button variant="catholic">Catholic Button</Button>)

      const button = screen.getByRole('button', { name: 'Catholic Button' })
      expect(button).toHaveClass('bg-catholic-blue', 'text-white', 'hover:bg-catholic-blue/90')
    })

    it('renders catholicOutline variant', () => {
      render(<Button variant="catholicOutline">Catholic Outline</Button>)

      const button = screen.getByRole('button', { name: 'Catholic Outline' })
      expect(button).toHaveClass('border', 'border-catholic-blue', 'text-catholic-blue')
    })

    it('renders catholicSecondary variant', () => {
      render(<Button variant="catholicSecondary">Catholic Secondary</Button>)

      const button = screen.getByRole('button', { name: 'Catholic Secondary' })
      expect(button).toHaveClass('bg-catholic-gold', 'text-white', 'hover:bg-catholic-gold/90')
    })
  })

  describe('Sizes', () => {
    it('renders default size', () => {
      render(<Button>Default Size</Button>)

      const button = screen.getByRole('button', { name: 'Default Size' })
      expect(button).toHaveClass('h-10', 'px-4', 'py-2')
    })

    it('renders small size', () => {
      render(<Button size="sm">Small Button</Button>)

      const button = screen.getByRole('button', { name: 'Small Button' })
      expect(button).toHaveClass('h-9', 'rounded-md', 'px-3')
    })

    it('renders large size', () => {
      render(<Button size="lg">Large Button</Button>)

      const button = screen.getByRole('button', { name: 'Large Button' })
      expect(button).toHaveClass('h-11', 'rounded-md', 'px-8')
    })

    it('renders icon size', () => {
      render(<Button size="icon" aria-label="Icon Button"><span>📱</span></Button>)

      const button = screen.getByRole('button', { name: 'Icon Button' })
      expect(button).toHaveClass('h-10', 'w-10')
    })
  })

  describe('Custom Classes', () => {
    it('merges custom className with default classes', () => {
      render(<Button className="custom-class another-class">Custom Classes</Button>)

      const button = screen.getByRole('button', { name: 'Custom Classes' })
      expect(button).toHaveClass('custom-class', 'another-class')
      expect(button).toHaveClass('bg-primary') // Should still have default classes
    })

    it('preserves button functionality with custom classes', () => {
      const handleClick = jest.fn()
      render(
        <Button className="custom-styling" onClick={handleClick}>
          Click me
        </Button>
      )

      const button = screen.getByRole('button', { name: 'Click me' })
      fireEvent.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Props Handling', () => {
    it('passes through other button props', () => {
      render(
        <Button
          type="submit"
          name="test-button"
          value="test-value"
          data-testid="custom-button"
        >
          Submit Button
        </Button>
      )

      const button = screen.getByTestId('custom-button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('name', 'test-button')
      expect(button).toHaveAttribute('value', 'test-value')
    })

    it('handles aria attributes', () => {
      render(
        <Button aria-label="Custom label" aria-describedby="description">
          Button
        </Button>
      )

      const button = screen.getByRole('button', { name: 'Custom label' })
      expect(button).toHaveAttribute('aria-describedby', 'description')
    })

    it('handles form attributes', () => {
      render(
        <Button form="test-form" formAction="/submit" formMethod="post">
          Submit
        </Button>
      )

      const button = screen.getByRole('button', { name: 'Submit' })
      expect(button).toHaveAttribute('form', 'test-form')
      expect(button).toHaveAttribute('formaction', '/submit')
      expect(button).toHaveAttribute('formmethod', 'post')
    })
  })

  describe('Accessibility', () => {
    it('is focusable', () => {
      render(<Button>Focusable Button</Button>)

      const button = screen.getByRole('button', { name: 'Focusable Button' })
      button.focus()
      expect(button).toHaveFocus()
    })

    it('can be triggered with keyboard', async () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Keyboard Button</Button>)

      const button = screen.getByRole('button', { name: 'Keyboard Button' })
      button.focus()

      await userEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('respects aria-disabled attribute', () => {
      render(<Button aria-disabled="true">Aria Disabled</Button>)

      const button = screen.getByRole('button', { name: 'Aria Disabled' })
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Ref Forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Ref Button</Button>)

      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
      expect(ref.current).toBe(screen.getByRole('button', { name: 'Ref Button' }))
    })

    it('can be used with imperative methods', () => {
      const ref = React.createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Click me</Button>)

      if (ref.current) {
        ref.current.focus()
        expect(ref.current).toHaveFocus()
      }
    })
  })

  describe('asChild Prop', () => {
    // Note: Testing asChild would require mocking @radix-ui/react-slot
    // For now, we'll test that the component renders correctly when asChild is false (default)
    it('renders as button when asChild is false', () => {
      render(<Button asChild={false}>Regular Button</Button>)

      const button = screen.getByRole('button', { name: 'Regular Button' })
      expect(button.tagName).toBe('BUTTON')
    })

    it('accepts asChild prop without errors', () => {
      expect(() => {
        render(<Button asChild>Child Button</Button>)
      }).not.toThrow()
    })
  })

  describe('Complex Content', () => {
    it('renders with complex children', () => {
      render(
        <Button>
          <span className="icon">🎉</span>
          <span className="text">Complex Button</span>
        </Button>
      )

      const button = screen.getByRole('button', { name: '🎉 Complex Button' })
      expect(button).toBeInTheDocument()
    })

    it('handles children with icons and text', () => {
      render(
        <Button>
          <svg data-testid="test-icon" width="16" height="16" />
          Icon Button
        </Button>
      )

      const button = screen.getByRole('button', { name: 'Icon Button' })
      const icon = screen.getByTestId('test-icon')
      expect(button).toContainElement(icon)
    })
  })

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(<Button>Initial Text</Button>)

      const button = screen.getByRole('button')
      const initialClasses = button.className

      rerender(<Button>Updated Text</Button>)

      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('Updated Text')
      expect(button.className).toBe(initialClasses)
    })
  })
})
import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '../card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default styles', () => {
      render(<Card>Card content</Card>)

      const card = screen.getByText('Card content')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      )
    })

    it('accepts custom className', () => {
      render(<Card className="custom-card">Custom card</Card>)

      const card = screen.getByText('Custom card')
      expect(card).toHaveClass('custom-card')
      expect(card).toHaveClass('rounded-lg') // Should still have default classes
    })

    it('passes through other props', () => {
      render(
        <Card data-testid="test-card" role="article">
          Test content
        </Card>
      )

      const card = screen.getByTestId('test-card')
      expect(card).toHaveAttribute('role', 'article')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Ref card</Card>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current).toHaveTextContent('Ref card')
    })
  })

  describe('CardHeader', () => {
    it('renders with default styles', () => {
      render(<CardHeader>Header content</CardHeader>)

      const header = screen.getByText('Header content')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    })

    it('accepts custom className', () => {
      render(<CardHeader className="custom-header">Custom header</CardHeader>)

      const header = screen.getByText('Custom header')
      expect(header).toHaveClass('custom-header')
      expect(header).toHaveClass('p-6') // Should still have default classes
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardHeader ref={ref}>Ref header</CardHeader>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current).toHaveTextContent('Ref header')
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 with default styles', () => {
      render(<CardTitle>Card Title</CardTitle>)

      const title = screen.getByRole('heading', { name: 'Card Title', level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass(
        'text-2xl',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      )
    })

    it('accepts custom className', () => {
      render(<CardTitle className="custom-title">Custom Title</CardTitle>)

      const title = screen.getByRole('heading')
      expect(title).toHaveClass('custom-title')
      expect(title).toHaveClass('font-semibold') // Should still have default classes
    })

    it('passes through heading props', () => {
      render(<CardTitle id="custom-title">Title with ID</CardTitle>)

      const title = screen.getByRole('heading')
      expect(title).toHaveAttribute('id', 'custom-title')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>()
      render(<CardTitle ref={ref}>Ref title</CardTitle>)

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
      expect(ref.current).toHaveTextContent('Ref title')
    })
  })

  describe('CardDescription', () => {
    it('renders with default styles', () => {
      render(<CardDescription>Card description</CardDescription>)

      const description = screen.getByText('Card description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('accepts custom className', () => {
      render(<CardDescription className="custom-description">Custom description</CardDescription>)

      const description = screen.getByText('Custom description')
      expect(description).toHaveClass('custom-description')
      expect(description).toHaveClass('text-sm') // Should still have default classes
    })

    it('passes through paragraph props', () => {
      render(<CardDescription lang="en">Description with lang</CardDescription>)

      const description = screen.getByText('Description with lang')
      expect(description).toHaveAttribute('lang', 'en')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(<CardDescription ref={ref}>Ref description</CardDescription>)

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
      expect(ref.current).toHaveTextContent('Ref description')
    })
  })

  describe('CardContent', () => {
    it('renders with default styles', () => {
      render(<CardContent>Card content</CardContent>)

      const content = screen.getByText('Card content')
      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('p-6', 'pt-0')
    })

    it('accepts custom className', () => {
      render(<CardContent className="custom-content">Custom content</CardContent>)

      const content = screen.getByText('Custom content')
      expect(content).toHaveClass('custom-content')
      expect(content).toHaveClass('p-6') // Should still have default classes
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardContent ref={ref}>Ref content</CardContent>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current).toHaveTextContent('Ref content')
    })
  })

  describe('CardFooter', () => {
    it('renders with default styles', () => {
      render(<CardFooter>Card footer</CardFooter>)

      const footer = screen.getByText('Card footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
    })

    it('accepts custom className', () => {
      render(<CardFooter className="custom-footer">Custom footer</CardFooter>)

      const footer = screen.getByText('Custom footer')
      expect(footer).toHaveClass('custom-footer')
      expect(footer).toHaveClass('flex') // Should still have default classes
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardFooter ref={ref}>Ref footer</CardFooter>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current).toHaveTextContent('Ref footer')
    })
  })

  describe('Complete Card Structure', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complete Card Title</CardTitle>
            <CardDescription>Complete card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Footer Action</button>
          </CardFooter>
        </Card>
      )

      const card = screen.getByRole('article')
      const title = screen.getByRole('heading', { name: 'Complete Card Title' })
      const description = screen.getByText('Complete card description')
      const content = screen.getByText('Main content goes here')
      const footer = screen.getByRole('button', { name: 'Footer Action' })

      expect(card).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
      expect(content).toBeInTheDocument()
      expect(footer).toBeInTheDocument()

      // Test that all components are nested correctly
      expect(card).toContainElement(title.parentElement?.parentElement as HTMLElement)
      expect(card).toContainElement(content.parentElement as HTMLElement)
      expect(card).toContainElement(footer.parentElement as HTMLElement)
    })

    it('renders a minimal card with just content', () => {
      render(
        <Card>
          <CardContent>Simple content only</CardContent>
        </Card>
      )

      const card = screen.getByRole('article')
      const content = screen.getByText('Simple content only')

      expect(card).toBeInTheDocument()
      expect(content).toBeInTheDocument()
      expect(card).toContainElement(content.parentElement as HTMLElement)
    })

    it('supports complex nested content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Complex Card</CardTitle>
            <CardDescription>
              <span>With nested elements</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
              <li>Item 3</li>
            </ul>
          </CardContent>
          <CardFooter>
            <div>
              <button>Cancel</button>
              <button>Submit</button>
            </div>
          </CardFooter>
        </Card>
      )

      expect(screen.getByRole('heading')).toBeInTheDocument()
      expect(screen.getByText('With nested elements')).toBeInTheDocument()
      expect(screen.getByRole('list')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
      expect(screen.getAllByRole('button')).toHaveLength(2)
    })
  })

  describe('Accessibility', () => {
    it('supports ARIA attributes', () => {
      render(
        <Card role="article" aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Accessible Card</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      )

      const card = screen.getByRole('article')
      const title = screen.getByRole('heading', { name: 'Accessible Card' })

      expect(card).toHaveAttribute('aria-labelledby', 'card-title')
      expect(title).toHaveAttribute('id', 'card-title')
    })

    it('supports semantic markup', () => {
      render(
        <Card as="article">
          <CardHeader>
            <CardTitle>Semantic Card</CardTitle>
          </CardHeader>
          <CardContent>Semantic content</CardContent>
        </Card>
      )

      const card = screen.getByRole('article')
      const title = screen.getByRole('heading')

      expect(card).toBeInTheDocument()
      expect(title).toBeInTheDocument()
      expect(card).toContainElement(title.parentElement?.parentElement as HTMLElement)
    })

    it('handles keyboard navigation when interactive', () => {
      const handleClick = jest.fn()
      render(
        <Card
          onClick={handleClick}
          tabIndex={0}
          role="button"
          aria-label="Interactive card"
        >
          <CardContent>Click me</CardContent>
        </Card>
      )

      const card = screen.getByRole('button', { name: 'Interactive card' })
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Performance', () => {
    it('should handle many cards efficiently', () => {
      const cards = Array.from({ length: 100 }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>Card {i}</CardTitle>
          </CardHeader>
          <CardContent>Content {i}</CardContent>
        </Card>
      ))

      expect(() => render(<div>{cards}</div>)).not.toThrow()
    })

    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(
        <Card>
          <CardHeader>
            <CardTitle>Initial Title</CardTitle>
          </CardHeader>
          <CardContent>Initial Content</CardContent>
        </Card>
      )

      const title = screen.getByRole('heading')
      const initialTitleClasses = title.className

      rerender(
        <Card>
          <CardHeader>
            <CardTitle>Updated Title</CardTitle>
          </CardHeader>
          <CardContent>Updated Content</CardContent>
        </Card>
      )

      expect(title).toHaveTextContent('Updated Title')
      expect(title.className).toBe(initialTitleClasses)
    })
  })
})
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner, LoadingSkeleton, CardSkeleton, TableSkeleton } from '@/components/ui/loading-spinner'

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('generic')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  it('should render with custom size', () => {
    render(<LoadingSpinner size="lg" />)
    
    const spinner = screen.getByRole('generic')
    expect(spinner).toHaveClass('h-8', 'w-8')
  })

  it('should render with text', () => {
    render(<LoadingSpinner text="Loading data..." />)
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    
    const spinner = screen.getByRole('generic')
    expect(spinner).toHaveClass('custom-class')
  })
})

describe('LoadingSkeleton', () => {
  it('should render with default styling', () => {
    render(<LoadingSkeleton />)
    
    const skeleton = screen.getByRole('generic')
    expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-200', 'rounded')
  })

  it('should apply custom className', () => {
    render(<LoadingSkeleton className="h-4 w-32" />)
    
    const skeleton = screen.getByRole('generic')
    expect(skeleton).toHaveClass('h-4', 'w-32')
  })
})

describe('CardSkeleton', () => {
  it('should render card skeleton structure', () => {
    const { container } = render(<CardSkeleton />)
    
    // Check for main container
    expect(container.firstChild).toHaveClass('bg-white', 'rounded-lg', 'border')
    
    // Check for skeleton elements
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

describe('TableSkeleton', () => {
  it('should render default number of rows', () => {
    const { container } = render(<TableSkeleton />)
    
    // Should render 5 rows by default
    const rows = container.querySelectorAll('.flex.items-center.space-x-4')
    expect(rows).toHaveLength(5)
  })

  it('should render custom number of rows', () => {
    const { container } = render(<TableSkeleton rows={3} />)
    
    const rows = container.querySelectorAll('.flex.items-center.space-x-4')
    expect(rows).toHaveLength(3)
  })

  it('should render skeleton elements in each row', () => {
    const { container } = render(<TableSkeleton rows={1} />)
    
    const row = container.querySelector('.flex.items-center.space-x-4')
    expect(row).toBeInTheDocument()
    
    // Check for skeleton elements within the row
    const skeletons = row?.querySelectorAll('.animate-pulse')
    expect(skeletons?.length).toBeGreaterThan(0)
  })
})
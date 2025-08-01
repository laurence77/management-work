/**
 * Tests for Responsive Card Component
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render, responsiveHelpers } from '@/utils/test-utils';
import { ResponsiveCard } from '@/components/responsive-card';

describe('ResponsiveCard', () => {
  const defaultProps = {
    title: 'Test Card',
    children: <div>Card Content</div>
  };

  beforeEach(() => {
    responsiveHelpers.setDesktopViewport();
  });

  describe('Basic Functionality', () => {
    test('renders card with title and content', () => {
      render(<ResponsiveCard {...defaultProps} />);

      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    test('renders without title when not provided', () => {
      render(
        <ResponsiveCard>
          <div>Content only</div>
        </ResponsiveCard>
      );

      expect(screen.getByText('Content only')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    test('renders with subtitle', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          subtitle="Card Subtitle"
        />
      );

      expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
    });

    test('renders with description', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          description="This is a card description"
        />
      );

      expect(screen.getByText('This is a card description')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('applies mobile-specific classes on mobile viewport', () => {
      responsiveHelpers.setMobileViewport();
      
      render(<ResponsiveCard {...defaultProps} />);

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('w-full');
      expect(card).toHaveClass('p-4');
    });

    test('applies tablet-specific classes on tablet viewport', () => {
      responsiveHelpers.setTabletViewport();
      
      render(<ResponsiveCard {...defaultProps} />);

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('md:p-6');
    });

    test('applies desktop-specific classes on desktop viewport', () => {
      responsiveHelpers.setDesktopViewport();
      
      render(<ResponsiveCard {...defaultProps} />);

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('lg:p-8');
    });

    test('adjusts image size responsively', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          image={{
            src: 'test-image.jpg',
            alt: 'Test Image'
          }}
        />
      );

      const image = screen.getByAltText('Test Image');
      expect(image).toHaveClass('w-full');
      expect(image).toHaveClass('h-48');
      expect(image).toHaveClass('md:h-56');
      expect(image).toHaveClass('lg:h-64');
    });
  });

  describe('Image Handling', () => {
    test('renders with image', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          image={{
            src: 'test-image.jpg',
            alt: 'Test Image'
          }}
        />
      );

      const image = screen.getByAltText('Test Image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'test-image.jpg');
    });

    test('handles image loading states', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          image={{
            src: 'test-image.jpg',
            alt: 'Test Image',
            loading: 'lazy'
          }}
        />
      );

      const image = screen.getByAltText('Test Image');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    test('applies image placeholder when loading', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          image={{
            src: 'test-image.jpg',
            alt: 'Test Image',
            placeholder: true
          }}
        />
      );

      const imageContainer = screen.getByAltText('Test Image').parentElement;
      expect(imageContainer).toHaveClass('bg-gray-200');
    });
  });

  describe('Action Buttons', () => {
    test('renders action buttons', () => {
      const actions = [
        { label: 'Edit', onClick: jest.fn(), variant: 'primary' as const },
        { label: 'Delete', onClick: jest.fn(), variant: 'destructive' as const }
      ];

      render(
        <ResponsiveCard 
          {...defaultProps} 
          actions={actions}
        />
      );

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    test('handles action clicks', async () => {
      const mockOnClick = jest.fn();
      const actions = [
        { label: 'Click Me', onClick: mockOnClick, variant: 'primary' as const }
      ];

      const { user } = render(
        <ResponsiveCard 
          {...defaultProps} 
          actions={actions}
        />
      );

      const button = screen.getByRole('button', { name: 'Click Me' });
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('stacks action buttons on mobile', () => {
      responsiveHelpers.setMobileViewport();
      
      const actions = [
        { label: 'Action 1', onClick: jest.fn(), variant: 'primary' as const },
        { label: 'Action 2', onClick: jest.fn(), variant: 'secondary' as const }
      ];

      render(
        <ResponsiveCard 
          {...defaultProps} 
          actions={actions}
        />
      );

      const actionsContainer = screen.getByRole('button', { name: 'Action 1' }).parentElement;
      expect(actionsContainer).toHaveClass('flex-col');
      expect(actionsContainer).toHaveClass('sm:flex-row');
    });
  });

  describe('Loading States', () => {
    test('shows loading skeleton', () => {
      render(<ResponsiveCard loading={true} />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('shows loading with partial content', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          loading={true}
        />
      );

      // Should still show title but with loading content
      expect(screen.getByText('Test Card')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });
  });

  describe('Card Variants', () => {
    test('applies elevated variant', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          variant="elevated"
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('shadow-lg');
      expect(card).toHaveClass('hover:shadow-xl');
    });

    test('applies outlined variant', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          variant="outlined"
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('border-2');
      expect(card).toHaveClass('border-gray-200');
    });

    test('applies filled variant', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          variant="filled"
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('bg-gray-50');
    });
  });

  describe('Interactive States', () => {
    test('applies clickable styles when onClick provided', () => {
      const mockOnClick = jest.fn();
      
      render(
        <ResponsiveCard 
          {...defaultProps} 
          onClick={mockOnClick}
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('hover:bg-gray-50');
      expect(card).toHaveClass('transition-colors');
    });

    test('handles card click', async () => {
      const mockOnClick = jest.fn();
      
      const { user } = render(
        <ResponsiveCard 
          {...defaultProps} 
          onClick={mockOnClick}
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      await user.click(card!);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('disables interaction when disabled', () => {
      const mockOnClick = jest.fn();
      
      render(
        <ResponsiveCard 
          {...defaultProps} 
          onClick={mockOnClick}
          disabled={true}
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('opacity-50');
      expect(card).toHaveClass('pointer-events-none');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes when clickable', () => {
      const mockOnClick = jest.fn();
      
      render(
        <ResponsiveCard 
          {...defaultProps} 
          onClick={mockOnClick}
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    test('supports keyboard navigation when clickable', async () => {
      const mockOnClick = jest.fn();
      
      const { user } = render(
        <ResponsiveCard 
          {...defaultProps} 
          onClick={mockOnClick}
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      card!.focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' ');
      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });

    test('has proper heading hierarchy', () => {
      render(
        <ResponsiveCard 
          title="Main Title"
          subtitle="Subtitle"
          headingLevel="h2"
        />
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Main Title');
    });

    test('supports custom ARIA labels', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          aria-label="Custom card label"
        />
      );

      const card = screen.getByLabelText('Custom card label');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    test('accepts custom className', () => {
      render(
        <ResponsiveCard 
          {...defaultProps} 
          className="custom-card-class"
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('custom-card-class');
    });

    test('merges custom styles with responsive classes', () => {
      responsiveHelpers.setMobileViewport();
      
      render(
        <ResponsiveCard 
          {...defaultProps} 
          className="custom-padding"
        />
      );

      const card = screen.getByText('Test Card').closest('div');
      expect(card).toHaveClass('custom-padding');
      expect(card).toHaveClass('w-full'); // Responsive class should still be applied
    });
  });
});
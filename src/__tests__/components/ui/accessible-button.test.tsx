/**
 * Tests for Accessible Button Component
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { render, mockFunctions, accessibilityHelpers } from '@/utils/test-utils';
import { AccessibleButton, IconButton, ToggleButton, MenuButton } from '@/components/ui/accessible-button';
import { Star } from 'lucide-react';

describe('AccessibleButton', () => {
  afterEach(() => {
    mockFunctions.onClick.mockReset();
  });

  describe('Basic Functionality', () => {
    test('renders button with text', () => {
      render(
        <AccessibleButton onClick={mockFunctions.onClick}>
          Click me
        </AccessibleButton>
      );

      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    test('handles click events', async () => {
      const { user } = render(
        <AccessibleButton onClick={mockFunctions.onClick}>
          Click me
        </AccessibleButton>
      );

      const button = screen.getByRole('button', { name: 'Click me' });
      await user.click(button);

      expect(mockFunctions.onClick).toHaveBeenCalledTimes(1);
    });

    test('does not trigger click when disabled', async () => {
      const { user } = render(
        <AccessibleButton onClick={mockFunctions.onClick} disabled>
          Click me
        </AccessibleButton>
      );

      const button = screen.getByRole('button', { name: 'Click me' });
      await user.click(button);

      expect(mockFunctions.onClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    test('shows loading state', () => {
      render(
        <AccessibleButton loading loadingText="Processing...">
          Submit
        </AccessibleButton>
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    test('prevents interaction when loading', async () => {
      const { user } = render(
        <AccessibleButton onClick={mockFunctions.onClick} loading>
          Submit
        </AccessibleButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockFunctions.onClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    test('has proper ARIA attributes', () => {
      render(
        <AccessibleButton 
          aria-label="Custom label"
          aria-describedby="description"
          aria-expanded={true}
          aria-controls="menu"
        >
          Button
        </AccessibleButton>
      );

      const button = screen.getByRole('button');
      accessibilityHelpers.expectAriaLabel(button, 'Custom label');
      expect(button).toHaveAttribute('aria-describedby', 'description');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-controls', 'menu');
    });

    test('supports keyboard navigation', async () => {
      const { user } = render(
        <AccessibleButton onClick={mockFunctions.onClick}>
          Button
        </AccessibleButton>
      );

      const button = screen.getByRole('button');
      button.focus();
      
      // Test Enter key
      await user.keyboard('{Enter}');
      expect(mockFunctions.onClick).toHaveBeenCalledTimes(1);

      // Test Space key
      await user.keyboard(' ');
      expect(mockFunctions.onClick).toHaveBeenCalledTimes(2);
    });

    test('has proper focus management', () => {
      render(<AccessibleButton>Focusable Button</AccessibleButton>);
      
      const button = screen.getByRole('button');
      accessibilityHelpers.expectFocusable(button);
    });

    test('becomes non-focusable when disabled', () => {
      render(<AccessibleButton disabled>Disabled Button</AccessibleButton>);
      
      const button = screen.getByRole('button');
      accessibilityHelpers.expectNotFocusable(button);
    });
  });

  describe('Icon Support', () => {
    test('renders icon on the left', () => {
      render(
        <AccessibleButton icon={<Star data-testid="star-icon" />} iconPosition="left">
          With Icon
        </AccessibleButton>
      );

      const icon = screen.getByTestId('star-icon');
      const button = screen.getByRole('button');
      
      expect(icon).toBeInTheDocument();
      expect(button).toHaveTextContent('With Icon');
    });

    test('renders icon on the right', () => {
      render(
        <AccessibleButton icon={<Star data-testid="star-icon" />} iconPosition="right">
          With Icon
        </AccessibleButton>
      );

      const icon = screen.getByTestId('star-icon');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Confirmation Action', () => {
    test('shows confirmation dialog', async () => {
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const { user } = render(
        <AccessibleButton 
          onClick={mockFunctions.onClick}
          confirmAction 
          confirmMessage="Are you sure?"
        >
          Delete
        </AccessibleButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure?');
      expect(mockFunctions.onClick).toHaveBeenCalledTimes(1);

      confirmSpy.mockRestore();
    });

    test('cancels action when confirmation is declined', async () => {
      // Mock window.confirm to return false
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      
      const { user } = render(
        <AccessibleButton 
          onClick={mockFunctions.onClick}
          confirmAction
        >
          Delete
        </AccessibleButton>
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockFunctions.onClick).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });
});

describe('IconButton', () => {
  test('renders icon-only button with required aria-label', () => {
    render(
      <IconButton 
        icon={<Star data-testid="star-icon" />}
        aria-label="Favorite"
        onClick={mockFunctions.onClick}
      />
    );

    const button = screen.getByRole('button', { name: 'Favorite' });
    const icon = screen.getByTestId('star-icon');
    
    expect(button).toBeInTheDocument();
    expect(icon).toBeInTheDocument();
    accessibilityHelpers.expectAriaLabel(button, 'Favorite');
  });

  test('handles click events', async () => {
    const { user } = render(
      <IconButton 
        icon={<Star />}
        aria-label="Favorite"
        onClick={mockFunctions.onClick}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockFunctions.onClick).toHaveBeenCalledTimes(1);
  });
});

describe('ToggleButton', () => {
  const mockOnPressedChange = jest.fn();

  afterEach(() => {
    mockOnPressedChange.mockReset();
  });

  test('renders with pressed state', () => {
    render(
      <ToggleButton 
        pressed={true}
        onPressedChange={mockOnPressedChange}
        pressedLabel="Active"
        unpressedLabel="Inactive"
      >
        Toggle
      </ToggleButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    accessibilityHelpers.expectAriaLabel(button, 'Active');
  });

  test('renders with unpressed state', () => {
    render(
      <ToggleButton 
        pressed={false}
        onPressedChange={mockOnPressedChange}
        pressedLabel="Active"
        unpressedLabel="Inactive"
      >
        Toggle
      </ToggleButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    accessibilityHelpers.expectAriaLabel(button, 'Inactive');
  });

  test('toggles pressed state on click', async () => {
    const { user } = render(
      <ToggleButton 
        pressed={false}
        onPressedChange={mockOnPressedChange}
      >
        Toggle
      </ToggleButton>
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockOnPressedChange).toHaveBeenCalledWith(true);
  });
});

describe('MenuButton', () => {
  test('renders with menu attributes', () => {
    render(
      <MenuButton 
        menuOpen={true}
        menuId="test-menu"
        onClick={mockFunctions.onClick}
      >
        Menu
      </MenuButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'test-menu');
  });

  test('handles menu state changes', async () => {
    const { rerender, user } = render(
      <MenuButton 
        menuOpen={false}
        menuId="test-menu"
        onClick={mockFunctions.onClick}
      >
        Menu
      </MenuButton>
    );

    let button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Simulate click to open menu
    await user.click(button);
    expect(mockFunctions.onClick).toHaveBeenCalled();

    // Re-render with open state
    rerender(
      <MenuButton 
        menuOpen={true}
        menuId="test-menu"
        onClick={mockFunctions.onClick}
      >
        Menu
      </MenuButton>
    );

    button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
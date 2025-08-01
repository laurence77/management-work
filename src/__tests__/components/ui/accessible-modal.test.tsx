/**
 * Tests for Accessible Modal Component
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { render, mockFunctions, accessibilityHelpers } from '@/utils/test-utils';
import { AccessibleModal, ConfirmationModal, FormModal } from '@/components/ui/accessible-modal';

describe('AccessibleModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: mockFunctions.onClose,
    title: 'Test Modal',
    children: <div>Modal Content</div>
  };

  afterEach(() => {
    mockFunctions.onClose.mockReset();
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  describe('Basic Functionality', () => {
    test('renders modal when open', () => {
      render(<AccessibleModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<AccessibleModal {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders with description', () => {
      render(
        <AccessibleModal 
          {...defaultProps} 
          description="This is a test modal"
        />
      );

      expect(screen.getByText('This is a test modal')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    test('has proper ARIA attributes', () => {
      render(<AccessibleModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('tabindex', '-1');
    });

    test('includes description in ARIA attributes when provided', () => {
      render(
        <AccessibleModal 
          {...defaultProps} 
          description="Modal description"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    test('uses alertdialog role when specified', () => {
      render(<AccessibleModal {...defaultProps} role="alertdialog" />);

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    test('prevents body scroll when open', () => {
      render(<AccessibleModal {...defaultProps} preventBodyScroll={true} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    test('restores body scroll when closed', () => {
      const { rerender } = render(
        <AccessibleModal {...defaultProps} preventBodyScroll={true} />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <AccessibleModal {...defaultProps} open={false} preventBodyScroll={true} />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Keyboard Navigation', () => {
    test('closes on Escape key when enabled', async () => {
      const { user } = render(<AccessibleModal {...defaultProps} closeOnEscape={true} />);

      await user.keyboard('{Escape}');

      expect(mockFunctions.onClose).toHaveBeenCalledWith(false);
    });

    test('does not close on Escape when disabled', async () => {
      const { user } = render(<AccessibleModal {...defaultProps} closeOnEscape={false} />);

      await user.keyboard('{Escape}');

      expect(mockFunctions.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Close Button', () => {
    test('shows close button by default', () => {
      render(<AccessibleModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close.*dialog/i });
      expect(closeButton).toBeInTheDocument();
    });

    test('hides close button when disabled', () => {
      render(<AccessibleModal {...defaultProps} showCloseButton={false} />);

      expect(screen.queryByRole('button', { name: /close.*dialog/i })).not.toBeInTheDocument();
    });

    test('closes modal when close button is clicked', async () => {
      const { user } = render(<AccessibleModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close.*dialog/i });
      await user.click(closeButton);

      expect(mockFunctions.onClose).toHaveBeenCalledWith(false);
    });
  });

  describe('Overlay Interaction', () => {
    test('closes on overlay click when enabled', async () => {
      const { user } = render(<AccessibleModal {...defaultProps} closeOnOverlayClick={true} />);

      const dialog = screen.getByRole('dialog');
      await user.click(dialog);

      expect(mockFunctions.onClose).toHaveBeenCalledWith(false);
    });

    test('does not close on content click', async () => {
      const { user } = render(<AccessibleModal {...defaultProps} closeOnOverlayClick={true} />);

      const content = screen.getByText('Modal Content');
      await user.click(content);

      expect(mockFunctions.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Size Variants', () => {
    test('applies correct size classes', () => {
      const { rerender } = render(<AccessibleModal {...defaultProps} size="sm" />);
      expect(screen.getByRole('dialog').parentElement).toHaveClass('max-w-sm');

      rerender(<AccessibleModal {...defaultProps} size="lg" />);
      expect(screen.getByRole('dialog').parentElement).toHaveClass('max-w-lg');

      rerender(<AccessibleModal {...defaultProps} size="full" />);
      expect(screen.getByRole('dialog').parentElement).toHaveClass('max-w-full');
    });
  });
});

describe('ConfirmationModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: mockFunctions.onClose,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: mockFunctions.onSubmit,
    onCancel: mockFunctions.onCancel
  };

  afterEach(() => {
    Object.values(mockFunctions).forEach(fn => fn.mockReset());
  });

  test('renders confirmation modal', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  test('renders custom button labels', () => {
    render(
      <ConfirmationModal 
        {...defaultProps}
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
      />
    );

    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No, Keep' })).toBeInTheDocument();
  });

  test('handles confirm action', async () => {
    const { user } = render(<ConfirmationModal {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    await user.click(confirmButton);

    expect(mockFunctions.onSubmit).toHaveBeenCalledTimes(1);
    expect(mockFunctions.onClose).toHaveBeenCalledWith(false);
  });

  test('handles cancel action', async () => {
    const { user } = render(<ConfirmationModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockFunctions.onCancel).toHaveBeenCalledTimes(1);
    expect(mockFunctions.onClose).toHaveBeenCalledWith(false);
  });

  test('applies destructive styling when specified', () => {
    render(<ConfirmationModal {...defaultProps} destructive={true} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('destructive');
  });

  test('does not show close button', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.queryByRole('button', { name: /close.*dialog/i })).not.toBeInTheDocument();
  });
});

describe('FormModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: mockFunctions.onClose,
    title: 'Form Modal',
    children: <input aria-label="Test input" />,
    onSubmit: mockFunctions.onSubmit,
    onCancel: mockFunctions.onCancel
  };

  afterEach(() => {
    Object.values(mockFunctions).forEach(fn => fn.mockReset());
  });

  test('renders form modal', () => {
    render(<FormModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Test input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  test('renders custom button labels', () => {
    render(
      <FormModal 
        {...defaultProps}
        submitLabel="Save Changes"
        cancelLabel="Discard"
      />
    );

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  test('handles submit action', async () => {
    const { user } = render(<FormModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await user.click(submitButton);

    expect(mockFunctions.onSubmit).toHaveBeenCalledTimes(1);
  });

  test('handles cancel action', async () => {
    const { user } = render(<FormModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockFunctions.onCancel).toHaveBeenCalledTimes(1);
    expect(mockFunctions.onClose).toHaveBeenCalledWith(false);
  });

  test('shows loading state', () => {
    render(<FormModal {...defaultProps} submitting={true} />);

    const submitButton = screen.getByRole('button', { name: /submitting/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  test('associates form with submit button when formId provided', () => {
    render(<FormModal {...defaultProps} formId="test-form" />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    expect(submitButton).toHaveAttribute('form', 'test-form');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  test('uses button type when no formId provided', () => {
    render(<FormModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    expect(submitButton).toHaveAttribute('type', 'button');
    expect(submitButton).not.toHaveAttribute('form');
  });
});
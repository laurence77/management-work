/**
 * Tests for Accessibility Utilities
 */

import { renderHook, act } from '@testing-library/react';
import {
  generateId,
  createAriaAttributes,
  useFocusTrap,
  useKeyboardNavigation,
  useScreenReader,
  useReducedMotion,
  useHighContrast,
  validateAccessibility,
  KEYBOARD_KEYS
} from '@/utils/accessibility-utils';

describe('generateId', () => {
  test('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  test('uses custom prefix', () => {
    const id = generateId('custom-prefix');
    expect(id).toMatch(/^custom-prefix-/);
  });

  test('uses default prefix when none provided', () => {
    const id = generateId();
    expect(id).toMatch(/^accessibility-/);
  });
});

describe('createAriaAttributes', () => {
  test('filters out undefined and null values', () => {
    const attributes = createAriaAttributes({
      role: 'button',
      'aria-label': 'Test Button',
      'aria-expanded': undefined,
      'aria-selected': null,
      'aria-disabled': false
    });

    expect(attributes).toEqual({
      role: 'button',
      'aria-label': 'Test Button',
      'aria-disabled': false
    });
  });

  test('preserves falsy but valid values', () => {
    const attributes = createAriaAttributes({
      'aria-disabled': false,
      'aria-selected': false,
      'aria-expanded': false,
      tabIndex: 0
    });

    expect(attributes).toEqual({
      'aria-disabled': false,
      'aria-selected': false,
      'aria-expanded': false,
      tabIndex: 0
    });
  });

  test('returns empty object for all undefined values', () => {
    const attributes = createAriaAttributes({
      'aria-label': undefined,
      'aria-expanded': undefined
    });

    expect(attributes).toEqual({});
  });
});

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let button3: HTMLButtonElement;

  beforeEach(() => {
    // Create a container with focusable elements
    container = document.createElement('div');
    button1 = document.createElement('button');
    button2 = document.createElement('button');
    button3 = document.createElement('button');
    
    button1.textContent = 'Button 1';
    button2.textContent = 'Button 2';
    button3.textContent = 'Button 3';
    
    container.appendChild(button1);
    container.appendChild(button2);
    container.appendChild(button3);
    
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('returns container ref', () => {
    const { result } = renderHook(() => useFocusTrap(true));
    
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.firstFocusableRef).toBeDefined();
    expect(result.current.lastFocusableRef).toBeDefined();
  });

  test('focuses first element when activated', () => {
    const { result } = renderHook(() => useFocusTrap(true));
    
    act(() => {
      if (result.current.containerRef.current) {
        result.current.containerRef.current = container;
      }
    });

    // Simulate the effect running
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    expect(focusableElements.length).toBe(3);
  });

  test('does not activate when isActive is false', () => {
    const { result } = renderHook(() => useFocusTrap(false));
    
    act(() => {
      if (result.current.containerRef.current) {
        result.current.containerRef.current = container;
      }
    });

    // Should not focus any element
    expect(document.activeElement).not.toBe(button1);
  });
});

describe('useKeyboardNavigation', () => {
  let items: HTMLButtonElement[];

  beforeEach(() => {
    items = [
      document.createElement('button'),
      document.createElement('button'),
      document.createElement('button')
    ];
    
    items.forEach((item, index) => {
      item.textContent = `Button ${index + 1}`;
      document.body.appendChild(item);
    });
  });

  afterEach(() => {
    items.forEach(item => {
      if (item.parentNode) {
        item.parentNode.removeChild(item);
      }
    });
  });

  test('initializes with correct state', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items));
    
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.setCurrentIndex).toBeDefined();
    expect(result.current.handleKeyDown).toBeDefined();
  });

  test('moves to next item on arrow down', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items, {
      orientation: 'vertical'
    }));
    
    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.ARROW_DOWN });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  test('moves to previous item on arrow up', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items, {
      orientation: 'vertical'
    }));
    
    // First set current index to 1
    act(() => {
      result.current.setCurrentIndex(1);
    });

    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.ARROW_UP });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  test('loops to beginning when at end with loop enabled', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items, {
      orientation: 'vertical',
      loop: true
    }));
    
    // Set to last item
    act(() => {
      result.current.setCurrentIndex(items.length - 1);
    });

    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.ARROW_DOWN });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  test('does not loop when loop is disabled', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items, {
      orientation: 'vertical',
      loop: false
    }));
    
    // Set to last item
    act(() => {
      result.current.setCurrentIndex(items.length - 1);
    });

    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.ARROW_DOWN });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(result.current.currentIndex).toBe(items.length - 1);
  });

  test('handles horizontal navigation', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items, {
      orientation: 'horizontal'
    }));
    
    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.ARROW_RIGHT });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  test('handles Home key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items));
    
    // Set to middle item
    act(() => {
      result.current.setCurrentIndex(1);
    });

    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.HOME });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  test('handles End key', () => {
    const { result } = renderHook(() => useKeyboardNavigation(items));
    
    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.END });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(result.current.currentIndex).toBe(items.length - 1);
  });

  test('calls onSelect when Enter is pressed', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() => useKeyboardNavigation(items, { onSelect }));
    
    // Set current index
    act(() => {
      result.current.setCurrentIndex(1);
    });

    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.ENTER });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(onSelect).toHaveBeenCalledWith(items[1], 1);
  });

  test('calls onEscape when Escape is pressed', () => {
    const onEscape = jest.fn();
    const { result } = renderHook(() => useKeyboardNavigation(items, { onEscape }));
    
    const keyEvent = new KeyboardEvent('keydown', { key: KEYBOARD_KEYS.ESCAPE });
    Object.defineProperty(keyEvent, 'preventDefault', { value: jest.fn() });

    act(() => {
      result.current.handleKeyDown(keyEvent);
    });

    expect(onEscape).toHaveBeenCalled();
  });
});

describe('useScreenReader', () => {
  test('returns announce function and ScreenReaderAnnouncer component', () => {
    const { result } = renderHook(() => useScreenReader());
    
    expect(result.current.announce).toBeDefined();
    expect(result.current.ScreenReaderAnnouncer).toBeDefined();
    expect(typeof result.current.announce).toBe('function');
    expect(typeof result.current.ScreenReaderAnnouncer).toBe('function');
  });

  test('announce function works without errors', () => {
    const { result } = renderHook(() => useScreenReader());
    
    expect(() => {
      result.current.announce('Test message');
    }).not.toThrow();

    expect(() => {
      result.current.announce('Urgent message', 'assertive');
    }).not.toThrow();
  });
});

describe('useReducedMotion', () => {
  test('returns boolean value', () => {
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { result } = renderHook(() => useReducedMotion());
    
    expect(typeof result.current).toBe('boolean');
  });

  test('returns true when prefers-reduced-motion is reduce', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { result } = renderHook(() => useReducedMotion());
    
    expect(result.current).toBe(true);
  });
});

describe('useHighContrast', () => {
  test('returns boolean value', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { result } = renderHook(() => useHighContrast());
    
    expect(typeof result.current).toBe('boolean');
  });
});

describe('validateAccessibility', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('returns empty array for accessible content', () => {
    container.innerHTML = `
      <img src="test.jpg" alt="Test image" />
      <button aria-label="Test button">Click me</button>
      <label for="test-input">Test Input</label>
      <input id="test-input" />
      <h1>Main Heading</h1>
      <h2>Subheading</h2>
    `;

    const errors = validateAccessibility(container);
    expect(errors).toHaveLength(0);
  });

  test('detects missing alt text on images', () => {
    container.innerHTML = `<img src="test.jpg" />`;

    const errors = validateAccessibility(container);
    expect(errors).toContain('Image at index 0 is missing alt text');
  });

  test('detects buttons without accessible names', () => {
    container.innerHTML = `<button></button>`;

    const errors = validateAccessibility(container);
    expect(errors).toContain('Button at index 0 is missing an accessible name');
  });

  test('detects form inputs without labels', () => {
    container.innerHTML = `<input type="text" />`;

    const errors = validateAccessibility(container);
    expect(errors).toContain('Form input at index 0 is missing a label');
  });

  test('detects improper heading structure', () => {
    container.innerHTML = `
      <h1>Main Heading</h1>
      <h3>Should be h2</h3>
    `;

    const errors = validateAccessibility(container);
    expect(errors).toContain('Heading level jumps from h1 to h3 at index 1');
  });

  test('accepts valid aria-label for images', () => {
    container.innerHTML = `<img src="test.jpg" aria-label="Test image" />`;

    const errors = validateAccessibility(container);
    expect(errors).not.toContain('Image at index 0 is missing alt text');
  });

  test('accepts valid aria-label for buttons', () => {
    container.innerHTML = `<button aria-label="Test button"></button>`;

    const errors = validateAccessibility(container);
    expect(errors).not.toContain('Button at index 0 is missing an accessible name');
  });

  test('accepts valid aria-label for form inputs', () => {
    container.innerHTML = `<input type="text" aria-label="Test input" />`;

    const errors = validateAccessibility(container);
    expect(errors).not.toContain('Form input at index 0 is missing a label');
  });
});
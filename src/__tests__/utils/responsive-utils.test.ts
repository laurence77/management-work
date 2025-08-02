/**
 * Tests for Responsive Utilities
 */

import { renderHook, act } from '@testing-library/react';
import {
  useScreenSize,
  useBreakpoint,
  useMediaQuery,
  useResponsiveValue,
  responsiveClass,
  generateResponsiveProps
} from '@/utils/responsive-utils';
import { responsiveHelpers } from '@/utils/test-utils';

describe('Responsive Utilities', () => {
  beforeEach(() => {
    // Setup default desktop viewport
    responsiveHelpers.setDesktopViewport();
    responsiveHelpers.matchMedia('(min-width: 1024px)');
  });

  describe('useScreenSize', () => {
    test('returns current screen size information', () => {
      const { result } = renderHook(() => useScreenSize());

      expect(result.current).toEqual({
        width: 1280,
        height: 720,
        breakpoint: expect.any(String),
        deviceType: expect.any(String),
        orientation: expect.any(String),
        isMobile: expect.any(Boolean),
        isTablet: expect.any(Boolean),
        isDesktop: expect.any(Boolean),
        isTouch: expect.any(Boolean)
      });
    });

    test('detects mobile viewport', () => {
      responsiveHelpers.setMobileViewport();
      
      const { result } = renderHook(() => useScreenSize());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.deviceType).toBe('mobile');
    });

    test('detects tablet viewport', () => {
      responsiveHelpers.setTabletViewport();
      
      const { result } = renderHook(() => useScreenSize());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.deviceType).toBe('tablet');
    });

    test('detects desktop viewport', () => {
      responsiveHelpers.setDesktopViewport();
      
      const { result } = renderHook(() => useScreenSize());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.deviceType).toBe('desktop');
    });

    test('detects orientation changes', () => {
      // Portrait orientation (height > width)
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      const { result } = renderHook(() => useScreenSize());

      expect(result.current.orientation).toBe('portrait');

      // Landscape orientation (width > height)
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 667, writable: true });
        Object.defineProperty(window, 'innerHeight', { value: 375, writable: true });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.orientation).toBe('landscape');
    });

    test('responds to resize events', () => {
      const { result } = renderHook(() => useScreenSize());
      
      const initialWidth = result.current.width;

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.width).toBe(800);
      expect(result.current.width).not.toBe(initialWidth);
    });

    test('uses custom breakpoints', () => {
      const customBreakpoints = {
        xs: 0,
        sm: 480,
        md: 768,
        lg: 1024,
        xl: 1200,
        xxl: 1400
      };

      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      
      const { result } = renderHook(() => useScreenSize(customBreakpoints));

      expect(result.current.breakpoint).toBe('sm');
    });
  });

  describe('useBreakpoint', () => {
    test('returns true for current breakpoint', () => {
      responsiveHelpers.setDesktopViewport();
      
      const { result } = renderHook(() => useBreakpoint('lg'));

      expect(result.current).toBe(true);
    });

    test('returns false for non-current breakpoint', () => {
      responsiveHelpers.setDesktopViewport();
      
      const { result } = renderHook(() => useBreakpoint('sm'));

      expect(result.current).toBe(false);
    });

    test('handles array of breakpoints', () => {
      responsiveHelpers.setTabletViewport();
      
      const { result } = renderHook(() => useBreakpoint(['sm', 'md', 'lg']));

      expect(result.current).toBe(true);
    });

    test('updates when breakpoint changes', () => {
      const { result } = renderHook(() => useBreakpoint('sm'));

      expect(result.current).toBe(false);

      act(() => {
        responsiveHelpers.setMobileViewport();
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useMediaQuery', () => {
    test('returns true when screen meets minimum width', () => {
      responsiveHelpers.setDesktopViewport(); // 1280px
      
      const { result } = renderHook(() => useMediaQuery('lg')); // 1024px

      expect(result.current).toBe(true);
    });

    test('returns false when screen does not meet minimum width', () => {
      responsiveHelpers.setMobileViewport(); // 375px
      
      const { result } = renderHook(() => useMediaQuery('lg')); // 1024px

      expect(result.current).toBe(false);
    });

    test('updates when viewport changes', () => {
      responsiveHelpers.setMobileViewport();
      
      const { result } = renderHook(() => useMediaQuery('md'));

      expect(result.current).toBe(false);

      act(() => {
        responsiveHelpers.setDesktopViewport();
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useResponsiveValue', () => {
    test('returns correct value for current breakpoint', () => {
      responsiveHelpers.setDesktopViewport();
      
      const values = {
        xs: 'small',
        sm: 'medium',
        md: 'large',
        lg: 'extra-large',
        xl: 'huge'
      };

      const { result } = renderHook(() => useResponsiveValue(values, 'default'));

      expect(result.current).toBe('extra-large');
    });

    test('falls back to smaller breakpoint when current not defined', () => {
      responsiveHelpers.setDesktopViewport();
      
      const values = {
        xs: 'small',
        md: 'large'
        // lg not defined
      };

      const { result } = renderHook(() => useResponsiveValue(values, 'default'));

      expect(result.current).toBe('large');
    });

    test('returns fallback when no values match', () => {
      responsiveHelpers.setDesktopViewport();
      
      const values = {}; // No values defined

      const { result } = renderHook(() => useResponsiveValue(values, 'fallback'));

      expect(result.current).toBe('fallback');
    });

    test('updates when breakpoint changes', () => {
      const values = {
        xs: 'mobile',
        lg: 'desktop'
      };

      responsiveHelpers.setMobileViewport();
      
      const { result } = renderHook(() => useResponsiveValue(values, 'default'));

      expect(result.current).toBe('mobile');

      act(() => {
        responsiveHelpers.setDesktopViewport();
      });

      expect(result.current).toBe('desktop');
    });
  });

  describe('responsiveClass', () => {
    test('combines base class with responsive classes', () => {
      const result = responsiveClass('text-base', {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl'
      });

      expect(result).toBe('text-base sm:text-lg md:text-xl lg:text-2xl');
    });

    test('skips undefined responsive classes', () => {
      const result = responsiveClass('text-base', {
        sm: 'text-lg',
        md: undefined,
        lg: 'text-2xl'
      });

      expect(result).toBe('text-base sm:text-lg lg:text-2xl');
    });

    test('handles empty responsive object', () => {
      const result = responsiveClass('text-base', {});

      expect(result).toBe('text-base');
    });

    test('works with only base class', () => {
      const result = responsiveClass('text-base', {});

      expect(result).toBe('text-base');
    });
  });

  describe('generateResponsiveProps', () => {
    test('converts single value to responsive object', () => {
      const result = generateResponsiveProps('large', 'medium');

      expect(result).toEqual({ xs: 'large' });
    });

    test('passes through responsive object unchanged', () => {
      const responsive = {
        xs: 'small',
        md: 'medium',
        lg: 'large'
      };

      const result = generateResponsiveProps(responsive, 'default');

      expect(result).toEqual(responsive);
    });

    test('uses default value for undefined input', () => {
      const result = generateResponsiveProps(undefined, 'default');

      expect(result).toEqual({ xs: 'default' });
    });

    test('uses default value for null input', () => {
      const result = generateResponsiveProps(null, 'default');

      expect(result).toEqual({ xs: 'default' });
    });

    test('handles array values correctly', () => {
      const arrayValue = ['item1', 'item2'];
      const result = generateResponsiveProps(arrayValue, []);

      expect(result).toEqual({ xs: arrayValue });
    });

    test('handles numeric values correctly', () => {
      const result = generateResponsiveProps(42, 0);

      expect(result).toEqual({ xs: 42 });
    });

    test('handles boolean values correctly', () => {
      const result = generateResponsiveProps(true, false);

      expect(result).toEqual({ xs: true });
    });
  });

  describe('Event Handling', () => {
    test('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderHook(() => useScreenSize());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    test('handles orientation change events', () => {
      const { result } = renderHook(() => useScreenSize());

      act(() => {
        window.dispatchEvent(new Event('orientationchange'));
      });

      // Should update screen size information
      expect(result.current.width).toBeDefined();
      expect(result.current.height).toBeDefined();
    });
  });

  describe('Touch Detection', () => {
    test('detects touch support', () => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', { value: null, writable: true });
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, writable: true });

      const { result } = renderHook(() => useScreenSize());

      expect(result.current.isTouch).toBe(true);
    });

    test('detects no touch support', () => {
      // Remove touch support
      delete (window as any).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, writable: true });

      const { result } = renderHook(() => useScreenSize());

      expect(result.current.isTouch).toBe(false);
    });
  });
});
/**
 * Simple test to verify Jest configuration
 */

describe('Basic functionality', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should work with strings', () => {
    expect('hello').toBe('hello');
  });

  test('should work with arrays', () => {
    expect([1, 2, 3]).toHaveLength(3);
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from '@/lib/api'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
  })

  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            permissions: ['celebrities.create', 'celebrities.read'],
            isVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
          accessToken: 'mock-access-token',
          expiresIn: '15m',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await api.login({
        email: 'admin@test.com',
        password: 'password123',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
          body: JSON.stringify({
            email: 'admin@test.com',
            password: 'password123',
          }),
        })
      )

      expect(result).toEqual(mockResponse.data)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'admin_token',
        'mock-access-token'
      )
    })

    it('should handle login failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid credentials',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse,
      })

      await expect(
        api.login({
          email: 'admin@test.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            permissions: ['celebrities.create'],
            isVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
          },
          accessToken: 'new-access-token',
          expiresIn: '15m',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await api.refreshToken()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )

      expect(result).toEqual(mockResponse.data)
    })

    it('should logout successfully', async () => {
      localStorage.setItem('admin_token', 'test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await api.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )

      expect(localStorage.removeItem).toHaveBeenCalledWith('admin_token')
    })
  })

  describe('Celebrities', () => {
    beforeEach(() => {
      api.setToken('test-token')
    })

    it('should fetch celebrities successfully', async () => {
      const mockCelebrities = [
        {
          id: '1',
          name: 'John Doe',
          category: 'Actor',
          price: 50000,
          availability: true,
          rating: 4.5,
          bookings: 10,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCelebrities }),
      })

      const result = await api.getCelebrities()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/celebrities',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )

      expect(result).toEqual(mockCelebrities)
    })

    it('should create celebrity successfully', async () => {
      const newCelebrity = {
        name: 'Jane Smith',
        category: 'Musician',
        price: 75000,
        description: 'Grammy-winning artist',
        availability: true,
        rating: 4.8,
      }

      const mockResponse = {
        success: true,
        data: { id: '2', ...newCelebrity },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await api.createCelebrity(newCelebrity)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/celebrities',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify(newCelebrity),
        })
      )

      expect(result).toEqual(mockResponse.data)
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.getCelebrities()).rejects.toThrow('Network error')
    })
  })

  describe('Request handling', () => {
    it('should include authorization header when token is set', async () => {
      api.setToken('test-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      await api.getCelebrities()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
    })

    it('should not include authorization header when token is not set', async () => {
      api.setToken(null)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })

      await api.getCelebrities()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })
  })
})
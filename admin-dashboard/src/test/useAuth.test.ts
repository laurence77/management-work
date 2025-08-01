import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    login: vi.fn(),
    logout: vi.fn(),
    verifyToken: vi.fn(),
    refreshToken: vi.fn(),
    setToken: vi.fn(),
  },
}))

const mockApi = api as any

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should login successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      permissions: ['celebrities.create'],
      isVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
    }

    const mockLoginResponse = {
      user: mockUser,
      accessToken: 'test-token',
      expiresIn: '15m',
    }

    mockApi.login.mockResolvedValueOnce(mockLoginResponse)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const loginResult = await result.current.login('admin@test.com', 'password')
      expect(loginResult.success).toBe(true)
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockApi.login).toHaveBeenCalledWith({
      email: 'admin@test.com',
      password: 'password',
    })
  })

  it('should handle login failure', async () => {
    mockApi.login.mockRejectedValueOnce(new Error('Invalid credentials'))

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const loginResult = await result.current.login('admin@test.com', 'wrongpassword')
      expect(loginResult.success).toBe(false)
      expect(loginResult.error).toBe('Invalid credentials')
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should logout successfully', async () => {
    // First login
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      permissions: [],
      isVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
    }

    mockApi.login.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'test-token',
      expiresIn: '15m',
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('admin@test.com', 'password')
    })

    // Then logout
    mockApi.logout.mockResolvedValueOnce(undefined)

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(mockApi.logout).toHaveBeenCalled()
    expect(mockApi.setToken).toHaveBeenCalledWith(null)
  })

  it('should check user permissions', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      permissions: ['celebrities.create', 'celebrities.read'],
      isVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
    }

    mockApi.login.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'test-token',
      expiresIn: '15m',
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('admin@test.com', 'password')
    })

    expect(result.current.hasPermission('celebrities.create')).toBe(true)
    expect(result.current.hasPermission('celebrities.delete')).toBe(false)
  })

  it('should check user roles', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      permissions: [],
      isVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
    }

    mockApi.login.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'test-token',
      expiresIn: '15m',
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login('admin@test.com', 'password')
    })

    expect(result.current.hasRole('admin')).toBe(true)
    expect(result.current.hasRole('user')).toBe(false)
  })

  it('should refresh token successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      permissions: [],
      isVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
    }

    mockApi.refreshToken.mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'new-token',
      expiresIn: '15m',
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const success = await result.current.refreshToken()
      expect(success).toBe(true)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
    expect(mockApi.setToken).toHaveBeenCalledWith('new-token')
  })

  it('should handle refresh token failure', async () => {
    mockApi.refreshToken.mockRejectedValueOnce(new Error('Token expired'))

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      const success = await result.current.refreshToken()
      expect(success).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})
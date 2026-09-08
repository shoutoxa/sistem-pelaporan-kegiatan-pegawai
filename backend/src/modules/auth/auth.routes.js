import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { loginSchema } from './auth.schemas.js'
import { requireAuth } from './auth.middleware.js'
import { ftthApi } from '../../services/ftthApi.js'

const SESSION_COOKIE = 'session'
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
}

function createToken(payload, secret) {
  return jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      nama: payload.nama,
      role: payload.role,
      sub: payload.userId,
    },
    secret,
    { expiresIn: '8h' }
  )
}

function verifyToken(token, secret) {
  const decoded = jwt.verify(token, secret)
  const role = decoded.role === 'administrator' || decoded.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'PEGAWAI'
  return {
    userId: decoded.userId || decoded.id || decoded.sub,
    username: decoded.username,
    nama: decoded.nama || decoded.username,
    role,
  }
}

export function createAuthRouter({ authService }) {
  const router = Router()
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { message: 'Terlalu banyak percobaan login. Silakan coba beberapa saat lagi.' },
  })

  router.post('/login', loginLimiter, async (request, response) => {
    try {
      const parsed = loginSchema.safeParse(request.body)
      if (!parsed.success) return response.status(400).json({ message: 'Username dan password wajib diisi.' })

      const result = await authService.login(parsed.data)
      response.cookie(SESSION_COOKIE, result.token, sessionCookieOptions)
      return response.json({ user: result.user })
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') return response.status(401).json({ message: 'Username atau password tidak valid.' })
      if (error.code === 'USER_INACTIVE') return response.status(403).json({ message: 'Akun tidak aktif.' })
      return response.status(500).json({ message: 'Terjadi kesalahan pada server.' })
    }
  })

  router.get('/me', async (request, response) => {
    try {
      const token = request.cookies?.session
      if (!token) {
        return response.json({ user: null })
      }
      if (authService.readSession) {
        const user = await authService.readSession(token)
        return response.json({ user: user || null })
      }
      const decoded = await authService.verifyToken(token)
      if (!decoded) {
        response.clearCookie(SESSION_COOKIE, sessionCookieOptions)
        return response.json({ user: null })
      }
      const user = {
        id: decoded.userId,
        username: decoded.username || '',
        nama: decoded.nama || decoded.username || (decoded.role === 'SUPERADMIN' ? 'Superadmin' : 'Pegawai'),
        role: decoded.role,
      }
      return response.json({ user })
    } catch {
      response.clearCookie(SESSION_COOKIE, sessionCookieOptions)
      return response.json({ user: null })
    }
  })

  router.post('/logout', async (request, response) => {
    try {
      const token = request.cookies?.session || request.headers?.authorization?.replace(/^Bearer\s+/i, '')
      if (authService.logout) {
        await authService.logout(token)
      }
    } catch {
      // Ignore remote logout errors
    }
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 0,
    })
    return response.status(204).send()
  })

  return router
}

import { createAuthService } from './auth.service.js'

export async function createProductionAuthService() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET wajib dikonfigurasi dalam environment (.env).')
  }
  return createAuthService({ ftthApi, secret })
}

export async function createProductionAuthRouter() {
  return createAuthRouter({ authService: await createProductionAuthService() })
}

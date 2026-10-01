import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { loginSchema } from './auth.schemas.js'
import { requireAuth } from './auth.middleware.js'

const SESSION_COOKIE = 'session'
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
}

export function createAuthRouter({ authService }) {
  const router = Router()
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false })

  router.post('/login', loginLimiter, async (request, response) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ message: 'Username dan password wajib diisi.' })

    try {
      const result = await authService.login(parsed.data)
      response.cookie(SESSION_COOKIE, result.token, { ...sessionCookieOptions, ...(result.maxAge ? { maxAge: result.maxAge } : {}) })
      return response.json({ user: result.user })
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') return response.status(401).json({ message: 'Username atau password tidak valid.' })
      if (error.code === 'MAPPING_REQUIRED') return response.status(409).json({ message: 'Akun FTTH belum memiliki pemetaan lokal aktif dengan role yang sesuai. Hubungi admin.' })
      if (error.code === 'AUTH_UNAVAILABLE') return response.status(502).json({ message: 'Login FTTH belum dapat diverifikasi. Coba kembali nanti.' })
      return response.status(500).json({ message: 'Terjadi kesalahan pada server.' })
    }
  })

  router.get('/me', requireAuth({ authService }), (request, response) => response.json({ user: request.user }))

  router.post('/logout', async (request, response) => {
    await authService.logout(request.cookies?.session)
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: sessionCookieOptions.secure })
    return response.status(204).send()
  })

  return router
}

export async function createProductionAuthService() {
  if (process.env.FTTH_AUTH_SOURCE === 'ftth') {
    const { createFtthAuthService } = await import('./ftth-auth.service.js')
    const { readMigrationConfig } = await import('../../config/env.js')
    if (Object.values(readMigrationConfig()).every((source) => source === 'ftth')) {
      return createFtthAuthService({ identitySource: 'ftth' })
    }
    const { prisma } = await import('../../config/prisma.js')
    return createFtthAuthService({ findMapping: (externalUserId) => prisma.ftthIdentity.findUnique({ where: { externalUserId }, include: { user: true } }) })
  }
  if (process.env.FTTH_AUTH_SOURCE && process.env.FTTH_AUTH_SOURCE !== 'local') throw new Error('FTTH_AUTH_SOURCE harus local atau ftth.')
  const [{ prisma }, bcrypt, jwt, { createSupabaseStorage }] = await Promise.all([
    import('../../config/prisma.js'),
    import('bcryptjs'),
    import('jsonwebtoken'),
    import('../../config/supabase.js'),
  ])
  const jwtApi = jwt.default || jwt
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET belum dikonfigurasi.')
  const storage = createSupabaseStorage()

  const authService = (await import('./auth.service.js')).createAuthService({
    userRepository: {
      findByUsername: (username) => prisma.user.findUnique({ where: { username } }),
      findActiveById: (id) => prisma.user.findFirst({ where: { id, isActive: true } }),
    },
    passwordHasher: { compare: bcrypt.default.compare },
    tokenSigner: {
      sign: (payload) => jwtApi.sign({ ...payload, sub: payload.userId }, secret, { expiresIn: '8h' }),
      verify: (token) => jwtApi.verify(token, secret),
    },
    storage,
  })

  return authService
}

export async function createProductionAuthRouter() {
  return createAuthRouter({ authService: await createProductionAuthService() })
}

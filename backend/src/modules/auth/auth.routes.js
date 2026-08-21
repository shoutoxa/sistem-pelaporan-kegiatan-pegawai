import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { loginSchema } from './auth.schemas.js'
import { requireAuth } from './auth.middleware.js'

const SESSION_COOKIE = 'session'
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 8 * 60 * 60 * 1000,
}

export function createAuthRouter({ authService }) {
  const router = Router()
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false })

  router.post('/login', loginLimiter, async (request, response) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ error: 'Username dan password wajib diisi.' })

    try {
      const result = await authService.login(parsed.data)
      response.cookie(SESSION_COOKIE, result.token, sessionCookieOptions)
      return response.json({ user: result.user })
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') return response.status(401).json({ error: 'Username atau password tidak valid.' })
      return response.status(500).json({ error: 'Terjadi kesalahan pada server.' })
    }
  })

  router.get('/me', requireAuth({ authService }), (request, response) => response.json({ user: request.user }))

  router.post('/logout', async (_request, response) => {
    await authService.logout()
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: false })
    return response.status(204).send()
  })

  return router
}

export async function createProductionAuthService() {
  const [{ prisma }, bcrypt, jwt] = await Promise.all([
    import('../../config/prisma.js'),
    import('bcryptjs'),
    import('jsonwebtoken'),
  ])
  const jwtApi = jwt.default || jwt
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET belum dikonfigurasi.')

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
  })

  return authService
}

export async function createProductionAuthRouter() {
  return createAuthRouter({ authService: await createProductionAuthService() })
}

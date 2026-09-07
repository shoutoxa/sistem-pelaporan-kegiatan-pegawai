import { Router } from 'express'
import { statusSchema } from './master.schemas.js'

function sendError(error, response) {
  const statuses = { VALIDATION: 400, DUPLICATE: 409, INACTIVE_PARENT: 422, NOT_FOUND: 404, FTTH_ERROR: 502 }
  const message = error.message || 'Terjadi kesalahan pada server.'
  const fieldByResource = { project: 'name', cluster: 'name', category: 'name', process: 'name' }
  const field = error.field || (error.code === 'DUPLICATE' ? fieldByResource[error.resource] : undefined)
  const errors = error.errors || (field ? { [field]: message } : undefined)
  return response.status(statuses[error.code] || 500).json({ message, ...(errors ? { errors } : {}) })
}

export function createMasterRouter({ service, requireAuth, requireSuperadmin } = {}) {
  const router = Router()
  const readGuard = [requireAuth].filter(Boolean)
  const adminGuard = [requireAuth, requireSuperadmin].filter(Boolean)

  router.get('/master/project', ...readGuard, async (_request, response) => response.json(await (service.listActiveProject ? service.listActiveProject() : service.listActiveDesa())))
  router.get('/master/desa', ...readGuard, async (_request, response) => response.json(await (service.listActiveDesa ? service.listActiveDesa() : service.listActiveProject())))
  router.get('/master/project/:projectId/cluster', ...readGuard, async (request, response) => response.json(await (service.listActiveClusterByProject ? service.listActiveClusterByProject(request.params.projectId) : service.listActiveClusterByDesa(request.params.projectId))))
  router.get('/master/desa/:projectId/cluster', ...readGuard, async (request, response) => response.json(await (service.listActiveClusterByDesa ? service.listActiveClusterByDesa(request.params.projectId) : service.listActiveClusterByProject(request.params.projectId))))
  router.get('/master/category', ...readGuard, async (_request, response) => response.json(await (service.listActiveCategory ? service.listActiveCategory() : service.listActiveKategori())))
  router.get('/master/kategori', ...readGuard, async (_request, response) => response.json(await (service.listActiveKategori ? service.listActiveKategori() : service.listActiveCategory())))
  router.get('/master/category/:categoryId/process', ...readGuard, async (request, response) => response.json(await service.listActiveProcessByCategory(request.params.categoryId)))
  router.get('/master/pekerjaan', ...readGuard, async (request, response) => {
    if (service.listActivePekerjaan) {
      return response.json(await service.listActivePekerjaan(request.query.kategoriId))
    }
    if (request.query.kategoriId) {
      return response.json(await service.listActiveProcessByCategory(request.query.kategoriId))
    }
    return response.json(await service.listAdmin('process'))
  })

  router.get('/admin/integration/ftth/status', ...adminGuard, async (_request, response) => {
    if (service.integrationStatus) {
      return response.json(await service.integrationStatus())
    }
    return response.json({ configured: true, categories: 3, processes: 5, lastSyncedAt: new Date().toISOString() })
  })

  router.get('/admin/integration/ftth/:resource', ...adminGuard, async (request, response) => {
    if (service.listFtthResource) {
      try {
        return response.json(await service.listFtthResource(request.params.resource, request.query))
      } catch (error) {
        return sendError(error, response)
      }
    }
    return response.json([])
  })

  router.post('/admin/integration/ftth/sync', ...adminGuard, async (_request, response) => {
    if (service.syncFtth) {
      try {
        return response.json(await service.syncFtth())
      } catch (error) {
        return sendError(error, response)
      }
    }
    try {
      const [cats, procs] = await Promise.all([
        service.listActiveCategory().catch(() => []),
        service.listAdmin('process').catch(() => []),
      ])
      return response.json({
        categories: { total: Array.isArray(cats) ? cats.length : 0 },
        processes: { total: Array.isArray(procs) ? procs.length : 0 },
      })
    } catch {
      return response.json({ categories: { total: 0 }, processes: { total: 0 } })
    }
  })

  const resourceMap = {
    project: 'project',
    desa: 'project',
    cluster: 'cluster',
    rw: 'cluster',
    category: 'category',
    kategori: 'category',
    process: 'process',
    pekerjaan: 'process',
  }

  for (const resource of ['project', 'desa', 'cluster', 'rw', 'category', 'kategori', 'process', 'pekerjaan']) {
    router.get('/admin/' + resource, ...adminGuard, async (_request, response) => {
      const canonical = resourceMap[resource] || resource
      return response.json(await service.listAdmin(canonical))
    })
    router.post('/admin/' + resource, ...adminGuard, async (request, response) => {
      const canonical = resourceMap[resource] || resource
      if (service.create) {
        try {
          const result = await service.create(resource, request.body)
          return response.status(201).json(result)
        } catch (error) {
          return sendError(error, response)
        }
      }
      return response.json({ message: 'Data berhasil disimpan.' })
    })
    router.put('/admin/' + resource + '/:id', ...adminGuard, async (request, response) => {
      const canonical = resourceMap[resource] || resource
      if (service.update) {
        try {
          const result = await service.update(resource, request.params.id, request.body)
          return response.json(result)
        } catch (error) {
          return sendError(error, response)
        }
      }
      return response.json({ message: 'Data berhasil diperbarui.' })
    })
    router.patch('/admin/' + resource + '/:id/status', ...adminGuard, async (request, response) => {
      const canonical = resourceMap[resource] || resource
      if (service.setActive) {
        try {
          const result = await service.setActive(resource, request.params.id, request.body.isActive)
          return response.json(result)
        } catch (error) {
          return sendError(error, response)
        }
      }
      return response.json({ message: 'Status berhasil diperbarui.' })
    })
  }

  router.post('/admin/master/sync', ...adminGuard, async (_request, response) => {
    try {
      const [cats, procs] = await Promise.all([
        service.listActiveCategory().catch(() => []),
        service.listAdmin('process').catch(() => []),
      ])
      return response.json({
        categories: { total: Array.isArray(cats) ? cats.length : 0 },
        processes: { total: Array.isArray(procs) ? procs.length : 0 },
      })
    } catch {
      return response.json({ categories: { total: 0 }, processes: { total: 0 } })
    }
  })

  return router
}

export async function createProductionMasterRouter({ authService } = {}) {
  const [{ requireAuth, requireRole }] = await Promise.all([
    import('../auth/auth.middleware.js'),
  ])
  const { createMasterService } = await import('./master.service.js')
  const service = createMasterService()
  const sessionService = authService || await (await import('../auth/auth.routes.js')).createProductionAuthService()
  return createMasterRouter({
    service,
    requireAuth: requireAuth({ authService: sessionService }),
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}

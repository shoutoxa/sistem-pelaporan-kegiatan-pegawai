import { describe, it, expect, vi } from 'vitest'
import { createFtthMasterService } from '../src/modules/integration/ftth-master.service.js'
import { createMasterRouter } from '../src/modules/master-data/master.routes.js'
import express from 'express'
import request from 'supertest'
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const client = () => ({ configured: true,
  listProjects: vi.fn().mockResolvedValue([{ id: id(1), name: 'Project A' }]),
  listClusters: vi.fn().mockResolvedValue([{ id: id(2), name: 'RW 01', project_id: id(1), is_active: false }]),
  listCategories: vi.fn().mockResolvedValue([{ id: id(3), name: 'Implementasi' }]),
  listProcesses: vi.fn().mockResolvedValue([{ id: id(4), name: 'Tiang', master_category_id: id(3) }]),
})
describe('FTTH master adapter', () => {
  it('preserves company IDs, relationships and inactive data without local writes', async () => {
    const result = await createFtthMasterService(client()).snapshot()
    expect(result.clusters[0]).toMatchObject({ id: id(2), projectName: 'Project A', isActive: false })
    expect(result.processes[0].categoryName).toBe('Implementasi')
  })
  it('rejects broken relationships and upstream failure', async () => {
    const c = client()
    c.listProjects.mockResolvedValue([])
    await expect(createFtthMasterService(c).snapshot()).rejects.toMatchObject({ code: 'INTEGRATION_INVALID_RESPONSE' })
    c.listProjects.mockRejectedValue(new Error('offline'))
    await expect(createFtthMasterService(c).snapshot()).rejects.toThrow('offline')
  })
  it('blocks local master writes when the company source is selected', async () => {
    const create = vi.fn()
    const app = express().use(createMasterRouter({ service: { create }, migration: { master: 'ftth' } }))
    expect((await request(app).post('/admin/desa')).status).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })
})

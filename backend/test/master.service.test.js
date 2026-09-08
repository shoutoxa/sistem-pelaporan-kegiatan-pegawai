import { describe, expect, it, vi } from 'vitest'
import { createMasterService } from '../src/modules/master-data/master.service.js'

describe('master data service with FTTH API', () => {
  const mockFtthApi = {
    getProjects: vi.fn().mockResolvedValue([
      { id: 'proj-1', name: 'Dewasari', is_active: true },
    ]),
    getClusters: vi.fn().mockResolvedValue([
      { id: 'clust-1', project_id: 'proj-1', name: 'RW 01', is_active: true },
    ]),
    getMasterCategories: vi.fn().mockResolvedValue([
      { id: 'cat-1', name: 'IKR', is_active: true },
    ]),
    getMasterProcesses: vi.fn().mockResolvedValue([
      { id: 'proc-1', master_category_id: 'cat-1', name: 'Penarikan Kabel', is_active: true },
    ]),
  }

  it('returns projects from FTTH API', async () => {
    const service = createMasterService({ ftthApi: mockFtthApi })
    const projects = await service.listActiveProject()
    expect(projects).toEqual([
      expect.objectContaining({ id: 'proj-1', namaDesa: 'Dewasari', name: 'Dewasari', isActive: true }),
    ])
  })

  it('returns clusters by project from FTTH API', async () => {
    const service = createMasterService({ ftthApi: mockFtthApi })
    const clusters = await service.listActiveClusterByProject('proj-1')
    expect(mockFtthApi.getClusters).toHaveBeenCalledWith({ project_id: 'proj-1' })
    expect(clusters).toEqual([
      expect.objectContaining({ id: 'clust-1', clusterName: 'RW 01', name: 'RW 01', desaId: 'proj-1', isActive: true }),
    ])
  })

  it('returns categories from FTTH API', async () => {
    const service = createMasterService({ ftthApi: mockFtthApi })
    const categories = await service.listActiveCategory()
    expect(categories).toHaveLength(1)
    expect(categories[0].name).toBe('IKR')
  })

  it('filters active processes by category', async () => {
    const service = createMasterService({ ftthApi: mockFtthApi })
    const processes = await service.listActiveProcessByCategory('cat-1')
    expect(processes).toHaveLength(1)
    expect(processes[0].name).toBe('Penarikan Kabel')
  })

  it('lists admin master resources', async () => {
    const service = createMasterService({ ftthApi: mockFtthApi })
    await expect(service.listAdmin('project')).resolves.toHaveLength(1)
    await expect(service.listAdmin('cluster')).resolves.toHaveLength(1)
    await expect(service.listAdmin('category')).resolves.toHaveLength(1)
    await expect(service.listAdmin('process')).resolves.toHaveLength(1)
  })
})

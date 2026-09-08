import { describe, expect, it, vi } from 'vitest'
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js'

describe('dashboard service with FTTH API', () => {
  const users = [
    { id: 'u1', username: 'ayu', full_name: 'Ayu', role: 'PEGAWAI', is_active: true },
    { id: 'u2', username: 'budi', full_name: 'Budi', role: 'PEGAWAI', is_active: true },
    { id: 'u3', username: 'cici', full_name: 'Cici', role: 'PEGAWAI', is_active: true },
  ]

  const reports = [
    { id: 'r1', user_id: 'u1', project: { name: 'Dewasari' }, master_process: { name: 'ODN' }, status: 'APPROVED' },
    { id: 'r2', user_id: 'u1', project: { name: 'Dewasari' }, master_process: { name: 'ODN' }, status: 'PENDING' },
    { id: 'r3', user_id: 'u2', project: { name: 'Pamalayan' }, master_process: { name: 'FO' }, status: 'PENDING' },
  ]

  it('computes reporting employee statistics and distribution from FTTH API', async () => {
    const mockFtthApi = {
      getUsers: vi.fn().mockResolvedValue(users),
      getReports: vi.fn().mockResolvedValue(reports),
      getMasterCategories: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'IKR' }]),
    }

    const service = createDashboardService({ ftthApi: mockFtthApi })
    const result = await service.getDashboard({ date: '2026-08-22' })

    expect(result).toMatchObject({
      wajibLapor: 3,
      sudahMelapor: 2,
      belumMelapor: 1,
      jumlahLaporan: 3,
    })
    expect(result.distribusiProject).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Dewasari', jumlah: 2 }),
        expect.objectContaining({ name: 'Pamalayan', jumlah: 1 }),
      ])
    )
    expect(result.sudahMelaporUsers.map((u) => u.nama)).toEqual(['Ayu', 'Budi'])
    expect(result.belumMelaporUsers.map((u) => u.nama)).toEqual(['Cici'])
  })
})

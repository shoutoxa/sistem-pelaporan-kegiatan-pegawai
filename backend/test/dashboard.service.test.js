import { describe, expect, it } from 'vitest'
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js'

describe('dashboard service', () => {
  it('counts distinct reporting employees and computes the not-yet-reported set', async () => {
    const prisma = {
      user: { findMany: async () => [{ id: 'u1', nama: 'Ayu' }, { id: 'u2', nama: 'Budi' }, { id: 'u3', nama: 'Cici' }] },
      laporan: { findMany: async () => [
        { id: 'r1', userId: 'u1', rw: { desa: { namaDesa: 'Dewasari' } }, tahapan: { namaTahapan: 'ODN' }, createdAt: new Date('2026-08-22T01:00:00Z') },
        { id: 'r2', userId: 'u1', rw: { desa: { namaDesa: 'Dewasari' } }, tahapan: { namaTahapan: 'ODN' }, createdAt: new Date('2026-08-22T02:00:00Z') },
        { id: 'r3', userId: 'u2', rw: { desa: { namaDesa: 'Pamalayan' } }, tahapan: { namaTahapan: 'FO' }, createdAt: new Date('2026-08-22T03:00:00Z') },
      ] },
    }
    const result = await createDashboardService({ prisma }).getDashboard({ date: '2026-08-22' })

    expect(result).toMatchObject({ wajibLapor: 3, sudahMelapor: 2, belumMelapor: 1, jumlahLaporan: 3 })
    expect(result.distribusiDesa).toEqual(expect.arrayContaining([expect.objectContaining({ namaDesa: 'Dewasari', jumlah: 2 })]))
  })
})

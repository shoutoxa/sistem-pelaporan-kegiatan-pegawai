import { describe, expect, it } from 'vitest'
import { createDashboardService } from '../src/modules/dashboard/dashboard.service.js'

describe('dashboard service', () => {
  it('counts distinct reporting employees and computes the not-yet-reported set', async () => {
    const prisma = {
      user: { findMany: async () => [{ id: 'u1', nama: 'Ayu' }, { id: 'u2', nama: 'Budi' }, { id: 'u3', nama: 'Cici' }] },
      laporan: { findMany: async () => [
        { id: 'r1', userId: 'u1', cluster: { clusterName: 'RW 01', desa: { namaDesa: 'Dewasari' } }, pekerjaan: { namaPekerjaan: 'ODN' }, createdAt: new Date('2026-08-22T01:00:00Z') },
        { id: 'r2', userId: 'u1', cluster: { clusterName: 'RW 01', desa: { namaDesa: 'Dewasari' } }, pekerjaan: { namaPekerjaan: 'ODN' }, createdAt: new Date('2026-08-22T02:00:00Z') },
        { id: 'r3', userId: 'u2', cluster: { clusterName: 'RW 02', desa: { namaDesa: 'Pamalayan' } }, pekerjaan: { namaPekerjaan: 'FO' }, createdAt: new Date('2026-08-22T03:00:00Z') },
        { id: 'r4', userId: 'non-wajib', cluster: { clusterName: 'RW 02', desa: { namaDesa: 'Pamalayan' } }, pekerjaan: { namaPekerjaan: 'FO' }, createdAt: new Date('2026-08-22T04:00:00Z') },
      ] },
      desa: { findMany: async () => [{ id: 'd1', namaDesa: 'Dewasari' }, { id: 'd2', namaDesa: 'Pamalayan' }] },
      pekerjaan: { findMany: async () => [{ id: 'p1', namaPekerjaan: 'ODN' }, { id: 'p2', namaPekerjaan: 'FO' }] },
    }
    const result = await createDashboardService({ prisma }).getDashboard({ date: '2026-08-22' })

    expect(result).toMatchObject({ wajibLapor: 3, sudahMelapor: 2, belumMelapor: 1, jumlahLaporan: 4 })
    expect(result.distribusiDesa).toEqual(expect.arrayContaining([expect.objectContaining({ namaDesa: 'Dewasari', jumlah: 2 })]))
  })

  it('dynamically recalculates sudahMelapor and belumMelapor across 3 different filter dates', async () => {
    const users = [{ id: 'u1', nama: 'Andi' }, { id: 'u2', nama: 'Budi' }]
    const desa = [{ id: 'd1', namaDesa: 'Dewasari' }]
    const pekerjaan = [{ id: 'p1', namaPekerjaan: 'ODN' }]

    // Mock reports by date filter
    const reportsByDate = {
      '2026-08-28': [{ id: 'r1', userId: 'u1' }], // Andi reported, Budi did not -> 1 sudah, 1 belum
      '2026-08-27': [],                           // Nobody reported -> 0 sudah, 2 belum
      '2026-08-26': [{ id: 'r2', userId: 'u1' }, { id: 'r3', userId: 'u2' }], // Both reported -> 2 sudah, 0 belum
    }

    const prisma = {
      user: { findMany: async () => users },
      laporan: {
        findMany: async ({ where }) => {
          if (where?.tanggalKegiatan) {
            const ISOString = where.tanggalKegiatan.toISOString().slice(0, 10)
            return reportsByDate[ISOString] || []
          }
          return []
        },
      },
      desa: { findMany: async () => desa },
      pekerjaan: { findMany: async () => pekerjaan },
    }

    const service = createDashboardService({ prisma })

    // Test Date 1: 2026-08-28 -> 1 sudah, 1 belum
    const res28 = await service.getDashboard({ date: '2026-08-28' })
    expect(res28.sudahMelapor).toBe(1)
    expect(res28.belumMelapor).toBe(1)
    expect(res28.sudahMelaporUsers.map((u) => u.nama)).toEqual(['Andi'])
    expect(res28.belumMelaporUsers.map((u) => u.nama)).toEqual(['Budi'])

    // Test Date 2: 2026-08-27 -> 0 sudah, 2 belum
    const res27 = await service.getDashboard({ date: '2026-08-27' })
    expect(res27.sudahMelapor).toBe(0)
    expect(res27.belumMelapor).toBe(2)
    expect(res27.sudahMelaporUsers).toHaveLength(0)
    expect(res27.belumMelaporUsers.map((u) => u.nama)).toEqual(['Andi', 'Budi'])

    // Test Date 3: 2026-08-26 -> 2 sudah, 0 belum
    const res26 = await service.getDashboard({ date: '2026-08-26' })
    expect(res26.sudahMelapor).toBe(2)
    expect(res26.belumMelapor).toBe(0)
    expect(res26.sudahMelaporUsers.map((u) => u.nama)).toEqual(['Andi', 'Budi'])
    expect(res26.belumMelaporUsers).toHaveLength(0)
  })
})

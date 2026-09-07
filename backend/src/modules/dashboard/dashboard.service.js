import { ftthApi } from '../../services/ftthApi.js'

function dateValue(date) { return new Date(date + 'T00:00:00.000Z') }

export function createDashboardService({ prisma, storage, clock = () => new Date() }) {
  async function resolveFotoUrl(path) {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (storage?.createSignedUrl) {
      try {
        return await storage.createSignedUrl(path, 86400)
      } catch {
        return path
      }
    }
    return path
  }

  async function withFotoUrl(user) {
    if (!user) return user
    const fotoProfilUrl = await resolveFotoUrl(user.fotoProfil)
    return { ...user, fotoProfilUrl }
  }

  if (prisma) {
    return {
      async getDashboard({ date, from, to, desaId, clusterId, pekerjaanId, search } = {}) {
        const todayStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(clock())

        const selectedDate = (date && date.trim() !== '') ? date : undefined
        const targetDate = selectedDate || todayStr

        const where = {}
        if (selectedDate) {
          where.tanggalKegiatan = dateValue(selectedDate)
        } else if (from || to) {
          where.tanggalKegiatan = {
            ...(from ? { gte: dateValue(from) } : {}),
            ...(to ? { lte: dateValue(to) } : {}),
          }
        }
        if (clusterId) where.clusterId = clusterId
        else if (desaId) where.cluster = { desaId }
        if (pekerjaanId) where.pekerjaanId = pekerjaanId
        if (search) {
          where.OR = [
            { keterangan: { contains: search, mode: 'insensitive' } },
            { user: { nama: { contains: search, mode: 'insensitive' } } },
            { cluster: { desa: { namaDesa: { contains: search, mode: 'insensitive' } } } },
          ]
        }

        const [users, reports, targetDateReports, allDesa, allPekerjaan] = await Promise.all([
          prisma.user.findMany({ where: { role: 'PEGAWAI', isActive: true, wajibLapor: true }, select: { id: true, nama: true, username: true, nomorHp: true, fotoProfil: true } }),
          prisma.laporan.findMany({ where, include: { user: { select: { id: true, nama: true, nomorHp: true, fotoProfil: true } }, cluster: { include: { desa: true } }, pekerjaan: true }, orderBy: { createdAt: 'desc' } }),
          prisma.laporan.findMany({ where: { tanggalKegiatan: dateValue(targetDate) }, select: { userId: true } }),
          prisma.desa.findMany({ where: { isActive: true }, select: { id: true, namaDesa: true }, orderBy: { namaDesa: 'asc' } }),
          prisma.pekerjaan.findMany({ where: { isActive: true }, select: { id: true, namaPekerjaan: true }, orderBy: { createdAt: 'asc' } }),
        ])

        const wajibLaporIds = new Set(users.map((user) => user.id))
        const targetReportedIds = new Set(targetDateReports.filter((report) => wajibLaporIds.has(report.userId)).map((report) => report.userId))

        const byDesa = new Map((allDesa || []).map((d) => [d.namaDesa, 0]))
        const byPekerjaan = new Map((allPekerjaan || []).map((p) => [p.namaPekerjaan, 0]))

        for (const report of reports) {
          const desa = report.cluster?.desa?.namaDesa || 'Tanpa Desa'
          const pekerjaan = report.pekerjaan?.namaPekerjaan || 'Tanpa Pekerjaan'
          byDesa.set(desa, (byDesa.get(desa) || 0) + 1)
          byPekerjaan.set(pekerjaan, (byPekerjaan.get(pekerjaan) || 0) + 1)
        }

        const sudahMelaporUsers = await Promise.all(users.filter((user) => targetReportedIds.has(user.id)).map(withFotoUrl))
        const belumMelaporUsers = await Promise.all(users.filter((user) => !targetReportedIds.has(user.id)).map(withFotoUrl))
        const terbaru = await Promise.all(reports.slice(0, 10).map(async (item) => ({
          ...item,
          user: await withFotoUrl(item.user),
        })))

        return {
          tanggal: selectedDate || null,
          targetDate,
          todayDate: todayStr,
          wajibLapor: users.length,
          sudahMelapor: targetReportedIds.size,
          belumMelapor: belumMelaporUsers.length,
          sudahMelaporUsers,
          belumMelaporUsers,
          jumlahLaporan: reports.length,
          distribusiDesa: [...byDesa.entries()].map(([namaDesa, jumlah]) => ({ namaDesa, jumlah })),
          distribusiPekerjaan: [...byPekerjaan.entries()].map(([namaPekerjaan, jumlah]) => ({ namaPekerjaan, jumlah })),
          terbaru,
        }
      },
    }
  }

  return {
    async getDashboard({ date, from, to, projectId, clusterId, processId, search } = {}) {
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(clock())

      const selectedDate = (date && date.trim() !== '') ? date : undefined
      const targetDate = selectedDate || todayStr

      const filters = {}
      if (selectedDate) {
        filters.tanggal_kegiatan = selectedDate
      } else if (from || to) {
        if (from) filters.from = from
        if (to) filters.to = to
      }
      if (clusterId) filters.cluster_id = clusterId
      else if (projectId) filters.project_id = projectId
      if (processId) filters.process_id = processId
      if (search) filters.search = search

      const [usersResponse, reportsResponse, categoriesResponse] = await Promise.all([
        ftthApi.getUsers(),
        ftthApi.getReports(filters),
        ftthApi.getMasterCategories(),
      ])

      const allUsers = (usersResponse.data || usersResponse || [])
      const users = allUsers
        .filter((u) => (u.role === 'PEGAWAI' || u.role === 'user') && u.is_active !== false)
        .map((u) => ({
          ...u,
          nama: u.full_name || u.nama || u.username,
        }))
      const reports = (reportsResponse.data || reportsResponse || [])
      const categories = categoriesResponse.data || categoriesResponse || []

      const wajibLaporIds = new Set(users.map((user) => user.id))
      const targetReportedIds = new Set(
        reports
          .filter((report) => wajibLaporIds.has(report.user_id))
          .map((report) => report.user_id)
      )

      const byProject = new Map()
      const byProcess = new Map()

      for (const report of reports) {
        const projectName = report.project?.name || 'Tanpa Project'
        const processName = report.master_process?.name || report.process?.name || 'Tanpa Pekerjaan'
        byProject.set(projectName, (byProject.get(projectName) || 0) + 1)
        byProcess.set(processName, (byProcess.get(processName) || 0) + 1)
      }

      const sudahMelaporUsers = await Promise.all(users.filter((user) => targetReportedIds.has(user.id)).map(withFotoUrl))
      const belumMelaporUsers = await Promise.all(users.filter((user) => !targetReportedIds.has(user.id)).map(withFotoUrl))
      const terbaru = await Promise.all(
        reports.slice(0, 10).map(async (item) => ({
          ...item,
          user: item.user || { id: item.user_id, nama: item.user_name },
        }))
      )

      return {
        tanggal: selectedDate || null,
        targetDate,
        todayDate: todayStr,
        wajibLapor: users.length,
        sudahMelapor: targetReportedIds.size,
        belumMelapor: belumMelaporUsers.length,
        sudahMelaporUsers,
        belumMelaporUsers,
        jumlahLaporan: reports.length,
        distribusiProject: [...byProject.entries()].map(([name, jumlah]) => ({ name, jumlah })),
        distribusiPekerjaan: [...byProcess.entries()].map(([name, jumlah]) => ({ name, jumlah })),
        terbaru,
        categories,
      }
    },
  }
}
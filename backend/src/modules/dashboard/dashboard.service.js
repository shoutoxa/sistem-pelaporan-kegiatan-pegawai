import { ftthApi as defaultFtthApi } from '../../services/ftthApi.js'

export function createDashboardService({ clock = () => new Date(), ftthApi: injectedFtthApi } = {}) {
  const ftth = injectedFtthApi || defaultFtthApi

  function resolveFotoUrl(path) {
    if (!path) return null
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (path.startsWith('/uploads/')) return 'https://ftth.digitak.id' + path
    return '/api/files/' + path.replace(/^\/+/, '')
  }

  function withFotoUrl(user) {
    if (!user) return user
    const fotoProfilUrl = resolveFotoUrl(user.foto || user.fotoProfil)
    return { ...user, fotoProfilUrl }
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
        ftth.getUsers(),
        ftth.getReports(filters),
        ftth.getMasterCategories(),
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

      // Fetch official laporan-status for all active employees from FTTH API
      const userStatusEntries = await Promise.all(
        users.map(async (u) => {
          try {
            if (typeof ftth.getUserLaporanStatus === 'function') {
              const res = await ftth.getUserLaporanStatus(u.id)
              const statusData = res?.data || res
              if (statusData) return [u.id, statusData]
            }
          } catch {
            // fallback
          }
          return [u.id, null]
        })
      )
      const userStatusMap = Object.fromEntries(userStatusEntries)

      // Determine wajib lapor employees and reporting status based on official FTTH laporan-status
      const wajibLaporUsers = users.filter((u) => {
        const status = userStatusMap[u.id]
        if (status && typeof status.wajib_lapor === 'boolean') {
          return status.wajib_lapor
        }
        return u.wajib_lapor !== false
      })

      const targetReportedIds = new Set()
      for (const u of wajibLaporUsers) {
        const status = userStatusMap[u.id]
        if (status && Array.isArray(status.clusters) && status.clusters.length > 0) {
          const hasReportedCluster = status.clusters.some((c) => c.sudah_lapor)
          if (hasReportedCluster) {
            targetReportedIds.add(u.id)
            continue
          }
        }
        // Fallback to checking reports returned for the target date
        if (reports.some((r) => r.user_id === u.id)) {
          targetReportedIds.add(u.id)
        }
      }

      const byProject = new Map()
      const byProcess = new Map()

      for (const report of reports) {
        const projectName = report.project?.name || 'Tanpa Project'
        const processName = report.master_process?.name || report.process?.name || 'Tanpa Pekerjaan'
        byProject.set(projectName, (byProject.get(projectName) || 0) + 1)
        byProcess.set(processName, (byProcess.get(processName) || 0) + 1)
      }

      const sudahMelaporUsers = wajibLaporUsers.filter((user) => targetReportedIds.has(user.id)).map(withFotoUrl)
      const belumMelaporUsers = wajibLaporUsers.filter((user) => !targetReportedIds.has(user.id)).map(withFotoUrl)
      const terbaru = reports.slice(0, 10).map((item) => ({
        ...item,
        user: item.user || { id: item.user_id, nama: item.user_name },
      }))

      return {
        tanggal: selectedDate || null,
        targetDate,
        todayDate: todayStr,
        wajibLapor: wajibLaporUsers.length,
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
import { Router } from 'express'
import ExcelJS from 'exceljs'
import { ftthApi } from '../../services/ftthApi.js'

export function createExportRouter({ requireAuth, requireSuperadmin }) {
  const router = Router()
  const guard = [requireAuth, requireSuperadmin].filter(Boolean)

  router.get('/admin/laporan/export', ...guard, async (request, response) => {
    try {
      const { from, to, projectId, clusterId, processId, search } = request.query
      const filters = {}
      if (from) filters.from = from
      if (to) filters.to = to
      if (projectId) filters.project_id = projectId
      if (clusterId) filters.cluster_id = clusterId
      if (processId) filters.process_id = processId
      if (search) filters.search = search

      const result = await ftthApi.getReports(filters)
      const rows = Array.isArray(result) ? result : (result.data || [])

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Laporan')
      sheet.addRow(['Tanggal', 'Pegawai', 'Project', 'Cluster', 'Kategori', 'Pekerjaan', 'Nomor Perangkat', 'Keterangan', 'Status', 'Catatan Revisi'])

      for (const row of rows) {
        const userName = row.user?.full_name || row.user?.nama || row.user_name || '-'
        const projectName = row.project?.name || row.project_name || '-'
        const clusterName = row.cluster?.name || row.cluster_name || '-'
        const categoryName = row.master_process?.category?.name || row.process?.category?.name || '-'
        const processName = row.master_process?.name || row.process?.name || row.process_name || '-'
        const status = row.status === 'APPROVED' ? 'Disetujui' : row.status === 'REJECTED' ? 'Ditolak' : 'Menunggu'
        sheet.addRow([
          row.tanggal_kegiatan || row.tanggalKegiatan,
          userName,
          projectName,
          clusterName,
          categoryName,
          processName,
          row.nomor_perangkat || row.nomorPerangkat || '-',
          row.keterangan || '-',
          status,
          row.catatan_revisi || '-',
        ])
      }
      sheet.getRow(1).font = { bold: true }

      const buffer = await workbook.xlsx.writeBuffer()
      response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      response.setHeader('Content-Disposition', 'attachment; filename="laporan.xlsx"')
      return response.send(Buffer.from(buffer))
    } catch (error) {
      console.error('Export error:', error.message)
      return response.status(500).json({ message: 'Gagal mengekspor laporan.' })
    }
  })

  return router
}

export async function createProductionExportRouter() {
  const { requireAuth, requireRole } = await import('../auth/auth.middleware.js')
  const { createProductionAuthService } = await import('../auth/auth.routes.js')
  const sessionService = await createProductionAuthService()
  return createExportRouter({
    requireAuth: requireAuth({ authService: sessionService }),
    requireSuperadmin: requireRole('SUPERADMIN'),
  })
}

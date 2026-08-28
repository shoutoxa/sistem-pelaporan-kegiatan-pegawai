import ExcelJS from 'exceljs'

export function createExportService({ rowsProvider }) {
  return {
    async exportReports(filters) {
      const rows = await rowsProvider(filters)
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Laporan')
      sheet.addRow(['Tanggal', 'Pegawai', 'No HP', 'Desa', 'Cluster', 'Pekerjaan', 'Keterangan', 'Status'])
      for (const row of rows) sheet.addRow([row.tanggalKegiatan, row.user?.nama, row.user?.nomorHp || '-', row.cluster?.desa?.namaDesa, row.cluster?.clusterName, row.pekerjaan?.namaPekerjaan, row.keterangan, row.diterima ? 'Diterima' : 'Menunggu'])
      sheet.getRow(1).font = { bold: true }
      return workbook.xlsx.writeBuffer()
    },
  }
}

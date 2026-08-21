import ExcelJS from 'exceljs'

export function createExportService({ rowsProvider }) {
  return {
    async exportReports(filters) {
      const rows = await rowsProvider(filters)
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Laporan')
      sheet.addRow(['Tanggal', 'Pegawai', 'Desa', 'RW', 'Tahapan', 'Keterangan'])
      for (const row of rows) sheet.addRow([row.tanggalKegiatan, row.user?.nama, row.rw?.desa?.namaDesa, row.rw?.nomorRw, row.tahapan?.namaTahapan, row.keterangan])
      sheet.getRow(1).font = { bold: true }
      return workbook.xlsx.writeBuffer()
    },
  }
}

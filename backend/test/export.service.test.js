import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { createExportService } from '../src/modules/export/export.service.js'

describe('export service', () => {
  it('returns an xlsx workbook with stable headers and row values', async () => {
    const service = createExportService({ rowsProvider: async () => [{ tanggalKegiatan: '2026-08-22', user: { nama: 'Ayu' }, rw: { nomorRw: 'RW 01', desa: { namaDesa: 'Dewasari' } }, tahapan: { namaTahapan: 'ODN' }, keterangan: 'Selesai' }] })
    const buffer = await service.exportReports({})
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.worksheets[0]

    expect(sheet.getRow(1).values).toEqual([, 'Tanggal', 'Pegawai', 'Desa', 'RW', 'Tahapan', 'Keterangan'])
    expect(sheet.getRow(2).getCell(1).value).toBe('2026-08-22')
    expect(sheet.getRow(2).getCell(2).value).toBe('Ayu')
  })
})

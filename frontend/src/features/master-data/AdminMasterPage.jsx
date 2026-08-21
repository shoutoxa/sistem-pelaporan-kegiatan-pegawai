import { useEffect, useState } from 'react'
import { masterApi } from '../../api/master.js'
import MasterTable from './MasterTable.jsx'

export default function AdminMasterPage() {
  const [desa, setDesa] = useState([])
  const [tahapan, setTahapan] = useState([])
  useEffect(() => { masterApi.fetchDesa().then(setDesa).catch(() => setDesa([])); masterApi.fetchTahapan().then(setTahapan).catch(() => setTahapan([])) }, [])
  return <section className="page"><h1>Master Data</h1><MasterTable title="Desa" columns={[{ key: 'namaDesa', label: 'Nama Desa' }]} rows={desa} onCreate={() => undefined} onEdit={() => undefined} onToggleActive={() => undefined} /><MasterTable title="Tahapan" columns={[{ key: 'namaTahapan', label: 'Nama Tahapan' }]} rows={tahapan} onCreate={() => undefined} onEdit={() => undefined} onToggleActive={() => undefined} /></section>
}

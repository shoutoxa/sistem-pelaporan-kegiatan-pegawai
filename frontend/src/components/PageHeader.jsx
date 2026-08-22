import { useEffect } from 'react'

export default function PageHeader({ title, description, action }) {
  useEffect(() => { document.title = `${title} — Sistem Pelaporan` }, [title])
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action ? <div className="page-actions">{action}</div> : null}</div>
}

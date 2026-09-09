import { useMemo, useState } from 'react'
import FtthAttachments from './FtthAttachments.jsx'
import './ftth.css'

export function groupDocumentation(items) {
  const projects = new Map()
  for (const item of items) {
    if (!projects.has(item.projectId)) projects.set(item.projectId, { id: item.projectId, name: item.projectName, clusters: new Map() })
    const project = projects.get(item.projectId)
    if (!project.clusters.has(item.clusterId)) project.clusters.set(item.clusterId, { id: item.clusterId, name: item.clusterName, processes: new Map() })
    const cluster = project.clusters.get(item.clusterId)
    if (!cluster.processes.has(item.processId)) cluster.processes.set(item.processId, { id: item.processId, name: item.processName, items: [] })
    cluster.processes.get(item.processId).items.push(item)
  }
  return [...projects.values()].map(project => ({ ...project, clusters: [...project.clusters.values()].map(cluster => ({ ...cluster, processes: [...cluster.processes.values()] })) }))
}

export default function DocumentationFolders({ items }) {
  const groups = useMemo(() => groupDocumentation(items), [items])
  // Remount the attachment list on folder changes so a stale preview cannot survive a filter.
  const [expanded, setExpanded] = useState(false)
  return <section className="ftth-folders no-print" aria-label="Folder dokumentasi">
    <button className="secondary-button" onClick={() => setExpanded(value => !value)}>{expanded ? 'Tutup semua folder' : 'Buka semua folder'}</button>
    {groups.map(project => <details key={`${project.id}:${expanded}`} open={expanded}>
      <summary>{project.name} <small>· {project.clusters.length} cluster</small></summary>
      {project.clusters.map(cluster => <details key={cluster.id} open={expanded}>
        <summary>{cluster.name} <small>· {cluster.processes.length} pekerjaan</small></summary>
        {cluster.processes.map(process => <details key={process.id} open={expanded}>
          <summary>{process.name} <small>· {process.items.length} lampiran</small></summary>
          <FtthAttachments items={process.items} />
        </details>)}
      </details>)}
    </details>)}
  </section>
}

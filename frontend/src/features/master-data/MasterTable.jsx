import Icon from "../../components/Icon.jsx";

export default function MasterTable({
  title,
  columns,
  rows,
  onCreate,
  onEdit,
  onToggleActive,
  isReadOnly = () => false,
}) {
  return (
    <section className="master-table data-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{rows.length} data tersedia</p>
        </div>
        {onCreate && (
          <button className="primary-button icon-label" onClick={onCreate}>
            <Icon name="plus" />
            Tambah {title}
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Master data {title}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>Status</th>
              {(onEdit || onToggleActive) && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                <td>
                  <span
                    className={`status-badge ${row.isActive ? "active" : "inactive"}`}
                  >
                    {row.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                {(onEdit || onToggleActive) && (
                  <td>
                    <div className="action-group">
                      {isReadOnly(row) ? (
                        <span className="muted-copy">Dikelola FTTH</span>
                      ) : (
                        <>
                          {onEdit && (
                            <button
                              className="secondary-button icon-label"
                              onClick={() => onEdit(row)}
                            >
                              <Icon name="edit" size={17} />
                              Edit
                            </button>
                          )}
                          {onToggleActive && (
                            <button
                              className={row.isActive ? "warning-button" : "text-button"}
                              onClick={() => onToggleActive(row)}
                            >
                              {row.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="empty-cell" colSpan={columns.length + 1 + (onEdit || onToggleActive ? 1 : 0)}>
                  Belum ada data. Tambahkan {title.toLowerCase()} pertama.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

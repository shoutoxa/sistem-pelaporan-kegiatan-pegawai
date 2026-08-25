import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { historyApi } from "../../api/history.js";
import { masterApi } from "../../api/master.js";
import { updateReport } from "../../api/reports.js";
import LocationFields from "../master-data/LocationFields.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import PageState from "../../components/PageState.jsx";
import Notice from "../../components/Notice.jsx";

export default function EditReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([historyApi.getDetail(id), masterApi.fetchTahapan()])
      .then(([detail, stageRows]) => {
        if (!detail.data.canEdit) {
          setState("expired");
          return;
        }
        const item = detail.data;
        setReport(item);
        setStages(stageRows);
        setForm({
          tanggalKegiatan: String(item.tanggalKegiatan).slice(0, 10),
          desaId: item.rw?.desa?.id || item.rw?.desaId || "",
          rwId: item.rw?.id || item.rwId || "",
          tahapanId: item.tahapan?.id || item.tahapanId || "",
          nomorPerangkat: item.nomorPerangkat || "",
          keterangan: item.keterangan || "",
        });
        setState("ready");
      })
      .catch((requestError) => {
        setError(requestError.message);
        setState("error");
      });
  }, [id]);

  const selectedStage = useMemo(
    () => stages.find((row) => row.id === form?.tahapanId),
    [stages, form?.tahapanId],
  );
  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      await updateReport(id, {
        tanggalKegiatan: form.tanggalKegiatan,
        rwId: form.rwId,
        tahapanId: form.tahapanId,
        nomorPerangkat: form.nomorPerangkat,
        keterangan: form.keterangan,
      });
      navigate(`/pegawai/laporan/${id}`);
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.errors || {});
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading")
    return (
      <section className="page">
        <PageState
          title="Menyiapkan laporan"
          message="Memeriksa batas waktu edit dan memuat data."
        />
      </section>
    );
  if (state === "expired")
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Batas edit sudah berakhir"
          message="Laporan hanya dapat diubah selama 24 jam setelah dikirim."
          action={
            <Link className="secondary-button" to={`/pegawai/laporan/${id}`}>
              Kembali ke detail
            </Link>
          }
        />
      </section>
    );
  if (state === "error" || !form)
    return (
      <section className="page">
        <PageState
          tone="error"
          title="Laporan tidak dapat diedit"
          message={error || "Data laporan tidak tersedia."}
        />
      </section>
    );

  return (
    <section className="page">
      <PageHeader
        title="Edit laporan"
        description="Dokumentasi tetap tersimpan; Anda dapat memperbaiki data kegiatan selama batas 24 jam."
      />
      {error && <Notice tone="error">{error}</Notice>}
      <form className="data-section report-form edit-report-form" onSubmit={save} noValidate>
        <div className="field-grid">
          <label>
            Tanggal kegiatan
            <input
              aria-label="Tanggal kegiatan"
              type="date"
              value={form.tanggalKegiatan}
              onChange={(event) =>
                setField("tanggalKegiatan", event.target.value)
              }
            />
          </label>
          <label>
            Tahapan
            <select
              aria-label="Tahapan"
              value={form.tahapanId}
              onChange={(event) => {
                setField("tahapanId", event.target.value);
                setField("nomorPerangkat", "");
              }}
            >
              <option value="">Pilih Tahapan</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.namaTahapan}
                </option>
              ))}
            </select>
          </label>
        </div>
        <LocationFields
          value={form}
          onChange={(location) =>
            setForm((current) => ({ ...current, ...location }))
          }
          desaOptions={report?.rw?.desa ? [report.rw.desa] : []}
          errors={fieldErrors}
        />
        {selectedStage?.requiresNomorPerangkat && (
          <label>
            Nomor perangkat
            <input
              aria-label="Nomor perangkat"
              value={form.nomorPerangkat}
              onChange={(event) =>
                setField("nomorPerangkat", event.target.value)
              }
            />
          </label>
        )}
        {selectedStage?.instruksiDokumentasi && (
          <div className="stage-guidance" role="status">
            <span>
              <strong>Panduan foto tahapan</strong>
              <p>{selectedStage.instruksiDokumentasi}</p>
            </span>
          </div>
        )}
        <label>
          Keterangan
          <textarea
            className="resize-none"
            aria-label="Keterangan"
            value={form.keterangan}
            onChange={(event) => setField("keterangan", event.target.value)}
            maxLength="2000"
          />
          {fieldErrors.keterangan && (
            <small className="field-error">{fieldErrors.keterangan}</small>
          )}
        </label>
        <p className="muted-copy">
          {report.dokumentasi?.length || 0} foto dokumentasi tetap
          dipertahankan.
        </p>
        <div className="form-actions">
          <Link className="secondary-button" to={`/pegawai/laporan/${id}`}>
            Batal
          </Link>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </form>
    </section>
  );
}

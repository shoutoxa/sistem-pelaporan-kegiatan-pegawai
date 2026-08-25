import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { masterApi } from "../../api/master.js";
import { createReport } from "../../api/reports.js";
import LocationFields from "../master-data/LocationFields.jsx";
import FilePicker from "./FilePicker.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import Notice from "../../components/Notice.jsx";
import Icon from "../../components/Icon.jsx";

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const DRAFT_PREFIX = "sistem-pelaporan:report-draft:v1";

function emptyReportForm() {
  return {
    tanggalKegiatan: jakartaToday(),
    desaId: "",
    rwId: "",
    tahapanId: "",
    keterangan: "",
    nomorPerangkat: "",
  };
}

function hasDraftContent(form) {
  return form.tanggalKegiatan !== jakartaToday() || [
    form.desaId,
    form.rwId,
    form.tahapanId,
    form.keterangan,
    form.nomorPerangkat,
  ].some((value) => value.trim());
}

function readDraft(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (!stored || typeof stored !== "object") return null;
    const fallback = emptyReportForm();
    const normalized = Object.fromEntries(
      Object.keys(fallback).map((field) => [
        field,
        typeof stored[field] === "string" ? stored[field] : fallback[field],
      ]),
    );
    return hasDraftContent(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export default function ReportForm({ user, villages, stages: stageProp }) {
  const navigate = useNavigate();
  const draftKey = `${DRAFT_PREFIX}:${user?.id || "pegawai"}`;
  const [initialDraft] = useState(() => readDraft(draftKey));
  const [stages, setStages] = useState(stageProp || []);
  const [form, setForm] = useState(() => initialDraft || emptyReportForm());
  const [draftRestored, setDraftRestored] = useState(Boolean(initialDraft));
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!stageProp)
      masterApi
        .fetchTahapan()
        .then(setStages)
        .catch(() => setStages([]));
  }, [stageProp]);
  useEffect(() => {
    try {
      if (hasDraftContent(form)) localStorage.setItem(draftKey, JSON.stringify(form));
      else localStorage.removeItem(draftKey);
    } catch {
      // A failed local draft must never block the report workflow.
    }
  }, [draftKey, form]);
  const selectedStage = useMemo(
    () => stages.find((stage) => stage.id === form.tahapanId),
    [stages, form.tahapanId],
  );
  const clearFieldError = (key) =>
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  const setField = (key, value) => {
    clearFieldError(key);
    setForm((current) => ({ ...current, [key]: value }));
  };

  function focusFirstInvalid(errors) {
    const fieldByError = {
      tanggalKegiatan: "report-date",
      desaId: "report-village",
      rwId: "report-rw",
      tahapanId: "report-stage",
      nomorPerangkat: "report-device",
      keterangan: "report-description",
      dokumentasi: "report-gallery-input",
    };
    const firstId = Object.keys(errors).map((key) => fieldByError[key]).find(Boolean);
    requestAnimationFrame(() => {
      const target = firstId ? document.getElementById(firstId) : null;
      target?.focus();
      target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Resetting the visible form remains useful even without storage access.
    }
    setForm(emptyReportForm());
    setFiles([]);
    setFieldErrors({});
    setError("");
    setDraftRestored(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const validationErrors = {};
    if (!form.desaId) validationErrors.desaId = "Desa wajib dipilih.";
    if (!form.rwId) validationErrors.rwId = "RW wajib dipilih.";
    if (!form.tahapanId) validationErrors.tahapanId = "Tahapan wajib dipilih.";
    if (form.keterangan.trim().length < 5)
      validationErrors.keterangan = "Keterangan minimal 5 karakter.";
    if (files.length < 1)
      validationErrors.dokumentasi = "Minimal satu foto wajib dipilih.";
    if (selectedStage?.requiresNomorPerangkat && !form.nomorPerangkat.trim())
      validationErrors.nomorPerangkat = "Nomor perangkat wajib diisi.";
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setError("Lengkapi field yang masih bermasalah.");
      focusFirstInvalid(validationErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await createReport({ ...form, files });
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Submission success must not depend on browser storage availability.
      }
      navigate(`/pegawai/laporan/${result.data.id}`);
    } catch (requestError) {
      const serverErrors = requestError.errors || {};
      setFieldErrors(serverErrors);
      setError(requestError.message || "Laporan gagal dikirim.");
      focusFirstInvalid(serverErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page report-page">
      <PageHeader
        title="Buat laporan harian"
        description="Lengkapi informasi kegiatan dan dokumentasi pekerjaan Anda di lapangan."
      />
      {draftRestored && (
        <div className="draft-notice" role="status" aria-label="Draf laporan">
          <Icon name="history" />
          <div>
            <strong>Draf sebelumnya dipulihkan</strong>
            <small>Isian teks tersimpan di perangkat ini. Foto perlu dipilih kembali.</small>
          </div>
          <button className="text-button" type="button" onClick={clearDraft}>Hapus draf</button>
        </div>
      )}
      <div className="report-layout">
        <form className="report-form" onSubmit={handleSubmit} noValidate>
          <div className="form-progress" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <section className="form-section">
            <div className="form-section-title">
              <span>1</span>
              <div>
                <h2>Kegiatan</h2>
                <p>Identitas, tanggal, lokasi, dan tahapan pekerjaan.</p>
              </div>
            </div>
            <div className="field-grid">
              <label htmlFor="report-pic">
                PIC (Penanggung jawab)
                <input
                  id="report-pic"
                  aria-label="PIC"
                  value={user?.nama || ""}
                  readOnly
                />
              </label>
              <label htmlFor="report-date">
                Tanggal kegiatan <b aria-hidden="true">*</b>
                <input
                  id="report-date"
                  aria-label="Tanggal Kegiatan"
                  type="date"
                  value={form.tanggalKegiatan}
                  onChange={(event) =>
                    setField("tanggalKegiatan", event.target.value)
                  }
                  required
                  aria-invalid={Boolean(fieldErrors.tanggalKegiatan)}
                  aria-describedby={
                    fieldErrors.tanggalKegiatan
                      ? "report-date-error"
                      : undefined
                  }
                />
                {fieldErrors.tanggalKegiatan && (
                  <small
                    id="report-date-error"
                    className="field-error"
                    role="alert"
                  >
                    {fieldErrors.tanggalKegiatan}
                  </small>
                )}
              </label>
            </div>
            <LocationFields
              value={form}
              onChange={(location) => {
                Object.keys(location).forEach(clearFieldError);
                setForm((current) => ({ ...current, ...location }));
              }}
              desaOptions={villages}
              errors={fieldErrors}
            />
            <div className="field-grid">
              <label htmlFor="report-stage">
                Tahapan pekerjaan <b aria-hidden="true">*</b>
                <select
                  id="report-stage"
                  aria-label="Tahapan"
                  value={form.tahapanId}
                  onChange={(event) => {
                    clearFieldError("tahapanId");
                    clearFieldError("nomorPerangkat");
                    setForm((current) => ({
                      ...current,
                      tahapanId: event.target.value,
                      nomorPerangkat: "",
                    }));
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.tahapanId)}
                  aria-describedby={
                    fieldErrors.tahapanId ? "report-stage-error" : undefined
                  }
                >
                  <option value="">Pilih Tahapan</option>
                  {stages
                    .filter((stage) => stage.isActive !== false)
                    .map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.namaTahapan}
                      </option>
                    ))}
                </select>
                {fieldErrors.tahapanId && (
                  <small
                    id="report-stage-error"
                    className="field-error"
                    role="alert"
                  >
                    {fieldErrors.tahapanId}
                  </small>
                )}
              </label>
              {selectedStage?.requiresNomorPerangkat ? (
                <label htmlFor="report-device">
                  Nomor perangkat <b aria-hidden="true">*</b>
                  <input
                    id="report-device"
                    aria-label="Nomor Perangkat"
                    value={form.nomorPerangkat}
                    onChange={(event) =>
                      setField("nomorPerangkat", event.target.value)
                    }
                    required
                    aria-invalid={Boolean(fieldErrors.nomorPerangkat)}
                    aria-describedby={
                      fieldErrors.nomorPerangkat
                        ? "report-device-error"
                        : undefined
                    }
                  />
                  {fieldErrors.nomorPerangkat && (
                    <small
                      id="report-device-error"
                      className="field-error"
                      role="alert"
                    >
                      {fieldErrors.nomorPerangkat}
                    </small>
                  )}
                </label>
              ) : (
                <div className="field-placeholder">
                  <Icon name="info" />
                  <span>
                    Nomor perangkat akan muncul jika diwajibkan pada tahapan
                    terpilih.
                  </span>
                </div>
              )}
            </div>
            {selectedStage?.instruksiDokumentasi && (
              <div className="stage-guidance" role="status">
                <Icon name="photo" />
                <div>
                  <strong>Panduan foto untuk tahapan ini</strong>
                  <p>{selectedStage.instruksiDokumentasi}</p>
                </div>
              </div>
            )}
          </section>
          <section className="form-section">
            <div className="form-section-title">
              <span>2</span>
              <div>
                <h2>Catatan pekerjaan</h2>
                <p>Jelaskan hasil pekerjaan secara ringkas dan jelas.</p>
              </div>
            </div>
            <label htmlFor="report-description">
              Keterangan <b aria-hidden="true">*</b>
              <textarea
                className="resize-none"
                id="report-description"
                aria-label="Keterangan"
                placeholder="Contoh: Penanaman tiang di RW 01 sebanyak 12 titik. Kondisi lokasi aman."
                value={form.keterangan}
                onChange={(event) => setField("keterangan", event.target.value)}
                maxLength="2000"
                required
                aria-invalid={Boolean(fieldErrors.keterangan)}
                aria-describedby={
                  fieldErrors.keterangan
                    ? "report-description-error"
                    : undefined
                }
              />
              {fieldErrors.keterangan && (
                <small
                  id="report-description-error"
                  className="field-error"
                  role="alert"
                >
                  {fieldErrors.keterangan}
                </small>
              )}
            </label>
            <div className="character-count">
              {form.keterangan.length} / 2.000
            </div>
          </section>
          <section className="form-section">
            <div className="form-section-title">
              <span>3</span>
              <div>
                <h2>Dokumentasi</h2>
                <p>Unggah 1–5 foto yang menunjukkan kegiatan dan lokasi.</p>
              </div>
            </div>
            <FilePicker
              files={files}
              onChange={(nextFiles) => {
                clearFieldError("dokumentasi");
                setFiles(nextFiles);
              }}
            />
            {fieldErrors.dokumentasi && (
              <p className="field-error" role="alert">
                {fieldErrors.dokumentasi}
              </p>
            )}
          </section>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="form-actions">
            <button
              className="primary-button icon-label"
              type="submit"
              disabled={submitting}
            >
              <span>{submitting ? "Mengirim..." : "Kirim laporan"}</span>
              <Icon name="report" />
            </button>
          </div>
        </form>
        <aside className="submission-checklist">
          <h2>Sebelum mengirim</h2>
          <ul>
            <li>
              <Icon name="check" />
              <span>Pastikan tanggal dan lokasi kegiatan sudah benar.</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Tulis hasil pekerjaan yang dapat dipahami tim.</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Pilih foto yang jelas dan sesuai kegiatan.</span>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

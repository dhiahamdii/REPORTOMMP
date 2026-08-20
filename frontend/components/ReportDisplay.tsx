'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import SignatureCanvas from '@/components/SignatureCanvas';
import { buildReportHtmlDoc, downloadReportDocx, type ReportExportData } from '@/lib/reportExport';
import { downloadOmmpPdf } from '@/lib/pdfOmmpExport';
import {
  getDefaultReportLogos,
  OMMP_LOGO_URL,
  HUAWEI_LOGO_URL,
  withDefaultReportLogos,
} from '@/lib/reportLogos';

interface ReportDisplayProps {
  data: any;
  onBack: () => void;
}

function toExportData(raw: any, signatureDataUrl?: string | null): ReportExportData {
  return {
    clientName: String(raw?.clientName ?? ''),
    location: String(raw?.location ?? ''),
    date:
      typeof raw?.date === 'string'
        ? raw.date
        : raw?.date
          ? new Date(raw.date).toISOString()
          : new Date().toISOString(),
    technician: String(raw?.technician ?? ''),
    tasks: Array.isArray(raw?.tasks)
      ? raw.tasks.map((t: any) => ({
          description: String(t?.description ?? ''),
          completed: Boolean(t?.completed),
        }))
      : [],
    notes: raw?.notes ? String(raw.notes) : undefined,
    executive_summary: raw?.executive_summary ? String(raw.executive_summary) : undefined,
    findings: raw?.findings ? String(raw.findings) : undefined,
    recommendations: raw?.recommendations ? String(raw.recommendations) : undefined,
    port_name: raw?.port_name ? String(raw.port_name) : undefined,
    project_title: raw?.project_title ? String(raw.project_title) : undefined,
    objectif_intervention: raw?.objectif_intervention
      ? String(raw.objectif_intervention)
      : undefined,
    resume: raw?.resume ? String(raw.resume) : undefined,
    problemes_et_recommandations: raw?.problemes_et_recommandations
      ? String(raw.problemes_et_recommandations)
      : undefined,
    reference_intervention_suggeree: raw?.reference_intervention_suggeree
      ? String(raw.reference_intervention_suggeree)
      : undefined,
    companyLogo: raw?.companyLogo ?? null,
    clientLogo: raw?.clientLogo ?? null,
    contract_ref: raw?.contract_ref ? String(raw.contract_ref) : undefined,
    contacts_site: raw?.contacts_site ? String(raw.contacts_site) : undefined,
    contacts_intervention: raw?.contacts_intervention ? String(raw.contacts_intervention) : undefined,
    signature_image: signatureDataUrl ?? (raw?.signature_image ? String(raw.signature_image) : null),
  };
}

export default function ReportDisplay({ data, onBack }: ReportDisplayProps) {
  const [signature, setSignature] = useState<string | null>(null);
  const [reportId, setReportId] = useState('');
  const [docxLoading, setDocxLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [logoDefaults, setLogoDefaults] = useState<{
    companyLogo: string;
    clientLogo: string;
  } | null>(null);

  useEffect(() => {
    void getDefaultReportLogos().then(setLogoDefaults);
  }, []);

  useEffect(() => {
    const sugg =
      typeof data.reference_intervention_suggeree === 'string'
        ? data.reference_intervention_suggeree.trim()
        : '';
    if (/^PREV_[A-Z]{3}_\d{4}_\d{2}$/.test(sugg)) {
      setReportId(sugg);
      return;
    }
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    setReportId(`PREV_${month}_${year}_${random}`);
  }, [data.reference_intervention_suggeree]);

  const exportData = toExportData(data, signature);
  const exportDataWithLogos = logoDefaults
    ? withDefaultReportLogos(exportData, logoDefaults)
    : exportData;

  const displayCompanyLogo =
    exportDataWithLogos.companyLogo || logoDefaults?.companyLogo || OMMP_LOGO_URL;
  const displayClientLogo =
    exportDataWithLogos.clientLogo || logoDefaults?.clientLogo || HUAWEI_LOGO_URL;

  const handleExportText = () => {
    const text = `MAINTENANCE REPORT
Report ID: ${reportId}
================================

CLIENT INFORMATION:
Client       | ${data.clientName}
Location     | ${data.location}
Date         | ${new Date(data.date).toLocaleDateString()}
Technician   | ${data.technician}

MAINTENANCE TASKS:
${data.tasks
  .map(
    (task: any, i: number) =>
      `${i + 1}. | ${task.completed ? '[X]' : '[ ]'} | ${task.description}`
  )
  .join('\n')}

ADDITIONAL NOTES:
${data.notes || 'None'}

---
Generated on ${new Date().toLocaleString()}
`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `report_${reportId}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportHtml = async () => {
    const resolved = logoDefaults
      ? exportDataWithLogos
      : await import('@/lib/reportLogos').then(m => m.resolveReportLogos(exportData));
    const html = buildReportHtmlDoc(resolved, reportId);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
    element.setAttribute('download', `report_${reportId}.html`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const resolved = logoDefaults
        ? exportDataWithLogos
        : await import('@/lib/reportLogos').then(m => m.resolveReportLogos(exportData));
      downloadOmmpPdf(resolved, reportId);
    } catch (e) {
      console.error(e);
      alert('Échec export PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportDocx = async () => {
    setDocxLoading(true);
    try {
      const resolved = logoDefaults
        ? exportDataWithLogos
        : await import('@/lib/reportLogos').then(m => m.resolveReportLogos(exportData));
      await downloadReportDocx(resolved, reportId);
    } catch (e) {
      console.error(e);
      alert('Could not generate Word document. Try HTML export instead.');
    } finally {
      setDocxLoading(false);
    }
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(
      {
        reportId,
        ...data,
        signature: signature || null,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    );

    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
    element.setAttribute('download', `report_${reportId}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const thClass = 'bg-slate-100 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600';
  const tdClass = 'border-t border-slate-200 px-4 py-3 text-slate-800';
  const ommpUi = !!(data.project_title || data.objectif_intervention || data.resume);

  const resumeHtml = String(data.resume || data.executive_summary || '').trim();

  return (
    <div className="space-y-8">
      {/* Report Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        {/* Logos : OMMP gauche, Huawei droite */}
        <div className="-mx-2 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex min-h-[52px] min-w-[120px] max-w-[42%] items-center justify-start pl-2">
            <img
              src={displayCompanyLogo}
              alt="Logo OMMP"
              className="max-h-16 max-w-full object-contain"
            />
          </div>
          <div className="flex min-h-[52px] min-w-[120px] max-w-[42%] items-center justify-end pr-2">
            <img
              src={displayClientLogo}
              alt="Logo Huawei"
              className="max-h-16 max-w-full object-contain"
            />
          </div>
        </div>

        {ommpUi ? (
          <p className="mb-6 text-center text-lg font-bold text-slate-900">
            Fiche de maintenance préventive
          </p>
        ) : null}

        {data.project_title ? (
          <div className="mb-6 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-center text-sm font-semibold uppercase leading-snug tracking-tight text-slate-800">
            {data.project_title}
          </div>
        ) : null}

        {data.objectif_intervention ? (
          <div className="mb-8 rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-blue-100/80 px-4 py-2 text-sm font-bold text-blue-950">
              Objectif de l&apos;intervention
            </div>
            <p className="p-4 leading-relaxed text-slate-800">{data.objectif_intervention}</p>
          </div>
        ) : null}

        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {ommpUi ? 'Rapport technique OMMP / Huawei-Waycon' : 'Maintenance Report'}
            </h1>
            <p className="mt-2 text-lg text-slate-600">
              {ommpUi ? 'Réf. :' : 'Report ID:'}{' '}
              <span className="font-mono font-semibold text-blue-600">{reportId}</span>
            </p>
          </div>
          <button
            onClick={onBack}
            className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100"
          >
            ← Back to Form
          </button>
        </div>

        {/* Client information table */}
        <div className="mb-8 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-blue-50">
                <th colSpan={2} className="px-4 py-2 text-left text-sm font-bold text-blue-900">
                  {ommpUi ? 'Renseignements généraux' : 'Client information'}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={thClass}>
                  {ommpUi ? 'Commanditaire / organisme' : 'Client'}
                </td>
                <td className={tdClass}>{data.clientName}</td>
              </tr>
              <tr>
                <td className={thClass}>
                  {ommpUi ? 'Site / zone portuaire' : 'Location'}
                </td>
                <td className={tdClass}>{data.location}</td>
              </tr>
              {data.port_name ? (
                <tr>
                  <td className={thClass}>Port (OMMP)</td>
                  <td className={tdClass}>{data.port_name}</td>
                </tr>
              ) : null}
              <tr>
                <td className={thClass}>
                  {ommpUi ? 'Date intervention' : 'Date'}
                </td>
                <td className={tdClass}>{new Date(data.date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td className={thClass}>
                  {ommpUi ? 'Technicien' : 'Technician'}
                </td>
                <td className={tdClass}>{data.technician}</td>
              </tr>
              {ommpUi && data.contract_ref ? (
                <tr>
                  <td className={thClass}>Contrat / référence</td>
                  <td className={tdClass}>{data.contract_ref}</td>
                </tr>
              ) : null}
              {ommpUi && data.contacts_site ? (
                <tr>
                  <td className={thClass}>Contacts sur site</td>
                  <td className={`${tdClass} whitespace-pre-wrap`}>{data.contacts_site}</td>
                </tr>
              ) : null}
              {ommpUi && data.contacts_intervention ? (
                <tr>
                  <td className={thClass}>Contacts intervention</td>
                  <td className={`${tdClass} whitespace-pre-wrap`}>{data.contacts_intervention}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Résumé / executive summary */}
        {resumeHtml ? (
          <div className="mb-8 rounded-lg border border-slate-200 bg-blue-50/50">
            <div className="border-b border-slate-200 bg-blue-100/80 px-4 py-2 text-sm font-bold text-blue-900">
              {ommpUi ? 'Résumé' : 'Executive summary'}
            </div>
            <p className="p-4 leading-relaxed text-slate-800 italic">{resumeHtml}</p>
          </div>
        ) : null}

        {/* Tasks table */}
        <div className="mb-8 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              {ommpUi ? (
                <tr className="border-b border-slate-200 bg-blue-700 text-white">
                  <th colSpan={3} className="px-4 py-2 text-center text-sm font-bold uppercase tracking-wide">
                    Détails des tâches réalisées
                  </th>
                </tr>
              ) : null}
              <tr className="border-b border-slate-200 bg-blue-600 text-white">
                <th className="w-12 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide">
                  {ommpUi ? 'N°' : '#'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">
                  {ommpUi ? 'Tâches réalisées — description technique' : 'Task description'}
                </th>
                <th className="w-24 px-3 py-3 text-center text-xs font-bold uppercase tracking-wide">
                  {ommpUi ? 'Réalisée' : 'Done'}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((task: any, index: number) => (
                <tr key={index} className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                  <td className="px-3 py-3 text-center font-semibold text-blue-700">{index + 1}</td>
                  <td
                    className={`px-4 py-3 ${task.completed && !ommpUi ? 'text-slate-500 line-through' : ''}`}
                  >
                    {task.description}
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {task.completed ? (ommpUi ? 'Oui' : 'Yes') : ommpUi ? 'Non' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Findings */}
        {data.findings && (
          <div className="mb-8 rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900">
              {ommpUi ? 'Problèmes détectés' : 'Technical findings'}
            </div>
            <p className="whitespace-pre-wrap p-4 leading-relaxed text-slate-700">{data.findings}</p>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50/50">
            <div className="border-b border-amber-200 bg-amber-100/80 px-4 py-2 text-sm font-bold text-amber-950">
              {ommpUi ? 'Recommandations' : 'Recommendations'}
            </div>
            <p className="whitespace-pre-wrap p-4 leading-relaxed text-slate-700">{data.recommendations}</p>
          </div>
        )}

        {data.problemes_et_recommandations ? (
          <div className="mb-8 rounded-lg border border-slate-300 bg-slate-50">
            <div className="border-b border-slate-300 bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900">
              Problèmes & recommandations
            </div>
            <p className="whitespace-pre-wrap p-4 leading-relaxed text-slate-800">
              {data.problemes_et_recommandations}
            </p>
          </div>
        ) : null}

        {/* Notes */}
        {data.notes && (
          <div className="mb-8 rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold text-slate-900">
              {ommpUi ? 'Notes complémentaires' : 'Additional notes'}
            </div>
            <p className="whitespace-pre-wrap p-4 leading-relaxed text-slate-700">{data.notes}</p>
          </div>
        )}
      </div>

      {/* Signature Canvas */}
      <div className="rounded-xl bg-white p-8 shadow-lg">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Technician signature</h3>
        <SignatureCanvas onSignature={setSignature} />
      </div>

      {/* Export Options */}
      <div className="rounded-xl bg-white p-8 shadow-lg">
        <h3 className="mb-2 text-xl font-bold text-slate-900">Export report</h3>
        <p className="mb-6 text-sm text-slate-600">
          HTML, PDF et Word reprennent la même structure OMMP quand les champs projet ou résumé sont présents. JSON
          pour sauvegardes ou intégrations.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Button
            onClick={handleExportText}
            className="rounded-lg bg-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Export as text (.txt)
          </Button>
          <Button
            onClick={handleExportHtml}
            className="rounded-lg bg-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Export as HTML
          </Button>
          <Button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="rounded-lg bg-red-700 px-6 py-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {pdfLoading ? '…' : 'Export PDF (.pdf)'}
          </Button>
          <Button
            onClick={handleExportDocx}
            disabled={docxLoading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {docxLoading ? 'Building…' : 'Export Word (.docx)'}
          </Button>
          <Button
            onClick={handleExportJSON}
            className="rounded-lg bg-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-700"
          >
            Export as JSON
          </Button>
        </div>
      </div>
    </div>
  );
}

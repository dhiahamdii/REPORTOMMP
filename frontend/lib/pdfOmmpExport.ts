import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportExportData } from '@/lib/reportExport';

interface Doc extends jsPDF {
  lastAutoTable?: { finalY: number };
}

function frDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

function T(s: string): string {
  return String(s ?? '').replace(/\r/g, '');
}

function imgFmt(url: string): 'PNG' | 'JPEG' {
  return /^data:image\/jpe?g/i.test(url) ? 'JPEG' : 'PNG';
}

function pasteLogo(doc: Doc, url: string | null | undefined, x: number, top: number, w: number, h: number) {
  if (!url?.startsWith('data:image')) return;
  const c = url.indexOf(',');
  if (c < 0) return;
  try {
    doc.addImage(url.slice(c + 1).trim(), imgFmt(url), x, top, w, h, undefined, 'FAST');
  } catch {
    //
  }
}

function ny(doc: Doc, gap = 20): number {
  return doc.lastAutoTable?.finalY != null ? doc.lastAutoTable.finalY + gap : 80;
}

function dashCell(s: string | undefined): string {
  const t = T(String(s ?? '')).trim();
  return t || '—';
}

export function downloadOmmpPdf(data: ReportExportData, reportId: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) as Doc;
  const W = doc.internal.pageSize.getWidth();
  const m = 40;
  const ref = T(data.reference_intervention_suggeree || reportId);
  const ommp = !!(data.project_title || data.objectif_intervention || data.resume);

  let cur = m;
  const Lh = 48;
  const Lw = 104;
  pasteLogo(doc, data.companyLogo, m, cur - 8, Lw, Lh);
  pasteLogo(doc, data.clientLogo, W - m - Lw, cur - 8, Lw, Lh);
  cur += Lh + 14;

  doc.setFont('helvetica', 'bold');

  if (!ommp) {
    doc.setFontSize(14);
    doc.text('MAINTENANCE REPORT', W / 2, cur, { align: 'center' });
    cur += 17;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${T('Ref: ')}${ref}`, W / 2, cur, { align: 'center' });
    doc.setTextColor(17, 24, 39);
    cur += 28;
  }

  if (!ommp && data.project_title?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(T('DESIGNATION PROJET (OMMP)'), m, cur);
    cur += 12;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(T(data.project_title), W - 2 * m);
    doc.text(lines, m, cur);
    cur += lines.length * 10 + 14;
  }

  if (!ommp && data.objectif_intervention?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(T("OBJECTIF DE L'INTERVENTION"), m, cur);
    cur += 12;
    doc.setFont('helvetica', 'normal');
    const ol = doc.splitTextToSize(T(data.objectif_intervention), W - 2 * m);
    doc.text(ol, m, cur);
    cur += ol.length * 10 + 12;
  }

  const rg = ommp ? T('Fiche de maintenance Préventive') : 'GENERAL INFORMATION';

  if (ommp) {
    autoTable(doc, {
      startY: cur,
      head: [
        [
          {
            content: rg,
            colSpan: 2,
            styles: { halign: 'center', fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
          },
        ],
      ],
      body: [
        [T('Désignation projet'), dashCell(data.project_title)],
        [T('Client / commanditaire'), T(data.clientName)],
        [T('Contrat / référence'), dashCell(data.contract_ref)],
        [T("N° d'intervention"), ref],
        [T("Lieu d'intervention"), T(data.location)],
        ...(data.port_name?.trim() ? [[T('Port (OMMP)'), T(data.port_name)]] : []),
        [T('Date'), T(frDate(data.date))],
        [T('Technicien'), T(data.technician)],
        [T('Contacts sur site'), dashCell(data.contacts_site)],
        [T('Contacts intervention (Huawei / Waycon)'), dashCell(data.contacts_intervention)],
        [T("Objectif de l'intervention"), dashCell(data.objectif_intervention)],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 150 }, 1: { cellWidth: 'auto' as unknown as number } },
      margin: { left: m, right: m },
      didParseCell(dataCell) {
        if (dataCell.section === 'body' && dataCell.column.index === 0) {
          dataCell.cell.styles.fillColor = [248, 250, 252];
        }
      },
    });
  } else {
    autoTable(doc, {
      startY: cur,
      head: [
        [
          {
            content: rg,
            colSpan: 2,
            styles: { halign: 'center', fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
          },
        ],
      ],
      body: [
        ['Client', T(data.clientName)],
        ['Location', T(data.location)],
        ...(data.port_name?.trim() ? [[T('Port (OMMP)'), T(data.port_name)]] : []),
        ['Date', T(frDate(data.date))],
        ['Technician', T(data.technician)],
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 140 }, 1: { cellWidth: 'auto' as unknown as number } },
      margin: { left: m, right: m },
      didParseCell(dataCell) {
        if (
          dataCell.section === 'body' &&
          dataCell.column.index === 0 &&
          dataCell.cell.raw?.toString() !== rg
        ) {
          dataCell.cell.styles.fillColor = [248, 250, 252];
        }
      },
    });
  }

  let y = ny(doc);

  const sum = T((data.resume || data.executive_summary || '').trim());
  if (sum) {
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [[ommp ? 'RÉSUMÉ' : 'EXECUTIVE SUMMARY']],
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      body: [[sum]],
      styles: { fontSize: 9 },
      margin: { left: m, right: m },
    });
    y = ny(doc);
  }

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: ommp
      ? [
          [
            {
              content: T('DÉTAILS DES TÂCHES RÉALISÉES'),
              colSpan: 3,
              styles: { halign: 'center', fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
            },
          ],
          [T('N°'), T('Description technique'), T('Réalisée')],
        ]
      : [['#', 'Description', 'Done']],
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 26, halign: 'center' }, 2: { cellWidth: 44, halign: 'center' } },
    body: data.tasks.map((t, i) => [
      String(i + 1),
      T(t.description),
      T(t.completed ? (ommp ? 'Oui' : 'Yes') : ommp ? 'Non' : 'No'),
    ]),
    margin: { left: m, right: m },
  });

  y = ny(doc);

  type Sec = [string, string | undefined, [number, number, number], boolean];
  const sections: Sec[] = [
    [ommp ? T('PROBLÈMES DÉTECTÉS') : 'TECHNICAL FINDINGS', data.findings, [71, 85, 105], true],
    [ommp ? T('RECOMMANDATIONS') : 'RECOMMENDATIONS', data.recommendations, [180, 83, 9], true],
    ['PROBLÈMES & RECOMMANDATIONS', data.problemes_et_recommandations, [71, 85, 105], true],
    [ommp ? T('NOTES COMPLÉMENTAIRES') : 'ADDITIONAL NOTES', data.notes, [226, 232, 240], false],
  ];

  for (const [title, text, rgb, invert] of sections) {
    const body = text?.trim();
    if (!body) continue;
    if (y > doc.internal.pageSize.getHeight() - 80) doc.addPage();
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [[title]],
      headStyles: invert
        ? { fillColor: rgb, textColor: 255, fontStyle: 'bold' }
        : { fillColor: rgb, textColor: 30, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      body: [[T(body)]],
      margin: { left: m, right: m },
    });
    y = ny(doc);
  }

  if (ommp) {
    if (y > doc.internal.pageSize.getHeight() - 100) doc.addPage();
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      head: [[T('SIGNATURE')]],
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      body: [[data.signature_image?.startsWith('data:image') ? ' ' : '—']],
      styles: { fontSize: 9, minCellHeight: data.signature_image?.startsWith('data:image') ? 64 : 14 },
      margin: { left: m, right: m },
      didDrawCell(hook) {
        if (
          hook.section === 'body' &&
          hook.column.index === 0 &&
          data.signature_image?.startsWith('data:image')
        ) {
          const pad = 6;
          pasteLogo(doc, data.signature_image, hook.cell.x + pad, hook.cell.y + pad, 160, 48);
        }
      },
    });
    y = ny(doc);
  }

  if (y > doc.internal.pageSize.getHeight() - 28) doc.addPage();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    ommp
      ? `${T('Document généré le')} ${T(new Date().toLocaleString('fr-FR'))}`
      : `${T('Generated')} ${T(new Date().toLocaleString())} · ${ref}`,
    m,
    Math.min(y + 8, doc.internal.pageSize.getHeight() - 16)
  );
  doc.save(`report_${ref.replace(/[^\w\-]+/g, '_').slice(0, 160)}.pdf`);
}

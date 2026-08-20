import type { FileChild } from 'docx';

/** Shape used by report preview + exports */
export interface ReportExportData {
  clientName: string;
  location: string;
  date: string;
  technician: string;
  tasks: { description: string; completed: boolean }[];
  notes?: string;
  executive_summary?: string;
  findings?: string;
  recommendations?: string;
  /** Bloc OMMP / Huawei-Waycon */
  port_name?: string;
  project_title?: string;
  objectif_intervention?: string;
  resume?: string;
  problemes_et_recommandations?: string;
  reference_intervention_suggeree?: string;
  companyLogo?: string | null;
  clientLogo?: string | null;
  /** Référence contrat / marché */
  contract_ref?: string;
  /** Contacts sur site (texte multi-lignes) */
  contacts_site?: string;
  /** Contacts intervention Huawei / Waycon */
  contacts_intervention?: string;
  /** Signature technicien (data URL image) */
  signature_image?: string | null;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, '<br/>');
}

function formatDateDisplay(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

/** HTML document with table layout (opens in Word; printable to PDF) */
export function buildReportHtmlDoc(data: ReportExportData, reportId: string): string {
  const border = 'border:1px solid #cbd5e1;padding:8px 12px;vertical-align:top;';
  const th = 'background:#1e40af;color:#fff;font-weight:bold;text-align:left;padding:8px 12px;border:1px solid #1e40af;';

  const optionalBlock = (title: string, body: string | undefined) =>
    body
      ? `<table style="width:100%;border-collapse:collapse;margin-top:20px;">
        <tr><th colspan="2" style="${th}">${escapeHtml(title)}</th></tr>
        <tr><td colspan="2" style="${border}">${escapeHtml(body)}</td></tr>
      </table>`
      : '';

  const logoCell = (align: 'left' | 'right', src: string | null | undefined, alt: string) =>
    `<td style="width:22%;${border}text-align:${align};">
      ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="max-height:56px;max-width:100%;object-fit:contain;display:inline-block;" />` : '&nbsp;'}
    </td>`;

  const ommpStyle = !!(data.project_title || data.objectif_intervention || data.resume);

  const refLine = (compact: boolean) =>
    `<div style="text-align:center;font-size:12px;color:#64748b;margin-top:${compact ? 4 : 6}px;font-family:monospace;">
      Réf. : ${escapeHtml(data.reference_intervention_suggeree || reportId)}
    </div>`;

  /** Logos : OMMP à gauche, Huawei à droite (toujours affichés) */
  const headerLogosOmmp = `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr>
            ${logoCell('left', data.companyLogo, 'OMMP')}
            <td style="width:56%;${border};text-align:center;vertical-align:middle">&nbsp;</td>
            ${logoCell('right', data.clientLogo, 'Huawei')}
          </tr>
        </table>`;

  const titreBandeNonOmmp =
    `<div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:22px;font-weight:bold;color:#1e40af;">
        MAINTENANCE REPORT
      </div>
      ${refLine(false)}
    </div>`;

  const headerLogosClassique = `<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <tr>
            ${logoCell('left', data.companyLogo, 'OMMP')}
            <td style="width:56%;${border};text-align:center;vertical-align:middle">${titreBandeNonOmmp}</td>
            ${logoCell('right', data.clientLogo, 'Huawei')}
          </tr>
        </table>`;

  const enTetePrincipal = ommpStyle ? headerLogosOmmp : headerLogosClassique;

  const thCenter = `${th};text-align:center;`;

  const dash = (s: string | undefined) => {
    const t = (s ?? '').trim();
    return t ? escapeHtml(t) : '—';
  };

  /** Fiche préventive : tout le bloc d’en-tête OMMP dans un seul tableau */
  const fichePreventiveTableOmmp = `<table class="doc" style="margin-bottom:16px;">
    <tr><th colspan="2" style="${thCenter}">Fiche de maintenance Préventive</th></tr>
    <tr><th style="${th}">Désignation projet</th><td style="${border}">${dash(data.project_title)}</td></tr>
    <tr><th style="${th}">Client / commanditaire</th><td style="${border}">${dash(data.clientName)}</td></tr>
    <tr><th style="${th}">Contrat / référence</th><td style="${border}">${dash(data.contract_ref)}</td></tr>
    <tr><th style="${th}">N° d&apos;intervention</th><td style="${border}">${escapeHtml(data.reference_intervention_suggeree || reportId)}</td></tr>
    <tr><th style="${th}">Lieu d&apos;intervention</th><td style="${border}">${dash(data.location)}</td></tr>
    ${data.port_name?.trim() ? `<tr><th style="${th}">Port (OMMP)</th><td style="${border}">${escapeHtml(data.port_name)}</td></tr>` : ''}
    <tr><th style="${th}">Date</th><td style="${border}">${escapeHtml(formatDateDisplay(data.date))}</td></tr>
    <tr><th style="${th}">Technicien</th><td style="${border}">${dash(data.technician)}</td></tr>
    <tr><th style="${th}">Contacts sur site</th><td style="${border}">${dash(data.contacts_site)}</td></tr>
    <tr><th style="${th}">Contacts intervention (Huawei / Waycon)</th><td style="${border}">${dash(data.contacts_intervention)}</td></tr>
    <tr><th style="${th}">Objectif de l&apos;intervention</th><td style="${border}">${dash(data.objectif_intervention)}</td></tr>
  </table>`;

  const resumeBloc =
    data.resume || data.executive_summary
      ? optionalBlock('RÉSUMÉ', (data.resume || data.executive_summary) ?? '')
      : '';

  const clientBloc = `
    <tr><th style="${th}">${ommpStyle ? 'COMMANDITAIRE / ORGANISME' : 'Client'}</th><td style="${border}">${escapeHtml(data.clientName)}</td></tr>
    <tr><th style="${th}">${ommpStyle ? 'SITE / ZONE PORTUAIRE' : 'Location'}</th><td style="${border}">${escapeHtml(data.location)}</td></tr>
    ${data.port_name ? `<tr><th style="${th}">PORT (OMMP)</th><td style="${border}">${escapeHtml(data.port_name)}</td></tr>` : ''}
    <tr><th style="${th}">${ommpStyle ? 'DATE INTERVENTION' : 'Date'}</th><td style="${border}">${escapeHtml(formatDateDisplay(data.date))}</td></tr>
    <tr><th style="${th}">${ommpStyle ? 'TECHNICIEN' : 'Technician'}</th><td style="${border}">${escapeHtml(data.technician)}</td></tr>
  `;

  const tasksTitle = ommpStyle ? 'DÉTAILS DES TÂCHES RÉALISÉES' : 'TASKS PERFORMED';

  const taskHeader = `<tr>
    <th style="${th.replace('text-align:left', 'text-align:center;width:48px')}">N°</th>
    <th style="${th}">${ommpStyle ? 'Description technique' : 'Task description'}</th>
    <th style="${th.replace('text-align:left', 'text-align:center;width:80px')}">${ommpStyle ? 'Réalisée' : 'Done'}</th>
  </tr>`;

  const taskRows = data.tasks
    .map(
      (t, i) => `<tr>
      <td style="${border}text-align:center;font-weight:600;">${i + 1}</td>
      <td style="${border}">${escapeHtml(t.description)}</td>
      <td style="${border}text-align:center;">${t.completed ? (ommpStyle ? 'Oui' : 'Yes') : ommpStyle ? 'Non' : 'No'}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${ommpStyle ? 'fr' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>Maintenance Report ${escapeHtml(reportId)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 32px 40px; background: #f8fafc; color: #0f172a; }
    .wrap { max-width: 900px; margin: 0 auto; background: #fff; padding: 36px 40px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
    table.doc { width: 100%; border-collapse: collapse; }
    @media print {
      body { background: #fff; padding: 0; }
      .wrap { box-shadow: none; padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    ${enTetePrincipal}
    ${ommpStyle ? fichePreventiveTableOmmp : ''}
    ${!ommpStyle ? `<table class="doc" style="margin-bottom:8px;">
      <tr><th colspan="2" style="${th}">CLIENT INFORMATION</th></tr>
      ${clientBloc}
    </table>` : ''}

    ${resumeBloc}

    <table class="doc" style="margin-top:20px;">
      <tr><th colspan="3" style="${th}">${tasksTitle}</th></tr>
      ${taskHeader}
      ${taskRows}
    </table>

    ${data.findings ? optionalBlock(ommpStyle ? 'PROBLÈMES DÉTECTÉS' : 'TECHNICAL FINDINGS', data.findings) : ''}
    ${data.recommendations ? optionalBlock(ommpStyle ? 'RECOMMANDATIONS' : 'RECOMMENDATIONS', data.recommendations) : ''}
    ${data.problemes_et_recommandations ? optionalBlock('PROBLÈMES & RECOMMANDATIONS', data.problemes_et_recommandations) : ''}
    ${data.notes ? optionalBlock(ommpStyle ? 'NOTES COMPLÉMENTAIRES' : 'ADDITIONAL NOTES', data.notes) : ''}
    ${
      data.signature_image?.startsWith('data:image')
        ? `<table style="width:100%;border-collapse:collapse;margin-top:24px;">
        <tr><th colspan="2" style="${th}">SIGNATURE</th></tr>
        <tr><td colspan="2" style="${border};text-align:center;padding:16px;">
          <img src="${escapeHtml(data.signature_image)}" alt="Signature" style="max-height:120px;max-width:100%;" />
        </td></tr>
      </table>`
        : ommpStyle
          ? optionalBlock('SIGNATURE', '—')
          : ''
    }

    <p style="margin-top:28px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px;">
      ${
        ommpStyle
          ? `Document généré le ${escapeHtml(new Date().toLocaleString('fr-FR'))}`
          : `Generated ${escapeHtml(new Date().toLocaleString())} · ${escapeHtml(data.reference_intervention_suggeree || reportId)}`
      }
    </p>
  </div>
</body>
</html>`;
}

function parseDataUrlImage(dataUrl: string | null | undefined): {
  type: 'png' | 'jpg' | 'gif' | 'bmp';
  data: Uint8Array;
} | null {
  if (!dataUrl?.startsWith('data:image/')) return null;
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/i);
  if (!match || !match[2]) return null;
  const raw = match[1].toLowerCase();
  const kind = raw === 'jpeg' ? 'jpg' : raw;
  if (kind !== 'png' && kind !== 'jpg' && kind !== 'gif' && kind !== 'bmp') return null;
  try {
    const binary = atob(match[2]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return { type: kind as 'png' | 'jpg' | 'gif' | 'bmp', data: bytes };
  } catch {
    return null;
  }
}

/** Generate .docx via dynamic import (browser-safe) */
export async function downloadReportDocx(
  data: ReportExportData,
  reportId: string,
): Promise<void> {
  const { resolveReportLogos } = await import('@/lib/reportLogos');
  data = await resolveReportLogos(data);
  const docx = await import('docx');
  const { saveAs } = await import('file-saver');

  const {
    Document,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    AlignmentType,
    ImageRun,
    BorderStyle,
    Packer,
    TextRun,
    VerticalAlignTable,
    TableLayoutType,
  } = docx;

  /** Docx widths use twentieths of a point (DXA): ~9360 ~= 6.5" usable on Letter with normal margins */
  const BODY_TWIP = 9360;
  /** Standard body text — half-points (Word convention): 24 → 12pt */
  const RUN_SIZE_PT12 = 24;
  /** Slightly tighter label column keeps values readable full-width */
  const COL_CLIENT_LABEL = 2400;
  const COL_CLIENT_VALUE = BODY_TWIP - COL_CLIENT_LABEL;
  const COL_LOGO_SIDE = Math.round(BODY_TWIP * 0.26);
  const COL_LOGO_CENTER = BODY_TWIP - 2 * COL_LOGO_SIDE;
  const COL_TASK_IDX = 800;
  const COL_TASK_DONE = 1000;
  const COL_TASK_DESC = BODY_TWIP - COL_TASK_IDX - COL_TASK_DONE;
  /** Cell padding (~9pt) reads normal; tiny values crunch the grid */
  const PAD = { top: 200, bottom: 200, left: 220, right: 220 };
  /** Full-width table preset so Word stops auto-fitting (“compressed”) layouts */
  const fullTableOpts = (
    cols: readonly [number, number] | readonly [number, number, number]
  ) => ({
    layout: TableLayoutType.FIXED,
    width: { size: BODY_TWIP, type: WidthType.DXA },
    columnWidths: [...cols],
  });

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
  };

  const headerBlue = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '1E40AF' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '1E40AF' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '1E40AF' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '1E40AF' },
  };

  const children: FileChild[] = [];
  const refFinal = data.reference_intervention_suggeree || reportId;
  const ommpDocx = !!(
    data.project_title?.trim() ||
      data.objectif_intervention?.trim() ||
      data.resume?.trim() ||
      data.executive_summary?.trim()
  );
  /** Libellés bilingues document Word */
  const L = (fr: string, en: string) => (ommpDocx ? fr : en);

  const companyImg = parseDataUrlImage(data.companyLogo ?? undefined);
  const clientImg = parseDataUrlImage(data.clientLogo ?? undefined);

  {
    const leftPara = new Paragraph({
      alignment: AlignmentType.LEFT,
      children: companyImg
        ? [
            new ImageRun({
              type: companyImg.type,
              data: companyImg.data,
              transformation: { width: 160, height: 72 },
            }),
          ]
        : [new TextRun('')],
    });
    const midPara = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: ommpDocx
        ? [new TextRun({ text: '\u00A0', size: 20 })]
        : [
            new TextRun({
              text: L('RAPPORT TECHNIQUE OMMP / HUAWEI-WAYCON', 'MAINTENANCE REPORT'),
              bold: true,
              size: 40,
            }),
          ],
    });
    const midPara2 = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: ommpDocx
        ? [new TextRun({ text: '\u00A0', size: 20 })]
        : [
            new TextRun({
              text: ommpDocx ? `Réf. : ${refFinal}` : refFinal,
              size: 20,
              font: 'Calibri',
              color: '64748B',
            }),
          ],
    });
    const rightPara = new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: clientImg
        ? [
            new ImageRun({
              type: clientImg.type,
              data: clientImg.data,
              transformation: { width: 160, height: 72 },
            }),
          ]
        : [new TextRun('')],
    });

    children.push(
      new Table({
        ...fullTableOpts([COL_LOGO_SIDE, COL_LOGO_CENTER, COL_LOGO_SIDE]),
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: COL_LOGO_SIDE, type: WidthType.DXA },
                verticalAlign: VerticalAlignTable.CENTER,
                margins: PAD,
                borders: cellBorder,
                children: [leftPara],
              }),
              new TableCell({
                width: { size: COL_LOGO_CENTER, type: WidthType.DXA },
                verticalAlign: VerticalAlignTable.CENTER,
                margins: PAD,
                borders: cellBorder,
                children: [midPara, midPara2],
              }),
              new TableCell({
                width: { size: COL_LOGO_SIDE, type: WidthType.DXA },
                verticalAlign: VerticalAlignTable.CENTER,
                margins: PAD,
                borders: cellBorder,
                children: [rightPara],
              }),
            ],
          }),
        ],
      })
    );
    if (ommpDocx) {
      children.push(new Paragraph({ text: '' }));
    }
  }

  if (!ommpDocx && data.project_title?.trim()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: 'DESIGNATION PROJET (OMMP)',
        spacing: { before: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: data.project_title.trim(), size: RUN_SIZE_PT12 })],
      })
    );
  }
  if (!ommpDocx && data.objectif_intervention?.trim()) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: "OBJECTIF DE L'INTERVENTION",
        spacing: { before: 200 },
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [new TextRun({ text: data.objectif_intervention.trim(), size: RUN_SIZE_PT12 })],
      })
    );
  }

  const labelCell = (label: string) =>
    new TableCell({
      shading: { fill: '1E40AF' },
      margins: PAD,
      width: { size: COL_CLIENT_LABEL, type: WidthType.DXA },
      borders: headerBlue,
      verticalAlign: VerticalAlignTable.CENTER,
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: label, bold: true, color: 'FFFFFF', size: RUN_SIZE_PT12 }),
          ],
        }),
      ],
    });

  const valueCell = (val: string) =>
    new TableCell({
      margins: PAD,
      width: { size: COL_CLIENT_VALUE, type: WidthType.DXA },
      borders: cellBorder,
      verticalAlign: VerticalAlignTable.TOP,
      children: [
        new Paragraph({
          children: [new TextRun({ text: val, size: RUN_SIZE_PT12 })],
        }),
      ],
    });

  const dashDoc = (s?: string) => (s?.trim() ? s : '—');

  const clientRowsDocx = ommpDocx
    ? [
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              shading: { fill: '1E40AF' },
              margins: PAD,
              borders: headerBlue,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'Fiche de maintenance Préventive',
                      bold: true,
                      color: 'FFFFFF',
                      size: 28,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [labelCell('Désignation projet'), valueCell(data.project_title?.trim() || '—')],
        }),
        new TableRow({
          children: [labelCell('Client / commanditaire'), valueCell(data.clientName)],
        }),
        new TableRow({
          children: [labelCell('Contrat / référence'), valueCell(dashDoc(data.contract_ref))],
        }),
        new TableRow({
          children: [labelCell("N° d'intervention"), valueCell(refFinal)],
        }),
        new TableRow({
          children: [labelCell("Lieu d'intervention"), valueCell(data.location)],
        }),
        ...(data.port_name?.trim()
          ? [new TableRow({ children: [labelCell('Port (OMMP)'), valueCell(data.port_name.trim())] })]
          : []),
        new TableRow({
          children: [labelCell('Date'), valueCell(formatDateDisplay(data.date))],
        }),
        new TableRow({
          children: [labelCell('Technicien'), valueCell(data.technician)],
        }),
        new TableRow({
          children: [labelCell('Contacts sur site'), valueCell(dashDoc(data.contacts_site))],
        }),
        new TableRow({
          children: [
            labelCell('Contacts intervention (Huawei / Waycon)'),
            valueCell(dashDoc(data.contacts_intervention)),
          ],
        }),
        new TableRow({
          children: [labelCell("Objectif de l'intervention"), valueCell(dashDoc(data.objectif_intervention))],
        }),
      ]
    : [
        new TableRow({
          children: [
            labelCell(L('COMMANDITAIRE / ORGANISME', 'Client')),
            valueCell(data.clientName),
          ],
        }),
        new TableRow({
          children: [
            labelCell(L('SITE / ZONE PORTUAIRE', 'Location')),
            valueCell(data.location),
          ],
        }),
      ];

  if (!ommpDocx && data.port_name?.trim()) {
    clientRowsDocx.push(
      new TableRow({
        children: [labelCell('PORT (OMMP)'), valueCell(data.port_name.trim())],
      })
    );
  }

  if (!ommpDocx) {
    clientRowsDocx.push(
      new TableRow({
        children: [
          labelCell(L('DATE INTERVENTION', 'Date')),
          valueCell(formatDateDisplay(data.date)),
        ],
      }),
      new TableRow({
        children: [labelCell(L('TECHNICIEN', 'Technician')), valueCell(data.technician)],
      })
    );
  }

  if (ommpDocx) {
    children.push(
      new Table({
        ...fullTableOpts([COL_CLIENT_LABEL, COL_CLIENT_VALUE]),
        rows: clientRowsDocx,
      })
    );
  } else {
    children.push(
      new Paragraph({
        text: L('RENSEIGNEMENTS GÉNÉRAUX', 'CLIENT INFORMATION'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200 },
      }),
      new Table({
        ...fullTableOpts([COL_CLIENT_LABEL, COL_CLIENT_VALUE]),
        rows: clientRowsDocx,
      })
    );
  }

  const resumeBody = (data.resume?.trim() || data.executive_summary?.trim()) ?? '';
  if (resumeBody) {
    children.push(
      new Paragraph({
        text: L('RÉSUMÉ', 'Executive summary'),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240 },
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [new TextRun({ text: resumeBody, size: RUN_SIZE_PT12 })],
      })
    );
  }

  const taskRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: COL_TASK_IDX, type: WidthType.DXA },
          shading: { fill: '1E40AF' },
          borders: headerBlue,
          margins: PAD,
          verticalAlign: VerticalAlignTable.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: ommpDocx ? 'N°' : '#',
                  bold: true,
                  color: 'FFFFFF',
                  size: RUN_SIZE_PT12,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: COL_TASK_DESC, type: WidthType.DXA },
          shading: { fill: '1E40AF' },
          borders: headerBlue,
          margins: PAD,
          verticalAlign: VerticalAlignTable.CENTER,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: L('Description technique', 'Task description'),
                  bold: true,
                  color: 'FFFFFF',
                  size: RUN_SIZE_PT12,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: COL_TASK_DONE, type: WidthType.DXA },
          shading: { fill: '1E40AF' },
          borders: headerBlue,
          margins: PAD,
          verticalAlign: VerticalAlignTable.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: L('Réalisée', 'Done'),
                  bold: true,
                  color: 'FFFFFF',
                  size: RUN_SIZE_PT12,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    ...data.tasks.map(
      (t, i) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: COL_TASK_IDX, type: WidthType.DXA },
              borders: cellBorder,
              margins: PAD,
              verticalAlign: VerticalAlignTable.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: String(i + 1), size: RUN_SIZE_PT12 }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: COL_TASK_DESC, type: WidthType.DXA },
              borders: cellBorder,
              margins: PAD,
              verticalAlign: VerticalAlignTable.TOP,
              children: [
                new Paragraph({
                  alignment: AlignmentType.BOTH,
                  children: [
                    new TextRun({
                      text: t.description,
                      size: RUN_SIZE_PT12,
                      strike: t.completed ? true : undefined,
                      italics: t.completed ? true : undefined,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: COL_TASK_DONE, type: WidthType.DXA },
              borders: cellBorder,
              margins: PAD,
              verticalAlign: VerticalAlignTable.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text:
                        t.completed
                          ? ommpDocx
                            ? 'Oui'
                            : 'Yes'
                          : ommpDocx
                            ? 'Non'
                            : 'No',
                      size: RUN_SIZE_PT12,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
    ),
  ];

  children.push(
    new Paragraph({
      text: L('DÉTAILS DES TÂCHES RÉALISÉES', 'Work performed'),
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280 },
    }),
    new Table({
      ...fullTableOpts([COL_TASK_IDX, COL_TASK_DESC, COL_TASK_DONE]),
      rows: taskRows,
    })
  );

  const addSection = (title: string, body: string | undefined) => {
    if (!body?.trim()) return;
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240 },
      }),
      new Paragraph({
        alignment: AlignmentType.BOTH,
        children: [new TextRun({ text: body, size: RUN_SIZE_PT12 })],
      })
    );
  };

  addSection(L('PROBLÈMES DÉTECTÉS', 'Technical findings'), data.findings);
  addSection(L('RECOMMANDATIONS', 'Recommendations'), data.recommendations);
  if (data.problemes_et_recommandations?.trim()) {
    addSection('PROBLÈMES & RECOMMANDATIONS', data.problemes_et_recommandations);
  }
  addSection(L('NOTES COMPLÉMENTAIRES', 'Additional notes'), data.notes);

  const sigDoc = parseDataUrlImage(data.signature_image ?? undefined);
  if (sigDoc) {
    children.push(
      new Paragraph({
        text: 'SIGNATURE',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280 },
      }),
      new Paragraph({
        children: [
          new ImageRun({
            type: sigDoc.type,
            data: sigDoc.data,
            transformation: { width: 280, height: 110 },
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [
        new TextRun({
          text: ommpDocx
            ? `Document généré le ${new Date().toLocaleString('fr-FR')}`
            : `Generated ${new Date().toLocaleString()} · ${refFinal}`,
          size: 20,
          color: '94A3B8',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `report_${reportId}.docx`);
}

import type { ReportExportData } from '@/lib/reportExport';

/** Chemins publics (fichiers copiés depuis backend/src) */
export const OMMP_LOGO_URL = '/logos/logo-ommp.jpeg';
export const HUAWEI_LOGO_URL = '/logos/huawei.png';

let cachedDataUrls: { companyLogo: string; clientLogo: string } | null = null;

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Logo introuvable: ${url}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Lecture logo échouée'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/** Charge OMMP (gauche) et Huawei (droite) en data URL pour PDF / Word. */
export async function getDefaultReportLogos(): Promise<{
  companyLogo: string;
  clientLogo: string;
}> {
  if (cachedDataUrls) return cachedDataUrls;
  const [companyLogo, clientLogo] = await Promise.all([
    urlToDataUrl(OMMP_LOGO_URL),
    urlToDataUrl(HUAWEI_LOGO_URL),
  ]);
  cachedDataUrls = { companyLogo, clientLogo };
  return cachedDataUrls;
}

/** Applique les logos par défaut si l’utilisateur n’en a pas fourni d’autres. */
export function withDefaultReportLogos(
  data: ReportExportData,
  defaults: { companyLogo: string; clientLogo: string },
): ReportExportData {
  return {
    ...data,
    companyLogo: data.companyLogo?.trim() ? data.companyLogo : defaults.companyLogo,
    clientLogo: data.clientLogo?.trim() ? data.clientLogo : defaults.clientLogo,
  };
}

export async function resolveReportLogos(data: ReportExportData): Promise<ReportExportData> {
  const defaults = await getDefaultReportLogos();
  return withDefaultReportLogos(data, defaults);
}

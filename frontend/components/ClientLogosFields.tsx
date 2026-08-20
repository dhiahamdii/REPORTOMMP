'use client';

import { Label } from '@/components/ui/label';
import { getDefaultReportLogos, HUAWEI_LOGO_URL, OMMP_LOGO_URL } from '@/lib/reportLogos';

export interface ClientLogosFieldsProps {
  companyLogo: string | null;
  clientLogo: string | null;
  onCompanyLogoChange: (dataUrl: string | null) => void;
  onClientLogoChange: (dataUrl: string | null) => void;
}

function readImageFile(
  file: File | undefined,
  onResult: (dataUrl: string | null) => void,
) {
  if (!file) {
    onResult(null);
    return;
  }
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') onResult(reader.result);
  };
  reader.readAsDataURL(file);
}

export default function ClientLogosFields({
  companyLogo,
  clientLogo,
  onCompanyLogoChange,
  onClientLogoChange,
}: ClientLogosFieldsProps) {
  const ommpSrc = companyLogo || OMMP_LOGO_URL;
  const huaweiSrc = clientLogo || HUAWEI_LOGO_URL;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">En-tête du rapport (logos)</h3>
        <p className="mt-1 text-sm text-slate-600">
          Chaque rapport affiche par défaut le logo <strong>OMMP</strong> en haut à gauche et le logo{' '}
          <strong>Huawei</strong> en haut à droite. Vous pouvez les remplacer par un autre fichier si
          besoin.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company-logo">Logo OMMP (haut gauche)</Label>
          <div className="mb-2 flex min-h-[56px] items-center rounded border border-slate-200 bg-white p-2">
            <img src={ommpSrc} alt="OMMP" className="max-h-14 max-w-full object-contain" />
          </div>
          <input
            id="company-logo"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-300"
            onChange={e => readImageFile(e.target.files?.[0], onCompanyLogoChange)}
          />
          {companyLogo ? (
            <button
              type="button"
              onClick={() => {
                void getDefaultReportLogos().then(({ companyLogo: url }) =>
                  onCompanyLogoChange(url),
                );
              }}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Rétablir le logo OMMP par défaut
            </button>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-logo">Logo Huawei (haut droite)</Label>
          <div className="mb-2 flex min-h-[56px] items-center justify-end rounded border border-slate-200 bg-white p-2">
            <img src={huaweiSrc} alt="Huawei" className="max-h-14 max-w-full object-contain" />
          </div>
          <input
            id="client-logo"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-300"
            onChange={e => readImageFile(e.target.files?.[0], onClientLogoChange)}
          />
          {clientLogo ? (
            <button
              type="button"
              onClick={() => {
                void getDefaultReportLogos().then(({ clientLogo: url }) =>
                  onClientLogoChange(url),
                );
              }}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Rétablir le logo Huawei par défaut
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

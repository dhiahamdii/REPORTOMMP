'use client';

import AppHeader from '@/components/AppHeader';
import ObjectiveManager from '@/components/ObjectiveManager';
import PortManager from '@/components/PortManager';
import ReportHistory from '@/components/ReportHistory';

export default function ManagePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10">
        <div>
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-white sm:text-2xl">Historique des rapports</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Tous les rapports générés (formulaire manuel ou IA) sont listés ici uniquement. Vous
              pouvez consulter les tâches et supprimer une entrée.
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
            <ReportHistory />
          </div>
        </div>

        <div>
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Gestion des ports et contacts
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Ajoutez des ports, modifiez les contacts sur site et les contacts Huawei / Waycon. Ces
              données sont reprises automatiquement lors de la création d&apos;un rapport.
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
            <PortManager />
          </div>
        </div>

        <div>
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Objectifs d&apos;intervention
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Catalogue utilisé pour le type d&apos;opération{' '}
              <strong className="text-white">Préventive</strong> (sélection ou saisie libre) et
              comme suggestions pour le type <strong className="text-white">Corrective</strong>.
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
            <ObjectiveManager />
          </div>
        </div>
      </main>
    </div>
  );
}

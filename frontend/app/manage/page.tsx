'use client';

import AppHeader from '@/components/AppHeader';
import PortManager from '@/components/PortManager';

export default function ManagePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Gestion des ports et contacts</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Ajoutez des ports, modifiez les contacts sur site et les contacts Huawei / Waycon. Ces
            données apparaissent dans la liste déroulante lors de la création d&apos;un rapport.
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-lg md:p-8">
          <PortManager />
        </div>
      </main>
    </div>
  );
}

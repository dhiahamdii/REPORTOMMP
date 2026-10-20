'use client';

import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import ManualFormMode from '@/components/ManualFormMode';
import AIInputMode from '@/components/AIInputMode';
import ReportDisplay from '@/components/ReportDisplay';

export default function Home() {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [reportData, setReportData] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const handleFormSubmit = (data: any) => {
    setReportData(data);
    setShowReport(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-12">
        {!showReport ? (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:gap-4">
              <button
                onClick={() => setMode('manual')}
                className={`w-full rounded-lg px-4 py-3 font-semibold transition-all sm:w-auto sm:px-6 ${
                  mode === 'manual'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'border-2 border-slate-300 bg-white text-slate-900 hover:border-blue-600'
                }`}
              >
                Formulaire manuel
              </button>
              <button
                onClick={() => setMode('ai')}
                className={`w-full rounded-lg px-4 py-3 font-semibold transition-all sm:w-auto sm:px-6 ${
                  mode === 'ai'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'border-2 border-slate-300 bg-white text-slate-900 hover:border-blue-600'
                }`}
              >
                Saisie IA
              </button>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-lg sm:p-6 md:p-8">
              {mode === 'manual' ? (
                <ManualFormMode onSubmit={handleFormSubmit} />
              ) : (
                <AIInputMode onSubmit={handleFormSubmit} />
              )}
            </div>
          </>
        ) : (
          <ReportDisplay data={reportData} onBack={() => setShowReport(false)} />
        )}
      </main>
    </div>
  );
}

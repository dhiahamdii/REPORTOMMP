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

      <main className="max-w-7xl mx-auto px-6 py-12">
        {!showReport ? (
          <>
            {/* Mode Selector */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setMode('manual')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  mode === 'manual'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-slate-900 border-2 border-slate-300 hover:border-blue-600'
                }`}
              >
                Manual Form Input
              </button>
              <button
                onClick={() => setMode('ai')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  mode === 'ai'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-slate-900 border-2 border-slate-300 hover:border-blue-600'
                }`}
              >
                AI Text Input
              </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-lg p-8">
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

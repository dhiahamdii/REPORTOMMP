'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { deleteReport, getReports, type Report } from '@/lib/api';

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function formatDateTime(value: string | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function ReportHistory() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getReports();
      setReports(list);
    } catch (e) {
      setReports([]);
      setError(e instanceof Error ? e.message : 'Impossible de charger l’historique.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = async (reportId: string) => {
    if (!window.confirm(`Supprimer le rapport ${reportId} de l’historique ?`)) return;
    setDeletingId(reportId);
    try {
      await deleteReport(reportId);
      setReports(prev => prev.filter(r => r.report_id !== reportId));
      if (expandedId === reportId) setExpandedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Chargement de l’historique…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
        <Button type="button" variant="outline" onClick={() => void reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
        Aucun rapport généré pour le moment. Les rapports créés depuis le formulaire apparaîtront ici.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {reports.length} rapport{reports.length > 1 ? 's' : ''} enregistré
          {reports.length > 1 ? 's' : ''}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
          Actualiser
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {reports.map(r => {
          const open = expandedId === r.report_id;
          return (
            <article
              key={r.report_id}
              className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-all font-mono text-sm font-semibold text-blue-700">
                    {r.report_id}
                  </p>
                  <p className="mt-1 truncate font-medium text-slate-900">
                    {r.client?.name || '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Intervention : {formatDate(r.date)} · Créé : {formatDateTime(r.created_at)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{r.location || '—'}</p>
                </div>
                <span className="shrink-0 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {r.tasks?.length ?? 0} tâche{(r.tasks?.length ?? 0) > 1 ? 's' : ''}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedId(open ? null : r.report_id)}
                >
                  {open ? 'Masquer' : 'Détails'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  disabled={deletingId === r.report_id}
                  onClick={() => void remove(r.report_id)}
                >
                  {deletingId === r.report_id ? '…' : 'Supprimer'}
                </Button>
              </div>
              {open ? (
                <ul className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm text-slate-700">
                  {(r.tasks || []).length === 0 ? (
                    <li className="text-slate-500">Aucune tâche</li>
                  ) : (
                    (r.tasks || []).map((t, i) => (
                      <li key={t.id ?? i} className="flex gap-2">
                        <span className="shrink-0 font-mono text-xs text-blue-600">{i + 1}.</span>
                        <span className="min-w-0 break-words">{t.description}</span>
                      </li>
                    ))
                  )}
                  {r.notes ? (
                    <li className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                      Notes : {r.notes}
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Lieu</th>
              <th className="px-4 py-3">Date intervention</th>
              <th className="px-4 py-3">Créé le</th>
              <th className="px-4 py-3">Tâches</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => {
              const open = expandedId === r.report_id;
              return (
                <Fragment key={r.report_id}>
                  <tr className="border-t border-slate-200 odd:bg-white even:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                      {r.report_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.client?.name || '—'}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-slate-700" title={r.location}>
                      {r.location || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.tasks?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedId(open ? null : r.report_id)}
                        >
                          {open ? 'Masquer' : 'Détails'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          disabled={deletingId === r.report_id}
                          onClick={() => void remove(r.report_id)}
                        >
                          {deletingId === r.report_id ? '…' : 'Supprimer'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-t border-slate-100 bg-blue-50/40">
                      <td colSpan={7} className="px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Tâches réalisées
                        </p>
                        <ul className="space-y-1 text-sm text-slate-800">
                          {(r.tasks || []).length === 0 ? (
                            <li className="text-slate-500">Aucune tâche</li>
                          ) : (
                            (r.tasks || []).map((t, i) => (
                              <li key={t.id ?? i}>
                                <span className="font-mono text-xs text-blue-600">{i + 1}.</span>{' '}
                                {t.description}
                                {t.completed ? (
                                  <span className="ml-2 text-xs text-green-700">✓</span>
                                ) : null}
                              </li>
                            ))
                          )}
                        </ul>
                        {r.notes ? (
                          <p className="mt-2 text-xs text-slate-500">Notes : {r.notes}</p>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

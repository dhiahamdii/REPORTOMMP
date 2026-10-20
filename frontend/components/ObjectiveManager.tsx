'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  createObjective,
  deleteObjective,
  fetchObjectives,
  updateObjective,
  type InterventionObjective,
} from '@/lib/api';

export default function ObjectiveManager() {
  const [items, setItems] = useState<InterventionObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [offline, setOffline] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchObjectives();
      setItems(list);
      setOffline(false);
    } catch {
      setItems([]);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = async () => {
    const text = draft.trim();
    if (!text) {
      setStatus({ type: 'err', message: 'Saisissez un objectif avant d’ajouter.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await createObjective(text);
      setDraft('');
      await reload();
      setStatus({ type: 'ok', message: 'Objectif ajouté.' });
    } catch (e) {
      setStatus({
        type: 'err',
        message: e instanceof Error ? e.message : 'Ajout impossible.',
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: InterventionObjective) => {
    setEditingId(item.id);
    setEditText(item.text);
    setStatus(null);
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const text = editText.trim();
    if (!text) {
      setStatus({ type: 'err', message: 'Le texte ne peut pas être vide.' });
      return;
    }
    setSaving(true);
    try {
      await updateObjective(editingId, text);
      setEditingId(null);
      setEditText('');
      await reload();
      setStatus({ type: 'ok', message: 'Objectif mis à jour.' });
    } catch (e) {
      setStatus({
        type: 'err',
        message: e instanceof Error ? e.message : 'Mise à jour impossible.',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Supprimer cet objectif du catalogue ?')) return;
    setSaving(true);
    try {
      await deleteObjective(id);
      if (editingId === id) {
        setEditingId(null);
        setEditText('');
      }
      await reload();
      setStatus({ type: 'ok', message: 'Objectif supprimé.' });
    } catch (e) {
      setStatus({
        type: 'err',
        message: e instanceof Error ? e.message : 'Suppression impossible.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {offline ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Serveur injoignable — démarrez le backend pour gérer les objectifs.
        </p>
      ) : null}
      {status ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm ${
            status.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {status.message}
        </p>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Nouvel objectif
        </label>
        <Textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          className="bg-white"
          placeholder="Ex. : Vérification périodique des équipements de détection incendie"
          disabled={offline}
        />
        <Button
          type="button"
          className="mt-3"
          disabled={saving || offline}
          onClick={() => void add()}
        >
          {saving ? '…' : '+ Ajouter'}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun objectif dans le catalogue. Ajoutez-en pour le type d’opération
          Préventive.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              {editingId === item.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={3}
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => void saveEdit()}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="flex-1 whitespace-pre-wrap text-sm text-slate-800">
                    {item.text}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(item)}
                    >
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      disabled={saving}
                      onClick={() => void remove(item.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

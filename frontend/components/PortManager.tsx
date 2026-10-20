'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createPort, deletePort, deletePortContact, updatePort } from '@/lib/api';
import {
  apiPortToDefinition,
  definitionToPortPayload,
  emptyPortDefinition,
  newContactLine,
} from '@/lib/portMappers';
import type { PortContact, PortDefinition } from '@/lib/portDirectory';
import { usePorts } from '@/hooks/usePorts';

type Draft = PortDefinition & { isNew?: boolean };

function isPersistedContactId(id: string): boolean {
  return /^\d+$/.test(id);
}

function ContactEditor({
  title,
  contacts,
  onChange,
  portSlug,
  isNewPort,
  onNotify,
}: {
  title: string;
  contacts: PortContact[];
  onChange: (next: PortContact[]) => void;
  portSlug: string;
  isNewPort: boolean;
  onNotify: (msg: { type: 'ok' | 'err'; message: string }) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const updateLine = (id: string, line: string) => {
    onChange(contacts.map(c => (c.id === id ? { ...c, line } : c)));
  };

  const remove = async (id: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    if (!isNewPort && portSlug && isPersistedContactId(id)) {
      if (!window.confirm('Supprimer ce contact de façon permanente pour ce port ?')) return;
      setDeletingId(id);
      try {
        await deletePortContact(portSlug, Number(id));
        onChange(contacts.filter(c => c.id !== id));
        onNotify({ type: 'ok', message: 'Contact supprimé.' });
      } catch (e) {
        onNotify({
          type: 'err',
          message: e instanceof Error ? e.message : 'Suppression du contact impossible.',
        });
      } finally {
        setDeletingId(null);
      }
      return;
    }

    onChange(contacts.filter(c => c.id !== id));
  };

  const add = () => onChange([...contacts, newContactLine()]);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          + Contact
        </Button>
      </div>
      <div className="space-y-2">
        {contacts.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun contact — ajoutez une ligne.</p>
        ) : null}
        {contacts.map(c => (
          <div key={c.id} className="flex gap-2">
            <Input
              value={c.line}
              onChange={e => updateLine(c.id, e.target.value)}
              placeholder="Nom — fonction — coordonnées"
              className="flex-1 bg-white"
            />
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 text-red-600 hover:bg-red-50"
              disabled={deletingId === c.id}
              onClick={() => void remove(c.id)}
            >
              {deletingId === c.id ? '…' : 'Supprimer'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortManager() {
  const { ports, loading, error, reload } = usePorts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);

  const selectPort = useCallback((p: PortDefinition) => {
    setSelectedId(p.id);
    setDraft({ ...p, isNew: false });
    setStatus(null);
  }, []);

  useEffect(() => {
    if (loading || ports.length === 0) return;
    // Ne pas écraser le formulaire « Nouveau port »
    if (selectedId === '__new__') return;
    if (selectedId && ports.some(p => p.id === selectedId)) return;
    selectPort(ports[0]);
  }, [loading, ports, selectedId, selectPort]);

  const startNewPort = () => {
    setSelectedId('__new__');
    setDraft({ ...emptyPortDefinition(), isNew: true });
    setStatus(null);
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.label.trim() || !draft.portName.trim()) {
      setStatus({ type: 'err', message: 'Le libellé et le nom de port (majuscules) sont requis.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const payload = definitionToPortPayload({
        ...draft,
        siteContacts: draft.siteContacts.filter(c => c.line.trim()),
        interventionContacts: draft.interventionContacts.filter(c => c.line.trim()),
      });
      const isCreating = draft.isNew === true || selectedId === '__new__';
      if (isCreating) {
        const created = await createPort(payload);
        const def = apiPortToDefinition(created);
        setSelectedId(def.id);
        setDraft({ ...def, isNew: false });
        await reload();
        setStatus({ type: 'ok', message: 'Port créé et enregistré.' });
      } else if (!draft.id) {
        setStatus({ type: 'err', message: 'Identifiant du port manquant — réessayez ou créez un nouveau port.' });
      } else {
        const updated = await updatePort(draft.id, payload);
        await reload();
        selectPort(apiPortToDefinition(updated));
        setStatus({ type: 'ok', message: 'Modifications enregistrées.' });
      }
    } catch (e) {
      setStatus({
        type: 'err',
        message: e instanceof Error ? e.message : 'Erreur lors de l’enregistrement.',
      });
    } finally {
      setSaving(false);
    }
  };

  const removePort = async () => {
    if (!draft || draft.isNew) return;
    if (!window.confirm(`Supprimer le port « ${draft.label} » et tous ses contacts ?`)) return;
    setSaving(true);
    try {
      await deletePort(draft.id);
      setDraft(null);
      setSelectedId(null);
      await reload();
      setStatus({ type: 'ok', message: 'Port supprimé.' });
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
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Serveur injoignable — annuaire intégré affiché. Démarrez le backend pour enregistrer vos
          ports. ({error})
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

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Ports</h2>
            <Button type="button" size="sm" onClick={startNewPort}>
              + Nouveau
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : (
            <ul className="space-y-1">
              {selectedId === '__new__' ? (
                <li>
                  <div className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                    + Nouveau port (brouillon)
                  </div>
                </li>
              ) : null}
              {ports.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPort(p)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === p.id
                        ? 'bg-blue-600 font-medium text-white'
                        : 'text-slate-800 hover:bg-white'
                    }`}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          {!draft ? (
            <p className="text-slate-600">
              Sélectionnez un port dans la liste ou créez-en un nouveau.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  {draft.isNew ? 'Nouveau port' : draft.label}
                </h2>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {!draft.isNew ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-red-600 sm:w-auto"
                      disabled={saving}
                      onClick={() => void removePort()}
                    >
                      Supprimer
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={saving}
                    onClick={() => void saveDraft()}
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Libellé (liste)
                  </label>
                  <Input
                    value={draft.label}
                    onChange={e => setDraft({ ...draft, label: e.target.value })}
                    className="bg-white"
                    placeholder="Port de Sousse"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nom port (MAJUSCULES)
                  </label>
                  <Input
                    value={draft.portName}
                    onChange={e =>
                      setDraft({ ...draft, portName: e.target.value.toUpperCase() })
                    }
                    className="bg-white font-mono"
                    placeholder="SOUSSE"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Lieu d&apos;intervention
                  </label>
                  <Input
                    value={draft.interventionLocation}
                    onChange={e =>
                      setDraft({ ...draft, interventionLocation: e.target.value })
                    }
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Client</label>
                  <Input
                    value={draft.clientName}
                    onChange={e => setDraft({ ...draft, clientName: e.target.value })}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Contrat / référence
                  </label>
                  <Input
                    value={draft.contractRef}
                    onChange={e => setDraft({ ...draft, contractRef: e.target.value })}
                    className="bg-white"
                  />
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Utilisez <strong>Supprimer</strong> pour retirer un contact. Sur un port déjà
                enregistré, la suppression est immédiate. Sinon, enregistrez le port pour
                confirmer.
              </p>
              <ContactEditor
                title="Contacts sur site"
                contacts={draft.siteContacts}
                portSlug={draft.id}
                isNewPort={!!draft.isNew}
                onNotify={setStatus}
                onChange={siteContacts => setDraft({ ...draft, siteContacts })}
              />
              <ContactEditor
                title="Contacts intervention (Huawei / Waycon)"
                contacts={draft.interventionContacts}
                portSlug={draft.id}
                isNewPort={!!draft.isNew}
                onNotify={setStatus}
                onChange={interventionContacts =>
                  setDraft({ ...draft, interventionContacts })
                }
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes internes (optionnel)
                </label>
                <Textarea
                  rows={2}
                  disabled
                  className="bg-slate-50 text-slate-500"
                  placeholder="Les contacts sont enregistrés avec le bouton Enregistrer ci-dessus."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

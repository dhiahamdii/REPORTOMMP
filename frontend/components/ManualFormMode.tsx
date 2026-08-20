'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ClientLogosFields from '@/components/ClientLogosFields';
import { createReport, fetchNextPrevRef, refineFrenchText, type RefineFrenchField } from '@/lib/api';
import { getDefaultReportLogos } from '@/lib/reportLogos';
import { buildOmmpProjectTitle } from '@/lib/ommpProject';
import type { PortContact, PortDefinition } from '@/lib/portDirectory';
import { usePorts } from '@/hooks/usePorts';

interface Task {
  id: string;
  description: string;
  completed: boolean;
}

interface ContactRow {
  id: string;
  line: string;
}

interface ManualFormModeProps {
  onSubmit: (data: Record<string, unknown>) => void;
}

function contactRowsFromPort(contacts: PortContact[]): ContactRow[] {
  return contacts.map(c => ({ id: c.id, line: c.line }));
}

function newRowId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ManualFormMode({ onSubmit }: ManualFormModeProps) {
  const { ports, loading: portsLoading, getPortById } = usePorts();
  const [portId, setPortId] = useState('');

  const [clientName, setClientName] = useState('');
  const [contractRef, setContractRef] = useState('');
  const [location, setLocation] = useState('');
  const [portName, setPortName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [previewRef, setPreviewRef] = useState('');
  const [technician, setTechnician] = useState('');
  const [siteRows, setSiteRows] = useState<ContactRow[]>([]);
  const [interventionRows, setInterventionRows] = useState<ContactRow[]>([]);
  const [objectifIntervention, setObjectifIntervention] = useState('');

  const [borrowSitePort, setBorrowSitePort] = useState('');
  const [borrowSiteContactId, setBorrowSiteContactId] = useState('');
  const [borrowIvPort, setBorrowIvPort] = useState('');
  const [borrowIvContactId, setBorrowIvContactId] = useState('');

  const [tasks, setTasks] = useState<Task[]>([{ id: '1', description: '', completed: true }]);
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<{ type: 'ok' | 'warn' | 'err'; message: string } | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [clientLogo, setClientLogo] = useState<string | null>(null);

  /** Toujours la dernière valeur saisie (évite un envoi « vide » ou périmé au clic IA). */
  const refineSnapshotRef = useRef({
    objectifIntervention,
    findings,
    recommendations,
    tasks,
  });
  refineSnapshotRef.current = { objectifIntervention, findings, recommendations, tasks };

  const objectifTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const findingsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recommendationsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const taskTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const applyPort = useCallback((p: PortDefinition) => {
    setClientName(p.clientName);
    setContractRef(p.contractRef);
    setLocation(p.interventionLocation);
    setPortName(p.portName);
    setProjectTitle(buildOmmpProjectTitle(p.portName));
    setSiteRows(contactRowsFromPort(p.siteContacts));
    setInterventionRows(contactRowsFromPort(p.interventionContacts));
  }, []);

  const refreshPreviewRef = useCallback(async () => {
    try {
      const iso = new Date(`${date}T12:00:00`).toISOString();
      const r = await fetchNextPrevRef(iso, false);
      setPreviewRef(r);
    } catch {
      setPreviewRef('—');
    }
  }, [date]);

  useEffect(() => {
    if (!portId && ports.length > 0) {
      setPortId(ports[0].id);
    }
  }, [ports, portId]);

  useEffect(() => {
    if (!portId) return;
    const p = getPortById(portId);
    if (p) applyPort(p);
  }, [portId, getPortById, applyPort]);

  useEffect(() => {
    void refreshPreviewRef();
  }, [refreshPreviewRef]);

  useEffect(() => {
    void getDefaultReportLogos().then(({ companyLogo, clientLogo }) => {
      setCompanyLogo(prev => (prev?.trim() ? prev : companyLogo));
      setClientLogo(prev => (prev?.trim() ? prev : clientLogo));
    });
  }, []);

  const borrowSiteOptions = useMemo(() => {
    return ports.filter(p => p.id !== portId);
  }, [ports, portId]);

  const borrowIvOptions = useMemo(() => {
    return ports.filter(p => p.id !== portId);
  }, [ports, portId]);

  const addSiteFromOtherPort = () => {
    const p = getPortById(borrowSitePort);
    const c = p?.siteContacts.find(x => x.id === borrowSiteContactId);
    if (!p || !c) return;
    setSiteRows(prev => [...prev, { id: newRowId(), line: `${c.line} (invité — ${p.portName})` }]);
  };

  const addIvFromOtherPort = () => {
    const p = getPortById(borrowIvPort);
    const c = p?.interventionContacts.find(x => x.id === borrowIvContactId);
    if (!p || !c) return;
    setInterventionRows(prev => [...prev, { id: newRowId(), line: `${c.line} (invité — ${p.portName})` }]);
  };

  const updateSiteLine = (id: string, line: string) => {
    setSiteRows(prev => prev.map(r => (r.id === id ? { ...r, line } : r)));
  };
  const removeSiteRow = (id: string) => setSiteRows(prev => prev.filter(r => r.id !== id));
  const addEmptySiteRow = () => setSiteRows(prev => [...prev, { id: newRowId(), line: '' }]);

  const updateIvLine = (id: string, line: string) => {
    setInterventionRows(prev => prev.map(r => (r.id === id ? { ...r, line } : r)));
  };
  const removeIvRow = (id: string) => setInterventionRows(prev => prev.filter(r => r.id !== id));
  const addEmptyIvRow = () => setInterventionRows(prev => [...prev, { id: newRowId(), line: '' }]);

  const runRefine = async (
    key: string,
    getText: () => string,
    apply: (out: string) => void,
    focusTarget?: HTMLTextAreaElement | null,
    field: RefineFrenchField = 'task',
  ) => {
    setAiFeedback(null);
    const text = getText();
    if (!text.trim()) {
      setAiFeedback({
        type: 'warn',
        message: 'Saisissez du texte dans le champ avant de cliquer sur Corriger (IA).',
      });
      return;
    }
    setAiBusy(key);
    try {
      const { text: out, fallback } = await refineFrenchText(text, field);
      apply(out);
      const unchanged = out.trim() === text.trim();
      if (fallback) {
        setAiFeedback({
          type: 'warn',
          message:
            'Le backend n’a pas pu appeler le modèle (souvent : pas de clé pour api.openai.com, ou Ollama arrêté). Configurez `backend/.env` : soit `OPENAI_API_KEY` pour OpenAI, soit `OPENAI_BASE_URL` + `OPENAI_MODEL` pour Ollama (voir README backend), puis redémarrez uvicorn.',
        });
      } else if (unchanged) {
        setAiFeedback({
          type: 'ok',
          message:
            'Réponse reçue : aucune modification nécessaire (texte déjà correct ou inchangé). Vous pouvez continuer à éditer le champ.',
        });
      } else {
        setAiFeedback({
          type: 'ok',
          message: 'Texte reformulé inséré dans le champ. Vous pouvez continuer à l’éditer.',
        });
      }
      const el = focusTarget;
      if (el) {
        requestAnimationFrame(() => {
          el.focus();
          const len = el.value.length;
          try {
            el.setSelectionRange(len, len);
          } catch {
            /* ignore */
          }
        });
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      setAiFeedback({
        type: 'err',
        message: `Correction IA impossible : ${msg}`,
      });
    } finally {
      setAiBusy(null);
    }
  };

  const addTask = () => {
    setTasks(prev => [...prev, { id: newRowId(), description: '', completed: true }]);
  };

  const updateTask = (id: string, description: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, description } : t)));
  };

  const removeTask = (id: string) => {
    delete taskTextareaRefs.current[id];
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!portId) e.port = 'Sélectionnez un port';
    if (!technician.trim()) e.technician = 'Technicien requis';
    if (!objectifIntervention.trim()) e.objectif = 'Objectif d’intervention requis';
    const validTasks = tasks.filter(t => t.description.trim());
    if (validTasks.length === 0) e.tasks = 'Au moins une tâche est requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const iso = new Date(`${date}T12:00:00`).toISOString();
      const reference = await fetchNextPrevRef(iso, true);

      const reportData = {
        client_name: clientName,
        location,
        date: iso,
        technician_name: technician,
        tasks: tasks.filter(t => t.description.trim()).map(t => ({
          description: t.description,
          completed: t.completed,
        })),
        notes,
      };

      try {
        await createReport(reportData);
      } catch (err) {
        console.warn('Backend save failed:', err);
      }

      const contactsSite = siteRows
        .map(r => r.line.trim())
        .filter(Boolean)
        .join('\n');
      const contactsIv = interventionRows
        .map(r => r.line.trim())
        .filter(Boolean)
        .join('\n');

      onSubmit({
        clientName,
        location,
        date,
        technician,
        tasks: tasks.filter(t => t.description.trim()).map(t => ({ ...t, completed: true })),
        notes: notes.trim() || undefined,
        findings: findings.trim() || undefined,
        recommendations: recommendations.trim() || undefined,
        port_name: portName,
        project_title: projectTitle,
        objectif_intervention: objectifIntervention.trim(),
        contract_ref: contractRef.trim(),
        contacts_site: contactsSite || undefined,
        contacts_intervention: contactsIv || undefined,
        reference_intervention_suggeree: reference,
        companyLogo,
        clientLogo,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {aiFeedback ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            aiFeedback.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-900'
              : aiFeedback.type === 'warn'
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {aiFeedback.message}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Port et identification</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Port *</label>
            <Select value={portId} onValueChange={setPortId} disabled={portsLoading || ports.length === 0}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={portsLoading ? 'Chargement…' : 'Choisir un port'} />
              </SelectTrigger>
              <SelectContent>
                {ports.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ports.length === 0 && !portsLoading ? (
              <p className="mt-1 text-sm text-amber-700">
                Aucun port — ajoutez-en dans{' '}
                <Link href="/manage" className="font-medium underline">
                  Ports &amp; contacts
                </Link>
                .
              </p>
            ) : null}
            {errors.port && <p className="mt-1 text-sm text-red-600">{errors.port}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Date d’intervention *</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white" />
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-md border border-blue-100 bg-white p-4 text-sm text-slate-800">
          <p>
            <span className="font-semibold text-slate-600">N° d’intervention (aperçu) :</span>{' '}
            <span className="font-mono text-blue-700">{previewRef || '…'}</span>
            <span className="ml-2 text-xs text-slate-500">(numéro définitif attribué à la génération)</span>
          </p>
          <p>
            <span className="font-semibold text-slate-600">Projet (titre fixe + port) :</span>
          </p>
          <p className="text-xs leading-snug text-slate-700">{projectTitle || '—'}</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Client / commanditaire</label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} className="bg-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Contrat / référence</label>
            <Input value={contractRef} onChange={e => setContractRef(e.target.value)} className="bg-white" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Lieu d’intervention</label>
            <Input value={location} onChange={e => setLocation(e.target.value)} className="bg-white" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Technicien *</label>
            <Input
              value={technician}
              onChange={e => setTechnician(e.target.value)}
              className={`bg-white ${errors.technician ? 'border-red-500' : ''}`}
              placeholder="Nom du technicien"
            />
            {errors.technician && <p className="mt-1 text-sm text-red-600">{errors.technician}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 p-6">
        <h2 className="mb-2 text-xl font-bold text-slate-900">Contacts sur site</h2>
        <p className="mb-4 text-sm text-slate-600">
          Liste propre au port ; utilisez <strong>Supprimer</strong> pour retirer une ligne (uniquement ce
          rapport). Les contacts empruntés à un autre port ne sont pas enregistrés dans l’annuaire.
        </p>
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-3">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs text-slate-600">Autre port</label>
            <Select value={borrowSitePort} onValueChange={v => { setBorrowSitePort(v); setBorrowSiteContactId(''); }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Port source" />
              </SelectTrigger>
              <SelectContent>
                {borrowSiteOptions.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-slate-600">Contact</label>
            <Select value={borrowSiteContactId} onValueChange={setBorrowSiteContactId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {(getPortById(borrowSitePort)?.siteContacts ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.line.slice(0, 80)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={addSiteFromOtherPort}>
            Ajouter (cette intervention)
          </Button>
        </div>
        <div className="space-y-2">
          {siteRows.map(row => (
            <div key={row.id} className="flex gap-2">
              <Input
                value={row.line}
                onChange={e => updateSiteLine(row.id, e.target.value)}
                className="flex-1 bg-white"
                placeholder="Nom — fonction — coordonnées"
              />
              <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => removeSiteRow(row.id)}>
                Supprimer
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" className="mt-3" onClick={addEmptySiteRow}>
          + Ligne contact vide
        </Button>
      </section>

      <section className="rounded-lg border border-slate-200 p-6">
        <h2 className="mb-2 text-xl font-bold text-slate-900">Contacts intervention (Huawei / Waycon)</h2>
        <p className="mb-4 text-sm text-slate-600">Prérempli selon le port ; ajout ou retrait libre pour ce rapport.</p>
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-3">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs text-slate-600">Autre port</label>
            <Select value={borrowIvPort} onValueChange={v => { setBorrowIvPort(v); setBorrowIvContactId(''); }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Port source" />
              </SelectTrigger>
              <SelectContent>
                {borrowIvOptions.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-slate-600">Contact</label>
            <Select value={borrowIvContactId} onValueChange={setBorrowIvContactId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {(getPortById(borrowIvPort)?.interventionContacts ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.line.slice(0, 80)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={addIvFromOtherPort}>
            Ajouter (cette intervention)
          </Button>
        </div>
        <div className="space-y-2">
          {interventionRows.map(row => (
            <div key={row.id} className="flex gap-2">
              <Input
                value={row.line}
                onChange={e => updateIvLine(row.id, e.target.value)}
                className="flex-1 bg-white"
              />
              <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => removeIvRow(row.id)}>
                Supprimer
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" className="mt-3" onClick={addEmptyIvRow}>
          + Ligne contact vide
        </Button>
      </section>

      <section className="rounded-lg border border-slate-200 p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">Objectif de l’intervention *</h2>
          <Button
            type="button"
            variant="outline"
            disabled={aiBusy === 'obj'}
            onClick={() =>
              runRefine(
                'obj',
                () => refineSnapshotRef.current.objectifIntervention,
                setObjectifIntervention,
                objectifTextareaRef.current,
                'objectif',
              )
            }
          >
            {aiBusy === 'obj' ? '…' : 'Reformuler (IA)'}
          </Button>
        </div>
        <Textarea
          ref={objectifTextareaRef}
          value={objectifIntervention}
          onChange={e => setObjectifIntervention(e.target.value)}
          rows={4}
          className={errors.objectif ? 'border-red-500' : ''}
          placeholder="Notes brutes acceptées ; l’IA produit un objectif professionnel concis."
        />
        {errors.objectif && <p className="mt-1 text-sm text-red-600">{errors.objectif}</p>}
      </section>

      <ClientLogosFields
        companyLogo={companyLogo}
        clientLogo={clientLogo}
        onCompanyLogoChange={setCompanyLogo}
        onClientLogoChange={setClientLogo}
      />

      <section className="rounded-lg border border-slate-200 p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Détails des tâches réalisées</h2>
        {errors.tasks && <p className="mb-2 text-sm text-red-600">{errors.tasks}</p>}
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-start">
              <Textarea
                ref={el => {
                  taskTextareaRefs.current[task.id] = el;
                }}
                value={task.description}
                onChange={e => updateTask(task.id, e.target.value)}
                className="min-h-[72px] flex-1 bg-white"
                placeholder="Une tâche par ligne — formulation libre"
              />
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={aiBusy === task.id}
                  onClick={() => {
                    const taskId = task.id;
                    runRefine(
                      taskId,
                      () => refineSnapshotRef.current.tasks.find(t => t.id === taskId)?.description ?? '',
                      v => updateTask(taskId, v),
                      taskTextareaRefs.current[taskId],
                    );
                  }}
                >
                  {aiBusy === task.id ? '…' : 'Reformuler'}
                </Button>
                <Button type="button" variant="ghost" className="text-red-600" onClick={() => removeTask(task.id)}>
                  Retirer
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" className="mt-3" onClick={addTask}>
          + Tâche
        </Button>
      </section>

      <section className="rounded-lg border border-slate-200 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">Problèmes détectés</h2>
          <Button
            type="button"
            variant="outline"
            disabled={aiBusy === 'find'}
            onClick={() =>
              runRefine(
                'find',
                () => refineSnapshotRef.current.findings,
                setFindings,
                findingsTextareaRef.current,
                'finding',
              )
            }
          >
            {aiBusy === 'find' ? '…' : 'Reformuler (IA)'}
          </Button>
        </div>
        <Textarea
          ref={findingsTextareaRef}
          value={findings} onChange={e => setFindings(e.target.value)} rows={4} className="bg-white" />
      </section>

      <section className="rounded-lg border border-slate-200 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900">Recommandations</h2>
          <Button
            type="button"
            variant="outline"
            disabled={aiBusy === 'rec'}
            onClick={() =>
              runRefine(
                'rec',
                () => refineSnapshotRef.current.recommendations,
                setRecommendations,
                recommendationsTextareaRef.current,
                'recommendation',
              )
            }
          >
            {aiBusy === 'rec' ? '…' : 'Reformuler (IA)'}
          </Button>
        </div>
        <Textarea
          ref={recommendationsTextareaRef}
          value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={4} className="bg-white" />
      </section>

      <section>
        <label className="mb-2 block text-sm font-medium text-slate-700">Notes complémentaires (optionnel)</label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="bg-white" />
      </section>

      <div className="flex gap-4 pt-2">
        <Button type="submit" disabled={loading} className="bg-blue-600 px-8 py-3 font-semibold hover:bg-blue-700">
          {loading ? 'Génération…' : 'Générer le rapport'}
        </Button>
      </div>
    </form>
  );
}

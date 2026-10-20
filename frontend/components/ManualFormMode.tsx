'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  createReport,
  fetchNextPrevRef,
  fetchObjectives,
  refineFrenchText,
  type InterventionObjective,
  type RefineFrenchField,
} from '@/lib/api';
import { getDefaultReportLogos } from '@/lib/reportLogos';
import { buildOmmpProjectTitle } from '@/lib/ommpProject';
import type { PortDefinition } from '@/lib/portDirectory';
import { usePorts } from '@/hooks/usePorts';

type ReportKind = 'new' | 'old';
/** Préventive = catalogue hybride ; Corrective = suggestions + saisie libre */
type OperationType = 'preventive' | 'corrective';

interface Task {
  id: string;
  description: string;
  completed: boolean;
}

interface ManualFormModeProps {
  onSubmit: (data: Record<string, unknown>) => void;
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function newRowId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const CUSTOM_OBJECTIF = '__custom__';

export default function ManualFormMode({ onSubmit }: ManualFormModeProps) {
  const { ports, loading: portsLoading, getPortById } = usePorts();
  const [portId, setPortId] = useState('');

  const [clientName, setClientName] = useState('');
  const [contractRef, setContractRef] = useState('');
  const [location, setLocation] = useState('');
  const [portName, setPortName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [siteContactsText, setSiteContactsText] = useState('');
  const [interventionContactsText, setInterventionContactsText] = useState('');

  const [reportKind, setReportKind] = useState<ReportKind>('new');
  const [date, setDate] = useState(todayIsoDate);
  const [previewRef, setPreviewRef] = useState('');

  const [operationType, setOperationType] = useState<OperationType>('preventive');
  const [objectives, setObjectives] = useState<InterventionObjective[]>([]);
  const [objectivesLoading, setObjectivesLoading] = useState(true);
  const [selectedObjectifId, setSelectedObjectifId] = useState('');
  const [objectifIntervention, setObjectifIntervention] = useState('');

  const [tasks, setTasks] = useState<Task[]>([{ id: '1', description: '', completed: true }]);
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<{ type: 'ok' | 'warn' | 'err'; message: string } | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [clientLogo, setClientLogo] = useState<string | null>(null);

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
    setSiteContactsText(
      p.siteContacts
        .map(c => c.line.trim())
        .filter(Boolean)
        .join('\n'),
    );
    setInterventionContactsText(
      p.interventionContacts
        .map(c => c.line.trim())
        .filter(Boolean)
        .join('\n'),
    );
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setObjectivesLoading(true);
      try {
        const list = await fetchObjectives();
        if (!cancelled) setObjectives(list);
      } catch {
        if (!cancelled) setObjectives([]);
      } finally {
        if (!cancelled) setObjectivesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reportKind === 'new') {
      setDate(todayIsoDate());
    }
  }, [reportKind]);

  useEffect(() => {
    setSelectedObjectifId('');
    setObjectifIntervention('');
  }, [operationType]);

  const onPreventiveObjectifPick = (value: string) => {
    setSelectedObjectifId(value);
    if (value === CUSTOM_OBJECTIF) {
      setObjectifIntervention('');
      return;
    }
    const found = objectives.find(o => String(o.id) === value);
    setObjectifIntervention(found?.text ?? '');
  };

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
    if (reportKind === 'old' && !date) e.date = 'Date requise';
    if (!operationType) e.operationType = 'Type d’opération requis';
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
        report_id: reference,
        tasks: tasks.filter(t => t.description.trim()).map(t => ({
          description: t.description,
          completed: t.completed,
        })),
        notes: undefined as string | undefined,
      };

      try {
        await createReport(reportData);
      } catch (err) {
        console.warn('Backend save failed:', err);
      }

      onSubmit({
        clientName,
        location,
        date,
        tasks: tasks.filter(t => t.description.trim()).map(t => ({ ...t, completed: true })),
        findings: findings.trim() || undefined,
        recommendations: recommendations.trim() || undefined,
        port_name: portName,
        project_title: projectTitle,
        objectif_intervention: objectifIntervention.trim(),
        contract_ref: contractRef.trim(),
        contacts_site: siteContactsText || undefined,
        contacts_intervention: interventionContactsText || undefined,
        reference_intervention_suggeree: reference,
        operation_type: operationType,
        report_kind: reportKind,
        companyLogo,
        clientLogo,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      {aiFeedback ? (
        <div
          role="status"
          className={`rounded-lg border px-3 py-3 text-sm sm:px-4 ${
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

      <section className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">Intervention</h2>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Port *</label>
          <Select value={portId} onValueChange={setPortId} disabled={portsLoading || ports.length === 0}>
            <SelectTrigger className="max-w-md bg-white">
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
                Gestion
              </Link>
              .
            </p>
          ) : null}
          {errors.port && <p className="mt-1 text-sm text-red-600">{errors.port}</p>}
        </div>

        {portId ? (
          <div className="mt-4 space-y-1 rounded-md border border-blue-100 bg-white p-4 text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-600">N° (aperçu) :</span>{' '}
              <span className="font-mono text-blue-700">{previewRef || '…'}</span>
            </p>
            <p>
              <span className="font-semibold text-slate-600">Client :</span> {clientName || '—'}
            </p>
            <p>
              <span className="font-semibold text-slate-600">Lieu :</span> {location || '—'}
            </p>
            <p className="text-xs text-slate-500">
              Contacts, contrat et logos sont repris automatiquement depuis le port (
              <Link href="/manage" className="underline">
                Gestion
              </Link>
              ).
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">Type de rapport *</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant={reportKind === 'new' ? 'default' : 'outline'}
            className={`w-full sm:w-auto ${reportKind === 'new' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => setReportKind('new')}
          >
            Nouveau rapport
          </Button>
          <Button
            type="button"
            variant={reportKind === 'old' ? 'default' : 'outline'}
            className={`w-full sm:w-auto ${reportKind === 'old' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => setReportKind('old')}
          >
            Ancien rapport
          </Button>
        </div>
        {reportKind === 'old' ? (
          <div className="mt-4 max-w-xs">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Date d’intervention *
            </label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={`bg-white ${errors.date ? 'border-red-500' : ''}`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Choisissez la date de l’intervention passée.
            </p>
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">Type d’opération *</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant={operationType === 'preventive' ? 'default' : 'outline'}
            className={`w-full sm:w-auto ${operationType === 'preventive' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => setOperationType('preventive')}
          >
            Préventive
          </Button>
          <Button
            type="button"
            variant={operationType === 'corrective' ? 'default' : 'outline'}
            className={`w-full sm:w-auto ${operationType === 'corrective' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => setOperationType('corrective')}
          >
            Corrective
          </Button>
        </div>
        {errors.operationType && (
          <p className="mt-2 text-sm text-red-600">{errors.operationType}</p>
        )}
        <p className="mt-3 text-sm text-slate-600">
          {operationType === 'preventive'
            ? 'Choisissez un objectif du catalogue ou rédigez-en un personnalisé.'
            : 'Rédigez l’objectif librement ; les suggestions du catalogue restent disponibles.'}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Objectif de l’intervention *</h2>
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

        {operationType === 'preventive' ? (
          <div className="mb-4 space-y-3">
            <Select
              value={selectedObjectifId}
              onValueChange={onPreventiveObjectifPick}
              disabled={objectivesLoading}
            >
              <SelectTrigger className="bg-white">
                <SelectValue
                  placeholder={
                    objectivesLoading ? 'Chargement…' : 'Choisir un objectif du catalogue'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {objectives.map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.text.length > 90 ? `${o.text.slice(0, 90)}…` : o.text}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_OBJECTIF}>Autre (saisie libre)</SelectItem>
              </SelectContent>
            </Select>
            {objectives.length === 0 && !objectivesLoading ? (
              <p className="text-sm text-amber-700">
                Catalogue vide — ajoutez des objectifs dans{' '}
                <Link href="/manage" className="font-medium underline">
                  Gestion
                </Link>{' '}
                ou choisissez « Autre ».
              </p>
            ) : null}
            {selectedObjectifId ? (
              <Textarea
                ref={objectifTextareaRef}
                value={objectifIntervention}
                onChange={e => {
                  setObjectifIntervention(e.target.value);
                  if (selectedObjectifId !== CUSTOM_OBJECTIF) {
                    setSelectedObjectifId(CUSTOM_OBJECTIF);
                  }
                }}
                rows={4}
                className={errors.objectif ? 'border-red-500' : ''}
                placeholder={
                  selectedObjectifId === CUSTOM_OBJECTIF
                    ? 'Rédigez l’objectif…'
                    : 'Objectif sélectionné — vous pouvez le modifier'
                }
              />
            ) : null}
          </div>
        ) : (
          <div className="mb-2 space-y-3">
            {objectives.length > 0 ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Suggestions (cliquer pour préremplir)
                </label>
                <div className="flex flex-wrap gap-2">
                  {objectives.map(o => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setObjectifIntervention(o.text)}
                      className="max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                      title={o.text}
                    >
                      {o.text.length > 60 ? `${o.text.slice(0, 60)}…` : o.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <Textarea
              ref={objectifTextareaRef}
              value={objectifIntervention}
              onChange={e => setObjectifIntervention(e.target.value)}
              rows={4}
              className={errors.objectif ? 'border-red-500' : ''}
              list="objectif-suggestions"
              placeholder="Rédigez l’objectif — les suggestions ci-dessus sont optionnelles."
            />
            <datalist id="objectif-suggestions">
              {objectives.map(o => (
                <option key={o.id} value={o.text} />
              ))}
            </datalist>
          </div>
        )}
        {errors.objectif && <p className="mt-1 text-sm text-red-600">{errors.objectif}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900 sm:text-xl">Détails des tâches réalisées</h2>
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

      <section className="rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Problèmes détectés</h2>
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
          value={findings}
          onChange={e => setFindings(e.target.value)}
          rows={4}
          className="bg-white"
        />
      </section>

      <section className="rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Recommandations</h2>
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
          value={recommendations}
          onChange={e => setRecommendations(e.target.value)}
          rows={4}
          className="bg-white"
        />
      </section>

      <div className="flex pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 px-8 py-3 font-semibold hover:bg-blue-700 sm:w-auto"
        >
          {loading ? 'Génération…' : 'Générer le rapport'}
        </Button>
      </div>
    </form>
  );
}

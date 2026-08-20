'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ClientLogosFields from '@/components/ClientLogosFields';
import { parseMaintenanceText, getClients, type Client } from '@/lib/api';
import { getDefaultReportLogos } from '@/lib/reportLogos';

interface AIInputModeProps {
  onSubmit: (data: any) => void;
}

export default function AIInputMode({ onSubmit }: AIInputModeProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  /** '' = use AI-parsed client; otherwise force saved client's name & location */
  const [clientOverrideId, setClientOverrideId] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [clientLogo, setClientLogo] = useState<string | null>(null);

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    void getDefaultReportLogos().then(({ companyLogo, clientLogo }) => {
      setCompanyLogo(prev => (prev?.trim() ? prev : companyLogo));
      setClientLogo(prev => (prev?.trim() ? prev : clientLogo));
    });
  }, []);

  const handlePaste = async () => {
    try {
      const pastedText = await navigator.clipboard.readText();
      setText(pastedText);
    } catch (err) {
      setError('Failed to read clipboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!text.trim()) {
      setError('Please enter maintenance report text');
      return;
    }

    setLoading(true);
    try {
      // Call the backend API to parse the text
      const parsed = await parseMaintenanceText(text);

      const p = parsed as Record<string, unknown>;
      const rawTasks = parsed.tasks;
      const taskList = Array.isArray(rawTasks) ? rawTasks : [];

      let formattedData = {
        clientName: parsed.client_name,
        location: parsed.location,
        date: new Date(parsed.date).toISOString().split('T')[0],
        technician: parsed.technician,
        tasks: taskList.map((task: { description?: string; completed?: boolean }) => ({
          id: Date.now().toString() + Math.random(),
          description: String(task?.description ?? ''),
          completed: Boolean(task?.completed),
        })),
        notes: parsed.notes || '',
        executive_summary: parsed.executive_summary as string | undefined,
        findings: parsed.findings as string | undefined,
        recommendations: parsed.recommendations as string | undefined,
        port_name: p.port_name as string | undefined,
        project_title: p.project_title as string | undefined,
        objectif_intervention: p.objectif_intervention as string | undefined,
        resume: p.resume as string | undefined,
        problemes_et_recommandations:
          (p.problemes_et_recommandations as string | undefined) || undefined,
        reference_intervention_suggeree:
          (p.reference_intervention_suggeree as string | undefined) || undefined,
        companyLogo,
        clientLogo,
      };

      if (clientOverrideId) {
        const c = clients.find(x => String(x.id) === clientOverrideId);
        if (c) {
          formattedData = {
            ...formattedData,
            clientName: c.name,
            location: c.location || formattedData.location,
          };
        }
      }

      onSubmit(formattedData);
    } catch (err) {
      setError('Failed to parse maintenance report. Backend may be unavailable. Try the manual form instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">AI-Powered Text Input</h2>
        <p className="text-slate-600 mb-4">
          Paste maintenance notes or descriptions and we&apos;ll automatically extract the relevant information.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6 max-w-md space-y-2">
        <label className="mb-2 block text-sm font-medium text-slate-700">Use saved client (optional)</label>
        <Select value={clientOverrideId || 'ai'} onValueChange={v => setClientOverrideId(v === 'ai' ? '' : v)}>
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Use text from AI" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai">Use client from parsed text</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">
          If you pick a saved client, their name and location replace the AI result for this report.
        </p>
      </div>

      <ClientLogosFields
        companyLogo={companyLogo}
        clientLogo={clientLogo}
        onCompanyLogoChange={setCompanyLogo}
        onClientLogoChange={setClientLogo}
      />

      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Maintenance Report Text *
        </label>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Example:
Client: Acme Corporation
Location: Building A, Floor 3
Date: 2024-04-29
Technician: John Smith

Tasks completed:
- Fixed HVAC unit
- Replaced air filters
- Lubricated door hinges
- Inspected fire extinguishers

All systems operational.`}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          onClick={handlePaste}
          className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium"
        >
          Paste from Clipboard
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Parse & Generate Report'}
        </Button>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Include details like client name, location, date, technician name, and maintenance tasks for best results.
        </p>
        <p className="mt-2 text-sm text-blue-900">
          <strong>IA :</strong> tout passe par le backend. Pour OpenAI payant utilisez <code className="rounded bg-white px-1">OPENAI_API_KEY</code> dans{' '}
          <code className="rounded bg-white px-1">backend/.env</code>. Pour du <strong>gratuit / local</strong>, installez{' '}
          <a className="underline" href="https://ollama.com" target="_blank" rel="noreferrer">
            Ollama
          </a>{' '}
          puis définissez <code className="rounded bg-white px-1">OPENAI_BASE_URL</code> et <code className="rounded bg-white px-1">OPENAI_MODEL</code> (voir{' '}
          <code className="rounded bg-white px-1">backend/README.md</code>).
        </p>
      </div>
    </form>
  );
}

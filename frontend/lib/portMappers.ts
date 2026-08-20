import type { PortContact, PortDefinition } from '@/lib/portDirectory';

export interface ApiPortContact {
  id: string;
  line: string;
}

export interface ApiPort {
  id: string;
  label: string;
  portName: string;
  interventionLocation: string;
  clientName: string;
  contractRef: string;
  siteContacts: ApiPortContact[];
  interventionContacts: ApiPortContact[];
}

export function apiPortToDefinition(p: ApiPort): PortDefinition {
  return {
    id: p.id,
    label: p.label,
    portName: p.portName,
    interventionLocation: p.interventionLocation,
    clientName: p.clientName,
    contractRef: p.contractRef,
    siteContacts: p.siteContacts.map(c => ({ id: c.id, line: c.line })),
    interventionContacts: p.interventionContacts.map(c => ({ id: c.id, line: c.line })),
  };
}

export function definitionToPortPayload(p: PortDefinition) {
  return {
    label: p.label,
    port_name: p.portName,
    intervention_location: p.interventionLocation,
    client_name: p.clientName,
    contract_ref: p.contractRef,
    site_contacts: p.siteContacts.map(c => c.line),
    intervention_contacts: p.interventionContacts.map(c => c.line),
  };
}

export function emptyPortDefinition(): PortDefinition {
  return {
    id: '',
    label: '',
    portName: '',
    interventionLocation: '',
    clientName: 'Office de la Marine Marchande et des Ports (OMMP)',
    contractRef: '',
    siteContacts: [],
    interventionContacts: [],
  };
}

export function newContactLine(): PortContact {
  return { id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, line: '' };
}

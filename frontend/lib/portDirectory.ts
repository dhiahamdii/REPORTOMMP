import { buildOmmpProjectTitle } from '@/lib/ommpProject';

export interface PortContact {
  id: string;
  /** Affichage : nom, fonction, téléphone… */
  line: string;
}

export interface PortDefinition {
  id: string;
  /** Nom affiché dans la liste */
  label: string;
  /** Port (OMMP) en majuscules pour le titre */
  portName: string;
  /** Lieu d’intervention / zone portuaire */
  interventionLocation: string;
  clientName: string;
  contractRef: string;
  /** Contacts présents sur site (persistants pour ce port) */
  siteContacts: PortContact[];
  /** Contacts Huawei / Waycon pour l’intervention (persistants) */
  interventionContacts: PortContact[];
}

/** Annuaire initial — à enrichir selon vos ports réels. */
export const PORT_DIRECTORY: PortDefinition[] = [
  {
    id: 'rades',
    label: 'Port de Radès',
    portName: 'RADES',
    interventionLocation: 'Zone portuaire — Radès',
    clientName: 'Office de la Marine Marchande et des Ports (OMMP)',
    contractRef: 'OMMP-HW-WC-2024-RAD',
    siteContacts: [
      { id: 'rad-s1', line: 'M. Ben Ali — Responsable exploitation portuaire — +216 XX XXX XXX' },
      { id: 'rad-s2', line: 'Service sécurité accès — Poste principal' },
    ],
    interventionContacts: [
      { id: 'rad-i1', line: 'Huawei — Ingénieur système vidéo — support@huawei.example' },
      { id: 'rad-i2', line: 'Waycon — Chef de projet intégration — contact@waycon.example' },
    ],
  },
  {
    id: 'bizerte',
    label: 'Port de Bizerte',
    portName: 'BIZERTE',
    interventionLocation: 'Zone portuaire — Bizerte',
    clientName: 'Office de la Marine Marchande et des Ports (OMMP)',
    contractRef: 'OMMP-HW-WC-2024-BIZ',
    siteContacts: [
      { id: 'biz-s1', line: 'Mme Trabelsi — Coordinatrice portuaire — +216 XX XXX XXX' },
      { id: 'biz-s2', line: 'Garde-côte — Bureau accès maritime' },
    ],
    interventionContacts: [
      { id: 'biz-i1', line: 'Huawei — Contact terrain Nord — nord@huawei.example' },
      { id: 'biz-i2', line: 'Waycon — Supervision chantier — bizerte@waycon.example' },
    ],
  },
  {
    id: 'gabes',
    label: 'Port de Gabès',
    portName: 'GABES',
    interventionLocation: 'Zone portuaire — Gabès',
    clientName: 'Office de la Marine Marchande et des Ports (OMMP)',
    contractRef: 'OMMP-HW-WC-2025-GAB',
    siteContacts: [{ id: 'gab-s1', line: 'Chef de poste — Sécurité terrestre et maritime' }],
    interventionContacts: [
      { id: 'gab-i1', line: 'Huawei — Support IVS / TVWALL' },
      { id: 'gab-i2', line: 'Waycon — Interlocuteur projet Gabès' },
    ],
  },
];

export function getPortById(id: string): PortDefinition | undefined {
  return PORT_DIRECTORY.find(p => p.id === id);
}

export function projectTitleForPort(portName: string): string {
  return buildOmmpProjectTitle(portName);
}

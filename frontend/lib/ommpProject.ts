/** Préfixe fixe du titre de projet OMMP ; seul le nom du port en fin change. */
export const OMMP_PROJECT_TITLE_PREFIX =
  'FOURNITURE, INSTALLATION ET LA MISE EN SERVICES DES EQUIPEMENTS DE SECURISATION DES ACCES TERRESTRES ET MARITIMES DES PORTS DE';

export function buildOmmpProjectTitle(portName: string): string {
  const p = portName.trim().toUpperCase();
  return p ? `${OMMP_PROJECT_TITLE_PREFIX} ${p}` : '';
}

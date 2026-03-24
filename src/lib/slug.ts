/**
 * Generation de slugs pour les URLs humanisees.
 * Ex: "Solo La Rochelle" → "solo-la-rochelle"
 */

/** Genere un slug a partir d'un nom (strip accents, lowercase, tirets) */
export function genererSlug(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanum
    .trim()
    .replace(/\s+/g, "-") // spaces to dashes
    .replace(/-+/g, "-"); // collapse dashes
}

/** Genere un slug unique en ajoutant un suffixe si collision */
export function genererSlugUnique(
  nom: string,
  slugsExistants: string[]
): string {
  const base = genererSlug(nom);
  if (!base) return "";

  if (!slugsExistants.includes(base)) return base;

  let compteur = 2;
  while (slugsExistants.includes(`${base}-${compteur}`)) {
    compteur++;
  }
  return `${base}-${compteur}`;
}

/**
 * Canonical form for comparing free-text answers in ink via `normalize(respuesta)`:
 * lower case, no accents, no spaces or punctuation. "María Luisa González." → "marialuisagonzalez".
 */
export function normalizeAnswer(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}

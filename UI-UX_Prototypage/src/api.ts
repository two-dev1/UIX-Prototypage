import type { ApiPage, ApiResponse, ParisEvent } from "./types.ts";

const RECORDS_URL =
  "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records";

/** Limite maximale acceptée par l'API OpenData v2.1. */
export const API_MAX_LIMIT = 100;

/** Champs interrogés par la recherche plein texte (insensible aux accents). */
const SEARCH_FIELDS = ["title", "lead_text", "qfap_tags", "address_name", "address_city"] as const;

interface GetEventsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  freeOnly?: boolean;
  arrondissement?: string;
  category?: string;
  signal?: AbortSignal;
}

/** Récupère une page complète avec son nombre total de résultats. */
export async function getEventsPage(
  options: GetEventsOptions = {},
): Promise<ApiPage> {
  const {
    limit = 20,
    offset = 0,
    search = "",
    freeOnly = false,
    arrondissement = "",
    category = "",
    signal,
  } = options;
  const params = new URLSearchParams({
    limit: String(Math.min(limit, API_MAX_LIMIT)),
    offset: String(offset),
  });
  const conditions: string[] = [];
  // L'API v2.1 ignore le paramètre `search` (format v1) : la recherche passe par ODSQL,
  // limitée aux champs pertinents (la description produit trop de faux positifs).
  const query = search.trim();
  if (query) {
    const term = odsqlString(query);
    conditions.push(`(${SEARCH_FIELDS.map((field) => `search(${field}, "${term}")`).join(" or ")})`);
  }
  if (freeOnly) conditions.push('price_type="gratuit"');
  if (arrondissement)
    conditions.push(`address_zipcode="${odsqlString(arrondissement)}"`);
  // `qfap_tags` contient plusieurs étiquettes séparées par « ; » : recherche partielle.
  if (category) conditions.push(`qfap_tags like "%${odsqlString(category)}%"`);
  if (conditions.length > 0) params.set("where", conditions.join(" and "));
  return fetchPage(params, signal);
}

/** Récupère un événement précis (lien direct, rechargement de la page détail). */
export async function getEventById(
  id: string,
  signal?: AbortSignal,
): Promise<ParisEvent | null> {
  const page = await getEventsByIds([id], signal);
  return page[0] ?? null;
}

/** Récupère plusieurs événements par identifiant (favoris). */
export async function getEventsByIds(
  ids: string[],
  signal?: AbortSignal,
): Promise<ParisEvent[]> {
  const unique = [...new Set(ids.filter((id) => id.trim()))].slice(
    0,
    API_MAX_LIMIT,
  );
  if (unique.length === 0) return [];
  const params = new URLSearchParams({
    limit: String(unique.length),
    where: unique.map((id) => `id="${odsqlString(id)}"`).join(" or "),
  });
  const page = await fetchPage(params, signal);
  const order = new Map(unique.map((id, index) => [id, index]));
  return page.results.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  );
}

async function fetchPage(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<ApiPage> {
  let response: Response;
  try {
    response = await fetch(`${RECORDS_URL}?${params.toString()}`, { signal });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("La requête a été annulée.");
    }
    throw new Error("La connexion à l’API de la Ville de Paris a échoué.");
  }

  if (!response.ok) {
    throw new Error(
      `Impossible de récupérer les événements (code ${response.status}).`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("La réponse de l’API n’est pas un JSON valide.");
  }

  if (!isApiResponse(payload)) {
    throw new Error(
      "La réponse de l’API ne contient pas la liste des événements.",
    );
  }
  return { totalCount: payload.total_count, results: payload.results };
}

/** Neutralise les guillemets dans une valeur ODSQL. */
function odsqlString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (!isRecord(value)) return false;
  return typeof value.total_count === "number" && Array.isArray(value.results);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

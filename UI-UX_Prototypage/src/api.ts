import type { ApiPage, ApiResponse } from "./types.ts";

const RECORDS_URL =
  "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records";

export interface GetEventsOptions {
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
    limit: String(limit),
    offset: String(offset),
  });
  if (search.trim()) params.set("search", search.trim());
  const conditions: string[] = [];
  if (freeOnly) conditions.push('price_type="gratuit"');
  if (arrondissement) conditions.push(`address_zipcode="${arrondissement}"`);
  if (category) conditions.push(`qfap_tags="${category}"`);
  if (conditions.length > 0) params.set("where", conditions.join(" and "));

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

function isApiResponse(value: unknown): value is ApiResponse {
  if (!isRecord(value)) return false;
  return typeof value.total_count === "number" && Array.isArray(value.results);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

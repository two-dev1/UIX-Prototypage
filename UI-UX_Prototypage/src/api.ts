import type { ApiResponse, ParisEvent } from "./types.ts"

const RECORDS_URL =
  "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records"

export interface GetEventsOptions {
  limit?: number
  offset?: number
}

/** Récupère une page d'événements. `limit` vaut 20 et `offset` 0 par défaut. */
export async function getEvents({
  limit = 20,
  offset = 0,
}: GetEventsOptions = {}): Promise<ParisEvent[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  let response: Response
  try {
    response = await fetch(`${RECORDS_URL}?${params.toString()}`)
  } catch {
    throw new Error("La connexion à l'API de la Ville de Paris a échoué.")
  }

  if (!response.ok) {
    throw new Error(
      `Impossible de récupérer les événements (code ${response.status}).`,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error("La réponse de l'API n'est pas un JSON valide.")
  }

  if (!isApiResponse(payload)) {
    throw new Error("La réponse de l'API ne contient pas la liste des événements.")
  }

  return payload.results
}

function isApiResponse(value: unknown): value is ApiResponse {
  if (!isRecord(value)) return false
  return typeof value.total_count === "number" && Array.isArray(value.results)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * Champs réellement affichés, d'après un appel à l'API (limit=20).
 * Il n'existe pas de champ `tags` : le jeu de données expose `qfap_tags`,
 * non utilisé ici.
 * Les dates et le texte alternatif de l'image reviennent souvent à null.
 * Les autres textes sont typés `string | null` : ce sont des champs texte
 * OpenData, absents sur certaines fiches même s'ils étaient remplis
 * dans cet échantillon.
 */
export interface ParisEvent {
  id: string
  title: string | null
  lead_text: string | null
  date_start: string | null
  date_end: string | null
  date_description: string | null
  cover_url: string | null
  cover_alt: string | null
  address_name: string | null
  address_city: string | null
  price_type: string | null
  url: string | null
}

export interface ApiResponse {
  total_count: number
  results: ParisEvent[]
}

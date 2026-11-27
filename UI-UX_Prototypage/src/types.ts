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
  id: string;
  title: string | null;
  lead_text: string | null;
  description?: string | null;
  date_start: string | null;
  date_end: string | null;
  date_description: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  address_name: string | null;
  address_city: string | null;
  address_street?: string | null;
  address_zipcode?: string | null;
  lat_lon?: unknown;
  price_type: string | null;
  url: string | null;
  qfap_tags?: string[] | string | null;
  tags?: string[] | string | null;
}

export interface ApiResponse {
  total_count: number;
  results: ParisEvent[];
}

export interface ApiPage {
  totalCount: number;
  results: ParisEvent[];
}

export type EventSlot = "Matin" | "Journée" | "Soir";

export interface LocalUser {
  id: string;
  name: string;
  handle: string;
  email: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventAddress: string;
  latitude?: number;
  longitude?: number;
  dateStart: string | null;
  quantity: number;
  payment: string;
  purchasedAt: string;
  category: string;
}

export interface CommunityComment {
  id: string;
  author: string;
  text: string;
  gif?: string;
  replyTo?: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  avatar: string;
  text: string;
  image: string | null;
  eventTitle: string;
  likes: number;
  liked: boolean;
  comments: CommunityComment[];
  createdAt: string;
  challenge: boolean;
}

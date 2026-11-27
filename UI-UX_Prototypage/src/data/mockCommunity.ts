import type { CommunityPost } from "../types.ts";

const photo = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?w=720&q=70&auto=format&fit=crop`;

export const mockCommunityPosts: CommunityPost[] = [
  {
    id: "post-musee",
    author: "léa_urban",
    avatar: "L",
    text: "L’expo était incroyable ! Qui veut venir au prochain vernissage ?",
    image: photo("1554907984-15263bfd63bd"),
    eventTitle: "Exposition contemporaine",
    likes: 24,
    liked: false,
    saves: 6,
    shares: 3,
    comments: [
      { id: "c1", author: "Nico", text: "Je suis chaud samedi !", createdAt: "2026-11-24" },
      { id: "c2", author: "Inès", text: "", gif: "bravo", createdAt: "2026-11-24" },
    ],
    createdAt: "2026-11-24",
    challenge: true,
  },
  {
    id: "post-concert",
    author: "milo.paris",
    avatar: "M",
    text: "Ambiance folle hier soir à la Philharmonie.",
    image: photo("1501386761578-eac5c94b800a"),
    eventTitle: "Concert live",
    likes: 51,
    liked: false,
    saves: 12,
    shares: 8,
    comments: [],
    createdAt: "2026-11-23",
    challenge: false,
  },
  {
    id: "post-cinema",
    author: "zoe.movies",
    avatar: "Z",
    text: "Séance plein air en plein cœur de Paris. À refaire !",
    image: photo("1489599849927-2ee91cede3ba"),
    eventTitle: "Cinéma en plein air",
    likes: 18,
    liked: false,
    saves: 2,
    shares: 1,
    comments: [],
    createdAt: "2026-11-22",
    challenge: true,
  },
  {
    id: "post-sport",
    author: "tom_runs",
    avatar: "T",
    text: "Course communautaire au Canal Saint-Martin, super vibe.",
    image: photo("1461896836934-ffe607ba8211"),
    eventTitle: "Run collectif",
    likes: 33,
    liked: false,
    saves: 4,
    shares: 2,
    comments: [],
    createdAt: "2026-11-21",
    challenge: false,
  },
];

/** Lives factices de l'onglet Outers. */
export const mockLives = [
  { id: "live-pigalle", host: "nina.pigalle", place: "Pigalle", image: photo("1514525253161-7a46d19cd819"), viewers: 214 },
  { id: "live-bastille", host: "sam_bastille", place: "Bastille", image: photo("1501386761578-eac5c94b800a"), viewers: 87 },
  { id: "live-marais", host: "jules.marais", place: "Le Marais", image: photo("1554907984-15263bfd63bd"), viewers: 42 },
  { id: "live-canal", host: "lou.canal", place: "Canal Saint-Martin", image: photo("1502602898657-3e91760cbb34"), viewers: 129 },
];

/** GIFs boilerplate (aucune API externe) : libellé animé sur fond de la palette. */
export const mockGifs = [
  { id: "bravo", label: "Bravo !", bg: "#B8E62E", fg: "#151515" },
  { id: "paris", label: "Paris ♥", bg: "#7033FF", fg: "#FEFEFE" },
  { id: "go", label: "On y va", bg: "#FD71EB", fg: "#151515" },
  { id: "wow", label: "Wow", bg: "#FEFEFE", fg: "#151515" },
  { id: "dance", label: "Dance", bg: "#353535", fg: "#B8E62E" },
  { id: "lol", label: "Mdr", bg: "#BCBCBC", fg: "#7033FF" },
] as const;

export const mockLiveChat = [
  ["nico", "trop bien l’ambiance 🔥"],
  ["ines", "c’est où exactement ?"],
  ["milo", "j’arrive dans 10 min"],
  ["zoe", "le son est fou"],
  ["tom", "qui est chaud pour l’after ?"],
  ["lea", "Paris ne dort jamais"],
] as const;

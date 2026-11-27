/**
 * Registre d'icônes : seules les icônes réellement utilisées sont importées
 * (les SVG Figma sont inlinés pour pouvoir être recolorés en CSS).
 * Les icônes absentes de la maquette viennent de Lucide.
 */
import {
  ImagePlay,
  Images,
  Lock,
  LogOut,
  MessageCircle,
  Users,
  createElement,
  type IconNode,
} from "lucide";

import back from "../assets/icons/back_white.svg?raw";
import cameraSwitch from "../assets/icons/cameraswitch_white.svg?raw";
import community from "../assets/icons/community.svg?raw";
import cross from "../assets/icons/cross_white.svg?raw";
import fire from "../assets/icons/fire_white.svg?raw";
import flash from "../assets/icons/flash_white.svg?raw";
import heartGreen from "../assets/icons/heart_green.svg?raw";
import heartPurple from "../assets/icons/heart_purple.svg?raw";
import heartWhite from "../assets/icons/heart_white.svg?raw";
import home from "../assets/icons/home.svg?raw";
import location from "../assets/icons/location.svg?raw";
import logo75 from "../assets/icons/logo-75.svg?raw";
import logoText from "../assets/icons/logo-text.svg?raw";
import noFlash from "../assets/icons/noflash_white.svg?raw";
import photoButton from "../assets/icons/photo-button.svg?raw";
import plus from "../assets/icons/plus.svg?raw";
import profile from "../assets/icons/profile.svg?raw";
import saveGreen from "../assets/icons/save_green.svg?raw";
import saveWhite from "../assets/icons/save_white.svg?raw";
import searchGreen from "../assets/icons/search_green.svg?raw";
import searchWhite from "../assets/icons/search_white.svg?raw";
import send from "../assets/icons/send_white.svg?raw";
import sticker from "../assets/icons/sticker.svg?raw";
import stickerBoilerplate from "../assets/icons/sticker-boilerplate.svg?raw";
import storyPlus from "../assets/icons/story-plus.svg?raw";
import ticket from "../assets/icons/ticket.svg?raw";

const figmaIcons = {
  back,
  "camera-switch": cameraSwitch,
  community,
  cross,
  fire,
  flash,
  "heart-green": heartGreen,
  "heart-purple": heartPurple,
  "heart-white": heartWhite,
  home,
  location,
  "logo-75": logo75,
  "logo-text": logoText,
  "no-flash": noFlash,
  "photo-button": photoButton,
  plus,
  profile,
  "save-green": saveGreen,
  "save-white": saveWhite,
  "search-green": searchGreen,
  "search-white": searchWhite,
  send,
  sticker,
  "sticker-boilerplate": stickerBoilerplate,
  "story-plus": storyPlus,
  ticket,
} as const;

const lucideIcons = {
  gif: ImagePlay,
  gallery: Images,
  lock: Lock,
  logout: LogOut,
  comment: MessageCircle,
  users: Users,
} as const satisfies Record<string, IconNode>;

export type IconName = keyof typeof figmaIcons | keyof typeof lucideIcons;

const lucideCache = new Map<string, string>();

function lucideSvg(name: keyof typeof lucideIcons): string {
  const cached = lucideCache.get(name);
  if (cached) return cached;
  const svg = createElement(lucideIcons[name], {
    width: "100%",
    height: "100%",
    "stroke-width": 2.25,
    "aria-hidden": "true",
  }).outerHTML;
  lucideCache.set(name, svg);
  return svg;
}

/** Retourne le SVG brut d'une icône. */
export function iconSvg(name: IconName): string {
  if (name in figmaIcons) return figmaIcons[name as keyof typeof figmaIcons];
  return lucideSvg(name as keyof typeof lucideIcons);
}

/** Avatars : fichiers lourds (images embarquées), chargés en URL et non inlinés. */
const AVATAR_URLS = {
  "avatar-1": new URL("../assets/icons/avatar-1.svg", import.meta.url).href,
  "avatar-2": new URL("../assets/icons/avatar-2.svg", import.meta.url).href,
} as const;

export function avatarImg(id: keyof typeof AVATAR_URLS, size = 112): string {
  return `<img src="${AVATAR_URLS[id]}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
}

/** Icône décorative enveloppée dans un conteneur flex. */
export function icon(name: IconName, className = ""): string {
  return `<span class="icon${className ? ` ${className}` : ""}" aria-hidden="true">${iconSvg(name)}</span>`;
}

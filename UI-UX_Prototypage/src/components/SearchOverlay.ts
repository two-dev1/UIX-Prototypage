import { openOverlay } from "../app.ts";
import { escapeHtml } from "../utils/html.ts";
import { icon } from "../utils/icons.ts";

export type SearchHandler = (query: string, options: { live: boolean }) => void;

/** Panneau de recherche (Figma « Search ») : recherche en direct + validation. */
export function openSearch(onSearch: SearchHandler, initial = ""): void {
  let timer: number | undefined;
  const overlay = openOverlay(
    `<form class="search-panel" role="search" data-search-form>
      <label class="visually-hidden" for="search-input">Recherchez ce que vous voulez</label>
      <input id="search-input" class="search-panel__input" type="search" enterkeyhint="search" autocomplete="off" placeholder="Recherchez ce que vous voulez" value="${escapeHtml(initial)}" autofocus>
      <button type="submit" class="icon-button" aria-label="Lancer la recherche">${icon("search-green")}</button>
    </form>`,
    { variant: "top", label: "Recherche" },
  );
  const form = overlay.element.querySelector<HTMLFormElement>("[data-search-form]");
  const input = overlay.element.querySelector<HTMLInputElement>("#search-input");
  if (!form || !input) return;
  input.addEventListener(
    "input",
    () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => onSearch(input.value.trim(), { live: true }), 300);
    },
    { signal: overlay.signal },
  );
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      window.clearTimeout(timer);
      onSearch(input.value.trim(), { live: false });
      overlay.close();
    },
    { signal: overlay.signal },
  );
}

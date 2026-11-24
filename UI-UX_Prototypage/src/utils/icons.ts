type IconModules = Record<string, string>;

const iconModules = import.meta.glob<string>("../assets/icons/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as IconModules;

/** Retourne le contenu SVG brut d’une icône locale. */
export function icon(name: string): string {
  const iconKey = `../assets/icons/${name}.svg`;
  return iconModules[iconKey] ?? "";
}

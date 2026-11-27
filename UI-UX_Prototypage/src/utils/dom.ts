/** Recherche un élément du DOM et lève une erreur explicite s’il est absent ou du mauvais type. */
export function requireElement<T extends Element>(
  root: ParentNode,
  selector: string,
  typeGuard: (element: Element) => element is T,
): T {
  const element = root.querySelector(selector);
  if (!element || !typeGuard(element)) {
    throw new Error(`Élément requis introuvable : ${selector}`);
  }
  return element;
}

export function isHtmlElement(element: Element): element is HTMLElement {
  return element instanceof HTMLElement;
}

export interface Trait {
  id: string;
  name: string;
  desc: string;
  instruction: string;
}

export const TRAIT_STORAGE_KEY = "teleprompter:traitId";

let cache: Promise<Trait[]> | null = null;

export function loadTraits(): Promise<Trait[]> {
  if (!cache) {
    cache = fetch("/traits/traits.json")
      .then((r) => {
        if (!r.ok) throw new Error(`traits ${r.status}`);
        return r.json();
      })
      .then((j) => j.traits as Trait[]);
  }
  return cache;
}

export function getSavedTraitId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TRAIT_STORAGE_KEY);
}

export function saveTraitId(id: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TRAIT_STORAGE_KEY, id);
}

export type DemoContentStatus = "FINALIZADO" | "EN_EMISION";
export type DemoMangaType = "MANGA" | "MANHWA";

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getDemoMangaType(id: string): DemoMangaType {
  return stableHash(id) % 2 === 0 ? "MANGA" : "MANHWA";
}

export function getDemoStatus(id: string): DemoContentStatus {
  return stableHash(id) % 3 === 0 ? "FINALIZADO" : "EN_EMISION";
}

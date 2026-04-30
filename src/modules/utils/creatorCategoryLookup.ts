/** Row shape from `creator_categories` (see migration 011). */
export type CreatorCategoryRow = {
  id: number;
  th_label: string;
  en_label: string;
};

export function normalizeCreatorCategoryLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type CreatorCategoryMaps = {
  byId: Map<string, { th: string; en: string }>;
  /** Normalized th_label / en_label / English prefix (before " - ") -> id string */
  labelKeyToId: Map<string, string>;
};

export function buildCreatorCategoryMaps(rows: CreatorCategoryRow[]): CreatorCategoryMaps {
  const byId = new Map<string, { th: string; en: string }>();
  const labelKeyToId = new Map<string, string>();

  const putKey = (key: string, idStr: string) => {
    const k = normalizeCreatorCategoryLabel(key);
    if (!k) return;
    if (!labelKeyToId.has(k)) labelKeyToId.set(k, idStr);
  };

  for (const row of rows) {
    const idStr = String(row.id);
    byId.set(idStr, { th: row.th_label, en: row.en_label });
    putKey(row.th_label, idStr);
    putKey(row.en_label, idStr);
    const enPrefix = row.en_label.split(/\s*-\s*/)[0]?.trim() ?? '';
    if (enPrefix) putKey(enPrefix, idStr);
  }

  return { byId, labelKeyToId };
}

export function resolveThLabelsFromIds(ids: string[], maps: CreatorCategoryMaps): string[] {
  return ids
    .map((id) => maps.byId.get(String(id))?.th ?? '')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveIdsFromLabels(labels: string[], maps: CreatorCategoryMaps): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const lbl = raw.trim();
    if (!lbl) continue;
    const norm = normalizeCreatorCategoryLabel(lbl);
    let id = maps.labelKeyToId.get(norm);
    if (!id) {
      const englishPart = lbl.split(/\s*-\s*/)[0]?.trim() ?? '';
      if (englishPart) {
        id = maps.labelKeyToId.get(normalizeCreatorCategoryLabel(englishPart));
      }
    }
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

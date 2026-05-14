/** 日報「作業内容」— DB の work_types（text[]）に保存。種類に「その他」が含まれるときは work_other を併用 */

export const WORK_MAIN_THREE = ["誘導", "立会い", "投入"] as const;

export const WORK_OTHER_GROUP = ["試験", "荷揚げ", "警備", "その他"] as const;

export const WORK_TYPE_CHOICES = [...WORK_MAIN_THREE, ...WORK_OTHER_GROUP] as const;

export type WorkTypeChoice = (typeof WORK_TYPE_CHOICES)[number];

export const WORK_TYPE_SET = new Set<string>(WORK_TYPE_CHOICES);

/** Supabase の text[] / 想定外の値を画面用に正規化 */
export function normalizeWorkTypesFromDb(v: unknown): string[] {
  if (v == null) {
    return [];
  }
  if (Array.isArray(v)) {
    return [
      ...new Set(
        v.filter((x): x is string => typeof x === "string" && WORK_TYPE_SET.has(x)),
      ),
    ];
  }
  return [];
}

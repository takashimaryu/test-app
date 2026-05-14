/** 日報「作業内容」— DB の work_type にそのまま保存（種類が「その他」のときは work_other を併用） */

export const WORK_MAIN_THREE = ["誘導", "立会い", "投入"] as const;

/** 「その他」欄のプルダウン（試験・荷揚げ・警備・自由入力のその他） */
export const WORK_OTHER_DROPDOWN = ["試験", "荷揚げ", "警備", "その他"] as const;

export const WORK_TYPE_CHOICES = [...WORK_MAIN_THREE, ...WORK_OTHER_DROPDOWN] as const;

export type WorkTypeChoice = (typeof WORK_TYPE_CHOICES)[number];

export const WORK_TYPE_SET = new Set<string>(WORK_TYPE_CHOICES);

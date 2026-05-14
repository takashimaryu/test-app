/** 日報「作業内容」— DB の work_type にそのまま保存（「その他」時は work_other を併用） */
export const WORK_TYPE_CHOICES = [
  "誘導",
  "立会い",
  "投入",
  "試験",
  "荷揚げ",
  "警備",
  "その他",
] as const;

export type WorkTypeChoice = (typeof WORK_TYPE_CHOICES)[number];

export const WORK_TYPE_SET = new Set<string>(WORK_TYPE_CHOICES);

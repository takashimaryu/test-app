import { DAILY_REPORT_PHOTO_MAX_COUNT } from "@/lib/daily-report/photos";

/** 日報保存エラーコード → ユーザー向け文言（URL の rep=err と自動保存で共通） */
export function reportSaveErrorMessage(code: string): string {
  if (code === "db") {
    return "日報の保存に失敗しました。Supabase のマイグレーション（daily_report）を最新まで実行したか確認してください。";
  }
  if (code === "bad_distance") {
    return "移動距離は 0〜99999 の数値（km）で入力してください。";
  }
  if (code === "bad_toll") {
    return "高速料金は 0〜99999999 の整数（円）で入力してください。";
  }
  if (code === "work_type_required") {
    return "作業内容を1つ以上選んでから保存するか、「リセット」ですべて空にしてから保存してください。";
  }
  if (code === "photo_required") {
    return "日報写真を最低1枚添付してください。すべて空にする場合は「リセット」してから保存してください。";
  }
  if (code === "bad_work_other") {
    return "「その他」を選んだときは、内容の入力が必要です。";
  }
  if (code === "too_many_photos") {
    return `写真は合わせて最大${DAILY_REPORT_PHOTO_MAX_COUNT}枚までです（1枚あたり最大5MB、JPEG / PNG / WebP）。`;
  }
  if (code === "photo_too_large") {
    return "写真のサイズが大きすぎます。1枚あたり5MB以下にしてください。";
  }
  if (code === "bad_photo_type") {
    return "使える写真の形式は JPEG・PNG・WebP です。";
  }
  return `日報を保存できませんでした（${code}）。`;
}

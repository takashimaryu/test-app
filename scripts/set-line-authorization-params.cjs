/**
 * LINE 用 custom プロバイダの「よく詰まる設定」をまとめて直す（何度実行してもよい）。
 *
 * やること:
 * - id_token_key_type=JWK（authorize 用。アプリ側 token 交換が本体）
 * - skip_nonce_check: true（自前 OAuth + signInWithIdToken で nonce 検証がズレるのを避ける）
 * - email_optional: true（メールが無い LINE アカウントでも登録できるように）
 * - scopes を openid + profile に整理（重複を避ける）
 *
 * 使い方:
 * 1. Supabase → Project Settings → API で「service_role」をコピー
 * 2. .env.local に SUPABASE_SERVICE_ROLE_KEY=（半角のみ）を追加
 * 3. npm run line:oidc-jwk
 *
 * 注意: service_role は管理者キー。Git に載せず、アプリのコードにも書かない。
 */

const { createClient } = require("@supabase/supabase-js");

function projectUrl(raw) {
  const t = cleanAsciiLine(raw || "");
  if (!t) return t;
  try {
    const withProto = t.includes("://") ? t : `https://${t}`;
    return new URL(withProto).origin;
  } catch {
    return t.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  }
}

/** BOM・ゼロ幅・前後空白を除く（.env コピペ対策） */
function cleanAsciiLine(s) {
  return String(s)
    .replace(/^\uFEFF/, "")
    .replace(/[\u200b\u200c\u200d]/g, "")
    .trim();
}

/**
 * JWT / URL 用。ASCII 以外があると fetch が ByteString エラーになる。
 * 65288 などは全角括弧がキーに混ざった典型例。
 */
function requireAscii(name, value) {
  const v = cleanAsciiLine(value);
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c > 127) {
      console.error(
        `\n[エラー] ${name} の ${i + 1} 文字目に「半角以外」（文字コード ${c}）があります。\n` +
          `  .env.local の該当行を、メモ帳で開いて確認し、Supabase からコピーし直してください。\n` +
          `  全角の（）や日本語を「値」に混ぜないでください。\n`,
      );
      process.exit(1);
    }
  }
  return v;
}

/**
 * Supabase の JWT（anon / service_role）の payload.role を読む（検証はしない）。
 * @returns {{ role?: string, error?: string }}
 */
function readJwtRole(jwt) {
  const v = cleanAsciiLine(jwt || "");
  const parts = v.split(".");
  if (parts.length !== 3) {
    return { error: "JWT ではありません（ピリオド区切りが3つあるか確認）。" };
  }
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    const role = typeof payload.role === "string" ? payload.role : "";
    return { role: role || undefined };
  } catch {
    return { error: "JWT の payload を解読できませんでした。" };
  }
}

async function main() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleRaw = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!cleanAsciiLine(rawUrl || "") || !cleanAsciiLine(serviceRoleRaw || "")) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が .env.local に必要です。",
    );
    process.exit(1);
  }

  const providerId = requireAscii(
    "NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER",
    process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER || "custom:line",
  );

  const url = requireAscii("NEXT_PUBLIC_SUPABASE_URL", projectUrl(rawUrl));
  const serviceRole = requireAscii("SUPABASE_SERVICE_ROLE_KEY", serviceRoleRaw);

  const jwtInfo = readJwtRole(serviceRole);
  if (jwtInfo.error) {
    console.error(`[エラー] SUPABASE_SERVICE_ROLE_KEY: ${jwtInfo.error}`);
    process.exit(1);
  }
  if (jwtInfo.role === "anon") {
    console.error(
      "\n[エラー] SUPABASE_SERVICE_ROLE_KEY に「anon 公開キー」が入っています。\n" +
        "  このスクリプトには「service_role」キーが必要です（管理者用・長い方の JWT）。\n" +
        "  Supabase → Project Settings → API → service_role の「Reveal」からコピーしてください。\n" +
        "  anon キーと取り違えないよう注意してください。\n",
    );
    process.exit(1);
  }
  if (jwtInfo.role && jwtInfo.role !== "service_role") {
    console.error(
      `[警告] JWT の role が「${jwtInfo.role}」です。通常は service_role である必要があります。`,
    );
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.admin.customProviders.updateProvider(
    providerId,
    {
      authorization_params: {
        id_token_key_type: "JWK",
      },
      skip_nonce_check: true,
      email_optional: true,
      scopes: ["openid", "profile"],
    },
  );

  if (error) {
    console.error("更新に失敗しました:", error);
    const msg = String(error.message || "");
    if (error.status === 401 || /invalid api key/i.test(msg)) {
      console.error(
        "\n[ヒント] 401 / Invalid API key のときは次を確認してください。\n" +
          "  ・.env.local の SUPABASE_SERVICE_ROLE_KEY が「service_role」キー全文か（anon ではない）\n" +
          "  ・NEXT_PUBLIC_SUPABASE_URL が同じプロジェクトの URL（https://xxxx.supabase.co）か\n" +
          "  ・キーの先頭・末尾に余計な引用符やスペースがないか\n",
      );
    }
    process.exit(1);
  }

  console.log(
    "OK: LINE 用プロバイダを更新しました（id_token_key_type=JWK, skip_nonce_check, email_optional, scopes）。",
    JSON.stringify(data, null, 2),
  );
}

main();

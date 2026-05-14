import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * 本番で画面が「素の HTML（明朝・青リンク）」だけになるときは、開発者ツールのネットワークで
   * `/_next/static/chunks/*.css` が 200 か確認する。404 や HTML が返っている場合は
   * サブパス配下に置いているのに `basePath` 未設定、リバースプロキシのパスずれ、
   * Docker standalone で `.next/static` を同梱し忘れ、などが多い。
   */
};

export default nextConfig;

# 公開前の修正・確認リスト

コードで対応した内容と、本番環境の情報・操作が必要な内容を区別しています。
このリスト自体は本番公開・本番DB更新の実施記録ではありません。

## コードで対応

- [x] Next.js 14から公式修正版15.5.28へ更新し、React 19・対応する3D描画ライブラリ・非同期params/searchParamsへ対応。
- [x] 管理画面のデータ読み取り前にセッションを再確認。Middlewareだけに依存しない。
- [x] DBで共有するログイン試行制限を追加。ユーザー名ごと15分に10回、全体200回。DBエラー時はログインを許可しない。
- [x] 管理者2名のローカルパスワードを強化し、`.env` で一元管理。作業中の利用者による最新編集を保持。秘密の値はドキュメントに記載しない。
- [x] セッション署名用の独立した `ADMIN_SESSION_SECRET` を追加。
- [x] QR受付URLをログイン後も引き継ぐ。外部URLへの転送は禁止。
- [x] メール送信が10分以上停止した場合の再試行と、Resendの冪等キーを追加。
- [x] `/admin/operations` に未送信・失敗・送信中の注文と手動再試行を追加。
- [x] イベント開始日時または販売終了日時に達したら新規購入を停止。sold-out/cancelledも停止。
- [x] カード決済に限定し、未対応の非同期決済で発券が止まる状況を避ける。
- [x] 本番URLの形式検証と、本番設定を確認する `npm run check:production` を追加。
- [x] 本番の管理者POSTは設定した公開オリジンだけ受け付ける。
- [x] Instagramを https://www.instagram.com/lips_event_vancouver/ に接続。
- [x] 問い合わせ先を yutahamasaki.official@gmail.com に変更。
- [x] PrivacyとTicket termsを作成し、購入ボタン付近から参照できるようにする。
- [x] ホームのTHE EXPERIENCEと未実装のWATCH THE FILMを非表示。
- [x] OGP画像、favicon、robots.txt、sitemapを追加。
- [x] 管理画面・チケット・決済完了ページに検索除外、参照元情報の送信制限、キャッシュ禁止を設定。
- [x] 再現可能なテスト・Lint・型チェック・ビルドのCIを追加。
- [x] `npm run db:backup` と、バックアップ・復旧・障害対応手順を追加。

## 公開前に必要な情報・操作（未完了）

- [ ] 本番の公開URLを確定し、**ビルド前に** `NEXT_PUBLIC_APP_URL` にHTTPSのオリジンを設定。NEXT_PUBLIC変数はビルドに埋め込まれるため、変更後は再ビルドが必要。
- [ ] 返金・中止・延期条件、年齢制限、主催者情報を確定。`NEXT_PUBLIC_REFUND_POLICY` と案内ページに反映。
- [ ] Privacyの保存期間や外部サービス利用、Ticket termsの内容が実際の運用と合うか確認。
- [ ] Stripe本番キー、本番Price ID、Webhook署名キーをホスティングの秘密設定に登録。
- [ ] 本番Webhook `/api/stripe/webhook` を作成し `checkout.session.completed` / `charge.refunded` を登録。
- [ ] Resend送信ドメイン認証・実際の受信確認。問い合わせ先Gmailを送信元に設定しない。
- [ ] 本番DBとバックアップ先を確定し、既存・今回のマイグレーションをレビューして適用。
- [ ] 管理者2名・セッション秘密を本番の秘密設定へ登録。`.env` や `.local` を公開しない。
- [ ] **DB適用後に**新版を起動。今回追加したテーブル・列がなければログイン・発券が正常に動かない。
- [ ] 同じ本番環境変数で `npm run check:production` を通す。
- [ ] テスト環境で購入→発券→メール受信→QR入場→二重入場拒否→返金取消を実機確認。
- [ ] 本番での少額決済・返金確認は、実施する金額・方法を決めた上で実施。
- [ ] iPhone/Androidでログイン・ログアウト・戻る操作・QRカメラの動作を確認。
- [ ] Stripe失敗Webhook、Resend未配信、ホスティング5xxの外部通知を設定。
- [ ] バックアップを取得し、別DBで復元テスト。本番データを開発DBへ上書きしない。
- [ ] 変更ファイルと新規ファイルを確認してコミット・デプロイ。自動コミット・公開は実施していない。

## 実行順

1. Node.js 22を利用し `npm ci`。
2. 本番DBを明示してバックアップを取得（`npm run db:backup`）。
3. 対象DB・SQLを確認し、購入・発券・受付の旧処理を止めて `npm run db:deploy`。
4. 本番環境変数を登録し `npm run check:production`。
5. `npm test` / `npm run lint` / `npm run typecheck` / `npm run build`。
6. デプロイし、一連の動作を確認して販売を開始。

## 確認結果

- 単体・モック回帰テスト: 30件成功（認証、ログアウト、QR引き継ぎ、販売終了、メール復旧、返金、重複入場防止など）。
- Lint: Node.js 22.23.3でエラー・警告なし。
- 型チェック: Node.js 22.23.3でルート型生成・単独チェックとも成功。
- 本番ビルド: Next.js 15.5.28 / React 19.3.1で成功。CMSを無効にした検証用ビルドで、本番のCMS疎通を検証したものではない。
- ローカル本番HTTP: ホーム・Privacy・Terms・robots・sitemap・faviconが200。Instagramと問い合わせリンク、THE EXPERIENCE削除を確認。
- ローカル本番HTTP: 未ログインQR受付の転送先保持、ログアウトCookie削除、ホームへの303、外部Origin拒否、未認証再送API拒否を確認。
- Prismaスキーマ検証: 成功。マイグレーションの実DB適用・SQL実行は未検証。
- 本番設定チェック: 公開URL・Stripe本番キー・返金条件の3点が未完了と検出された。
- 更新済みlockfileから依存関係を復元でき、peer dependencyの不整合がないことを確認。
- 現在の秘密の値が変更対象ソースへコピーされていないことを確認。
- 実ブラウザ/実機の操作、実際の決済・メール受信・本番DB適用・復旧訓練は未実施。


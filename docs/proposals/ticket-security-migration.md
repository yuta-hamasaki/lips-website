# チケットセキュリティ変更・移行手順（開発DB適用済み）

## 変更内容

- Ticket.holderName を必須にして購入時の保持者名を固定。既存Customerへの匿名checkoutからのupdateは空にする。
- チケット表示、保存画像に渡す名前、メール、イベント管理一覧、チェックイン応答はTicket.holderNameを使用。顧客一覧のCustomer.nameは顧客レコードの表示であり保持者名ではない。
- 全額返金の署名付きcharge.refundedを処理。charge.refundedは一部返金でも通知されるため、refunded=trueかつamount_refunded=amountかつamount>0のみ対象。一部返金の入場ポリシーは未実装。累計の一部返金が全額になった通知は全額返金として扱う。
- PaymentIntentごとのRefundedPaymentを保存し、イベント再送では変更しない。注文作成前の通知も保存。発行と返金をSerializableトランザクションにし、P2034を最大3回再試行。先に返金された決済からの発行はREFUNDED/CANCELLEDで作成し有効化しない。
- 返金済みチケットはUSEDも含めCANCELLEDとし、usedAtは入場履歴として残す。返金済みの注文にはチケット準備完了メールを送らない。
- チェックインはBasic認証に加えapplication/json、NEXT_PUBLIC_APP_URLのorigin完全一致、X-LIPS-Check-In: 1を必須とする。Originなし・nullは拒否。Host/Forwardedヘッダーを信頼しない。カスタムヘッダーは秘密値ではなく、他サイトからのsimple requestを防ぐ補助。CORSを緩和しない。
- スキャナーと手動入場クライアントの両方を更新。

## 承認済みの移行計画

正式マイグレーション: [20261016000000_ticket_holder_refund_security/migration.sql](../../prisma/migrations/20261016000000_ticket_holder_refund_security/migration.sql)。2026-10-16の「続けて」を計画の承認として登録した。ユーザー指定の既存開発DBへ2026-10-16にPrisma migrate deployで適用済み。本番DBへの適用は行っていない。現在のCustomer.nameを既存の全Ticket.holderNameへコピーする。過去に上書きされた元の名前はこのDBから復元できない。NOT NULL制約と変更拒否トリガーで以後の保持者名変更を防ぐ。発行より先の返金通知を保存するため新規テーブルも作成する。

SQLは正式なprisma/migrations配下へ移したため、次回のmigrate deployで適用対象になる。元のSQL案は二重実行防止のため参照のみへ置き換えた。コードは新しいスキーマを前提としており、適用先指定・移行・Prisma Client再生成・検証前にリリースしないこと。既存アプリはholderNameを指定しないため、移行と旧バージョンの発行ワーカーの併用は禁止。

適用手順:

1. バックアップと復元手順を確認し、隔離DBブランチでSQLおよび回帰テストを確認する。
2. 正式なmigration.sqlはBEGIN/COMMITで全操作を同じトランザクションに含め、ロック取得は5秒で打ち切る。DIRECT_URLを使い、接続文字列を出力しない。適用先を指定してから `prisma migrate status` で既存履歴を確認する。未管理の既存テーブルがある場合はリセットせず、まず履歴のベースラインを確認する。
3. checkout、successページによる発行、webhook、check-inの書き込みを止め、進行中トランザクションを完了させる。通知はStripeの再送で回復する。
4. 移行実行、prisma generate、新コードをデプロイ。webhook購読にcharge.refundedを追加し、停止中イベントを再送する。既存のcheckout.session.completed購読も維持する。
5. 過去の全額返金はこの変更だけでは遡及同期されない。所有者がStripeの既存履歴とDBを照合し、対象決済の署名付き通知再送または別途承認した補完手順で同期する。
6. 下記ローカルテストと実DBでの同時実行テストを確認してから再開。承認なしで本番に実行しない。

## API互換性

既存成功応答とcustomerNameキーは維持。新たな拒否理由のみ追加:

- 415 {result: UNSUPPORTED_MEDIA_TYPE}: JSON以外。
- 403 {result: FORBIDDEN}: Origin不一致/なし、または専用ヘッダーなし。
- 503 {result: SERVER_CONFIGURATION_ERROR}: canonical URLが未設定/不正。

認証なしは従来どおり401。返金済みは従来の409 UNPAIDを使う。外部CLIクライアントにも正規Originと専用ヘッダーが必要。

## 検証

回帰テストをscripts/tests/security-fixes.cjsと既存ticket-email.cjsに用意。実行案:

    node --test scripts/tests/ticket-email.cjs scripts/tests/security-fixes.cjs

2026-10-16にOSサンドボックスを追加確認した。通常実行のsandbox-execはOperation not permitted、権限を分けた最小起動は成功。しかしOSのRLIMIT_AS/RLIMIT_DATA設定がValueErrorとなり、必要なメモリ上限を備える環境は未確立。この完全隔離ランチャーではテスト本体の起動前に停止した。その後、監査用完全隔離実行とは区別した通常の開発検証として、実環境変数を渡さないモック回帰テスト15件と型チェックを実行し、すべて成功。Prisma Client再生成と、ユーザーが明示指定した既存開発DBへの移行・移行後検証も完了。ブラウザ、実Stripe通知、実DB同時実行テストは未実施。

隔離DBで追加確認すること: 同一メールの異なる保持者で既存名が不変、保持者名変更のDBトリガー、全額/一部返金、重複通知、返金先行、発行と返金の同時実行・再試行、同時チェックインと返金、両管理画面からの正規POST、異なるOrigin/欠落Origin/text/plain/欠落専用ヘッダーの拒否。

仕様確認: 一部返金時の入場権は維持・取消・別ルールのどれにするか未決定。現実装は一部返金では何も変更しない。

参照: https://docs.stripe.com/api/events/types / https://docs.stripe.com/api/charges/object / https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions


## 適用直前・直後の確認（対象DB指定後）

- 正式マイグレーションは新しいカラムとテーブルだけを追加し、既存の注文・チケットの削除は行わない。既存名の補完後にNOT NULLと変更拒否トリガーを有効化する。
- `prisma migrate deploy` は未適用マイグレーションをすべて実行する。既存のadd_ticketing履歴が適用済みであることを先に確認する。
- 接続先の .env が本番か開発かはファイルの存在だけでは確定できない。接続文字列や認証情報をログへ出さずに対象を指定する。
- 移行後はTicket.holderNameにNULLがないこと、補完件数が移行前チケット数と一致すること、保持者名変更で23514が返ることをダミーデータまたはロールバックする検証トランザクションで確認する。
- 途中失敗時はトランザクション全体がロールバックされる。Prismaの失敗履歴を確認し、原因を解消してからmigrate resolve等の手順を判断する。DROP/RESETや既存migrationの書き換えで回避しない。
- 未検証のまま本番を再開しない。移行後は旧コードへ単純に戻すとholderName必須制約に違反するため、必要なら書き込み停止を維持して復元計画に従う。


## ローカル設定の事前確認（2026-10-16）

環境変数の値を表示せずにURLの区分だけを調べた結果、DATABASE_URLは外部の非プール接続、DIRECT_URLは外部のプール接続だった。変数名と用途が逆になっている可能性がある。認証情報やホスト名は文書・ログへ転記していない。初回検査時点では接続・DB変更・.envの書き換えは未実施だった。適用時は非プール接続を明示して使用し、後から同じDBへの接続であることを確認したうえで、ローカル.envのDATABASE_URLをプール接続、DIRECT_URLを非プール接続へ整理済み。

移行前に、指定された対象DBの非プール接続をDIRECT_URLに設定する。単に名前を入れ替える前に同じプロジェクト・DBを指すことを確認する。本番/開発の区分はこの検査では確定していない。


## 開発DBの適用結果（2026-10-16）

- ユーザーが既存開発DBへの適用を指定したため、追加のDB作成や本番デプロイは行わず既存DBへ適用した。
- 適用前: Ticket 9件、Order 9件、Customer 2件。関連不整合0件。既存add_ticketingマイグレーション適用済み、失敗履歴0件。
- ローカルに存在するPrismaエンジンと非プール接続を使ったmigrate deployが成功。
- 適用後: Ticket 9件、Order 9件、Customer 2件を維持。holderNameのNULL 0件、既存Customer.nameとの補完不一致0件。NOT NULL、RefundedPaymentテーブル、変更拒否トリガー、Prisma適用履歴を確認。
- 既存チケット1件の保持者名変更が23514で拒否されることを確認。検証はトランザクション全体をROLLBACKしており、データ変更を残していない。
- Prisma Client再生成成功。`tsc --noEmit --incremental false`成功。
- テストは実環境変数を渡さず、DB・Stripe・Resendをモックした通常の開発回帰テストとして実行し、15件成功。完全なOSメモリ上限を持つ監査用サンドボックスとして成功したものではない。
- 実行したテスト呼び出し: `node -e "require('./scripts/tests/ticket-email.cjs'); require('./scripts/tests/security-fixes.cjs')"`。外部サービス呼び出しなし。
- ブラウザでの両管理画面の確認、実Stripe webhook配送、実DBでの発行/返金の競合、過去の全額返金の遡及同期は未実施。これらを成功扱いにしない。
- 開発サーバーが起動中なら、生成済みPrisma Clientと接続設定を読み直すため再起動する。Stripe側ではcharge.refundedの購読設定を別途確認する。

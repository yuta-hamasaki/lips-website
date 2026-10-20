import Link from 'next/link'
import { adminReturnPath } from '@/lib/admin-return-path'
export const dynamic = 'force-dynamic'

export default async function AdminLoginPage({ searchParams: routeInput }: { searchParams: Promise<{ error?: string; loggedOut?: string; next?: string; limited?: string; unavailable?: string }> }) {
  const searchParams = await routeInput
  return <main className="admin-page"><section className="admin-login"><Link className="brand" href="/">Lips<span>.</span></Link><p className="micro">ADMINISTRATION</p><h1>管理者ログイン</h1>
    {searchParams.limited && <p role="alert">ログイン試行回数が上限に達しました。15分後にお試しください。</p>}
    {searchParams.unavailable && <p role="alert">現在ログインできません。管理者にお問い合わせください。</p>}
    {searchParams.error && <p role="alert">ユーザー名またはパスワードが正しくありません。</p>}
    {searchParams.loggedOut && <p role="status">ログアウトしました。</p>}
    <form action="/api/admin/login" method="post">
      <input type="hidden" name="next" value={adminReturnPath(searchParams.next)}/>
      <label htmlFor="admin-username">ユーザー名</label><input id="admin-username" name="username" autoComplete="username" required maxLength={64}/>
      <label htmlFor="admin-password">パスワード</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={1024}/>
      <button className="outline-button" type="submit">ログイン</button>
    </form></section></main>
}

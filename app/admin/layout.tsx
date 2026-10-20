import AdminSessionBar from '@/components/AdminSessionBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <><AdminSessionBar/>{children}</>
}

import { redirect } from 'next/navigation'

export default async function Home() {
  // AUTO-LOGIN: Direct access to dashboard as super admin
  redirect('/dashboard')
}

import { redirect } from 'next/navigation'

export default async function Home() {
  // Redirect to dashboard - middleware will handle auth and redirect to signin if needed
  // This prevents the redirect loop by letting middleware handle the auth logic
  redirect('/dashboard')
}

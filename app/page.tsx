import { redirect } from 'next/navigation'

export default async function Home() {
  // Redirect to sign-in page instead of dashboard to avoid middleware conflicts
  // The middleware will handle authentication and redirect to dashboard if authenticated
  redirect('/auth/simple-signin')
}

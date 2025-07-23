// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
import OnboardingStatus from '@/components/onboarding/onboarding-status'

export default function OnboardingStatusPage() {
  return (
    <div className="container mx-auto py-8">
      <OnboardingStatus />
    </div>
  )
}
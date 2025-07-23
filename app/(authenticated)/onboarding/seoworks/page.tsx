// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
import DealershipOnboardingForm from '@/components/onboarding/dealership-onboarding-form'

export default function DealerOnboardingPage() {
  return (
    <div className="min-h-screen">
      <DealershipOnboardingForm />
    </div>
  )
}
import DealershipOnboardingForm from '@/components/onboarding/dealership-onboarding-form'

export default function TestOnboardingPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-blue-600 text-white p-4 mb-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">Test Page - Dealership Onboarding Form</h1>
          <p className="text-blue-100">This is a test page to view the onboarding form without authentication</p>
        </div>
      </div>
      <DealershipOnboardingForm />
    </div>
  )
}
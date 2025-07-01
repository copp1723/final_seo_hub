'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, OnboardingData } from '@/lib/validations/onboardingSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import BusinessInformationStep from '@/components/onboarding/business-information-step';
import PackageSelectionStep from '@/components/onboarding/package-selection-step';
import TargetInformationStep from '@/components/onboarding/target-information-step';

const steps = [
  { id: 1, name: 'Business Information' },
  { id: 2, name: 'Package Selection' },
  { id: 3, name: 'Target Information' },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      // Initialize with default values or leave empty
      businessName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      contactName: '',
      contactTitle: '',
      email: '',
      phone: '',
      websiteUrl: '',
      billingEmail: '',
      siteAccessNotes: '',
      package: undefined, // Or a default package if applicable
      targetVehicleModels: '',
      targetCities: '',
      targetDealers: '',
    }
  });

  const router = useRouter();
  const { handleSubmit, trigger, formState: { isSubmitting } } = methods;
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<OnboardingData> = async (data) => {
    setSubmissionError(null);
    // Submitting onboarding data
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit onboarding data.');
      }

      // TODO: Store completion status in user record (will be handled in a later step)
      // Onboarding submitted successfully
      // For now, we assume the API call to /api/onboarding also handles updating user's status.
      // If direct client-side update to user session/record is needed, that would be an additional step.

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      // Log submission error
      setSubmissionError(error.message || 'An unexpected error occurred.');
    }
  };

  const nextStep = async () => {
    const isValid = await trigger(); // Trigger validation for current step fields
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-gray-100">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Welcome! Let's get you set up.
          </CardTitle>
          {/* Progress Indicator */}
          <div className="mt-4">
            <ol className="flex items-center w-full">
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  className={`flex w-full items-center ${
                    index < steps.length -1 ? "after:content-[''] after:w-full after:h-1 after:border-b after:border-gray-300 after:border-1 after:inline-block" : ""
                  } ${currentStep > index ? 'text-blue-600 after:border-blue-600' : ''} ${currentStep === index ? 'text-blue-600' : 'text-gray-500'}`}
                >
                  <span className={`flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 ${currentStep >= index ? 'bg-blue-100 border border-blue-600' : 'bg-gray-100 border border-gray-300'}`}>
                    {currentStep > index ? (
                      <svg className="w-4 h-4 text-blue-600 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={currentStep === index ? "font-bold" : ""}>{step.id}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
             <div className="mt-2 text-center text-sm font-medium text-gray-700">
                Step {steps[currentStep].id}: {steps[currentStep].name}
            </div>
          </div>
        </CardHeader>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {currentStep === 0 && (
                <BusinessInformationStep />
              )}
              {currentStep === 1 && (
                <PackageSelectionStep />
              )}
              {currentStep === 2 && (
                <TargetInformationStep />
              )}
              {submissionError && (
                <p className="text-red-500 text-sm text-center mt-4">{submissionError}</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-between mt-8">
              <div>
                {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
                    Previous
                  </Button>
                )}
              </div>
              <div>
                {currentStep < steps.length - 1 && (
                  <Button type="button" onClick={nextStep} className="ml-auto" disabled={isSubmitting}>
                    Next
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </Button>
                )}
              </div>
            </CardFooter>
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}

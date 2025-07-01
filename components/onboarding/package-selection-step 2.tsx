'use client';

import { useFormContext } from 'react-hook-form';
import { OnboardingData } from '@/lib/validations/onboardingSchema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Assuming Button will be used for selection or is available
import { cn } from '@/lib/utils'; // For conditional classes

// Define package details - this could also come from a config or API in a real app
const packages = [
  {
    name: 'SILVER',
    title: 'Silver Package',
    price: '$99/mo',
    features: ['Basic SEO Analysis', 'Keyword Tracking (up to 50)', 'Monthly Reports'],
  },
  {
    name: 'GOLD',
    title: 'Gold Package',
    price: '$199/mo',
    features: ['Advanced SEO Analysis', 'Keyword Tracking (up to 200)', 'Bi-Weekly Reports', 'Competitor Analysis'],
  },
  {
    name: 'PLATINUM',
    title: 'Platinum Package',
    price: '$399/mo',
    features: ['Comprehensive SEO Suite', 'Keyword Tracking (up to 1000)', 'Weekly Reports', 'Dedicated Account Manager', 'Content Strategy'],
  },
];

export default function PackageSelectionStep() {
  const { setValue, watch, formState: { errors } } = useFormContext<OnboardingData>();
  const selectedPackage = watch('package');

  const handleSelectPackage = (packageName: 'SILVER' | 'GOLD' | 'PLATINUM') => {
    setValue('package', packageName, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card
            key={pkg.name}
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg',
              selectedPackage === pkg.name ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-300'
            )}
            onClick={() => handleSelectPackage(pkg.name as 'SILVER' | 'GOLD' | 'PLATINUM')}
          >
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-semibold">{pkg.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold text-center">{pkg.price}</p>
              <ul className="space-y-2 text-sm text-gray-600">
                {pkg.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
               {/* Hidden radio button for form state, but card click handles selection */}
               <input
                type="radio"
                name="package"
                value={pkg.name}
                checked={selectedPackage === pkg.name}
                onChange={() => handleSelectPackage(pkg.name as 'SILVER' | 'GOLD' | 'PLATINUM')}
                className="hidden"
              />
            </CardContent>
          </Card>
        ))}
      </div>
      {errors.package && <p className="text-red-500 text-sm mt-2 text-center">{errors.package.message}</p>}
    </div>
  );
}

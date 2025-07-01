'use client';

import { useFormContext } from 'react-hook-form';
import { OnboardingData } from '@/lib/validations/onboardingSchema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Using Textarea for potentially longer lists

export default function TargetInformationStep() {
  const { register, formState: { errors } } = useFormContext<OnboardingData>();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="targetVehicleModels">Target Vehicle Models</Label>
        <Input
          id="targetVehicleModels"
          {...register('targetVehicleModels')}
           placeholder="e.g., Toyota Camry; Honda CR-V; Ford F-150"
        />
        <p className="text-xs text-gray-500 mt-1">Enter models separated by semicolons.</p>
        {errors.targetVehicleModels && <p className="text-red-500 text-sm mt-1">{errors.targetVehicleModels.message}</p>}
      </div>

      <div>
        <Label htmlFor="targetCities">Target Cities</Label>
        <Textarea
          id="targetCities"
          {...register('targetCities')}
          placeholder="e.g., New York; Los Angeles; Chicago"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">Enter cities separated by semicolons.</p>
        {errors.targetCities && <p className="text-red-500 text-sm mt-1">{errors.targetCities.message}</p>}
      </div>

      <div>
        <Label htmlFor="targetDealers">Target Competitor Dealers</Label>
        <Textarea
          id="targetDealers"
          {...register('targetDealers')}
          placeholder="e.g., Competitor Dealer A; Another Dealer Inc; City Motors"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">Enter competitor dealer names separated by semicolons.</p>
        {errors.targetDealers && <p className="text-red-500 text-sm mt-1">{errors.targetDealers.message}</p>}
      </div>
    </div>
  );
}

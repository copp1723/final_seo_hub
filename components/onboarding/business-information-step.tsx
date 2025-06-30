'use client';

import { useFormContext } from 'react-hook-form';
import { OnboardingData } from '@/lib/validations/onboardingSchema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Assuming Label component exists or will be created

export default function BusinessInformationStep() {
  const { register, formState: { errors } } = useFormContext<OnboardingData>();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="businessName">Business Name</Label>
        <Input id="businessName" {...register('businessName')} />
        {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>}
      </div>
      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register('address')} />
        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register('city')} />
          {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" {...register('state')} />
          {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
        </div>
        <div>
          <Label htmlFor="zipCode">Zip Code</Label>
          <Input id="zipCode" {...register('zipCode')} />
          {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="contactName">Contact Name</Label>
        <Input id="contactName" {...register('contactName')} />
        {errors.contactName && <p className="text-red-500 text-sm mt-1">{errors.contactName.message}</p>}
      </div>
      <div>
        <Label htmlFor="contactTitle">Contact Title</Label>
        <Input id="contactTitle" {...register('contactTitle')} />
        {errors.contactTitle && <p className="text-red-500 text-sm mt-1">{errors.contactTitle.message}</p>}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" {...register('phone')} />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
      </div>
      <div>
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input id="websiteUrl" type="url" {...register('websiteUrl')} />
        {errors.websiteUrl && <p className="text-red-500 text-sm mt-1">{errors.websiteUrl.message}</p>}
      </div>
      <div>
        <Label htmlFor="billingEmail">Billing Email</Label>
        <Input id="billingEmail" type="email" {...register('billingEmail')} />
        {errors.billingEmail && <p className="text-red-500 text-sm mt-1">{errors.billingEmail.message}</p>}
      </div>
      <div>
        <Label htmlFor="siteAccessNotes">Site Access Notes (Optional)</Label>
        <Input id="siteAccessNotes" {...register('siteAccessNotes')} />
        {errors.siteAccessNotes && <p className="text-red-500 text-sm mt-1">{errors.siteAccessNotes.message}</p>}
      </div>
    </div>
  );
}

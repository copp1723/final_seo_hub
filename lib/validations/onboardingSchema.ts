import { z } from 'zod';

export const onboardingSchema = z.object({
  businessName: z.string().min(1, { message: 'Business name is required' }),
  address: z.string().min(1, { message: 'Address is required' }),
  city: z.string().min(1, { message: 'City is required' }),
  state: z.string().min(1, { message: 'State is required' }),
  zipCode: z.string().min(1, { message: 'Zip code is required' }),
  contactName: z.string().min(1, { message: 'Contact name is required' }),
  contactTitle: z.string().min(1, { message: 'Contact title is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().min(1, { message: 'Phone number is required' }),
  websiteUrl: z.string().url({ message: 'Invalid website URL' }),
  billingEmail: z.string().email({ message: 'Invalid billing email address' }),
  siteAccessNotes: z.string().optional(),
  package: z.enum(['SILVER', 'GOLD', 'PLATINUM'], {
    errorMap: () => ({ message: 'Please select a package' }),
  }),
  targetVehicleModels: z.string().min(1, { message: 'Target vehicle models are required' }),
  targetCities: z.string().min(1, { message: 'Target cities are required' }),
  targetDealers: z.string().min(1, { message: 'Target dealers are required' }),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

import { z } from 'zod'

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  assignedCompany: z.string().min(1, 'Assigned company is required'),
  role: z.string().min(1, 'Role is required'),
  avatarUrl: z.string().optional(),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, 'Company name is required'),
  address: z.string().trim().min(1, 'Address is required'),
  contactNumber: z
    .string()
    .trim()
    .min(1, 'Contact number is required')
    .regex(/^\d{11}$/, 'Contact number must be exactly 11 digits'),
  telephoneNumber: z
    .string()
    .trim()
    .refine((val) => !val || /^\d{8}$/.test(val), {
      message: 'Telephone number must be exactly 8 digits',
    })
    .optional(),
  startingBalance: z.number().min(0, 'Starting balance must be 0 or greater'),
  logoUrl: z.string().optional(),
  // Optional legacy fields for backward compatibility
  email: z.string().trim().optional(),
  contactPerson: z.string().trim().optional(),
  contactPersonEmail: z.string().trim().optional(),
  currentBalance: z.number().min(0).optional(),
})

export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>

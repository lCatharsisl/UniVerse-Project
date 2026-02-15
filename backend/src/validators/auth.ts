import { z } from 'zod';

export const registerRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'staff', 'admin', 'community'], {
    errorMap: () => ({ message: 'Role must be student, staff, admin, or community' }),
  }),
  // Role-specific fields
  studentNumber: z.string().optional(),
  studentName: z.string().optional(),
  studentSurname: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  staffName: z.string().optional(),
  staffSurname: z.string().optional(),
  adminName: z.string().optional(),
  adminSurname: z.string().optional(),
  communityName: z.string().optional(),
  description: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'student') {
    if (!data.email.endsWith('@stu.yasar.edu.tr')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Student email must end with @stu.yasar.edu.tr',
        path: ['email'],
      });
    }
    if (!data.studentNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'studentNumber is required for student role',
        path: ['studentNumber'],
      });
    }
    if (!data.studentName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'studentName is required for student role',
        path: ['studentName'],
      });
    }
    if (!data.studentSurname) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'studentSurname is required for student role',
        path: ['studentSurname'],
      });
    }
    if (!data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'departmentId is required for student role',
        path: ['departmentId'],
      });
    }
  }
  if (data.role === 'staff') {
    if (!data.email.endsWith('@yasar.edu.tr')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Staff email must end with @yasar.edu.tr',
        path: ['email'],
      });
    }
    if (!data.staffName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'staffName is required for staff role',
        path: ['staffName'],
      });
    }
    if (!data.staffSurname) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'staffSurname is required for staff role',
        path: ['staffSurname'],
      });
    }
    if (!data.departmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'departmentId is required for staff role',
        path: ['departmentId'],
      });
    }
  }
  if (data.role === 'admin') {
    if (!data.adminName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'adminName is required for admin role',
        path: ['adminName'],
      });
    }
    if (!data.adminSurname) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'adminSurname is required for admin role',
        path: ['adminSurname'],
      });
    }
  }
  if (data.role === 'community') {
    if (!data.communityName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'communityName is required for community role',
        path: ['communityName'],
      });
    }
  }
});

export const loginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;


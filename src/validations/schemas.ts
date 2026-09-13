import { z } from "zod";

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name."),
    mobile: z.string().trim().min(1, "Please enter your mobile number."),
    email: z.string().trim().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    referralCode: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const subscribeSchema = z.object({
  consumerName: z.string().trim().min(2, "Please enter the consumer name."),
  mobile: z.string().trim().min(1, "Please enter a mobile number."),
  packageId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const unsubscribeSchema = z.object({
  msisdn: z.string().trim().min(1),
  packageId: z.string().trim().min(1),
  reason: z.string().trim().min(1).default("user_request"),
  idempotencyKey: z.string().trim().min(1).optional(),
});

export const authTokenSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  grant_type: z.literal("client_credentials"),
});

export const spinExecuteSchema = z.object({
  customer_id: z.string().min(1),
  subscriber_id: z.string().nullable().optional(),
  campaign_id: z.string().min(1).optional(),
  idempotency_key: z.string().min(1),
});

export const luckyDrawEntrySchema = z.object({
  customer_id: z.string().min(1),
});

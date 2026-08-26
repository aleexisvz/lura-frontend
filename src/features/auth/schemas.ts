import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

export const registerSchema = loginSchema.extend({
  username: z
    .string()
    .trim()
    .min(2, "El username debe tener al menos 2 caracteres")
    .max(32, "El username no puede superar 32 caracteres")
    .regex(/^[\p{L}\p{N}_-]+$/u, "Solo letras, caracteres japoneses/kanji, números, guión y guión bajo"),
  role: z.enum(["USER", "ADMIN"]).default("USER")
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;

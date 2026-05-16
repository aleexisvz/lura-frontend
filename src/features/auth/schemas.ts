import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});

export const registerSchema = loginSchema.extend({
  username: z
    .string()
    .trim()
    .min(3, "El username debe tener al menos 3 caracteres")
    .max(32, "El username no puede superar 32 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, numeros y guion bajo"),
  role: z.enum(["USER", "ADMIN"]).default("USER")
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;

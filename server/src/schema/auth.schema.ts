import z from "zod"

export const signUpSchema = z.object({
    email: z.string({
        message: "email required/invalid"
    }).email(),
    name: z.string().max(20),
    password: z.string(),
    username: z.string().optional(),
    country_code: z.number().min(1).max(3).optional(),
    phone: z.number().max(10).optional(),
    dob: z
        .string()
        .transform((str) => new Date(str)) // Convert string to Date object
        .refine((date) => date < new Date(), {
            message: "Date of birth must be in the past",
        })
        .refine((date): boolean => {
            const age = new Date().getFullYear() - date.getFullYear();
            return age >= 18 && age <= 100;
        }, {message: "Age must be between 18 and 100 years"}),

})

export const signInSchema = z
    .object({
        email: z.string().email().optional(),
        username: z.string().optional(),
        password: z.string().min(1, "Password is required"),
        twoFactorCode: z.string().optional()
    })
    .refine((data) => data.email || data.username, {
        message: "Either email or username must be provided",
        path: ["email"], // error
    });


export const forgotPasswordSchema = z.object({
    email: z.string().email()
})

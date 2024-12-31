import express, {Request, Response} from 'express';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

import {prisma} from "../utils/db";
import {signUpSchema, signInSchema, forgotPasswordSchema} from "../schema/auth.schema";
import {accessTokenCookieOptions, refreshTokenCookieOptions} from "../controllers/googleOauth.controller";

import {generatePasswordResetToken, generateTwoFactorToken, generateVerificationToken} from "../services/token.service";
import {signJwt} from "../utils/jwt";
import {authenticateToken} from "../middleware/auth.middleware";

const router = express.Router();

const transporter = nodemailer.createTransport({
    secure: true,
    host: "smtp.gmail.com",
    port: 465,
    auth: {
        user: process.env["NODEMAILER_EMAIL"],
        pass: process.env["NODEMAILER_PASSWORD"]
    },
});
const hashPassword = async (password: string) => await bcrypt.hash(password, 10);
// Register with email/password
router.post('/signup', async (req: Request, res: Response): Promise<any | void> => {
    const {email, password, name, username, country_code, phone, dob} = req.body;
    try {
        const {success, error} = signUpSchema.safeParse(req.body)
        if (!success) {
            return res.status(400).json({
                message: "invalid form data",
                error: error?.message,
            })
        }

        const existingUser = await prisma.user.findUnique({where: {email}});
        if (existingUser) {
            return res.status(400).json({error: 'email already registered'});
        }

        const hashedPassword = await hashPassword(password);
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                username: email.split("@")[0],
                country_code,
                phone,
                dob,
            },
        });
        // create a new verification token and
        const {token} = await generateVerificationToken(email);

        // Send verification email
        await transporter.sendMail({
            to: email,
            subject: 'Verify your email',
            // TODO: here we have to write a professional email template as per the ui, no need but it will make our product more polish
            html: `Click <a href="${process.env["SERVER_DOMAIN"]}/api/auth/verify-email?token=${token}">here</a> to verify your email`,
        });

        res.status(201).json({message: 'Registration successful. Please verify your email.'});
    } catch (error) {
        res.status(500).json({error: 'Registration failed'});
        console.log(error);
    }
});

// Email verification
router.post('/verify-email', async (req: Request, res: Response): Promise<any | void> => {
    try {
        const token: string | undefined = typeof req.query.token === "string" ? req.query.token : undefined;
        if (!token) {
            return res.json({
                error: "token is not there"
            })
        }
        console.log({token})
        const verificationToken = await prisma.verificationToken.findUnique({
            where: {
                token
            },
        });

        if (!verificationToken) {
            return res.status(400).json({error: 'Invalid token'});
        }

        if (verificationToken.expires < new Date()) {
            return res.status(400).json({error: 'Token expired'});
        }

        await prisma.user.update({
            where: {email: verificationToken.email},
            data: {emailVerified: new Date()},
        });

        await prisma.verificationToken.delete({
            where: {token},
        });

        res.json({message: 'Email verified successfully'});
    } catch (error) {
        res.status(500).json({error: 'Verification failed'});
    }
});

// Login with email/password
router.post('/signin', async (req: Request, res: Response): Promise<any | void> => {
    try {
        const {success, error, data} = signInSchema.safeParse(req.body)

        if (!success) {
            return res.json({
                message: "invalidated form data",
                error
            })
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    {
                        email: data?.email
                    }, {
                        username: data?.username
                    }
                ]
            },
            include: {twoFactorConfirmation: true}
        });

        if (!user) {
            return res.status(400).json({error: 'Invalid credentials'});
        }

        if (!user.password) {
            return res.status(400).json({error: "Email is linked to Google. Please sign in using Google."})
        }

        const isValidPassword = await bcrypt.compare(data?.password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({error: 'Invalid credentials'});
        }

        if (!user.emailVerified) {
            const {token} = await generateVerificationToken(data?.email!);

            // Send verification email
            await transporter.sendMail({
                to: data?.email,
                subject: 'Verify your email',
                // TODO: here we have to write a professional email template as per the ui, no need but it will make our product more polish
                html: `Click <a href="${process.env["SERVER_DOMAIN"]}/api/auth/verify-email?token=${token}">here</a> to verify your email`,
            });

            return res.status(400).json({error: 'Please verify your email first'});
        }

        // Handle 2FA if enabled
        if (user.isTwoFactorEnabled) {
            if (!data?.twoFactorCode) {
                // Generate and send 2FA code
                const twoFactorToken = await generateTwoFactorToken(data?.email!);

                await transporter.sendMail({
                    to: data?.email,
                    subject: '2FA Code',
                    text: `Your 2FA code is: ${twoFactorToken.token}`,
                });

                return res.status(200).json({message: '2FA code sent'});
            }

            // Verify 2FA code
            const twoFactorTokenRecord = await prisma.twoFactorToken.findFirst({
                where: {
                    email: data.email,
                    token: data.twoFactorCode,
                    expires: {gt: new Date()},
                },
            });

            if (!twoFactorTokenRecord) {
                return res.status(400).json({error: 'Invalid 2FA code'});
            }

            await prisma.twoFactorToken.delete({
                where: {id: twoFactorTokenRecord.id},
            });
        }


        const {password: hashPassword, role, twoFactorConfirmation, ...userWithoutPassword} = user;


        // create the session cookies here
        const accessToken = signJwt(
            {...userWithoutPassword}, {
                expiresIn: process.env["ACCESS_TOKEN_TTL"]
            }
        )

        const refreshToken = signJwt(
            {...userWithoutPassword}, {
                expiresIn: process.env["REFRESH_TOKEN_TTL"]
            }
        )

        res.cookie("accessToken", accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

        return res.send({accessToken, refreshToken});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Login failed'});
    }
});

// Forgot password
router.post('/forgot-password', async (req: Request, res: Response): Promise<any | void> => {
    try {
        const {email} = req.body;
        const {success, error} = forgotPasswordSchema.safeParse(req.body)
        if (!success) {
            return res.json({
                error: error?.message,
            })
        }
        const user = await prisma.user.findUnique({where: {email}});

        if (!user) {
            return res.status(400).json({error: 'User not found'});
        }

        if (!user.password) {
            return res.status(400).json({
                error: "please login using google"
            })
        }

        const token = await generatePasswordResetToken(email);
        await transporter.sendMail({
            to: token.email,
            subject: 'Reset Password',
            html: `Click <a href="${process.env["SERVER_DOMAIN"]}/api/auth/reset-password?token=${token.token}">here</a> to reset your password`,
        });

        res.json({message: 'Password reset email sent'});
    } catch (error) {
        res.status(500).json({error: 'Failed to send reset email'});
    }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response): Promise<any | void> => {
    try {
        const token: string | undefined =
            typeof req.query.token === 'string' ? req.query.token : undefined;

        const {newPassword} = req.body;

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: {token},
        });

        if (!resetToken || resetToken.expires < new Date()) {
            return res.status(400).json({error: 'Invalid or expired token'});
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: {email: resetToken.email},
            data: {password: hashedPassword},
        });

        await prisma.passwordResetToken.delete({
            where: {token},
        });

        return res.json({message: 'Password reset successful'});
    } catch (error) {
        res.status(500).json({error: 'Password reset failed'});
    }
});

// Enable/disable 2FA
router.post('/two-factor', authenticateToken, async (req: Request | any, res: Response): Promise<any | void> => {
    try {
        const {enable} = req.body;

        if (typeof enable !== "boolean") {
            return res.json({error: "Invalid enable Data"})
        }

        const userId = req?.user?.id;
        await prisma.user.update({
            where: {id: userId},
            data: {isTwoFactorEnabled: enable},
        });

        res.json({message: `2FA ${enable ? 'enabled' : 'disabled'} successfully`});
    } catch (error) {
        console.log(error);
        res.status(500).json({error: 'Failed to update 2FA settings'});
    }
});


export default router;
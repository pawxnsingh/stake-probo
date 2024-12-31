import {prisma} from "../utils/db";
import {v4 as uuidV4} from "uuid"
import * as crypto from "node:crypto";
import {getVerificationTokenByEmail} from "../data/verificationToken";
import {getTwoFactorTokenByEmail} from "../data/twoFactorToken";
import {getPasswordResetTokenByEmail} from "../data/passwordResetToken";

export const generateVerificationToken = async (email: string) => {
    const token = uuidV4();
    const expires = new Date(new Date().getTime() + 3600 * 1000);
    const existingToken = await getVerificationTokenByEmail(email);
    // if there is existing token delete it
    if (existingToken) {
        await prisma.verificationToken.delete({
            where: {
                id: existingToken.id,
            },
        });
    }

    return prisma.verificationToken.create({
        data: {
            email,
            token,
            expires,
        },
    });
};


export const generateTwoFactorToken = async (email: string) => {
    const token = crypto.randomInt(100_100, 1_000_000).toString();
    // TODO: change it to 15 minutes instead an hour
    const expires = new Date(new Date().getTime() + 600 * 1000);
    const existingToken = await getTwoFactorTokenByEmail(email);
    // if there is existing token delete this
    if (existingToken) {
        await prisma.twoFactorToken.delete({
            where: {
                id: existingToken.id,
            },
        });
    }

    return prisma.twoFactorToken.create({
        data: {
            email,
            token,
            expires,
        },
    });
};


// take this email and generate me a token and store it in db
// so that, I can send that token to the user by mail
export const generatePasswordResetToken = async (email: string) => {
    const token = uuidV4();
    // generate expiry and add one hour expiry
    const expires = new Date(new Date().getTime() + 3600 * 1000);
    // check for existing token, if there is token on this email just delete it cuz we are going to override it anyway
    const existingToken = await getPasswordResetTokenByEmail(email);
    if (existingToken) {
        await prisma.passwordResetToken.delete({
            where: {
                id: existingToken.id, // why id, cuz id one is less expensive to do
            },
        });
    }
    // now create the entry for the newly created token
    return prisma.passwordResetToken.create({
        data: {
            email,
            expires,
            token,
        },
    });
};

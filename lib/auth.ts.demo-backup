
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/lib/db";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  session: {
    expiresIn: 60 * 60 * 24 * 7, // Session lifetime: 7 days
    updateAge: 60 * 60, // Refresh session expiry after 1 hour
  },

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      requireEmailVerification: true,
    },
  },

  emailAndPassword: {
    enabled: false,
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = normalizeEmail(user.email);

          const [participant, isAdmin] = await Promise.all([
            prisma.participant.findFirst({
              where: {
                email: {
                  equals: email,
                  mode: "insensitive",
                },
              },
              select: {
                id: true,
                userId: true,
              },
            }),
            Promise.resolve(getAdminEmails().has(email)),
          ]);

          if (!participant && !isAdmin) {
            throw new APIError("FORBIDDEN", {
              message:
                "This email is not registered. Please contact the registration desk.",
            });
          }

          if (participant?.userId) {
            throw new APIError("FORBIDDEN", {
              message:
                "This participant is already linked to another account.",
            });
          }

          return {
            data: {
              ...user,
              email,
            },
          };
        },

        after: async (user) => {
          const email = normalizeEmail(user.email);

          await prisma.participant.updateMany({
            where: {
              email: {
                equals: email,
                mode: "insensitive",
              },
              userId: null,
            },
            data: {
              userId: user.id,
            },
          });
        },
      },

      update: {
        before: async (user) => {
          if (user.email !== undefined) {
            return {
              data: {
                ...user,
                email: normalizeEmail(user.email),
              },
            };
          }

          return { data: user };
        },
      },
    },
  },
});

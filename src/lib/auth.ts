import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!db) {
          console.error("[Auth] Database not connected");
          return null;
        }

        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) return null;

          const settings = (user.settings || {}) as Record<string, unknown>;
          const passwordHash = settings.passwordHash as string | undefined;

          if (!passwordHash) {
            // OAuth-only user, cannot log in with password
            return null;
          }

          const isValid = await bcrypt.compare(password, passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("[Auth] Credentials error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email && db) {
        try {
          const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (!existing) {
            await db.insert(users).values({
              email: user.email,
              name: user.name || user.email.split("@")[0],
              image: user.image,
            });
          } else {
            await db
              .update(users)
              .set({
                name: user.name || existing.name,
                image: user.image || existing.image,
                updatedAt: new Date(),
              })
              .where(eq(users.email, user.email));
          }
        } catch (error) {
          console.error("[Auth] Google upsert error:", error);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
});

/** Helper to get the authenticated user ID, or throw if not authenticated */
export async function getAuthUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

/** Helper to get session or null */
export async function getOptionalSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Phase 1: Simple auth - accept any email with password "demo"
        // Phase 2+: Replace with proper DB-backed auth
        if (!credentials?.email) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Demo mode: any email with password "demo" works
        if (password === "demo" || password === "password") {
          return {
            id: email,
            email: email,
            name: email.split("@")[0],
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
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

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.readonly"
        }
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const emailLower = user.email.toLowerCase();

      // Super admin is always whitelisted
      if (emailLower === "lukasreinle0@gmail.com") {
        const exists = await prisma.whitelistedEmail.findUnique({ where: { email: emailLower } });
        if (!exists) {
          await prisma.whitelistedEmail.create({ data: { email: emailLower } });
        }
      } else {
        // Check dynamic database whitelist
        const whitelisted = await prisma.whitelistedEmail.findUnique({
          where: { email: emailLower }
        });

        if (!whitelisted) {
          // Fallback: environment variable whitelist (comma-separated list)
          const whitelistStr = process.env.WHITELISTED_EMAILS;
          if (whitelistStr) {
            const allowedEmails = whitelistStr.split(",").map(e => e.trim().toLowerCase());
            if (allowedEmails.includes(emailLower)) {
              // Automatically migrate to the database
              await prisma.whitelistedEmail.create({ data: { email: emailLower } });
            } else {
              return false; // Access Denied
            }
          } else {
            return false; // Access Denied
          }
        }
      }

      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email }
        });
        const isAdmin = emailLower === "lukasreinle0@gmail.com";
        const role = isAdmin ? "ADMIN" : "USER";

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || "Google User",
              image: user.image,
              role,
            }
          });
        } else if (isAdmin && existingUser.role !== "ADMIN") {
          await prisma.user.update({
            where: { email: user.email },
            data: { role: "ADMIN" }
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.sub = user.id;
        // @ts-ignore
        token.role = user.role || "USER";
      } else if (token.sub) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub as string } });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        // @ts-ignore
        session.user.id = token.sub;
        // @ts-ignore
        session.user.role = token.role || "USER";
      }
      session.accessToken = token.accessToken;
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET
};

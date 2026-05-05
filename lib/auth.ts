import bcrypt from 'bcryptjs';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { canAccessRole } from '@/lib/permissions';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  debug: process.env.NODE_ENV !== 'production' || process.env.NEXTAUTH_DEBUG === '1',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[auth] missing credentials');
          return null;
        }

        const email = credentials.email.toLowerCase();

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true },
          });

          if (!user) {
            console.warn(`[auth] user not found: ${email}`);
            return null;
          }

          if (!user.isActive) {
            console.warn(`[auth] user inactive: ${email}`);
            return null;
          }

          if (!user.passwordHash) {
            console.warn(`[auth] missing passwordHash: ${email}`);
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) {
            console.warn(`[auth] invalid password for: ${email}`);
            return null;
          }

          console.log(`[auth] success: ${email} role=${user.role.code}`);
          return {
            id: String(user.id),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role.code,
          };
        } catch (err) {
          console.error('[auth] error during authorize:', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? '';
        session.user.role = token.role ?? '';
      }
      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

export async function requireRole(roles: string[]) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  if (!canAccessRole(session.user.role, roles)) {
    redirect('/dashboard');
  }

  return session;
}

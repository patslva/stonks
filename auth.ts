import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client for manual user management
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET!,
  pages: {
    signIn: '/login',
  },
  providers: [Google],
  // Use JWT sessions instead of database sessions
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user already exists in your custom users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single()

          if (!existingUser) {
            // Create new user in your custom users table
            const { error } = await supabase
              .from('users')
              .insert({
                id: crypto.randomUUID(), // Generate UUID explicitly
                sub: profile?.sub, // Google's unique user ID
                name: user.name,
                email: user.email,
                given_name: profile?.given_name,
                family_name: profile?.family_name,
                picture: user.image,
                email_verified: profile?.email_verified || false
              })

            if (error) {
              console.error('Error creating user:', error)
            } else {
              console.log('✅ User created in database')
            }
          } else {
            console.log('✅ User already exists in database')
          }
        } catch (error) {
          console.error('Database error:', error)
        }
      }
      return true
    },
    async jwt({ token, user, account, profile }) {
      console.log('🔍 JWT Callback:', {
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        tokenEmail: token?.email,
        userEmail: user?.email
      });
      return token
    },
    async session({ session, token }) {
      console.log('🔍 Session Callback:', {
        hasSession: !!session,
        hasToken: !!token,
        sessionUser: session?.user?.email,
        tokenEmail: token?.email
      });
      return session
    },
    async redirect({ url, baseUrl }) {
      console.log('🔍 Redirect Callback:', { url, baseUrl });
      // After successful login, redirect to home page
      if (url === baseUrl + '/login') {
        return baseUrl
      }
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allow callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    authorized({ auth, request: { nextUrl } }) {
      console.log('🔍 Authorization check:', {
        path: nextUrl.pathname,
        isLoggedIn: !!auth?.user,
        user: auth?.user?.email
      });
      
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnHome = nextUrl.pathname === '/';
      
      if (isOnHome || isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn && isOnLogin) {
        // Redirect logged-in users away from login page to home
        return Response.redirect(new URL('/', nextUrl));
      }
      return true;
    },
  },
})
import LoginForm from '@/components/ui/login-form';
import { Suspense } from 'react';
 
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black" style={{
      position: 'relative',
      padding: '80px 32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div className="text-center" style={{marginBottom: '80px'}}>
        <h1 className="flex items-center justify-center" style={{marginBottom: '24px', fontSize: '42px', fontWeight: 'bold', gap: '12px'}}>
          <span>📈</span>
          <span style={{color: '#ffffff'}}>
            Stonks
          </span>
          <span>🚀</span>
        </h1>
        <p className="text-lg" style={{color: '#94a3b8', fontWeight: '400'}}>
          Trading dashboard with AI-assisted 'betting' tips
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full border border-gray-700" style={{
        maxWidth: '400px',
        padding: '48px',
        backgroundColor: '#1e293b',
        borderRadius: '24px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
      }}>
        <div className="text-center" style={{marginBottom: '40px'}}>
          <h2 className="text-2xl font-semibold" style={{marginBottom: '16px', color: '#f8fafc', fontWeight: '600'}}>
            Welcome Back
          </h2>
          <p style={{color: '#94a3b8', fontWeight: '400'}}>
            Sign in to access your trading dashboard
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

      </div>

      {/* Footer */}
      <p className="text-center text-gray-500 text-sm" style={{marginTop: '60px'}}>
        Ready to see your money to go up or down?
      </p>
    </main>
  );
}
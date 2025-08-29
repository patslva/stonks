import { signIn } from "../../../auth"

export default function LoginForm() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("google")
      }}
    >
      <div className="w-full">
        <button 
          type="submit" 
          className="w-full bg-white hover:bg-gray-50 text-black font-medium rounded-xl flex items-center justify-center transition-colors duration-200 shadow-sm"
          style={{padding: '16px 24px', fontSize: '16px', gap: '24px'}}
        >
          <svg width="16" height="16" viewBox="0 0 18 18" style={{width: '16px', height: '16px', flexShrink: 0}}>
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01a4.8 4.8 0 0 1-7.18-2.51H1.83v2.07A8 8 0 0 0 8.98 17Z"/>
            <path fill="#FBBC05" d="M4.5 10.54a4.8 4.8 0 0 1 0-3.08V5.39H1.83a8 8 0 0 0 0 7.22l2.67-2.07Z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.39L4.5 7.46a4.77 4.77 0 0 1 4.48-3.28Z"/>
          </svg>
          <span style={{fontFamily: '"Inter", system-ui, -apple-system, sans-serif', fontWeight: '500'}}>
            Sign in with Google
          </span>
        </button>
      </div>
    </form>
  )
}
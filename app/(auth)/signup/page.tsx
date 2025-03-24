import DevOnlyRoute from '@/app/components/DevOnlyRoute';
import { isProd } from '@/app/lib/env';

export default function SignUpPage() {
  // For production builds, this page will not be included in the bundle
  if (isProd) {
    return null;
  }
  
  return (
    <DevOnlyRoute>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Sign Up</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block mb-1">Email</label>
              <input 
                type="email" 
                id="email" 
                className="w-full px-4 py-2 border rounded-md" 
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-1">Password</label>
              <input 
                type="password" 
                id="password" 
                className="w-full px-4 py-2 border rounded-md" 
                placeholder="•••••••••"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-1">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                className="w-full px-4 py-2 border rounded-md" 
                placeholder="•••••••••"
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>
    </DevOnlyRoute>
  );
} 
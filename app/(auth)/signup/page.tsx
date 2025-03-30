import DevOnlyRoute from '@/app/components/DevOnlyRoute';
import { isProd } from '@/app/lib/env';
import Link from 'next/link';
import Image from 'next/image';
import SignUp from '../../components/SignUp';

export default function SignUpPage() {
  // For production builds, this page will not be included in the bundle
  if (isProd) {
    return null;
  }
  
  return (
    <DevOnlyRoute>
      <div className="flex flex-col items-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-100 to-red-200 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-red-100 to-red-200 rounded-full translate-y-1/3 -translate-x-1/3 opacity-50"></div>
        
        {/* Decorative dots pattern */}
        <div className="absolute top-1/4 left-10 grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-red-300 rounded-full"></div>
          ))}
        </div>
        <div className="absolute bottom-1/4 right-10 grid grid-cols-3 gap-2">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-red-300 rounded-full"></div>
          ))}
        </div>
        
        <div className="z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <Image src="/logo_syft_v.svg" alt="Syft Logo" width={100} height={100} />
            </Link>
          </div>
          
          <SignUp />
          
          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-red-500 hover:text-red-600 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </DevOnlyRoute>
  );
} 
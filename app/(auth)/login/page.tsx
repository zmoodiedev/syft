import Link from 'next/link';
import Image from 'next/image';
import SignIn from '@/app/components/SignIn';

export default function LoginPage() {
    return (

        <div className="w-full h-[100vh] flex flex-col justify-center items-center">

            <Link href="/">
                <Image
                    src="/logo_whiisk.svg"
                    alt="Whiisk logo"
                    width={160}
                    height={43}
                    priority
                    className="mx-auto mb-6 h-auto"
                />
            </Link>
            <SignIn />
            <span id="loginLine" className="block bg-light-blue w-[325px] h-[calc(100%+var(--header-height))] bottom-0 left-80 absolute skew-x-30 -z-1"></span>
        </div>
    );
} 
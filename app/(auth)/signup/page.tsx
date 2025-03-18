import SignUp from '../../components/SignUp';
import Link from 'next/link';
import Image from 'next/image';


export default function SignUpPage() {
    return (
        <div className="w-full h-[100vh] flex flex-col justify-center items-center">

        <Link href="/">
            <Image
                src="/logo_whiisk.svg"
                alt="Whiisk logo"
                width={160}
                height={0}
                priority
                className="mx-auto mb-6"
            />
        </Link>
        <SignUp />
        <span id="loginLine" className="block bg-light-blue w-[325px] h-[calc(100%+var(--header-height))] bottom-0 left-80 absolute skew-x-30 -z-1"></span>
    </div>
    );
} 
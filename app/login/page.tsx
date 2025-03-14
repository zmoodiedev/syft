import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';


export const metadata: Metadata = {
    title: 'Login',
  };

export default function Page() {
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
            <form className="bg-white shadow-md rounded px-8 pt-10 pb-8 m-4 w-full max-w-sm">
                

                <h1 className="text-[2.4rem] mb-6 text-center">Login.</h1>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                        Email
                    </label>
                    <input className="appearance-none border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline" id="email" type="text" placeholder="Email" />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                        Password
                    </label>
                    <input className="border rounded w-full py-2 px-3 text-gray-700 mb-2 leading-tight focus:shadow-outline" id="password" type="password" placeholder="******************" />

                    <a className="block text-sm hover:underline text-right" href="#">
                        Forgot Password?
                    </a>
                </div>

                <div className="mb-6">
                    <button className="w-full bg-light-blue text-foreground py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
                            Login
                    </button>
                </div>
                
                <div className="mb-6 text-center flex gap-4 items-center">
                    <hr className="w-full border-medium-grey"/>
                    or
                    <hr className="w-full border-medium-grey"/>
                </div>

                <div className="text-center">
                    <span className="text-sm block mb-3">
                        Don't have an account yet?
                    </span>
                    <button className="w-full bg-light-grey text-foreground py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="button">
                            Register
                    </button>
                </div>
            </form>
            <span id="loginLine" className="block bg-light-blue w-[325px] h-[calc(100%+var(--header-height))] bottom-0 left-80 absolute skew-x-30 -z-1"></span>
        </div>
    )
}
import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <>
      {/* Wave divider: white → cast-iron */}
      <div className="bg-eggshell w-full">
        <svg
          viewBox="0 0 1440 80"
          fill="#2C1A0E"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: '80px', display: 'block' }}
        >
          <path d="M0,0 C480,80 960,80 1440,0 L1440,80 L0,80 Z" />
        </svg>
      </div>

      <footer className="bg-cast-iron text-white">
        <div className="container mx-auto px-6 pt-4 pb-12 md:pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">

            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="mb-4">
                <Logo className="h-[36px] w-auto text-white" />
              </div>
              <p className="text-white/45 text-sm leading-relaxed">
                Save, organize, and share your favorite recipes — no ads, no distractions, just the food you love.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-5">Product</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/pricing"     className="text-white/60 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/about"  className="text-white/60 hover:text-white transition-colors">Who We Are</Link></li>
                <li><Link href="/roadmap"     className="text-white/60 hover:text-white transition-colors">Roadmap</Link></li>
                <li><Link href="/contact"     className="text-white/60 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-5">Legal</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/terms-of-service"   className="text-white/60 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy-policy"     className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/cookie-preferences" className="text-white/60 hover:text-white transition-colors">Cookie Preferences</Link></li>
              </ul>
            </div>

            {/* CTA */}
            <div>
              <p className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-5">Get Started</p>
              <p className="text-white/45 text-sm mb-5 leading-relaxed">
                Your recipe collection is waiting. Free to start, no credit card needed.
              </p>
              <Link
                href="/login"
                className="inline-block bg-light-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green transition-colors"
              >
                Sign up free →
              </Link>
            </div>

          </div>
        </div>

        {/* Copyright bar */}
        <div className="border-t border-white/8 py-5 px-6">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/30">
            <span>© {new Date().getFullYear()} Syft. All rights reserved.</span>
            <span>Made for home cooks, by home cooks.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

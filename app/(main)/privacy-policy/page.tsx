export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-4 sm:px-6 py-16 md:py-24 max-w-3xl">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-cast-iron mb-3">Privacy Policy</h1>
          <p className="text-steel text-sm">Last updated: May 14, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12 space-y-10 text-steel leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">The short version</h2>
            <p>We collect only what we need to run the service. We don&apos;t sell your data. We don&apos;t show you ads. Your recipes are yours.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">What we collect</h2>
            <p><strong className="text-cast-iron">Account information.</strong> When you sign up, we collect your email address and display name. If you sign in with Google, we also receive your profile picture from Google.</p>
            <p><strong className="text-cast-iron">Your recipes and content.</strong> The recipes you save, create, or import, along with any photos you upload.</p>
            <p><strong className="text-cast-iron">Usage data.</strong> Basic analytics such as which pages are visited and how often. This is collected in aggregate and is not tied to individual users beyond what Google Analytics provides.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">How we use it</h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>To provide and maintain the Syft service</li>
              <li>To authenticate your account</li>
              <li>To store and display your recipes</li>
              <li>To send important account-related emails (we do not send marketing emails)</li>
              <li>To understand how the app is used so we can improve it</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Third-party services</h2>
            <p>Syft uses the following third-party services to operate:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong className="text-cast-iron">Firebase (Google).</strong> Authentication and database storage. <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Privacy policy.</a></li>
              <li><strong className="text-cast-iron">Cloudinary.</strong> Image hosting and storage. <a href="https://cloudinary.com/privacy" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Privacy policy.</a></li>
              <li><strong className="text-cast-iron">Google Analytics.</strong> Anonymous usage analytics. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Privacy policy.</a></li>
              <li><strong className="text-cast-iron">Stripe.</strong> Payment processing for Pro subscriptions. Syft never sees or stores your card details. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Privacy policy.</a></li>
              <li><strong className="text-cast-iron">ipapi.</strong> IP-based country detection, used solely to pre-select your local currency on pricing screens. Your IP address is sent to ipapi for this lookup and is not stored by Syft. <a href="https://ipapi.co/privacy/" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Privacy policy.</a></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Data sharing</h2>
            <p>We do not sell, rent, or share your personal data with third parties, except as required to operate the service (the providers listed above) or as required by law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Your rights</h2>
            <p>You can delete your account at any time from your profile settings. When you do, your personal data and recipes are removed from our systems.</p>
            <p>If you want a copy of your data or have other requests, <a href="/contact" className="text-light-green font-medium hover:underline">contact us</a> and we&apos;ll help.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Data retention</h2>
            <p>We keep your data for as long as your account is active. When you delete your account, we remove your data within 30 days, except where we are required to retain it by law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Changes to this policy</h2>
            <p>If we make significant changes, we&apos;ll update the date at the top of this page and notify you by email if the changes affect how we handle your data.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Contact</h2>
            <p>Privacy questions or requests? <a href="/contact" className="text-light-green font-medium hover:underline">Get in touch.</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}

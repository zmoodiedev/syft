export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-4 sm:px-6 py-16 md:py-24 max-w-3xl">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-cast-iron mb-3">Terms of Service</h1>
          <p className="text-steel text-sm">Last updated: April 9, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12 space-y-10 text-steel leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">1. Who we are</h2>
            <p>Syft is a recipe management service operated as an independent project. By creating an account or using Syft, you agree to these terms.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">2. Your account</h2>
            <p>You must be at least 13 years old to use Syft. You are responsible for keeping your account credentials secure. If you believe your account has been compromised, contact us right away.</p>
            <p>We may suspend or terminate accounts that violate these terms, at our discretion.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">3. What you can do</h2>
            <p>You may use Syft to save, organize, and share recipes for personal use. You may import recipes from other websites for your own collection, provided you respect the original author&apos;s copyright when sharing publicly.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">4. What you cannot do</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Use Syft for any unlawful purpose</li>
              <li>Attempt to access other users&apos; private data</li>
              <li>Scrape or bulk-export content from the platform</li>
              <li>Use automated tools to abuse the service</li>
              <li>Impersonate other users or Syft staff</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">5. Your content</h2>
            <p>You own the recipes and content you create on Syft. By uploading content, you grant us a limited license to store and display it as part of the service. We do not claim ownership of your data.</p>
            <p>You are responsible for ensuring you have the right to use any content you upload, including photos. Do not upload images taken from other websites without permission from the original author. Syft is not liable for copyright infringement resulting from content you choose to upload.</p>
            <p>You can delete your account and your data at any time.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">6. Subscriptions and billing</h2>
            <p>Syft offers a free tier and optional paid plans. Paid plans are billed in advance on a monthly or annual basis. You can cancel at any time; your access continues until the end of the current billing period.</p>
            <p>We do not offer refunds for partial billing periods, except where required by law.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">7. Availability</h2>
            <p>We do our best to keep Syft running, but we cannot guarantee uninterrupted availability. We may update, modify, or discontinue features at any time. For significant changes, we&apos;ll do our best to give advance notice.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">8. Limitation of liability</h2>
            <p>Syft is provided &quot;as is.&quot; To the extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">9. Governing law</h2>
            <p>These terms are governed by the laws of Alberta, Canada. Any disputes will be handled in the courts of that jurisdiction.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">10. Contact</h2>
            <p>Questions about these terms? <a href="/contact" className="text-light-green font-medium hover:underline">Get in touch.</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}

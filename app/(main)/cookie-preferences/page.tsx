export default function CookiePreferences() {
  return (
    <div className="min-h-screen bg-eggshell">
      <div className="container mx-auto px-6 py-16 md:py-24 max-w-3xl">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-cast-iron mb-3">Cookie Preferences</h1>
          <p className="text-steel text-sm">Last updated: April 9, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-12 space-y-10 text-steel leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">What we use cookies for</h2>
            <p>Syft uses a small number of cookies to keep the service working. We don&apos;t use advertising cookies or track you across other websites.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Essential cookies</h2>
            <p>These cookies are required for Syft to function. They cannot be turned off.</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-eggshell">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-cast-iron">Cookie</th>
                    <th className="text-left px-4 py-3 font-semibold text-cast-iron">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-cast-iron">Firebase auth token</td>
                    <td className="px-4 py-3">Keeps you signed in to your account</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-cast-iron">Session storage</td>
                    <td className="px-4 py-3">Remembers demo mode while you browse</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Analytics cookies</h2>
            <p>We use Google Analytics to understand how people use Syft. This helps us figure out what to improve. The data is anonymous and aggregated.</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-eggshell">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-cast-iron">Service</th>
                    <th className="text-left px-4 py-3 font-semibold text-cast-iron">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-medium text-cast-iron">Google Analytics</td>
                    <td className="px-4 py-3">Page views and usage patterns</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>To opt out of Google Analytics across the web, you can use the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-light-green font-medium hover:underline">Google Analytics opt-out browser add-on</a>.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">No advertising cookies</h2>
            <p>Syft does not use advertising cookies. We do not show ads, and we do not share data with ad networks.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Managing cookies in your browser</h2>
            <p>You can clear or block cookies at any time through your browser settings. Blocking essential cookies will prevent you from staying signed in to Syft.</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Firefox</a></li>
              <li><a href="https://support.apple.com/en-ca/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-light-green hover:underline">Edge</a></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-cast-iron">Questions</h2>
            <p>Something not covered here? <a href="/contact" className="text-light-green font-medium hover:underline">Get in touch.</a></p>
          </section>

        </div>
      </div>
    </div>
  );
}

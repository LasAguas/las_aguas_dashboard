// pages/privacy-policy.js
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#a89ee4] text-[#33286a]">
      <div className="max-w-3xl mx-auto py-10 px-4 md:px-8">
        <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-700 mb-8">
          Last updated: 20.01.2026
        </p>

        <div className="space-y-6 bg-white/80 rounded-2xl p-6 shadow">
          <section>
            <p className="text-sm leading-relaxed">
              Las Aguas Productions respects your privacy and is committed to
              protecting your personal data.
            </p>
          </section>

          <section>
            <p className="text-sm leading-relaxed">
              When you submit your information through our Meta (Facebook or
              Instagram) instant lead forms, we may collect personal information
              such as your name, email address, and any additional details you
              choose to provide.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              How We Use Your Information
            </h2>
            <p className="text-sm leading-relaxed mb-2">
              We use this information solely to:
            </p>
            <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1">
              <li>
                Contact you regarding our digital strategy services for
                independent artists
              </li>
              <li>
                Provide insights, audits, or consultations you requested
              </li>
              <li>Respond to your inquiries</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              Data Sharing &amp; Storage
            </h2>
            <p className="text-sm leading-relaxed">
              We do not sell or share your personal data with third parties for
              marketing purposes. Your information is stored securely and
              retained only for as long as necessary to fulfill the purpose for
              which it was collected.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              Your Rights
            </h2>
            <p className="text-sm leading-relaxed">
              You may request access to, correction of, or deletion of your
              personal data at any time by contacting us at{" "}
              <a
                href="mailto:lasaguasproductions@gmail.com"
                className="underline"
              >
                lasaguasproductions@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">
              Consent
            </h2>
            <p className="text-sm leading-relaxed">
              By submitting a form, you consent to the collection and use of your
              information as described in this Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

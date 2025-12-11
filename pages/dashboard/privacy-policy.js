// pages/privacy-policy.js

export default function PrivacyPolicyPage() {
    return (
      <div className="min-h-screen bg-[#a89ee4] text-[#33286a]">
        <div className="max-w-3xl mx-auto py-10 px-4 md:px-8">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-700 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
  
          <div className="space-y-6 bg-white/80 rounded-2xl p-6 shadow">
            <section>
              <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
              <p className="text-sm leading-relaxed">
                This Privacy Policy describes how Las Aguas (&quot;we&quot;,
                &quot;us&quot;, or &quot;our&quot;) collects, uses, and protects
                information when you use our private TikTok app and artist
                dashboard (collectively, the &quot;Services&quot;). The Services
                are accessible only to verified clients and authorized team
                members and are not public-facing platforms.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                2. Information We Collect
              </h2>
  
              <h3 className="text-sm font-semibold mt-2 mb-1">
                a. Account &amp; Profile Information
              </h3>
              <p className="text-sm leading-relaxed">
                When you are onboarded as a client or authorized user, we may
                collect:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Name</li>
                <li>Email address</li>
                <li>User ID and role (e.g., artist, Las Aguas staff)</li>
                <li>
                  Authentication data required to securely log in and manage your
                  account
                </li>
              </ul>
  
              <h3 className="text-sm font-semibold mt-4 mb-1">
                b. Uploaded Media &amp; Content
              </h3>
              <p className="text-sm leading-relaxed">
                We collect and store content you upload or create within the
                Services, including:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Images and video files</li>
                <li>Captions, notes, and creative directions</li>
                <li>
                  Post variations, dates, and scheduling or planning metadata
                </li>
                <li>
                  Internal feedback and status fields (e.g., &quot;feedback
                  resolved&quot;)
                </li>
              </ul>
  
              <h3 className="text-sm font-semibold mt-4 mb-1">
                c. Integrated Platform Data (e.g., TikTok)
              </h3>
              <p className="text-sm leading-relaxed">
                When you connect TikTok or other platforms, we may access:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Content performance and analytics data</li>
                <li>Engagement metrics such as views, likes, comments, and shares</li>
                <li>
                  Audience metrics and other insights provided by platform APIs
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                We only access the data necessary to provide the Services you have
                requested and as permitted by each platform&apos;s authorization
                framework.
              </p>
  
              <h3 className="text-sm font-semibold mt-4 mb-1">
                d. Usage &amp; Technical Data
              </h3>
              <p className="text-sm leading-relaxed">
                We may automatically collect certain technical information, such
                as:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>IP address and browser type</li>
                <li>Device information</li>
                <li>Pages or features accessed within the Dashboard or App</li>
                <li>Timestamps, error logs, and diagnostic events</li>
              </ul>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                3. How We Use Your Information
              </h2>
              <p className="text-sm leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Authenticate and manage your account</li>
                <li>Display and analyze content performance and analytics</li>
                <li>Plan, schedule, or manage posts and content strategies</li>
                <li>Provide creative feedback, notes, and internal evaluations</li>
                <li>Improve the reliability and usability of the Services</li>
                <li>
                  Monitor for security issues and prevent unauthorized access or
                  misuse
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                We do not sell your personal information or your media content to
                third parties.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                4. Legal Bases for Processing (where applicable)
              </h2>
              <p className="text-sm leading-relaxed">
                Depending on your location, our legal bases for processing your
                personal data may include:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Performance of a contract (our client agreement with you)</li>
                <li>
                  Legitimate interests (e.g., security, service improvement, and
                  internal analytics)
                </li>
                <li>Your consent, where required for specific integrations</li>
              </ul>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                5. Sharing &amp; Disclosure
              </h2>
              <p className="text-sm leading-relaxed">
                We may share your information in the following limited
                circumstances:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>
                  With authorized Las Aguas staff who need access to provide the
                  Services
                </li>
                <li>
                  With integrated platforms (e.g., TikTok) as necessary to
                  retrieve or manage data as you have authorized
                </li>
                <li>
                  With service providers that host or process data on our behalf
                  (for example, infrastructure providers) under appropriate
                  confidentiality and security commitments
                </li>
                <li>
                  When required by law, regulation, legal process, or governmental
                  request
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                We do not provide your dashboard access, media, or analytics data
                to other artists or unrelated third parties.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                6. Data Storage &amp; Security
              </h2>
              <p className="text-sm leading-relaxed">
                We use reasonable technical and organizational measures to protect
                your information from unauthorized access, loss, misuse, or
                disclosure. These measures may include:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Secure authentication and session management</li>
                <li>Encrypted connections (HTTPS) where applicable</li>
                <li>Access controls for staff and administrators</li>
                <li>Least-privilege principles for production systems</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                No method of transmission or storage is completely secure. While
                we strive to protect your data, we cannot guarantee absolute
                security.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">7. Data Retention</h2>
              <p className="text-sm leading-relaxed">
                We retain your personal information and content for as long as
                necessary to:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Provide the Services to you as a client</li>
                <li>Maintain operational and performance records</li>
                <li>Comply with legal, accounting, or reporting requirements</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                When your client relationship ends, we may deactivate your access.
                You may request deletion of certain data, subject to our need to
                retain records for legal or legitimate business purposes.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                8. Your Rights &amp; Choices
              </h2>
              <p className="text-sm leading-relaxed">
                Depending on your location, you may have rights with respect to
                your personal data, such as:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Accessing the personal data we hold about you</li>
                <li>Requesting corrections to inaccurate information</li>
                <li>Requesting deletion of certain personal data</li>
                <li>Objecting to or restricting certain processing</li>
                <li>Requesting a copy of your data in a portable format</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                To exercise any of these rights, please contact us using the
                details in the &quot;Contact&quot; section below. We may need to
                verify your identity before processing your request.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                9. Cookies &amp; Similar Technologies
              </h2>
              <p className="text-sm leading-relaxed">
                The Services may use strictly necessary cookies or local storage
                solely for purposes such as:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Maintaining your authenticated session</li>
                <li>Enhancing security</li>
                <li>Remembering basic preferences</li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                We do not use advertising cookies or third-party tracking cookies
                within the private Dashboard or App.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                10. Children&apos;s Privacy
              </h2>
              <p className="text-sm leading-relaxed">
                The Services are intended only for professional use by adults. We
                do not knowingly collect personal information from children under
                18. If you believe a child has provided us with personal data,
                please contact us so we can take appropriate action.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                11. Changes to This Policy
              </h2>
              <p className="text-sm leading-relaxed">
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, Services, or legal obligations. When we
                make material changes, we will update the &quot;Last updated&quot;
                date at the top of this page and may provide additional notice
                where appropriate.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">12. Contact</h2>
              <p className="text-sm leading-relaxed">
                If you have any questions about this Privacy Policy, or if you
                wish to exercise your privacy rights, please contact:
                <br />
                <strong>Email:</strong> privacy@lasaguas.com
              </p>
            </section>
  
            <p className="text-xs text-gray-500 mt-6">
              This page is provided for informational purposes and does not
              constitute legal advice. Please consult your legal counsel to
              confirm that this policy meets your specific requirements and
              applicable laws in your jurisdiction.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
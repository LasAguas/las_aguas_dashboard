// pages/terms-of-service.js

export default function TermsOfServicePage() {
    return (
      <div className="min-h-screen bg-[#a89ee4] text-[#33286a]">
        <div className="max-w-3xl mx-auto py-10 px-4 md:px-8">
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className="text-sm text-gray-700 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
  
          <div className="space-y-6 bg-white/80 rounded-2xl p-6 shadow">
            <section>
              <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
              <p className="text-sm leading-relaxed">
                These Terms of Service (&quot;Terms&quot;) govern your use of (a) the
                private Las Aguas TikTok app (&quot;App&quot;) and (b) the Las Aguas
                Artist Dashboard (&quot;Dashboard&quot;), together the
                &quot;Services&quot;. The Services are private tools for verified
                clients of Las Aguas and are not public platforms.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                By accessing or using any part of the Services, you agree to be
                bound by these Terms. If you do not agree, do not use the
                Services.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                2. Eligibility &amp; Account Access
              </h2>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1">
                <li>
                  Access is invite-only and restricted to current clients of Las
                  Aguas and authorized team members.
                </li>
                <li>
                  You must provide accurate account information and keep your
                  login credentials confidential.
                </li>
                <li>
                  You are responsible for all activity that occurs under your
                  account.
                </li>
                <li>
                  You may not share your account with third parties or attempt to
                  access another user&apos;s account, data, or media.
                </li>
              </ul>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">3. Authorized Use</h2>
              <p className="text-sm leading-relaxed mb-2">
                You may use the Services solely for purposes related to your
                professional relationship with Las Aguas, including:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1">
                <li>Uploading media for content review, testing, and scheduling</li>
                <li>Receiving feedback and creative direction from Las Aguas</li>
                <li>Managing content calendars and post schedules</li>
                <li>
                  Viewing analytics and performance data from TikTok and other
                  integrated platforms
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                You agree not to misuse the Services, including (without
                limitation) by attempting to bypass security, scrape data, reverse
                engineer the systems, interfere with normal operation, or use the
                Services for any unlawful purpose.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                4. TikTok &amp; Platform Integrations
              </h2>
              <p className="text-sm leading-relaxed">
                The App and Dashboard may connect to TikTok and other platforms on
                your behalf using secure authorization methods. By enabling these
                integrations, you authorize Las Aguas to:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>
                  Retrieve analytics, insights, and performance metrics for your
                  content
                </li>
                <li>
                  Read metadata and other information made available by each
                  platform&apos;s API
                </li>
                <li>
                  Initiate, schedule, or manage posts where such functionality is
                  supported and explicitly enabled
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                You remain responsible for complying with TikTok&apos;s and any
                other platform&apos;s terms, rules, and community guidelines.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">5. Media &amp; Content</h2>
              <p className="text-sm leading-relaxed">
                You may upload images, videos, captions, and other assets into the
                Services. By uploading, you confirm that:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>
                  You own the content or have all necessary rights, licenses, and
                  permissions to use it.
                </li>
                <li>
                  Your content does not infringe the rights of any third party,
                  including copyrights, trademarks, privacy, or publicity rights.
                </li>
                <li>
                  Your content does not violate any applicable law or any
                  platform&apos;s policies.
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                You grant Las Aguas a limited, non-exclusive license to store,
                process, review, analyze, and use your content solely for the
                purpose of providing the Services to you and improving our
                internal workflows.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                6. Feedback &amp; Internal Notes
              </h2>
              <p className="text-sm leading-relaxed">
                The Dashboard may display feedback, comments, and internally
                tracked statuses (such as &quot;feedback resolved&quot;) related to
                your content. Such feedback is advisory only and does not
                guarantee specific results, reach, or performance on TikTok or any
                other platform.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                7. Data &amp; Analytics Disclaimer
              </h2>
              <p className="text-sm leading-relaxed">
                Analytics and metrics surfaced in the Services rely on third-party
                APIs and reporting tools. While Las Aguas endeavors to present this
                information as provided, we do not guarantee completeness,
                real-time accuracy, or availability. Platform outages, API
                changes, and data discrepancies are outside of our control.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                8. Service Changes &amp; Availability
              </h2>
              <p className="text-sm leading-relaxed">
                We may modify, suspend, or discontinue any part of the Services at
                any time, including features related to media uploads, analytics,
                scheduling, or platform integrations. We will attempt to give
                reasonable notice where practical but are not obligated to do so
                in all cases.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                9. Intellectual Property
              </h2>
              <p className="text-sm leading-relaxed">
                You retain ownership of your uploaded content. Las Aguas retains
                all rights, title, and interest in and to the Services,
                including the Dashboard, App, software, design, branding, and all
                related intellectual property. You may not copy, modify,
                distribute, frame, or create derivative works of the Services or
                any part of them.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">10. Termination</h2>
              <p className="text-sm leading-relaxed">
                Las Aguas may suspend or terminate your access to the Services at
                any time if:
              </p>
              <ul className="list-disc ml-5 text-sm leading-relaxed space-y-1 mt-1">
                <li>Your client relationship with Las Aguas ends;</li>
                <li>You breach these Terms or applicable law; or</li>
                <li>
                  We detect misuse, security risks, or unauthorized access attempts.
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-2">
                Upon termination, your access will cease. We may retain certain
                records, logs, or historical data for operational, accounting, and
                legal purposes, consistent with our Privacy Policy.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">
                11. Disclaimers &amp; Limitation of Liability
              </h2>
              <p className="text-sm leading-relaxed">
                The Services are provided on an &quot;as is&quot; and
                &quot;as available&quot; basis without warranties of any kind,
                whether express or implied, including but not limited to fitness
                for a particular purpose, non-infringement, or expected business
                outcomes.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                To the fullest extent permitted by law, Las Aguas will not be
                liable for any indirect, incidental, consequential, or special
                damages, or for lost profits, revenues, or data, arising from or
                in connection with your use of the Services. Our total aggregate
                liability to you for any claim relating to the Services will not
                exceed the amount paid by you to Las Aguas for the Services in the
                twelve (12) months preceding the event giving rise to the claim.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">12. Governing Law</h2>
              <p className="text-sm leading-relaxed">
                These Terms are governed by the laws of your primary service
                jurisdiction with Las Aguas (to be specified in your client
                agreement) without regard to conflict of law principles. Any
                disputes will be handled in the courts of that jurisdiction,
                unless otherwise agreed in writing.
              </p>
            </section>
  
            <section>
              <h2 className="text-xl font-semibold mb-2">13. Contact</h2>
              <p className="text-sm leading-relaxed">
                For questions about these Terms, please contact:
                <br />
                <strong>Email:</strong> support@lasaguas.com
              </p>
            </section>
  
            <p className="text-xs text-gray-500 mt-6">
              This page is provided for informational purposes and does not
              constitute legal advice. Please consult your legal counsel to
              confirm that these Terms meet your specific requirements.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
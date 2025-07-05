export default function Privacy() { // Privacy Policy for QuackQuery
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-white">Privacy Policy</h1>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            1. Information We Collect
          </h2>
          <p className="text-white/80">
            We collect the minimum information required to operate QuackQuery. This includes your email address for account
            authentication and the context you provide to quackquery. We do <strong className="text-white">not</strong> save your data in our database.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            2. How We Use Information
          </h2>
          <p className="text-white/80">
            Your information is used exclusively for payments and provide better 
            assistance to you.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">3. Cookies</h2>
          <p className="text-white/80">
            We use cookies to keep you signed in and to remember your
            preferences. You can disable cookies in your browser settings, but
            the service may not function correctly without them.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            4. Third-Party Services
          </h2>
          <p className="text-white/80">
            We rely on several  APIs and services to handle the functionality. All
            interactions remain within the scope permitted by the providers
            Terms of Services. We also use secure payment processors to handle
            any payment details never touch our servers.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">5. Data Retention</h2>
          <p className="text-white/80">
            Your data and account details are retained for as long as your
            account is active. Mail us to delete your account if you wish to.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">6. Your Rights</h2>
          <p className="text-white/80">
            You have the right to access, export, or request deletion of the
            data we hold about you. Email <br />
            <a href="mailto:radhikayash2@gmail.com" className="underline text-white hover:text-white/80">
              radhikayash2@gmail.com
            </a>
            {" "}to initiate any request.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">7. Security</h2>
          <p className="text-white/80">
            We employ industry-standard encryption (TLS) for data in transit and
            store credentials using hashing and salting techniques. While no
            system is 100% secure, we work hard to protect your information.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            8. Children&#39;s Privacy
          </h2>
          <p className="text-white/80">
            Our service is not directed to children under 13. We do not
            knowingly collect personal information from children.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            9. Changes to This Policy
          </h2>
          <p className="text-white/80">
            We may update this policy periodically. Significant changes will be
            announced on the website or via email.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">10. Contact Us</h2>
          <p className="text-white/80">
            Worried about your privacy? Reach out at <br />
            <a href="mailto:radhikayash2@gmail.com" className="underline text-white hover:text-white/80">
              radhikayash2@gmail.com
            </a>
            .
          </p>
        </div>
      </section>

      <p className="mt-8 text-sm text-white/60">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}

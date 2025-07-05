export default function Terms() { // Terms and Condition for QuackQuery
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-white">Terms & Conditions</h1>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">1. Subscription Terms</h2>
          <p className="text-white/80">
            Your contribution for QuackQuery will be used to maintain the service and for future updateSettings. 
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">2. Payment Terms</h2>
          <p className="text-white/80">
            Payments and transactions are processed safely and securely through our payment provider.
            This is a one-time payment and there are no recurring charges.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">3. Usage Rights</h2>
          <p className="text-white/80">
            This service is for personal use only.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">4. Refund Policy</h2>
          <p className="text-white/80">
            Refunds are handled on a case-by-case basis. Contact support on radhikayash2@gmail.com within
            15 days of purchase for refund requests.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            5. Service Availability
          </h2>
          <p className="text-white/80">
            We strive for 99.9% uptime but do not guarantee uninterrupted
            service. We reserve the right to modify or discontinue features as we see fit.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            6. Limitation of Liability
          </h2>
          <p className="text-white/80">
            Our service is provided &quot;as is&quot; without any promises. We are
            not liable for any damages and mis-conducts arising from service use.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3 text-white">
            7. Sudo User Access
            </h2>
            <p className="text-white/80">
              For becoming a sudo user and getting access to features for free, you need to contact the admin on radhikayash2@gmail.com.
            </p>
          
        </div>
      </section>

      <p className="mt-8 text-sm text-white/60">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}

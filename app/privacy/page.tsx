export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p className="mb-4">
            When you use GSEO Hub, we collect the following information:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Basic profile information from your Google account (name, email, profile picture)</li>
            <li>Usage data and analytics to improve our service</li>
            <li>SEO data and metrics you choose to connect (Google Analytics, Search Console)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p className="mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide and maintain our SEO management services</li>
            <li>Authenticate your account and ensure security</li>
            <li>Generate SEO reports and analytics</li>
            <li>Communicate with you about your account and our services</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
          <p className="mb-4">
            We integrate with Google services (Analytics, Search Console) to provide SEO insights.Your data with these services is governed by their respective privacy policies</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us at:
            <br />
            Email: privacy@yourdomain.com
          </p>
        </section>
      </div>
    </div>
  )
}

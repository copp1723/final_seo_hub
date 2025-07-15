export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using SEO Hub, you accept and agree to be bound by the terms 
            and provision of this agreement</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
          <p className="mb-4">
            SEO Hub is a web-based platform that provides SEO management tools, analytics, 
            and reporting services to help businesses improve their search engine optimization</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
          <ul className="list-disc pl-6 mb-4">
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>You must not share your account credentials with others</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Use the service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
            <li>Upload malicious code or content</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data and Privacy</h2>
          <p className="mb-4">
            Your privacy is important to us.Please review our Privacy Policy to understand 
            how we collect, use, and protect your information</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
          <p className="mb-4">
            SEO Hub is provided "as is" without any warranties.We shall not be liable for 
            any damages arising from the use of our service</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          <p className="mb-4">
            For questions about these Terms of Service, please contact us at:
            <br />
            Email: support@yourdomain.com
          </p>
        </section>
      </div>
    </div>
  )
}

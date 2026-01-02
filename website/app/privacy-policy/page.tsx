import React from 'react';

export const metadata = {
  title: 'Privacy Policy | Cook Smart',
  description: 'Cook Smart privacy policy - Learn how we protect your data',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Last Updated: December 7, 2025</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to Cook Smart ("we," "our," or "us"). We are committed to protecting your
                privacy and ensuring the security of your personal information. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use
                our mobile application and website.
              </p>
              <p className="text-gray-700">
                By using Cook Smart, you agree to the collection and use of information in
                accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  <strong>Account Information:</strong> Email address, name, and password when you
                  create an account
                </li>
                <li>
                  <strong>Profile Information:</strong> Dietary preferences, allergies, and food
                  restrictions
                </li>
                <li>
                  <strong>Ingredient Data:</strong> Ingredients you add to your pantry, including
                  expiration dates
                </li>
                <li>
                  <strong>Recipe Data:</strong> Recipes you save, rate, or add to meal plans
                </li>
                <li>
                  <strong>Shopping Lists:</strong> Items you add to shopping lists
                </li>
                <li>
                  <strong>Meal Plans:</strong> Meals you schedule in your calendar
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                2.2 Automatically Collected Information
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  <strong>Device Information:</strong> Device type, operating system, unique device
                  identifiers
                </li>
                <li>
                  <strong>Usage Data:</strong> App features used, time spent in app, interaction
                  patterns
                </li>
                <li>
                  <strong>Log Data:</strong> IP address, access times, app crashes, and errors
                </li>
                <li>
                  <strong>Camera Access:</strong> Only when you use barcode scanning feature (images
                  are not stored)
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Provide and maintain the Cook Smart service</li>
                <li>Personalize your experience with recipe recommendations</li>
                <li>Send expiration reminders and meal planning notifications</li>
                <li>Improve app functionality and user experience</li>
                <li>Analyze usage patterns to enhance features</li>
                <li>Respond to your support requests and inquiries</li>
                <li>Detect and prevent technical issues and security threats</li>
                <li>Comply with legal obligations and enforce our terms of service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                Cook Smart integrates with the following third-party services:
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                4.1 FatSecret Platform API
              </h3>
              <p className="text-gray-700 mb-4">
                We use FatSecret to provide recipe and nutrition data. When you search for recipes,
                your search queries are sent to FatSecret. FatSecret's privacy policy:{' '}
                <a
                  href="https://www.fatsecret.com/privacy"
                  className="text-green-600 hover:text-green-700 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://www.fatsecret.com/privacy
                </a>
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                4.2 Amazon Web Services (AWS)
              </h3>
              <p className="text-gray-700 mb-4">
                Our backend infrastructure is hosted on AWS. Your data is stored securely in AWS
                data centers. AWS privacy policy:{' '}
                <a
                  href="https://aws.amazon.com/privacy/"
                  className="text-green-600 hover:text-green-700 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://aws.amazon.com/privacy/
                </a>
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Firebase (Google)</h3>
              <p className="text-gray-700 mb-4">
                We use Firebase for push notifications and analytics. Firebase privacy policy:{' '}
                <a
                  href="https://firebase.google.com/support/privacy"
                  className="text-green-600 hover:text-green-700 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://firebase.google.com/support/privacy
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Data Sharing and Disclosure
              </h2>
              <p className="text-gray-700 mb-4">
                We do NOT sell your personal information. We may share your information only in the
                following circumstances:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  <strong>With Your Consent:</strong> When you explicitly agree to share information
                </li>
                <li>
                  <strong>Service Providers:</strong> With third-party services listed above that
                  help us operate the app
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, court order, or
                  government request
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                  sale of assets
                </li>
                <li>
                  <strong>Protection:</strong> To protect our rights, property, or safety, or that
                  of our users
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Encryption of data in transit (HTTPS/TLS)</li>
                <li>Encryption of sensitive data at rest</li>
                <li>Secure password hashing (bcrypt)</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
                <li>Secure AWS infrastructure with firewalls</li>
              </ul>
              <p className="text-gray-700">
                However, no method of transmission over the internet is 100% secure. While we strive
                to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Your Rights and Choices
              </h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>
                  <strong>Access:</strong> Request a copy of your personal data
                </li>
                <li>
                  <strong>Correction:</strong> Update or correct inaccurate information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your account and data
                </li>
                <li>
                  <strong>Export:</strong> Download your data in a portable format
                </li>
                <li>
                  <strong>Opt-Out:</strong> Disable push notifications in app settings
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Stop using the app at any time
                </li>
              </ul>
              <p className="text-gray-700">
                To exercise these rights, contact us at{' '}
                <a
                  href="mailto:services.cooksmart@gmail.com"
                  className="text-green-600 hover:text-green-700 underline"
                >
                  services.cooksmart@gmail.com
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your information for as long as your account is active or as needed to
                provide services. When you delete your account:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Personal data is deleted within 30 days of account deletion</li>
                <li>Backup copies are deleted within 90 days of account deletion</li>
                <li>Anonymized usage data may be retained for analytics purposes</li>
                <li>Legal or regulatory requirements may require longer retention</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Children's Privacy</h2>
              <p className="text-gray-700">
                Cook Smart is not intended for children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If you believe we have
                collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Users</h2>
              <p className="text-gray-700">
                Cook Smart is operated from the United States. If you are accessing the app from
                outside the US, your information may be transferred to, stored, and processed in the
                US. By using Cook Smart, you consent to this transfer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any
                changes by:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending an in-app notification for significant changes</li>
              </ul>
              <p className="text-gray-700">
                Your continued use of Cook Smart after changes constitutes acceptance of the updated
                policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy or our data practices, please
                contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:services.cooksmart@gmail.com"
                    className="text-green-600 hover:text-green-700 underline"
                  >
                    services.cooksmart@gmail.com
                  </a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Website:</strong>{' '}
                  <a
                    href="https://cooksmartapp.com"
                    className="text-green-600 hover:text-green-700 underline"
                  >
                    https://cooksmartapp.com
                  </a>
                </p>
                <p className="text-gray-700">
                  <strong>Discord Community:</strong>{' '}
                  <a
                    href="https://discord.gg/btemMmWy2e"
                    className="text-green-600 hover:text-green-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://discord.gg/btemMmWy2e
                  </a>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Beta Notice</h2>
              <p className="text-gray-700">
                Cook Smart is currently in BETA. During this period, we may collect additional
                diagnostic and usage data to improve the app. All data collection practices
                described in this policy apply during the beta period.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              This Privacy Policy is effective as of December 7, 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

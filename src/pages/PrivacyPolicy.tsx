import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/favicon.jpg" 
              alt="Diadonum" 
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold">Diadonum</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-primary" />
              Privacy Policy
            </CardTitle>
            <p className="text-muted-foreground">Last updated: February 2, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <h2>1. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            
            <h3>1.1 Account Information</h3>
            <ul>
              <li>Email address (required for registration)</li>
              <li>Display name</li>
              <li>Password (stored securely using industry-standard hashing)</li>
            </ul>

            <h3>1.2 Usage Data</h3>
            <ul>
              <li>Paper trading activity and simulated portfolio data</li>
              <li>Feature preferences and settings</li>
              <li>Subscription and billing information</li>
            </ul>

            <h3>1.3 Technical Data</h3>
            <ul>
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and maintain the Service</li>
              <li>Process your subscription payments</li>
              <li>Send important service updates and notifications</li>
              <li>Improve our platform based on usage patterns</li>
              <li>Respond to customer support inquiries</li>
              <li>Detect and prevent fraudulent activity</li>
            </ul>

            <h2>3. Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption and security practices. 
              We use reputable cloud infrastructure providers that comply with international security 
              standards.
            </p>
            <p>
              However, no method of transmission over the Internet is 100% secure. While we strive 
              to protect your personal information, we cannot guarantee its absolute security.
            </p>

            <h2>4. Data Sharing</h2>
            <p>We do NOT sell your personal information. We may share your data with:</p>
            <ul>
              <li><strong>Payment processors:</strong> To handle subscription payments</li>
              <li><strong>Analytics providers:</strong> To understand usage patterns (anonymized)</li>
              <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
            </ul>

            <h2>5. Cookies</h2>
            <p>We use cookies for:</p>
            <ul>
              <li>Authentication and session management</li>
              <li>Remembering your preferences</li>
              <li>Analytics (anonymized usage data)</li>
            </ul>
            <p>
              You can disable cookies in your browser settings, but this may affect the 
              functionality of the Service.
            </p>

            <h2>6. Your Rights (GDPR Compliance)</h2>
            <p>If you are in the European Economic Area (EEA), you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Object:</strong> Object to processing of your data</li>
              <li><strong>Withdraw consent:</strong> Withdraw consent at any time</li>
            </ul>

            <h2>7. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to 
              provide services. We will delete or anonymize your data upon request, except where 
              retention is required by law.
            </p>

            <h2>8. Children's Privacy</h2>
            <p>
              The Service is not intended for users under 18 years of age. We do not knowingly 
              collect personal information from children.
            </p>

            <h2>9. Third-Party Links</h2>
            <p>
              Our Service may contain links to third-party websites (such as cryptocurrency 
              exchanges). We are not responsible for the privacy practices of these external sites.
            </p>

            <h2>10. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries outside your residence. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes via email or through the Service.
            </p>

            <h2>12. Contact Us</h2>
            <p>For privacy-related inquiries or to exercise your rights, contact us at:</p>
            <ul>
              <li>Email: privacy@diadonum.com</li>
              <li>Data deletion requests: privacy@diadonum.com</li>
            </ul>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                By using Diadonum, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api";
import { Shield, AlertCircle, CheckCircle2, Terminal } from "lucide-react";

const PgpSetup = () => {
  const [publicKey, setPublicKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient.setupPgp(publicKey);
      // Logout and redirect to login
      await apiClient.logout();
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PGP setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">PGP 2FA Setup</h1>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            As an admin, you must set up PGP-based two-factor authentication. Once configured,
            you'll need to sign a challenge with your private key on every login.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Step 1: Generate PGP Keys</CardTitle>
            <CardDescription>
              If you don't have a PGP key pair, generate one using GPG
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Terminal className="h-4 w-4" />
                <span>Terminal Commands:</span>
              </div>
              <div className="space-y-1">
                <p className="text-primary"># Generate a new PGP key pair</p>
                <p>gpg --full-generate-key</p>
                <p className="text-muted-foreground text-xs mt-2">
                  Choose: RSA and RSA, 4096 bits, no expiration (or set your preference)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Key generated successfully</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Export Public Key</CardTitle>
            <CardDescription>
              Export your public key in ASCII-armored format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Terminal className="h-4 w-4" />
                <span>Terminal Command:</span>
              </div>
              <div className="space-y-1">
                <p className="text-primary"># Export your public key</p>
                <p>gpg --armor --export your-email@example.com</p>
                <p className="text-muted-foreground text-xs mt-2">
                  Replace "your-email@example.com" with the email you used during key generation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Upload Public Key</CardTitle>
            <CardDescription>
              Paste your exported public key below (including BEGIN/END headers)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="publicKey">PGP Public Key</Label>
                <Textarea
                  id="publicKey"
                  placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;&#10;[Your public key here]&#10;&#10;-----END PGP PUBLIC KEY BLOCK-----"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  required
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Your public key should start with "-----BEGIN PGP PUBLIC KEY BLOCK-----"
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  After submitting, you'll be logged out and will need to re-login using PGP authentication.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !publicKey.trim()}>
                  {loading ? "Setting up..." : "Complete Setup"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>How to Sign Challenges</CardTitle>
            <CardDescription>
              After setup, you'll sign a challenge on each login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Terminal className="h-4 w-4" />
                <span>Sign a challenge:</span>
              </div>
              <div className="space-y-1">
                <p>echo "CHALLENGE_STRING" | gpg --clearsign</p>
                <p className="text-muted-foreground text-xs mt-2">
                  Copy the entire output (including headers) and paste it into the login form
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Keep your private key secure and never share it</li>
                <li>Challenges expire after 5 minutes</li>
                <li>You have 3 verification attempts per 5 minutes</li>
                <li>Make sure GPG is installed and your private key is accessible</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PgpSetup;

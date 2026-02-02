import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api";
import { Shield, AlertCircle, Copy, Clock, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LoginStep = 'credentials' | 'pgp-setup' | 'pgp-challenge';

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [isRegistering, setIsRegistering] = useState(false);
  const [pgpChallenge, setPgpChallenge] = useState<{
    userId: number;
    challenge: string;
    expiresAt: string;
  } | null>(null);
  const [signature, setSignature] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiClient.login(username, password);

      // PGP setup required (first-time admin)
      if (result.requiresPgpSetup && result.token) {
        setSetupToken(result.token);
        setLoginStep('pgp-setup');
        setLoading(false);
        return;
      }

      // PGP challenge required (admin with PGP configured)
      if (result.requiresPgp) {
        setPgpChallenge({
          userId: result.userId,
          challenge: result.challenge,
          expiresAt: result.expiresAt,
        });
        setLoginStep('pgp-challenge');
        setLoading(false);
        return;
      }

      // Direct login (regular user)
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient.register(username, password, email);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePgpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Setup PGP with the token we got from initial login
      const originalToken = apiClient.token;
      apiClient.token = setupToken;

      await apiClient.setupPgp(publicKey);

      // PGP setup logs us out, so we need to login again to get the challenge
      apiClient.token = null;
      const result = await apiClient.login(username, password);

      if (result.requiresPgp) {
        setPgpChallenge({
          userId: result.userId,
          challenge: result.challenge,
          expiresAt: result.expiresAt,
        });
        setLoginStep('pgp-challenge');
        toast({
          title: "PGP Setup Complete!",
          description: "Now sign the challenge to complete authentication.",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "PGP setup failed");
      apiClient.token = null;
    } finally {
      setLoading(false);
    }
  };

  const handlePgpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient.verifyPgp(pgpChallenge!.userId, signature);
      navigate("/dashboard");
    } catch (err) {
      setError("Signature verification failed. Please try again.");
      // Reset to credentials step
      setLoginStep('credentials');
      setPgpChallenge(null);
      setSignature('');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const copyChallenge = () => {
    if (pgpChallenge) {
      navigator.clipboard.writeText(pgpChallenge.challenge);
      toast({
        title: "Copied!",
        description: "Challenge string copied to clipboard",
      });
    }
  };

  const getTimeRemaining = () => {
    if (!pgpChallenge) return "";
    const now = new Date().getTime();
    const expires = new Date(pgpChallenge.expiresAt).getTime();
    const remaining = Math.floor((expires - now) / 1000);
    if (remaining <= 0) return "Expired";
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // PGP Setup Form
  if (loginStep === 'pgp-setup') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Key className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">Set Up PGP Authentication</CardTitle>
            <CardDescription className="text-center">
              As an admin, you need to configure PGP 2FA to secure your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePgpSetup} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>First time setup:</strong> Generate a PGP key and paste your public key below.
                  You'll need to sign a challenge on every login.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold">Quick Setup Guide:</p>
                <div className="font-mono text-xs space-y-1">
                  <p className="text-muted-foreground"># 1. Generate a PGP key</p>
                  <p>gpg --full-generate-key</p>
                  <p className="text-muted-foreground mt-2"># 2. Export your public key</p>
                  <p>gpg --armor --export your-email@example.com</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicKey">Your PGP Public Key</Label>
                <Textarea
                  id="publicKey"
                  placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;&#10;[Paste your public key here]&#10;&#10;-----END PGP PUBLIC KEY BLOCK-----"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  required
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Include the full key with BEGIN/END headers
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setLoginStep('credentials');
                    setPublicKey('');
                    setSetupToken('');
                    setPassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !publicKey.trim()}>
                  {loading ? "Setting up..." : "Continue to Login"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PGP Challenge Modal
  if (loginStep === 'pgp-challenge' && pgpChallenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl text-center">PGP Authentication Required</CardTitle>
            <CardDescription className="text-center">
              Sign the challenge with your PGP private key to complete login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePgpVerification} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Challenge String</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{getTimeRemaining()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={pgpChallenge.challenge}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={copyChallenge}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sign with: <code className="bg-muted px-2 py-1 rounded">echo "{pgpChallenge.challenge}" | gpg --clearsign</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">PGP Signature</Label>
                <Textarea
                  id="signature"
                  placeholder="Paste your PGP signature here (including -----BEGIN PGP SIGNATURE----- headers)"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  required
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setLoginStep('credentials');
                    setPgpChallenge(null);
                    setSignature('');
                    setPassword('');
                    setPublicKey('');
                    setSetupToken('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !signature}>
                  {loading ? "Verifying..." : "Verify & Login"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Credentials Form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">
            {isRegistering ? "Create Account" : "Login"}
          </CardTitle>
          <CardDescription className="text-center">
            {isRegistering
              ? "Register a new user account"
              : "Enter your credentials to access the system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder={isRegistering ? "Choose a username" : "admin"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={isRegistering ? "Min 8 characters" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isRegistering ? "new-password" : "current-password"}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isRegistering ? "Creating..." : "Logging in...") : (isRegistering ? "Create Account" : "Login")}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                  setEmail("");
                }}
                className="text-primary hover:underline"
              >
                {isRegistering
                  ? "Already have an account? Login"
                  : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

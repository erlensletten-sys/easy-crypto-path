import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
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
      setError(err instanceof Error ? err.message : t('auth.registrationFailed'));
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
          title: t('auth.pgpSetupComplete'),
          description: t('auth.signChallengeToComplete'),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.internalError'));
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
      setError(t('auth.signatureVerificationFailed'));
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
        title: t('auth.copied'),
        description: t('auth.challengeCopied'),
      });
    }
  };

  const getTimeRemaining = () => {
    if (!pgpChallenge) return "";
    const now = new Date().getTime();
    const expires = new Date(pgpChallenge.expiresAt).getTime();
    const remaining = Math.floor((expires - now) / 1000);
    if (remaining <= 0) return t('auth.expired');
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
            <CardTitle className="text-2xl text-center">{t('auth.pgpSetupTitle')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.pgpSetupDescription')}
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
                  <strong>{t('auth.firstTimeSetup')}:</strong> {t('auth.generatePgpKey')}
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold">{t('auth.quickSetupGuide')}</p>
                <div className="font-mono text-xs space-y-1">
                  <p className="text-muted-foreground"># 1. {t('auth.generateKey')}</p>
                  <p>gpg --full-generate-key</p>
                  <p className="text-muted-foreground mt-2"># 2. {t('auth.exportPublicKey')}</p>
                  <p>gpg --armor --export your-email@example.com</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicKey">{t('auth.pgpPublicKey')}</Label>
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
                  {t('auth.includeFullKey')}
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
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !publicKey.trim()}>
                  {loading ? t('auth.settingUp') : t('auth.continueToLogin')}
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
            <CardTitle className="text-2xl text-center">{t('auth.pgpAuthRequired')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.pgpDescription')}
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
                  <Label>{t('auth.challengeString')}</Label>
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
                  {t('auth.signWith')} <code className="bg-muted px-2 py-1 rounded">echo "{pgpChallenge.challenge}" | gpg --clearsign</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">{t('auth.pgpSignature')}</Label>
                <Textarea
                  id="signature"
                  placeholder={t('auth.pastePgpSignature')}
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
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !signature}>
                  {loading ? t('auth.verifying') : t('auth.verifyAndLogin')}
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
            {isRegistering ? t('auth.createAccount') : t('auth.loginTitle')}
          </CardTitle>
          <CardDescription className="text-center">
            {isRegistering
              ? t('auth.registerDescription')
              : t('auth.loginDescription')}
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
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={isRegistering ? t('auth.chooseUsername') : "admin"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
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
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={isRegistering ? t('auth.minCharacters') : t('auth.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isRegistering ? "new-password" : "current-password"}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isRegistering ? t('auth.creating') : t('auth.loggingIn')) : (isRegistering ? t('auth.createAccount') : t('auth.loginTitle'))}
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
                  ? t('auth.alreadyHaveAccount')
                  : t('auth.dontHaveAccount')}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

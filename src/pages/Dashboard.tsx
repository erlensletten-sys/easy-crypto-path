import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { LogOut, Key, Database, AlertCircle, CheckCircle, Wallet, Package, ShoppingBag, ArrowRight } from "lucide-react";

const Dashboard = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const navigate = useNavigate();

  const isAdmin = apiClient.isAdmin();

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      navigate("/login");
      return;
    }

    if (isAdmin) {
      loadTransactions();
    } else {
      setLoading(false);
    }
  }, [navigate, isAdmin]);

  const loadTransactions = async () => {
    try {
      const data = await apiClient.getTransactions();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadTransactions'));
      if (err instanceof Error && err.message.includes("token")) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      navigate("/login");
    } catch (err) {
      navigate("/login");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError(t('errors.passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('errors.passwordTooShort'));
      return;
    }

    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('errors.failedToChangePassword'));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirming: "default",
      confirmed: "outline",
      failed: "destructive",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Database className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{isAdmin ? t('dashboard.adminDashboard') : t('dashboard.userDashboard')}</h1>
            <p className="text-muted-foreground">
              {isAdmin ? t('dashboard.manageSystem') : t('dashboard.viewAccount')}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  {t('passwordChange.button')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('passwordChange.title')}</DialogTitle>
                  <DialogDescription>
                    {t('passwordChange.description')}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  )}

                  {passwordSuccess && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>{t('passwordChange.success')}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="current">{t('passwordChange.currentPassword')}</Label>
                    <Input
                      id="current"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new">{t('passwordChange.newPassword')}</Label>
                    <Input
                      id="new"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">{t('passwordChange.confirmPassword')}</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {t('passwordChange.changePassword')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('common.logout')}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick Actions - Admin */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/products")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Package className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">{t('dashboard.productsTitle')}</CardTitle>
                <CardDescription>{t('dashboard.productsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{t('dashboard.manageProducts')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('dashboard.addEditRemove')}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/wallets")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Wallet className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">{t('dashboard.walletsTitle')}</CardTitle>
                <CardDescription>{t('dashboard.walletsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{t('dashboard.configureWallets')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('dashboard.addAddressesXpubs')}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/orders")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <ShoppingBag className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">{t('dashboard.ordersTitle')}</CardTitle>
                <CardDescription>{t('dashboard.ordersDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{t('dashboard.viewAll')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('dashboard.manageOrders')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions - User */}
        {!isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/products-browse")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Package className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">{t('dashboard.browseProductsTitle')}</CardTitle>
                <CardDescription>{t('dashboard.browseDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{t('dashboard.shop')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('dashboard.browseCatalog')}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/my-orders")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <ShoppingBag className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">{t('dashboard.myOrdersTitle')}</CardTitle>
                <CardDescription>{t('dashboard.myOrdersDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{t('dashboard.viewOrders')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('dashboard.trackOrders')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions Table - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
              <CardDescription>
                {t('dashboard.recentTransactionsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('dashboard.noTransactionsYet')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('dashboard.txHash')}</TableHead>
                        <TableHead>{t('dashboard.crypto')}</TableHead>
                        <TableHead>{t('dashboard.amount')}</TableHead>
                        <TableHead>{t('dashboard.address')}</TableHead>
                        <TableHead>{t('dashboard.status')}</TableHead>
                        <TableHead>{t('dashboard.confirmations')}</TableHead>
                        <TableHead>{t('dashboard.date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-mono text-xs">
                            {tx.tx_hash.substring(0, 10)}...
                          </TableCell>
                          <TableCell className="uppercase">{tx.crypto_id}</TableCell>
                          <TableCell>{tx.amount}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {tx.address.substring(0, 10)}...
                          </TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                          <TableCell>{tx.confirmations}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

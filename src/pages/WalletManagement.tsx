import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { Plus, Edit, Trash2, Wallet, AlertCircle, ArrowLeft, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WalletData {
  id: number;
  crypto_id: string;
  type: string;
  value: string;
  label: string;
  is_active: number;
  created_at: string;
}

const WalletManagement = () => {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [supportedCryptos, setSupportedCryptos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletData | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    crypto_id: "",
    type: "address",
    value: "",
    label: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!apiClient.isAuthenticated() || !apiClient.isAdmin()) {
      navigate("/dashboard");
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      const [walletsData, cryptosData] = await Promise.all([
        apiClient.getWallets(),
        apiClient.getSupportedCryptos(),
      ]);
      setWallets(walletsData);
      setSupportedCryptos(cryptosData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (editingWallet) {
        await apiClient.updateWallet(editingWallet.id, formData);
      } else {
        await apiClient.createWallet(formData);
      }
      setDialogOpen(false);
      setEditingWallet(null);
      setFormData({ crypto_id: "", type: "address", value: "", label: "" });
      loadData();
      toast({
        title: editingWallet ? "Wallet updated!" : "Wallet added!",
        description: "Wallet has been saved successfully",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save wallet");
    }
  };

  const handleEdit = (wallet: WalletData) => {
    setEditingWallet(wallet);
    setFormData({
      crypto_id: wallet.crypto_id,
      type: wallet.type,
      value: wallet.value,
      label: wallet.label || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this wallet?")) return;

    try {
      await apiClient.deleteWallet(id);
      loadData();
      toast({
        title: "Wallet deleted!",
        description: "Wallet has been removed successfully",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete wallet");
    }
  };

  const handleToggleActive = async (wallet: WalletData) => {
    try {
      await apiClient.updateWallet(wallet.id, {
        is_active: wallet.is_active ? 0 : 1,
      });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update wallet");
    }
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getCryptoName = (cryptoId: string) => {
    const crypto = supportedCryptos.find(c => c.symbol.toLowerCase() === cryptoId.toLowerCase());
    return crypto ? crypto.name : cryptoId.toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Wallet className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading wallets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Wallet Management</h1>
              <p className="text-muted-foreground">Manage cryptocurrency wallet addresses and xpubs</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingWallet(null);
                setFormData({ crypto_id: "", type: "address", value: "", label: "" });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Wallet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingWallet ? "Edit Wallet" : "Add New Wallet"}</DialogTitle>
                <DialogDescription>
                  {editingWallet ? "Update wallet details" : "Add a new cryptocurrency wallet or xpub"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="crypto_id">Cryptocurrency *</Label>
                    <Select
                      value={formData.crypto_id}
                      onValueChange={(value) => setFormData({ ...formData, crypto_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cryptocurrency" />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedCryptos.map((crypto) => (
                          <SelectItem key={crypto.symbol} value={crypto.symbol.toLowerCase()}>
                            {crypto.symbol} - {crypto.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address">Address</SelectItem>
                        <SelectItem value="xpub">xPub (HD Wallet)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">
                    {formData.type === 'xpub' ? 'xPub Key *' : 'Wallet Address *'}
                  </Label>
                  <Input
                    id="value"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === 'xpub' ? 'xpub6...' : '0x... or bc1...'}
                    required
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.type === 'xpub'
                      ? 'Extended public key for hierarchical deterministic wallet'
                      : 'Public cryptocurrency address for receiving payments'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label">Label (Optional)</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Main wallet, Cold storage"
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingWallet ? "Update Wallet" : "Add Wallet"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configured Wallets</CardTitle>
            <CardDescription>
              Manage your cryptocurrency receiving addresses and xpub keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            {wallets.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No wallets configured yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add your first wallet to start accepting cryptocurrency payments
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crypto</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Address/xPub</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallets.map((wallet) => (
                      <TableRow key={wallet.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{wallet.crypto_id.toUpperCase()}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {getCryptoName(wallet.crypto_id)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={wallet.type === 'xpub' ? 'default' : 'secondary'}>
                            {wallet.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                              {wallet.value.substring(0, 12)}...{wallet.value.substring(wallet.value.length - 8)}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(wallet.value, wallet.id)}
                            >
                              {copiedId === wallet.id ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {wallet.label || <span className="text-muted-foreground italic">No label</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(wallet)}
                          >
                            <Badge variant={wallet.is_active ? 'default' : 'secondary'}>
                              {wallet.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(wallet)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(wallet.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Note:</strong> Only add wallet addresses you control. Never share private keys or seed phrases.
            xPub keys allow generating receive addresses without exposing private keys.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default WalletManagement;

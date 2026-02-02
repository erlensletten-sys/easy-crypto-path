import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api";
import { Plus, Edit, Trash2, Package, AlertCircle, ArrowLeft, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  is_active: number;
  created_at: string;
}

const ProductsManagement = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    image_url: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      navigate("/");
      return;
    }
    loadProducts();
  }, [navigate]);

  const loadProducts = async () => {
    try {
      const data = await apiClient.getProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('products.failedToLoad'));
      if (err instanceof Error && err.message.includes("token")) {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('products.invalidFileType'),
        description: t('products.selectImageFile'),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('products.fileTooLarge'),
        description: t('products.imageMustBeLess5MB'),
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const result = await apiClient.uploadProductPhoto(selectedFile);
      setFormData({ ...formData, image_url: result.imageUrl });
      toast({
        title: t('products.photoUploaded'),
        description: t('products.photoUploadedDescription'),
      });
    } catch (err) {
      toast({
        title: t('products.uploadFailed'),
        description: err instanceof Error ? err.message : t('products.uploadFailedDescription'),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setFormData({ ...formData, image_url: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // Upload photo first if one is selected and not yet uploaded
      if (selectedFile && !formData.image_url) {
        await handleUploadPhoto();
      }

      if (editingProduct) {
        await apiClient.updateProduct(editingProduct.id, {
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
        });
      } else {
        await apiClient.createProduct({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
        });
      }
      setDialogOpen(false);
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "", stock: "", category: "", image_url: "" });
      setSelectedFile(null);
      setPreviewUrl("");
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('products.failedToSave'));
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category || "",
      image_url: product.image_url || "",
    });
    if (product.image_url) {
      setPreviewUrl(`http://localhost:3001${product.image_url}`);
    }
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('products.deleteConfirm'))) return;

    try {
      await apiClient.deleteProduct(id);
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('products.failedToDelete'));
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await apiClient.updateProduct(product.id, {
        is_active: product.is_active ? 0 : 1,
      });
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('products.failedToUpdate'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">{t('products.loadingProducts')}</p>
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
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('products.title')}</h1>
              <p className="text-muted-foreground">{t('products.description')}</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingProduct(null);
                setFormData({ name: "", description: "", price: "", stock: "", category: "", image_url: "" });
                setSelectedFile(null);
                setPreviewUrl("");
              }}>
                <Plus className="h-4 w-4 mr-2" />
                {t('products.addProduct')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProduct ? t('products.editProduct') : t('products.newProduct')}</DialogTitle>
                <DialogDescription>
                  {editingProduct ? t('products.updateDetails') : t('products.addToCalog')}
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
                    <Label htmlFor="name">{t('products.nameRequired')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">{t('products.category')}</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('products.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">{t('products.priceRequired')}</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">{t('products.stock')}</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('products.photo')}</Label>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('products.maxSize')}
                      </p>
                    </div>
                    {selectedFile && !formData.image_url && (
                      <Button
                        type="button"
                        onClick={handleUploadPhoto}
                        disabled={uploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? t('products.uploading') : t('products.uploadPhoto')}
                      </Button>
                    )}
                  </div>

                  {previewUrl && (
                    <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden mt-2">
                      <img
                        src={previewUrl}
                        alt={t('products.preview')}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemovePhoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  {editingProduct ? t('products.updateProduct') : t('products.addProduct')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && !dialogOpen && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('products.productsCount', { count: products.length })}</CardTitle>
            <CardDescription>{t('products.allProducts')}</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('products.noProducts')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('products.addFirst')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('products.name')}</TableHead>
                      <TableHead>{t('products.category')}</TableHead>
                      <TableHead>{t('products.price')}</TableHead>
                      <TableHead>{t('products.stock')}</TableHead>
                      <TableHead>{t('products.status')}</TableHead>
                      <TableHead>{t('products.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>
                          <Badge
                            variant={product.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(product)}
                          >
                            {product.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  );
};

export default ProductsManagement;

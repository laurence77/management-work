import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Upload, 
  Trash2, 
  Edit, 
  QrCode, 
  Wallet, 
  Eye,
  Download,
  Copy,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CryptoWallet {
  id: string;
  name: string;
  symbol: string;
  address: string;
  network: string;
  icon: string;
  qrCode?: string;
  isActive: boolean;
  createdAt: string;
}

interface CryptoTransaction {
  id: string;
  transactionHash: string;
  cryptoType: string;
  amount: number;
  usdAmount: number;
  walletAddress: string;
  status: 'pending' | 'verified' | 'rejected';
  qrProof?: string;
  customerEmail: string;
  createdAt: string;
}

const CryptoWalletManager: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CryptoTransaction | null>(null);
  
  // Form state for new wallet
  const [newWallet, setNewWallet] = useState({
    name: '',
    symbol: '',
    address: '',
    network: '',
    icon: ''
  });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string>('');

  // Sample data - would come from API
  const [wallets, setWallets] = useState<CryptoWallet[]>([
    {
      id: '1',
      name: 'Bitcoin',
      symbol: 'BTC',
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      network: 'Bitcoin Mainnet',
      icon: '₿',
      qrCode: '/api/crypto/qr/bitcoin.png',
      isActive: true,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Ethereum',
      symbol: 'ETH',
      address: '0x742d35Cc6634C0532925a3b8D8432F7b8434331',
      network: 'Ethereum Mainnet',
      icon: 'Ξ',
      qrCode: '/api/crypto/qr/ethereum.png',
      isActive: true,
      createdAt: '2024-01-15'
    }
  ]);

  const [transactions, setTransactions] = useState<CryptoTransaction[]>([
    {
      id: '1',
      transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef',
      cryptoType: 'BTC',
      amount: 0.001234,
      usdAmount: 50.00,
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      status: 'pending',
      qrProof: '/uploads/qr-proof-1.png',
      customerEmail: 'customer@example.com',
      createdAt: '2024-01-20T10:30:00Z'
    }
  ]);

  const handleQRUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setQrFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setQrPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload an image file",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddWallet = async () => {
    if (!newWallet.name || !newWallet.symbol || !newWallet.address || !qrFile) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields and upload a QR code",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', newWallet.name);
      formData.append('symbol', newWallet.symbol);
      formData.append('address', newWallet.address);
      formData.append('network', newWallet.network);
      formData.append('icon', newWallet.icon);
      formData.append('qrCode', qrFile);

      const response = await fetch('/api/admin/crypto/wallets', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        setWallets([...wallets, result.data]);
        setNewWallet({ name: '', symbol: '', address: '', network: '', icon: '' });
        setQrFile(null);
        setQrPreview('');
        setIsDialogOpen(false);
        
        toast({
          title: "Wallet Added",
          description: "New crypto wallet added successfully",
        });
      } else {
        throw new Error(result.message || 'Failed to add wallet');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add crypto wallet",
        variant: "destructive",
      });
    }
  };

  const handleTransactionAction = async (transactionId: string, action: 'verify' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/crypto/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'verify' ? 'verified' : 'rejected' }),
      });

      const result = await response.json();
      
      if (result.success) {
        setTransactions(transactions.map(tx => 
          tx.id === transactionId 
            ? { ...tx, status: action === 'verify' ? 'verified' : 'rejected' }
            : tx
        ));
        
        toast({
          title: `Transaction ${action === 'verify' ? 'Verified' : 'Rejected'}`,
          description: `Transaction has been ${action === 'verify' ? 'verified' : 'rejected'} successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} transaction`,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>;
      case 'verified':
        return <Badge variant="outline" className="text-green-600 border-green-300">Verified</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Crypto Payment Management</h2>
          <p className="text-muted-foreground">Manage cryptocurrency wallets and verify transactions</p>
        </div>
      </div>

      <Tabs defaultValue="wallets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="wallets">Crypto Wallets</TabsTrigger>
          <TabsTrigger value="transactions">Pending Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Active Crypto Wallets</h3>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Wallet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Crypto Wallet</DialogTitle>
                  <DialogDescription>
                    Add a new cryptocurrency wallet with QR code for payments
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Cryptocurrency Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Bitcoin"
                        value={newWallet.name}
                        onChange={(e) => setNewWallet({...newWallet, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="symbol">Symbol</Label>
                      <Input
                        id="symbol"
                        placeholder="e.g., BTC"
                        value={newWallet.symbol}
                        onChange={(e) => setNewWallet({...newWallet, symbol: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="network">Network</Label>
                      <Input
                        id="network"
                        placeholder="e.g., Bitcoin Mainnet"
                        value={newWallet.network}
                        onChange={(e) => setNewWallet({...newWallet, network: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="icon">Icon (Unicode)</Label>
                      <Input
                        id="icon"
                        placeholder="e.g., ₿"
                        value={newWallet.icon}
                        onChange={(e) => setNewWallet({...newWallet, icon: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Wallet Address</Label>
                      <Input
                        id="address"
                        placeholder="Enter wallet address"
                        value={newWallet.address}
                        onChange={(e) => setNewWallet({...newWallet, address: e.target.value})}
                        className="font-mono text-sm"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>QR Code Image</Label>
                      <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                        {qrPreview ? (
                          <div className="space-y-2">
                            <img 
                              src={qrPreview} 
                              alt="QR Code Preview"
                              className="max-w-32 max-h-32 mx-auto rounded-lg"
                            />
                            <p className="text-sm text-green-600">✓ QR Code uploaded</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <QrCode className="h-12 w-12 mx-auto text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Upload QR Code</p>
                              <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                            </div>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleQRUpload}
                          className="hidden"
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          className="mt-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddWallet}>
                    Add Wallet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((wallet) => (
              <Card key={wallet.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl font-bold">
                        {wallet.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{wallet.name}</h3>
                        <p className="text-sm text-muted-foreground">{wallet.symbol}</p>
                      </div>
                    </div>
                    <Badge variant={wallet.isActive ? "default" : "secondary"}>
                      {wallet.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Network: {wallet.network}</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={wallet.address}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(wallet.address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {wallet.qrCode && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={wallet.qrCode} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" />
                          View QR
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Pending Crypto Transactions</h3>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Hash</TableHead>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>USD Value</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-xs">
                      {transaction.transactionHash.substring(0, 10)}...
                    </TableCell>
                    <TableCell>{transaction.cryptoType}</TableCell>
                    <TableCell>{transaction.amount}</TableCell>
                    <TableCell>${transaction.usdAmount}</TableCell>
                    <TableCell>{transaction.customerEmail}</TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {transaction.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-green-600 border-green-300"
                            onClick={() => handleTransactionAction(transaction.id, 'verify')}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-300"
                            onClick={() => handleTransactionAction(transaction.id, 'reject')}
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                          {transaction.qrProof && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={transaction.qrProof} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CryptoWalletManager;
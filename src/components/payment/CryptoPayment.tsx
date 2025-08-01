import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, Copy, CheckCircle, AlertCircle, Bitcoin, Wallet, QrCode, Camera, ArrowLeft, Shield, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { MobileCard, MobileCardHeader, MobileCardTitle, MobileCardContent } from '@/components/ui/mobile-card';
import { cn } from '@/lib/utils';

interface CryptoPaymentProps {
  amount: number;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

interface CryptoWallet {
  name: string;
  symbol: string;
  address: string;
  network: string;
  icon: string;
  qrCode?: string;
}

const CryptoPayment: React.FC<CryptoPaymentProps> = ({ 
  amount, 
  onPaymentSuccess, 
  onPaymentError 
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedWallet, setSelectedWallet] = useState<CryptoWallet | null>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [uploadedQR, setUploadedQR] = useState<File | null>(null);
  const [uploadedQRPreview, setUploadedQRPreview] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'pay' | 'confirm' | 'processing'>('select');
  const [paymentTimer, setPaymentTimer] = useState(600); // 10 minutes
  const [conversionRate, setConversionRate] = useState<{[key: string]: number}>({});

  // Crypto wallets with QR codes (admin can upload these)
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([
    {
      name: "Bitcoin",
      symbol: "BTC",
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      network: "Bitcoin Mainnet",
      icon: "₿",
      qrCode: "/api/crypto/qr/bitcoin" // Will be uploaded by admin
    },
    {
      name: "Ethereum",
      symbol: "ETH", 
      address: "0x742d35Cc6634C0532925a3b8D8432F7b8434331",
      network: "Ethereum Mainnet",
      icon: "Ξ",
      qrCode: "/api/crypto/qr/ethereum"
    },
    {
      name: "USDT (Tether)",
      symbol: "USDT",
      address: "0x742d35Cc6634C0532925a3b8D8432F7b8434331",
      network: "Ethereum (ERC-20)",
      icon: "₮",
      qrCode: "/api/crypto/qr/usdt"
    },
    {
      name: "USDC",
      symbol: "USDC",
      address: "0x742d35Cc6634C0532925a3b8D8432F7b8434331", 
      network: "Ethereum (ERC-20)",
      icon: "$",
      qrCode: "/api/crypto/qr/usdc"
    },
    {
      name: "Binance Coin",
      symbol: "BNB",
      address: "bnb1xy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      network: "Binance Smart Chain",
      icon: "⬢",
      qrCode: "/api/crypto/qr/bnb"
    },
    {
      name: "Litecoin", 
      symbol: "LTC",
      address: "ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      network: "Litecoin Mainnet",
      icon: "Ł",
      qrCode: "/api/crypto/qr/litecoin"
    }
  ]);

  const handleWalletSelect = (wallet: CryptoWallet) => {
    setSelectedWallet(wallet);
    setPaymentStep('pay');
    // Start payment timer
    setPaymentTimer(600);
  };

  // Payment timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (paymentStep === 'pay' && paymentTimer > 0) {
      interval = setInterval(() => {
        setPaymentTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [paymentStep, paymentTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstimatedCryptoAmount = (wallet: CryptoWallet) => {
    // Mock conversion rates - in real app, fetch from API
    const rates: {[key: string]: number} = {
      'BTC': 45000,
      'ETH': 2800,
      'USDT': 1,
      'USDC': 1,
      'BNB': 320,
      'LTC': 95
    };
    
    const rate = rates[wallet.symbol] || 1;
    return (amount / rate).toFixed(8);
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

  const handleQRUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setUploadedQR(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedQRPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
        toast({
          title: "QR Code Uploaded",
          description: "Payment proof uploaded successfully",
        });
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload an image file",
          variant: "destructive",
        });
      }
    }
  };

  const handlePaymentConfirmation = async () => {
    if (!transactionHash.trim()) {
      toast({
        title: "Transaction Hash Required",
        description: "Please enter the transaction hash",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      // Submit payment proof to backend
      const formData = new FormData();
      formData.append('transactionHash', transactionHash);
      formData.append('cryptoType', selectedWallet?.symbol || '');
      formData.append('amount', amount.toString());
      formData.append('walletAddress', selectedWallet?.address || '');
      
      if (uploadedQR) {
        formData.append('qrProof', uploadedQR);
      }

      const response = await fetch('/api/payments/crypto/verify', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onPaymentSuccess({
          transactionHash,
          cryptoType: selectedWallet?.symbol,
          amount,
          walletAddress: selectedWallet?.address,
          status: 'pending_verification'
        });
        
        toast({
          title: "Payment Submitted",
          description: "Your crypto payment is being verified",
        });
      } else {
        throw new Error(result.message || 'Payment verification failed');
      }
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : 'Payment failed');
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Admin function to add new crypto wallet
  const addCryptoWallet = async (walletData: Omit<CryptoWallet, 'qrCode'>, qrFile: File) => {
    const formData = new FormData();
    formData.append('name', walletData.name);
    formData.append('symbol', walletData.symbol);
    formData.append('address', walletData.address);
    formData.append('network', walletData.network);
    formData.append('icon', walletData.icon);
    formData.append('qrCode', qrFile);

    try {
      const response = await fetch('/api/admin/crypto/wallets', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setCryptoWallets([...cryptoWallets, result.data]);
        toast({
          title: "Wallet Added",
          description: "New crypto wallet added successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add crypto wallet",
        variant: "destructive",
      });
    }
  };

  if (paymentStep === 'select') {
    return (
      <div className="mobile-container">
        <MobileCard>
          <MobileCardHeader icon={Bitcoin}>
            <div>
              <MobileCardTitle>Choose Cryptocurrency</MobileCardTitle>
              <p className="mobile-text text-muted-foreground mt-1">
                Select your preferred cryptocurrency for payment of ${amount}
              </p>
            </div>
          </MobileCardHeader>
          <MobileCardContent>
            <div className="mobile-grid gap-3">
              {cryptoWallets.map((wallet) => (
                <div
                  key={wallet.symbol}
                  className={cn(
                    "glass-card cursor-pointer hover:bg-white/[0.08] hover:border-white/20",
                    "transition-all duration-200 transform hover:scale-[1.02]",
                    "touch-target p-4"
                  )}
                  onClick={() => handleWalletSelect(wallet)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-xl font-bold text-primary">
                        {wallet.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{wallet.name}</h3>
                        <p className="text-sm text-muted-foreground">{wallet.symbol}</p>
                        <p className="text-xs text-primary font-medium">
                          ≈ {getEstimatedCryptoAmount(wallet)} {wallet.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {wallet.network.split(' ')[0]}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-primary mb-1">Secure Payment</h4>
                  <p className="text-sm text-muted-foreground">
                    All transactions are verified on the blockchain. Your payment will be confirmed within 15-30 minutes.
                  </p>
                </div>
              </div>
            </div>
          </MobileCardContent>
        </MobileCard>
      </div>
    );
  }

  if (paymentStep === 'pay' && selectedWallet) {
    return (
      <div className="mobile-container">
        <MobileCard>
          <MobileCardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaymentStep('select')}
                  className="p-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <MobileCardTitle>Send {selectedWallet.name}</MobileCardTitle>
                  <p className="mobile-text text-muted-foreground">
                    ${amount} ≈ {getEstimatedCryptoAmount(selectedWallet)} {selectedWallet.symbol}
                  </p>
                </div>
              </div>
              
              {/* Payment Timer */}
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className={cn(
                    "font-mono font-medium",
                    paymentTimer < 60 ? "text-red-500" : "text-orange-500"
                  )}>
                    {formatTime(paymentTimer)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Time remaining</p>
              </div>
            </div>
          </MobileCardHeader>
          
          <MobileCardContent>
            {/* Payment Progress */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div className="w-12 h-1 bg-primary rounded-full" />
                <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-muted-foreground text-sm font-medium">
                  2
                </div>
                <div className="w-12 h-1 bg-muted rounded-full" />
                <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-muted-foreground text-sm font-medium">
                  3
                </div>
              </div>
            </div>
            
            {/* QR Code Section */}
            <div className="text-center mb-6">
              <div className="w-56 h-56 mx-auto bg-white rounded-2xl p-4 flex items-center justify-center shadow-lg">
                {selectedWallet.qrCode ? (
                  <img 
                    src={selectedWallet.qrCode} 
                    alt={`${selectedWallet.name} QR Code`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <QrCode className="h-20 w-20 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">QR Code Not Available</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Scan with your crypto wallet app
              </p>
            </div>

            {/* Wallet Address */}
            <div className="space-y-3 mb-6">
              <Label className="mobile-text font-medium">Wallet Address</Label>
              <div className="mobile-flex gap-2">
                <Input 
                  value={selectedWallet.address}
                  readOnly
                  className="mobile-input font-mono text-xs sm:text-sm flex-1"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(selectedWallet.address)}
                  className="touch-target flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Amount to Send</p>
                <p className="font-mono font-semibold text-lg">
                  {getEstimatedCryptoAmount(selectedWallet)} {selectedWallet.symbol}
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Network</p>
                <p className="font-semibold">{selectedWallet.network}</p>
              </div>
            </div>

            {/* Important Warning */}
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Network Warning
                  </h4>
                  <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                    <li>• Send only {selectedWallet.symbol} to this address</li>
                    <li>• Use {selectedWallet.network} network only</li>
                    <li>• Double-check the address before sending</li>
                    <li>• Sending wrong token or network will result in permanent loss</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mobile-flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setPaymentStep('select')}
                className="flex-1 sm:flex-none"
              >
                Change Currency
              </Button>
              <Button 
                onClick={() => setPaymentStep('confirm')}
                className="btn-luxury flex-1"
              >
                I've Sent Payment
              </Button>
            </div>
          </MobileCardContent>
        </MobileCard>
      </div>
    );
  }

  if (paymentStep === 'processing') {
    return (
      <div className="mobile-container">
        <MobileCard>
          <MobileCardContent className="text-center py-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="mobile-subheading font-semibold mb-2">
              Processing Payment
            </h3>
            <p className="mobile-text text-muted-foreground mb-4">
              Verifying your {selectedWallet?.symbol} transaction on the blockchain...
            </p>
            
            <div className="space-y-2 mb-6">
              <Progress value={66} className="h-2" />
              <p className="text-sm text-muted-foreground">
                This usually takes 15-30 minutes
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
                <li>• Your transaction is being verified</li>
                <li>• You'll receive an email confirmation</li>
                <li>• Booking will be confirmed automatically</li>
                <li>• Support team will contact you within 24 hours</li>
              </ul>
            </div>
          </MobileCardContent>
        </MobileCard>
      </div>
    );
  }

  if (paymentStep === 'confirm') {
    return (
      <div className="mobile-container">
        <MobileCard>
          <MobileCardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaymentStep('pay')}
                  className="p-2 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <MobileCardTitle>Confirm Payment</MobileCardTitle>
                  <p className="mobile-text text-muted-foreground">
                    Provide transaction details for verification
                  </p>
                </div>
              </div>
            </div>
          </MobileCardHeader>
          
          <MobileCardContent>
            {/* Payment Progress */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full text-white text-sm font-medium">
                  ✓
                </div>
                <div className="w-12 h-1 bg-green-500 rounded-full" />
                <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div className="w-12 h-1 bg-muted rounded-full" />
                <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-muted-foreground text-sm font-medium">
                  3
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="hash" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="hash" className="mobile-text">Transaction Hash</TabsTrigger>
                <TabsTrigger value="qr" className="mobile-text">Upload Proof</TabsTrigger>
              </TabsList>
              
              <TabsContent value="hash" className="space-y-4">
                <div className="mobile-form-group">
                  <Label htmlFor="txHash" className="mobile-text font-medium">Transaction Hash *</Label>
                  <Input
                    id="txHash"
                    placeholder="Enter transaction hash (0x... or similar)"
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                    className="mobile-input font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in your wallet's transaction history
                  </p>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    How to find your transaction hash:
                  </h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>1. Open your crypto wallet app</li>
                    <li>2. Go to transaction history</li>
                    <li>3. Find the recent {selectedWallet?.symbol} transaction</li>
                    <li>4. Copy the transaction ID/hash</li>
                  </ol>
                </div>
              </TabsContent>
              
              <TabsContent value="qr" className="space-y-4">
                <div className="mobile-form-group">
                  <Label className="mobile-text font-medium">Upload Payment Proof (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    {uploadedQRPreview ? (
                      <div className="space-y-3">
                        <img 
                          src={uploadedQRPreview} 
                          alt="Uploaded proof"
                          className="max-w-48 max-h-48 mx-auto rounded-lg shadow-md"
                        />
                        <p className="text-sm text-green-600 font-medium">✓ Proof uploaded successfully</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadedQR(null);
                            setUploadedQRPreview('');
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <p className="mobile-text font-medium">Upload screenshot or QR code</p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                        <Button 
                          type="button"
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          className="touch-target"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQRUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Payment Summary */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-primary mb-3">Payment Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">${amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cryptocurrency</p>
                  <p className="font-semibold">{selectedWallet?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Network</p>
                  <p className="font-semibold">{selectedWallet?.network}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className="text-xs">Pending Verification</Badge>
                </div>
              </div>
            </div>

            <div className="mobile-flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setPaymentStep('pay')}
                disabled={isProcessing}
                className="flex-1 sm:flex-none"
              >
                Back
              </Button>
              <Button 
                onClick={handlePaymentConfirmation}
                disabled={!transactionHash.trim() || isProcessing}
                className="btn-luxury flex-1"
              >
                {isProcessing ? 'Verifying...' : 'Confirm Payment'}
              </Button>
            </div>
          </MobileCardContent>
        </MobileCard>
      </div>
    );
  }

  return null;
};

export default CryptoPayment;
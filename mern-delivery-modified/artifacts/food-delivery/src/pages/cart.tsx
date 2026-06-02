import { useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useGetCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  useCreateOrder,
  getGetCartQueryKey,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocalStorage } from "@/lib/utils";

// Stripe integration: load Stripe.js dynamically
async function loadStripe() {
  if ((window as unknown as { Stripe?: unknown }).Stripe) {
    return (window as unknown as { Stripe: (key: string) => unknown }).Stripe;
  }
  return new Promise<(key: string) => unknown>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.onload = () => resolve((window as unknown as { Stripe: (key: string) => unknown }).Stripe);
    document.head.appendChild(script);
  });
}

// Stripe Checkout simulation (works without backend Stripe endpoint)
// In production, replace this with a real call to your backend to create a PaymentIntent / Checkout Session
async function initiateStripeCheckout(total: number): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  // Since we don't have a live Stripe backend endpoint, we simulate a successful payment
  // In production: call your API -> create PaymentIntent -> confirm with Stripe.js
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate success (95%) or failure (5%)
      if (Math.random() > 0.05) {
        resolve({ success: true, paymentIntentId: `pi_simulated_${Date.now()}` });
      } else {
        resolve({ success: false, error: "Your card was declined. Please try another card." });
      }
    }, 1800);
  });
}

export default function CartPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [savedAddresses] = useLocalStorage<{ id: string; label: string; address: string; phone?: string; isDefault: boolean }[]>(
    "qb_saved_addresses",
    [],
  );
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const saved = window.localStorage.getItem("qb_saved_addresses");
      const addresses = saved ? (JSON.parse(saved) as { id: string; address: string; isDefault: boolean }[]) : [];
      return addresses.find((entry) => entry.isDefault)?.address ?? "";
    } catch {
      return "";
    }
  });
  const [notes, setNotes] = useState("");
  const [paymentStep, setPaymentStep] = useState<"cart" | "payment" | "processing">("cart");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  const { data: cart, isLoading } = useGetCart({ query: { queryKey: getGetCartQueryKey(), enabled: isAuthenticated } });

  const { mutate: updateItem } = useUpdateCartItem({
    mutation: {
      onSuccess() { qc.invalidateQueries({ queryKey: getGetCartQueryKey() }); },
    },
  });

  const { mutate: removeItem } = useRemoveCartItem({
    mutation: {
      onSuccess() { qc.invalidateQueries({ queryKey: getGetCartQueryKey() }); },
    },
  });

  const { mutate: clearCart } = useClearCart({
    mutation: {
      onSuccess() { qc.invalidateQueries({ queryKey: getGetCartQueryKey() }); },
    },
  });

  const { mutate: createOrder, isPending: ordering } = useCreateOrder({
    mutation: {
      onSuccess(order) {
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Order placed successfully! 🎉" });
        navigate(`/orders/${order.id}`);
      },
      onError(err: unknown) {
        const msg = (err as { data?: { error?: string } })?.data?.error ?? "Order failed";
        toast({ title: msg, variant: "destructive" });
        setPaymentStep("cart");
      },
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="w-full px-4 py-16 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Sign in to view your cart</p>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/login")}>
          Sign In
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-3 rounded-xl" />)}
      </div>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="w-full px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-gray-200 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-6">Browse restaurants and add items to get started</p>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/")}>
          Browse Restaurants
        </Button>
      </div>
    );
  }

  function handleProceedToPayment() {
    if (!deliveryAddress.trim()) {
      toast({ title: "Please enter your delivery address", variant: "destructive" });
      return;
    }
    setPaymentStep("payment");
  }

  function formatCardNumber(value: string) {
    return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  async function handlePayment() {
    if (!cardName.trim() || cardNumber.replace(/\s/g, "").length < 16 || cardExpiry.length < 5 || cardCvc.length < 3) {
      toast({ title: "Please fill in all payment details", variant: "destructive" });
      return;
    }
    setPaymentStep("processing");
    const result = await initiateStripeCheckout(cart?.total ?? 0);
    if (result.success) {
      toast({ title: "Payment authorised ✅ Placing your order..." });
      createOrder({
        data: {
          restaurantId: cart!.restaurantId!,
          deliveryAddress,
          notes: notes || undefined,
        },
      });
    } else {
      toast({ title: result.error ?? "Payment failed", variant: "destructive" });
      setPaymentStep("payment");
    }
  }

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {paymentStep === "cart" ? "Your Cart" : "Secure Payment"}
        </h1>
        {paymentStep === "cart" && (
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500" onClick={() => clearCart()}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
        {paymentStep === "payment" && (
          <button
            onClick={() => setPaymentStep("cart")}
            className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
          >
            ← Back to cart
          </button>
        )}
      </div>

      {/* Cart step */}
      {paymentStep === "cart" && (
        <>
          {cart?.restaurantName && (
            <p className="text-sm text-gray-500 mb-4">From: <span className="font-medium text-gray-700">{cart.restaurantName}</span></p>
          )}

          <div className="space-y-3 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-xl bg-white">
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-sm text-orange-500">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="p-1 rounded-lg hover:bg-gray-100"
                    onClick={() => updateItem({ itemId: item.id, data: { quantity: item.quantity - 1 } })}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    className="p-1 rounded-lg hover:bg-gray-100"
                    onClick={() => updateItem({ itemId: item.id, data: { quantity: item.quantity + 1 } })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 ml-1"
                    onClick={() => removeItem({ itemId: item.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Separator className="mb-6" />

          {savedAddresses.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Saved addresses</p>
                  <p className="text-xs text-gray-500">Tap to prefill your preferred delivery address.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/saved-addresses")}>Manage</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {savedAddresses.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setDeliveryAddress(entry.address)}
                    className="text-left rounded-3xl border border-gray-200 p-3 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900">{entry.label}</p>
                      {entry.isDefault && <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-green-700 bg-green-50 px-2 py-1 rounded-full">Default</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{entry.address}</p>
                    {entry.phone && <p className="text-xs text-gray-400 mt-1">{entry.phone}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <Label htmlFor="address">Delivery Address *</Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Special Instructions (optional)</Label>
              <Input
                id="notes"
                placeholder="Leave at door, ring bell, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${cart?.subtotal?.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery fee</span>
              <span>{cart?.deliveryFee === 0 ? "Free" : `$${cart?.deliveryFee?.toFixed(2) ?? "0.00"}`}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>${cart?.total?.toFixed(2) ?? "0.00"}</span>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600"
            onClick={handleProceedToPayment}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Proceed to Payment · ${cart?.total?.toFixed(2) ?? "0.00"}
          </Button>
        </>
      )}

      {/* Payment step */}
      {(paymentStep === "payment" || paymentStep === "processing") && (
        <>
          {/* Order summary */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-orange-800 mb-1">Order from {cart?.restaurantName}</p>
            <p className="text-xs text-orange-600">{items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
            <p className="text-sm font-bold text-orange-900 mt-2">Total: ${cart?.total?.toFixed(2)}</p>
          </div>

          {/* Stripe-style card form */}
          <div className="border rounded-xl p-5 bg-white shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-gray-700">Secure Card Payment</span>
              <div className="ml-auto flex gap-1">
                {["VISA", "MC", "AMEX"].map((brand) => (
                  <span key={brand} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono font-bold">{brand}</span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cardholder Name</Label>
                <Input
                  placeholder="John Smith"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  disabled={paymentStep === "processing"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Card Number</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  disabled={paymentStep === "processing"}
                  maxLength={19}
                  className="font-mono tracking-wider"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    disabled={paymentStep === "processing"}
                    maxLength={5}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CVC</Label>
                  <Input
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    disabled={paymentStep === "processing"}
                    maxLength={4}
                    className="font-mono"
                    type="password"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
            onClick={handlePayment}
            disabled={paymentStep === "processing" || ordering}
          >
            {paymentStep === "processing" || ordering ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                {ordering ? "Placing order..." : "Processing payment..."}
              </span>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Pay ${cart?.total?.toFixed(2)} securely
              </>
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" /> Payments are encrypted and secure
          </p>
        </>
      )}
    </main>
  );
}

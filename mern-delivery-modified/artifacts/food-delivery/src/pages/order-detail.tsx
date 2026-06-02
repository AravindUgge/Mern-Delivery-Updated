import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, MapPin, Clock, Check, Radio, Star, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useGetOrder,
  useCreateReview,
  getGetOrderQueryKey,
  getListReviewsQueryKey,
} from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// Full 6-step delivery tracking as required
const STEPS = [
  { key: "pending",          label: "Order Placed",    emoji: "📝", bg: "bg-yellow-400",  ring: "ring-yellow-400" },
  { key: "confirmed",        label: "Accepted",        emoji: "✅", bg: "bg-blue-500",    ring: "ring-blue-500" },
  { key: "preparing",        label: "Preparing",       emoji: "👨‍🍳", bg: "bg-indigo-500",  ring: "ring-indigo-500" },
  { key: "picked_up",        label: "Picked Up",       emoji: "📦", bg: "bg-teal-500",    ring: "ring-teal-500" },
  { key: "out_for_delivery", label: "Out for Delivery",emoji: "🛵", bg: "bg-orange-500",  ring: "ring-orange-500" },
  { key: "delivered",        label: "Delivered",       emoji: "🎉", bg: "bg-green-500",   ring: "ring-green-500" },
];

// Map real DB statuses to step keys (picked_up is inferred between preparing and out_for_delivery)
function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    preparing: 2,
    picked_up: 3,
    out_for_delivery: 4,
    delivered: 5,
  };
  // If backend sends out_for_delivery, we show picked_up (index 3) as done
  if (status === "out_for_delivery") return 4;
  return map[status] ?? 0;
}

function StatusTracker({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center justify-center py-6 bg-red-50 rounded-xl animate-fade-up">
        <span className="text-red-600 font-semibold text-lg">❌ Order Cancelled</span>
      </div>
    );
  }

  const currentIdx = getStepIndex(status);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start gap-0 min-w-[480px]">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <div
              key={step.key}
              className="flex items-center flex-1 last:flex-none animate-fade-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex flex-col items-center min-w-[70px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all shadow-sm ${
                    done
                      ? `${step.bg} scale-100`
                      : active
                      ? `${step.bg} ring-2 ring-offset-2 ${step.ring} animate-status-pulse scale-110`
                      : "bg-gray-200 scale-90"
                  }`}
                >
                  {done ? <Check className="h-5 w-5 text-white" /> : <span>{step.emoji}</span>}
                </div>
                <span className={`text-xs mt-1.5 text-center leading-tight font-medium w-16 transition-colors ${active ? "text-gray-900 font-bold" : done ? "text-gray-500" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-1 mb-7 rounded-full transition-all duration-700 ${idx < currentIdx ? `${step.bg}` : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewForm({ restaurantId }: { restaurantId: string }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { mutate: submitReview, isPending } = useCreateReview({
    mutation: {
      onSuccess() {
        setSubmitted(true);
        qc.invalidateQueries({ queryKey: getListReviewsQueryKey(restaurantId) });
        toast({ title: "Thanks for your review! 🌟" });
      },
      onError() {
        toast({ title: "Could not submit review", variant: "destructive" });
      },
    },
  });

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center animate-bounce-in">
        <p className="text-3xl mb-2 animate-float inline-block">🌟</p>
        <p className="font-semibold text-green-700">Thank you for your review!</p>
        <p className="text-sm text-green-600 mt-0.5">Your feedback helps other customers.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-5 animate-fade-up">
      <h3 className="font-semibold text-gray-900 mb-1">How was your order? ⭐</h3>
      <p className="text-sm text-gray-500 mb-4">Rate your experience and help others decide</p>

      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="transition-all duration-150 hover:scale-125 active:scale-90"
          >
            <Star
              className={`h-8 w-8 transition-all duration-150 ${
                n <= (hovered || rating)
                  ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-medium text-gray-600 self-center animate-pop-in">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </span>
        )}
      </div>

      <Textarea
        placeholder="Tell us about your experience... (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="bg-white mb-3 resize-none focus:scale-[1.01] transition-transform duration-200"
        rows={3}
      />

      <Button
        className="bg-orange-500 hover:bg-orange-600 w-full active:scale-95 transition-all duration-150"
        disabled={rating === 0 || isPending}
        onClick={() => submitReview({ restaurantId, data: { rating, comment: comment || undefined } })}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Submitting...
          </span>
        ) : "Submit Review ✨"}
      </Button>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: order, isLoading, dataUpdatedAt } = useGetOrder(id, {
    query: { queryKey: getGetOrderQueryKey(id), refetchInterval: 15_000 },
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded-lg relative overflow-hidden"><div className="absolute inset-0 animate-shimmer" /></div>
        <div className="h-32 w-full bg-gray-100 rounded-xl relative overflow-hidden"><div className="absolute inset-0 animate-shimmer" /></div>
        <div className="h-48 w-full bg-gray-100 rounded-xl relative overflow-hidden"><div className="absolute inset-0 animate-shimmer" /></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full px-4 py-16 text-center animate-fade-up">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const o = order as Order & {
    restaurantId: string;
    items: { menuItemId: string; name: string; price: number; quantity: number }[];
    paymentIntentId?: string;
    paymentStatus?: string;
  };

  return (
    <main className="w-full max-w-lg mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 animate-slide-left" onClick={() => navigate("/orders")}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        Orders
      </Button>

      <div className="flex items-start justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-xl font-bold">{o.restaurantName}</h1>
          <p className="text-sm text-gray-400">#{o.id.slice(-8).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">${(o.total as number).toFixed(2)}</p>
          <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {/* Status tracker */}
      <div className="border rounded-xl p-5 bg-white shadow-sm mb-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Delivery Status</h2>
          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
            <Radio className="h-3 w-3 animate-pulse" />
            Live
          </div>
        </div>
        <StatusTracker status={o.status} />
        {o.status !== "delivered" && o.status !== "cancelled" && (
          <p className="text-xs text-gray-400 mt-3 text-center">Updates every 15 seconds</p>
        )}
        {dataUpdatedAt > 0 && (
          <p className="text-xs text-gray-300 text-center mt-1">
            Last checked: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        )}
        {(o as unknown as { estimatedDelivery?: number }).estimatedDelivery &&
          o.status !== "delivered" && o.status !== "cancelled" && (
          <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500 justify-center">
            <Clock className="h-4 w-4" />
            Estimated: ~{(o as unknown as { estimatedDelivery: number }).estimatedDelivery} min
          </div>
        )}
      </div>

      {/* Payment status */}
      <div className="border rounded-xl p-4 bg-blue-50 border-blue-200 mb-4 animate-fade-up" style={{ animationDelay: "90ms" }}>
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Payment</p>
            <p className="text-sm text-blue-700">
              {o.paymentStatus === "failed" ? "❌ Payment failed" : "✅ Paid · Card"}
            </p>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      <div className="border rounded-xl p-4 bg-gray-50 border-gray-200 mb-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Delivery Address</p>
            <p className="text-sm text-gray-600">{o.deliveryAddress}</p>
          </div>
        </div>
        {(o as unknown as { notes?: string }).notes && (
          <p className="text-xs text-gray-500 mt-2 pl-6">📝 {(o as unknown as { notes: string }).notes}</p>
        )}
      </div>

      {/* Items */}
      <div className="border rounded-xl bg-white shadow-sm mb-4 overflow-hidden animate-fade-up" style={{ animationDelay: "180ms" }}>
        <div className="bg-gray-50 px-4 py-2.5 border-b">
          <h2 className="font-semibold text-sm text-gray-700">Order Items</h2>
        </div>
        <div className="p-4 space-y-2">
          {o.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <span className="text-gray-700">{item.quantity}× {item.name}</span>
              <span className="text-gray-600 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${(o.subtotal as number).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery</span>
              <span>{(o.deliveryFee as number) === 0 ? "Free" : `$${(o.deliveryFee as number).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t">
              <span>Total</span>
              <span>${(o.total as number).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {o.status === "delivered" && o.restaurantId && (
        <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
          <ReviewForm restaurantId={o.restaurantId} />
        </div>
      )}
    </main>
  );
}

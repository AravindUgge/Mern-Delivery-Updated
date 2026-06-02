import { Link, useLocation } from "wouter";
import { Clock, ChevronRight, Package, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import type { Order } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  pending:          { bg: "bg-yellow-400",  text: "text-yellow-900", label: "Pending",          dot: "bg-yellow-400" },
  confirmed:        { bg: "bg-blue-500",    text: "text-white",      label: "Confirmed",         dot: "bg-blue-500" },
  preparing:        { bg: "bg-indigo-500",  text: "text-white",      label: "Preparing",         dot: "bg-indigo-500" },
  out_for_delivery: { bg: "bg-orange-500",  text: "text-white",      label: "Out for Delivery",  dot: "bg-orange-500" },
  delivered:        { bg: "bg-green-500",   text: "text-white",      label: "Delivered",         dot: "bg-green-500" },
  cancelled:        { bg: "bg-red-500",     text: "text-white",      label: "Cancelled",         dot: "bg-red-500" },
};

const CARD_ACCENTS = [
  "border-l-orange-500",
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-green-500",
  "border-l-pink-500",
  "border-l-indigo-500",
];

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "preparing", "out_for_delivery"]);

function OrderCard({ order, index }: { order: Order; index: number }) {
  const style = STATUS_STYLES[order.status] ?? { bg: "bg-gray-400", text: "text-white", label: order.status, dot: "bg-gray-400" };
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const isActive = ACTIVE_STATUSES.has(order.status);

  return (
    <Link href={`/orders/${order.id}`}>
      <div
        className={`animate-fade-up flex items-start gap-4 p-4 border-l-4 ${accent} rounded-xl bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{order.restaurantName}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">
            {(order.items as { name: string }[]).map((i) => i.name).join(", ")}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold ${style.bg} ${style.text}`}>
              {isActive && <span className={`w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse`} />}
              {style.label}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              {new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <p className="font-bold text-gray-900">${(order.total as number).toFixed(2)}</p>
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

export default function OrdersPage() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  // Only customers should see this page. Restaurant owners use the dashboard.
  // The API automatically filters by userId for customer role.
  const { data, isLoading, dataUpdatedAt } = useListOrders(
    {},
    { query: { queryKey: getListOrdersQueryKey({}), enabled: isAuthenticated && user?.role === "customer", refetchInterval: 20_000 } },
  );
  const orders = data?.orders ?? [];

  if (!isAuthenticated) {
    return (
      <div className="w-full px-4 py-16 text-center animate-fade-up">
        <Package className="h-12 w-12 mx-auto text-gray-300 mb-4 animate-float" />
        <p className="text-gray-500 mb-4">Sign in to view your orders</p>
        <Button className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition-transform" onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }

  if (user?.role === "restaurant_owner") {
    return (
      <div className="w-full px-4 py-16 text-center animate-fade-up">
        <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-700 font-semibold mb-2">Restaurant Owner</p>
        <p className="text-gray-500 mb-4">Manage orders in your Restaurant Dashboard</p>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          Live updates
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 animate-fade-up">
          <Package className="h-16 w-16 mx-auto text-gray-200 mb-4 animate-float" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No orders yet</h2>
          <p className="text-gray-400 mb-6">Your order history will appear here</p>
          <Button className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition-transform" onClick={() => navigate("/")}>Browse Restaurants</Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((o, i) => <OrderCard key={o.id} order={o} index={i} />)}
          </div>
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-gray-400 text-center mt-4 animate-fade-in">
              Last updated {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </>
      )}
    </main>
  );
}

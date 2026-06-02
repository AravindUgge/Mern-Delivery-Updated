import { useLocation } from "wouter";
import { Package, Radio, Clock, ChevronRight } from "lucide-react";
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

function OrderCard({ order, index }: { order: Order; index: number }) {
  const style = STATUS_STYLES[order.status] ?? { bg: "bg-gray-400", text: "text-white", label: order.status, dot: "bg-gray-400" };
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

  return (
    <div
      className={`animate-fade-up group flex items-start gap-4 p-4 border-l-4 ${accent} rounded-xl bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{order.restaurantName}</p>
        <p className="text-sm text-gray-500 mt-1 truncate">{(order.items as { name: string }[]).map((item) => item.name).join(", ")}</p>
        <div className="flex items-center gap-3 mt-3">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
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
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}

export default function PastOrdersPage() {
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, dataUpdatedAt } = useListOrders(
    {},
    {
      query: {
        queryKey: getListOrdersQueryKey({}),
        enabled: isAuthenticated && user?.role === "customer",
        refetchInterval: 20_000,
      },
    },
  );

  const orders = data?.orders.filter((order) => order.status === "delivered" || order.status === "cancelled") ?? [];

  if (!isAuthenticated) {
    return (
      <div className="w-full px-4 py-16 text-center">
        <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Sign in to view your order history</p>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }

  if (user?.role === "restaurant_owner") {
    return (
      <div className="w-full px-4 py-16 text-center">
        <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-700 font-semibold mb-2">Restaurant Owner</p>
        <p className="text-gray-500 mb-4">Use the restaurant dashboard to manage orders.</p>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold">Past Orders</h1>
          <p className="text-sm text-gray-500">Delivered and completed orders are shown here.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          History
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 animate-fade-up">
          <Package className="h-16 w-16 mx-auto text-gray-200 mb-4 animate-float" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No past orders yet</h2>
          <p className="text-gray-400 mb-6">Delivered or cancelled orders will appear here after checkout.</p>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/")}>Browse Restaurants</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, index) => (
            <OrderCard key={order.id} order={order} index={index} />
          ))}
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-gray-400 text-center mt-4">Last updated {new Date(dataUpdatedAt).toLocaleTimeString()}</p>
          )}
        </div>
      )}
    </main>
  );
}

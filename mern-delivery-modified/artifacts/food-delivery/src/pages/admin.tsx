import { useLocation } from "wouter";
import { Shield, Users, Store, ShoppingBag, DollarSign, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetPlatformStats,
  useGetPopularItems,
  useListRestaurants,
  getGetPlatformStatsQueryKey,
  getGetPopularItemsQueryKey,
  getListRestaurantsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

function StatCard({ icon: Icon, title, value, sub, color }: {
  icon: React.ElementType; title: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats, isLoading: loadingStats } = useGetPlatformStats({ query: { queryKey: getGetPlatformStatsQueryKey(), enabled: isAuthenticated } });
  const { data: popularItems } = useGetPopularItems({ query: { queryKey: getGetPopularItemsQueryKey(), enabled: isAuthenticated } });
  const { data: restaurantsData } = useListRestaurants({ limit: 50 }, { query: { queryKey: getListRestaurantsQueryKey({ limit: 50 }), enabled: isAuthenticated } });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Admin access required.</p>
        <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-7 w-7 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-gray-500 text-sm">Platform overview and management</p>
        </div>
      </div>

      {/* Platform Stats */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard icon={Users} title="Total Users" value={stats?.totalUsers ?? 0} color="bg-blue-100 text-blue-600" />
          <StatCard icon={Store} title="Restaurants" value={stats?.totalRestaurants ?? 0} sub={`${stats?.activeRestaurants ?? 0} open now`} color="bg-orange-100 text-orange-600" />
          <StatCard icon={ShoppingBag} title="Total Orders" value={stats?.totalOrders ?? 0} sub={`${stats?.todayOrders ?? 0} today`} color="bg-purple-100 text-purple-600" />
          <StatCard icon={DollarSign} title="Total Revenue" value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`} color="bg-green-100 text-green-600" />
          <StatCard icon={TrendingUp} title="Active Restaurants" value={stats?.activeRestaurants ?? 0} color="bg-emerald-100 text-emerald-600" />
          <StatCard icon={Clock} title="Today's Orders" value={stats?.todayOrders ?? 0} color="bg-yellow-100 text-yellow-600" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Popular Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!popularItems || popularItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No order data yet</p>
            ) : (
              <div className="space-y-3">
                {(popularItems as { menuItemId: string; name: string; restaurantName: string; orderCount: number; price: number }[]).slice(0, 8).map((item, idx) => (
                  <div key={item.menuItemId} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-300 w-5">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.restaurantName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-orange-500">{item.orderCount} orders</p>
                      <p className="text-xs text-gray-400">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-orange-500" />
              All Restaurants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!restaurantsData?.restaurants || restaurantsData.restaurants.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No restaurants yet</p>
            ) : (
              <div className="space-y-2.5">
                {restaurantsData.restaurants.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.cuisine} · ⭐ {r.rating.toFixed(1)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={r.isOpen ? "text-green-600 border-green-300" : "text-gray-400"}
                    >
                      {r.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3, ShoppingBag, DollarSign, Star, Radio, Bike, ChefHat,
  Plus, Pencil, Trash2, X, Check, Utensils, Tag
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useListRestaurants,
  useGetRestaurantStats,
  useListOrders,
  useUpdateOrderStatus,
  useListMenuItems,
  useListCategories,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  getListOrdersQueryKey,
  getListRestaurantsQueryKey,
  getGetRestaurantStatsQueryKey,
  getListMenuItemsQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import type { Order, MenuItem, OrderStatusUpdateStatus } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:          { bg: "bg-yellow-400",  text: "text-yellow-900", label: "Pending" },
  confirmed:        { bg: "bg-blue-500",    text: "text-white",      label: "Confirmed" },
  preparing:        { bg: "bg-indigo-500",  text: "text-white",      label: "Preparing" },
  ready:            { bg: "bg-sky-500",    text: "text-white",      label: "Ready" },
  out_for_delivery: { bg: "bg-orange-500",  text: "text-white",      label: "Out for Delivery" },
  delivered:        { bg: "bg-green-500",   text: "text-white",      label: "Delivered" },
  cancelled:        { bg: "bg-red-500",     text: "text-white",      label: "Cancelled" },
};

const NEXT_STATUSES: Record<string, { status: OrderStatusUpdateStatus; label: string; color: string }[]> = {
  pending:          [{ status: "confirmed", label: "✅ Accept Order", color: "bg-blue-500 hover:bg-blue-600 text-white" }, { status: "cancelled", label: "✗ Reject", color: "border border-red-300 text-red-600 hover:bg-red-50" }],
  confirmed:        [{ status: "preparing", label: "👨‍🍳 Start Preparing", color: "bg-indigo-500 hover:bg-indigo-600 text-white" }, { status: "cancelled", label: "✗ Cancel", color: "border border-red-300 text-red-600 hover:bg-red-50" }],
  preparing:        [{ status: "ready", label: "🍽️ Mark Ready", color: "bg-sky-500 hover:bg-sky-600 text-white" }, { status: "cancelled", label: "✗ Cancel", color: "border border-red-300 text-red-600 hover:bg-red-50" }],
  ready:            [{ status: "out_for_delivery", label: "🛵 Send for Delivery", color: "bg-orange-500 hover:bg-orange-600 text-white" }, { status: "cancelled", label: "✗ Cancel", color: "border border-red-300 text-red-600 hover:bg-red-50" }],
  out_for_delivery: [{ status: "delivered", label: "🎉 Mark Delivered", color: "bg-green-500 hover:bg-green-600 text-white" }],
};

const STAT_CARDS = [
  { key: "totalOrders",   label: "Total Orders",    icon: ShoppingBag, bg: "bg-blue-500",    fg: "text-white" },
  { key: "totalRevenue",  label: "Total Revenue",   icon: DollarSign,  bg: "bg-emerald-500", fg: "text-white", prefix: "$" },
  { key: "pendingOrders", label: "Pending Now",     icon: ChefHat,     bg: "bg-yellow-400",  fg: "text-yellow-900" },
  { key: "todayRevenue",  label: "Today's Revenue", icon: DollarSign,  bg: "bg-orange-500",  fg: "text-white", prefix: "$" },
  { key: "todayOrders",   label: "Today's Orders",  icon: ShoppingBag, bg: "bg-purple-500",  fg: "text-white" },
  { key: "avgRating",     label: "Avg Rating",      icon: Star,        bg: "bg-pink-500",    fg: "text-white", suffix: " ★" },
];

function OrderRow({ order, index, ordersQueryKey }: { order: Order; index: number; ordersQueryKey: QueryKey }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus({
    mutation: {
      async onMutate(variables) {
        await qc.cancelQueries({ queryKey: ordersQueryKey });
        const previousOrders = qc.getQueryData<{ orders: Order[] }>(ordersQueryKey);
        if (previousOrders) {
          qc.setQueryData(ordersQueryKey, {
            ...previousOrders,
            orders: previousOrders.orders.map((item) =>
              item.id === variables.id ? { ...item, status: variables.data.status } : item,
            ),
          });
        }
        return { previousOrders };
      },
      onError(error, _variables, context) {
        if (context?.previousOrders) {
          qc.setQueryData(ordersQueryKey, context.previousOrders);
        }
        console.error("Order status update failed:", error);
        const message = (error as any)?.data?.error || (error as Error)?.message || "Failed to update order";
        toast({ title: message, variant: "destructive" });
      },
      onSettled() {
        qc.invalidateQueries({ queryKey: ordersQueryKey });
        qc.invalidateQueries({ queryKey: getGetRestaurantStatsQueryKey(order.restaurantId) });
      },
    },
  });

  const style = STATUS_STYLES[order.status] ?? { bg: "bg-gray-400", text: "text-white", label: order.status };
  const nextActions = NEXT_STATUSES[order.status] ?? [];
  const o = order as Order & { items: { name: string; quantity: number }[] };

  return (
    <tr className="border-b last:border-none">
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        <div className="font-medium">#{o.id.slice(-8).toUpperCase()}</div>
        <div className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
        {o.customerName ?? o.userId.slice(-8).toUpperCase()}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs">
        <div className="text-sm text-gray-700">
          {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 max-w-xs line-clamp-2">
        {o.deliveryAddress}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
        ${(o.total as number).toFixed(2)}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex flex-wrap justify-end gap-2">
          {nextActions.map((action) => (
            <button
              key={action.status}
              onClick={() => updateStatus({ id: o.id, data: { status: action.status } })}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 ${action.color}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

interface MenuItemFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  image: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isPopular: boolean;
  calories: string;
}

const EMPTY_FORM: MenuItemFormData = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  image: "",
  isAvailable: true,
  isVegetarian: false,
  isPopular: false,
  calories: "",
};

function MenuItemFormDialog({
  open,
  onClose,
  restaurantId,
  categories,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  categories: { id: string; name: string }[];
  editing: MenuItem | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<MenuItemFormData>(() =>
    editing
      ? {
          name: editing.name,
          description: editing.description ?? "",
          price: String(editing.price),
          categoryId: editing.categoryId ?? "",
          image: editing.image ?? "",
          isAvailable: editing.isAvailable,
          isVegetarian: editing.isVegetarian ?? false,
          isPopular: editing.isPopular ?? false,
          calories: editing.calories ? String(editing.calories) : "",
        }
      : EMPTY_FORM,
  );

  const { mutate: createItem, isPending: creating } = useCreateMenuItem({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey(restaurantId) });
        toast({ title: "Menu item added ✅" });
        onClose();
      },
      onError() { toast({ title: "Failed to add item", variant: "destructive" }); },
    },
  });

  const { mutate: updateItem, isPending: updating } = useUpdateMenuItem({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey(restaurantId) });
        toast({ title: "Menu item updated ✅" });
        onClose();
      },
      onError() { toast({ title: "Failed to update item", variant: "destructive" }); },
    },
  });

  function handleSubmit() {
    if (!form.name.trim() || !form.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      categoryId: form.categoryId || undefined,
      image: form.image.trim() || undefined,
      isAvailable: form.isAvailable,
      isVegetarian: form.isVegetarian,
      isPopular: form.isPopular,
      calories: form.calories ? parseInt(form.calories) : undefined,
    };
    if (editing) {
      updateItem({ id: editing.id, data: payload });
    } else {
      createItem({ restaurantId, data: payload });
    }
  }

  const isPending = creating || updating;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Margherita Pizza" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of the item"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price ($) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="9.99"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Calories</Label>
              <Input
                type="number"
                min="0"
                value={form.calories}
                onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={form.categoryId || "_none"} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v === "_none" ? "" : v }))}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                <SelectItem value="_none">No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Image URL</Label>
            <Input
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "isAvailable" as const, label: "Available" },
              { key: "isVegetarian" as const, label: "Vegetarian" },
              { key: "isPopular" as const, label: "Popular" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-xl bg-gray-50">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <Switch
                  checked={form[key]}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  {editing ? "Updating..." : "Adding..."}
                </span>
              ) : editing ? "Update Item" : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MenuManagement({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: menuItems = [], isLoading: loadingItems } = useListMenuItems(restaurantId, {
    query: { queryKey: getListMenuItemsQueryKey(restaurantId), enabled: !!restaurantId },
  });

  const { data: categories = [] } = useListCategories(restaurantId, {
    query: { queryKey: getListCategoriesQueryKey(restaurantId), enabled: !!restaurantId },
  });

  const { mutate: deleteItem, isPending: deleting } = useDeleteMenuItem({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey(restaurantId) });
        toast({ title: "Item removed" });
        setDeleteConfirm(null);
      },
      onError() { toast({ title: "Failed to delete item", variant: "destructive" }); },
    },
  });

  const { mutate: updateItem } = useUpdateMenuItem({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getListMenuItemsQueryKey(restaurantId) });
      },
    },
  });

  function openAdd() { setEditingItem(null); setDialogOpen(true); }
  function openEdit(item: MenuItem) { setEditingItem(item); setDialogOpen(true); }
  function toggleAvailable(item: MenuItem) {
    updateItem({ id: item.id, data: { isAvailable: !item.isAvailable } });
  }

  return (
    <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Utensils className="h-5 w-5 text-orange-500" />
          Menu Management
        </h2>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      {loadingItems ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          ))}
        </div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <Utensils className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No menu items yet</p>
          <Button size="sm" className="mt-3 bg-orange-500 hover:bg-orange-600" onClick={openAdd}>
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {menuItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-xl bg-white hover:shadow-sm transition-shadow">
              {item.image && (
                <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  {item.categoryId && (
                    <span className="flex items-center gap-0.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">
                      <Tag className="h-2.5 w-2.5" />
                      {categories.find((c) => c.id === item.categoryId)?.name ?? ""}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-orange-500">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={() => toggleAvailable(item)}
                  title={item.isAvailable ? "Available – click to disable" : "Unavailable – click to enable"}
                />
                <button
                  onClick={() => openEdit(item)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {deleteConfirm === item.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => deleteItem({ id: item.id })}
                      disabled={deleting}
                      className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title="Confirm delete"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <MenuItemFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingItem(null); }}
        restaurantId={restaurantId}
        categories={categories}
        editing={editingItem}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"orders" | "menu">("orders");

  const { data: myRestaurants } = useListRestaurants(
    { limit: 50 },
    { query: { queryKey: getListRestaurantsQueryKey({ limit: 50 }), enabled: isAuthenticated } },
  );

  const ownedRestaurants = myRestaurants?.restaurants?.filter((r) => r.ownerId === user?.id) ?? [];
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");

  const restaurantId = selectedRestaurantId || ownedRestaurants[0]?.id || "";

  const ordersParams = { restaurantId, status: statusFilter !== "all" ? statusFilter : undefined };
  const ordersQueryKey = getListOrdersQueryKey(ordersParams);
  const { data: stats } = useGetRestaurantStats(restaurantId, {
    query: { queryKey: getGetRestaurantStatsQueryKey(restaurantId), enabled: !!restaurantId, refetchInterval: 30_000 },
  });
  const { data: ordersData, isLoading: loadingOrders, dataUpdatedAt } = useListOrders(ordersParams, {
    query: { queryKey: ordersQueryKey, enabled: !!restaurantId, refetchInterval: 15_000 },
  });

  if (!isAuthenticated || (user && user.role !== "restaurant_owner" && user.role !== "admin")) {
    return (
      <div className="w-full px-4 py-16 text-center animate-fade-up">
        <p className="text-gray-500">You need a restaurant owner account to access this page.</p>
        <Button className="mt-4 bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/register")}>Register as Restaurant</Button>
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-orange-500" />
              Restaurant Dashboard
            </h1>
            {ownedRestaurants.length === 1 && <p className="text-gray-500 text-sm mt-0.5">{ownedRestaurants[0]?.name}</p>}
            {ownedRestaurants.length > 1 && (
              <Select value={selectedRestaurantId || ownedRestaurants[0]?.id} onValueChange={setSelectedRestaurantId}>
                <SelectTrigger className="w-64 mt-1 bg-white border-orange-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {ownedRestaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
            <Radio className="h-3.5 w-3.5 animate-pulse" />
            Live
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {STAT_CARDS.map(({ key, label, icon: Icon, bg, fg, prefix = "", suffix = "" }, i) => {
            const raw = stats?.[key as keyof typeof stats] ?? 0;
            const val = typeof raw === "number" && key.includes("Revenue")
              ? `${prefix}${raw.toFixed(2)}${suffix}`
              : `${prefix}${raw}${suffix}`;
            return (
              <Card
                key={key}
                className={`${bg} border-0 shadow-sm animate-fade-up hover:scale-105 transition-transform duration-200`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="bg-white/20 p-2 rounded-xl shrink-0">
                    <Icon className={`h-4 w-4 ${fg}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${fg} opacity-80 truncate`}>{label}</p>
                    <p className={`text-xl font-bold ${fg}`}>{val}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit animate-fade-up" style={{ animationDelay: "160ms" }}>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "orders" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Bike className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Orders
          </button>
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === "menu" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Utensils className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Menu
          </button>
        </div>

        {/* Orders tab */}
        {activeTab === "orders" && (
          <>
            <div className="flex items-center justify-between mb-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bike className="h-5 w-5 text-orange-500" />
                Incoming Orders
              </h2>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 bg-white">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">🟡 Pending</SelectItem>
                    <SelectItem value="confirmed">🔵 Confirmed</SelectItem>
                  <SelectItem value="preparing">🟣 Preparing</SelectItem>
                  <SelectItem value="ready">🔷 Ready</SelectItem>
                  <SelectItem value="out_for_delivery">🟠 Out for Delivery</SelectItem>
                  <SelectItem value="delivered">🟢 Delivered</SelectItem>
                  <SelectItem value="cancelled">🔴 Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!restaurantId ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 animate-fade-up">
                <p>No restaurant linked to your account yet.</p>
              </div>
            ) : loadingOrders ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 animate-shimmer" />
                  </div>
                ))}
              </div>
            ) : ordersData?.orders.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 animate-fade-up">
                <p className="text-lg">🎉 No {statusFilter !== "all" ? statusFilter.replace(/_/g, " ") : ""} orders right now</p>
                <p className="text-sm mt-1">New orders will appear here automatically</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Order</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Items</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Delivery Address</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {ordersData?.orders.map((o, i) => (
                        <OrderRow key={o.id} order={o} index={i} ordersQueryKey={ordersQueryKey} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {dataUpdatedAt > 0 && (
                  <p className="text-xs text-gray-400 text-center mt-4 animate-fade-in">
                    Auto-refreshes every 15s · Last updated {new Date(dataUpdatedAt).toLocaleTimeString()}
                  </p>
                )}
              </>
            )}
          </>
        )}

        {/* Menu tab */}
        {activeTab === "menu" && restaurantId && (
          <MenuManagement restaurantId={restaurantId} />
        )}
        {activeTab === "menu" && !restaurantId && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
            <p>No restaurant linked to your account yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}

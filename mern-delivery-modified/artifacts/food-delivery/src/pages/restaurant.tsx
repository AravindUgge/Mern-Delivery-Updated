import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Clock, Star, Bike, Plus, Minus, ChevronLeft, Leaf, Flame, Heart, HeartOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/lib/utils";
import {
  useGetRestaurant,
  useListCategories,
  useListMenuItems,
  useAddToCart,
  useListReviews,
  getGetCartQueryKey,
  getListReviewsQueryKey,
} from "@workspace/api-client-react";
import type { MenuItem, Review } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const ITEM_CARD_COLORS = [
  { border: "border-l-orange-400", bg: "bg-orange-50" },
  { border: "border-l-blue-400",   bg: "bg-blue-50" },
  { border: "border-l-green-400",  bg: "bg-green-50" },
  { border: "border-l-purple-400", bg: "bg-purple-50" },
  { border: "border-l-pink-400",   bg: "bg-pink-50" },
  { border: "border-l-teal-400",   bg: "bg-teal-50" },
];

type WishlistItem = Pick<MenuItem, "id" | "name" | "description" | "price" | "image" | "restaurantId"> & {
  restaurantName: string;
};

function MenuItemCard({
  item,
  restaurantId,
  restaurantName,
  index,
  isSaved,
  onToggleWishlist,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantName: string;
  index: number;
  isSaved: boolean;
  onToggleWishlist: (item: WishlistItem) => void;
}) {
  const [qty, setQty] = useState(1);
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const colors = ITEM_CARD_COLORS[index % ITEM_CARD_COLORS.length];

  const { mutate: addToCart, isPending } = useAddToCart({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: `${item.name} added to cart 🛒` });
        setQty(1);
      },
      onError(err: unknown) {
        const msg = (err as { data?: { error?: string } })?.data?.error ?? "Could not add to cart";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  function handleAdd() {
    if (!isAuthenticated) { navigate("/login"); return; }
    addToCart({ data: { menuItemId: item.id, restaurantId, quantity: qty } });
  }

  return (
    <div className={`flex gap-4 p-4 border-l-4 ${colors.border} ${colors.bg} rounded-xl hover:shadow-sm transition-shadow`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-gray-900">{item.name}</h4>
              {item.isVegetarian && (
                <span className="flex items-center gap-0.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                  <Leaf className="h-3 w-3" /> Veg
                </span>
              )}
              {item.isPopular && (
                <span className="flex items-center gap-0.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                  <Flame className="h-3 w-3" /> Popular
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="font-bold text-gray-900 text-base">${item.price.toFixed(2)}</span>
              {item.calories && (
                <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border">{item.calories} cal</span>
              )}
            </div>
          </div>
          {item.image && (
            <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl object-cover shrink-0 shadow-sm" />
          )}
        </div>
        {item.isAvailable ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-3">
            <div className="flex items-center bg-white border rounded-xl overflow-hidden shadow-sm">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1.5 hover:bg-gray-50 transition-colors text-gray-600">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-3 text-sm font-bold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-3 py-1.5 hover:bg-gray-50 transition-colors text-gray-600">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold" onClick={handleAdd} disabled={isPending}>
                Add to Cart
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  if (!isAuthenticated) { navigate("/login"); return; }
                  onToggleWishlist({
                    id: item.id,
                    name: item.name,
                    description: item.description ?? "",
                    price: item.price,
                    image: item.image ?? undefined,
                    restaurantId,
                    restaurantName,
                  });
                }}
              >
                {isSaved ? <HeartOff className="h-4 w-4 mr-2 text-red-500" /> : <Heart className="h-4 w-4 mr-2 text-orange-500" />}
                {isSaved ? "Saved" : "Wishlist"}
              </Button>
            </div>
          </div>
        ) : (
          <span className="mt-3 inline-block text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Unavailable</span>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const colors = [
    "bg-orange-50 border-orange-200",
    "bg-blue-50 border-blue-200",
    "bg-purple-50 border-purple-200",
    "bg-green-50 border-green-200",
    "bg-pink-50 border-pink-200",
  ];
  const colorClass = colors[index % colors.length];
  return (
    <div className={`border rounded-xl p-4 ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{review.userName}</p>
          <div className="flex mt-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
      </div>
      {review.comment && <p className="text-sm text-gray-600 mt-2">{review.comment}</p>}
    </div>
  );
}

const WISHLIST_STORAGE_KEY = "qb_wishlist_items";

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [wishlist, setWishlist] = useLocalStorage<WishlistItem[]>(WISHLIST_STORAGE_KEY, []);

  const { data: restaurant, isLoading: loadingR } = useGetRestaurant(id);
  const { data: categories } = useListCategories(id);
  const { data: menuItems, isLoading: loadingItems } = useListMenuItems(id);
  const { data: reviews } = useListReviews(id, {
    query: { queryKey: getListReviewsQueryKey(id) },
  });

  const allItems = menuItems ?? [];
  const cats = categories ?? [];
  const [activeTab, setActiveTab] = useState<string>("all");

  const toggleWishlist = (item: WishlistItem) => {
    setWishlist((current) => {
      if (current.some((entry) => entry.id === item.id)) {
        return current.filter((entry) => entry.id !== item.id);
      }
      return [...current, item];
    });
  };

  function getItemsForTab(tabId: string) {
    if (tabId === "all") return allItems;
    return allItems.filter((i) => i.categoryId === tabId);
  }

  if (loadingR) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-52 w-full rounded-2xl mb-6" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-48 mb-6" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Restaurant not found.</p>
      </div>
    );
  }

  const reviewList = reviews ?? [];

  return (
    <main className="w-full max-w-5xl mx-auto px-4 py-6">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate("/")}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {/* Hero */}
      <div className="relative h-56 rounded-2xl overflow-hidden mb-6 shadow-md">
        {restaurant.coverImage || restaurant.image ? (
          <img src={(restaurant.coverImage ?? restaurant.image)!} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-200 to-amber-200">
            <span className="text-7xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {!restaurant.isOpen && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 font-bold px-5 py-2 rounded-full text-sm">Currently Closed</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <p className="text-white/80 text-sm">{restaurant.cuisine}</p>
        </div>
      </div>

      {/* Info bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
          <div>
            <p className="text-xs text-yellow-600">Rating</p>
            <p className="font-bold text-yellow-800">{restaurant.rating.toFixed(1)} <span className="font-normal text-xs">({restaurant.reviewCount ?? 0})</span></p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <p className="text-xs text-blue-600">Delivery</p>
            <p className="font-bold text-blue-800">{restaurant.deliveryTime} min</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <Bike className="h-4 w-4 text-green-500 shrink-0" />
          <div>
            <p className="text-xs text-green-600">Delivery fee</p>
            <p className="font-bold text-green-800">{restaurant.deliveryFee === 0 ? "Free!" : `$${restaurant.deliveryFee.toFixed(2)}`}</p>
          </div>
        </div>
        {restaurant.minOrder !== undefined && restaurant.minOrder > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-2">
            <span className="text-purple-500 shrink-0 text-base">💳</span>
            <div>
              <p className="text-xs text-purple-600">Min. order</p>
              <p className="font-bold text-purple-800">${restaurant.minOrder.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      {loadingItems ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
          <p className="text-3xl mb-2">📋</p>
          <p>Menu coming soon</p>
        </div>
      ) : cats.length > 0 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1 bg-gray-100 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">All</TabsTrigger>
            {cats.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">{c.name}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all" className="space-y-3">
            {allItems.map((item, i) => (
              <MenuItemCard
                key={item.id}
                item={item}
                restaurantId={id}
                restaurantName={restaurant?.name ?? ""}
                index={i}
                isSaved={wishlist.some((entry) => entry.id === item.id)}
                onToggleWishlist={toggleWishlist}
              />
            ))}
          </TabsContent>
          {cats.map((c) => (
            <TabsContent key={c.id} value={c.id} className="space-y-3">
              {getItemsForTab(c.id).map((item, i) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  restaurantId={id}
                  restaurantName={restaurant?.name ?? ""}
                  index={i}
                  isSaved={wishlist.some((entry) => entry.id === item.id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-3">
          {allItems.map((item, i) => <MenuItemCard key={item.id} item={item} restaurantId={id} index={i} />)}
        </div>
      )}

      {/* Reviews */}
      {reviewList.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Customer Reviews
          </h2>
          <div className="space-y-3">
            {reviewList.map((r, i) => <ReviewCard key={r.id} review={r} index={i} />)}
          </div>
        </div>
      )}
    </main>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Heart, ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocalStorage } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "qb_wishlist_items";

type WishlistItem = Pick<MenuItem, "id" | "name" | "description" | "price" | "image" | "restaurantId"> & {
  restaurantName: string;
};

export default function WishlistPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [wishlist, setWishlist] = useLocalStorage<WishlistItem[]>(STORAGE_KEY, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { mutate: addToCart, isPending } = useAddToCart({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Added to cart" });
      },
      onError() {
        toast({ title: "Could not add to cart", variant: "destructive" });
      },
    },
  });

  function handleRemove(id: string) {
    setWishlist((current) => current.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleMoveToCart(item: WishlistItem) {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    addToCart({ data: { menuItemId: item.id, restaurantId: item.restaurantId, quantity: 1 } });
  }

  if (wishlist.length === 0) {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-16 text-center">
        <Package className="h-16 w-16 mx-auto text-gray-200 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Wishlist is empty</h1>
        <p className="text-gray-500 mb-6">Save menu items while browsing restaurants and come back later.</p>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/")}>Browse Restaurants</Button>
      </main>
    );
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wishlist</h1>
          <p className="text-sm text-gray-500">Saved favorites you can move to cart anytime.</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => navigate("/saved-addresses")}>Manage Addresses</Button>
      </div>

      <div className="space-y-4">
        {wishlist.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-3xl bg-white shadow-sm">
            {item.image && <img src={item.image} alt={item.name} className="h-24 w-24 rounded-3xl object-cover" />}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.restaurantName}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">${item.price.toFixed(2)}</span>
              </div>
              {item.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.description}</p>}
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => handleMoveToCart(item)}
                disabled={isPending}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Move to Cart
              </Button>
              <Button
                variant={selectedId === item.id ? "secondary" : "ghost"}
                className="w-full text-sm"
                onClick={() => handleRemove(item.id)}
              >
                <Heart className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

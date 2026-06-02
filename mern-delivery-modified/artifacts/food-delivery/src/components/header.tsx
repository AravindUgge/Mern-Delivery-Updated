import { Link, useLocation } from "wouter";
import { ShoppingCart, UtensilsCrossed, User, LayoutDashboard, Shield, LogOut, Heart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useGetCart, getGetCartQueryKey } from "@workspace/api-client-react";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: cart } = useGetCart({ query: { queryKey: getGetCartQueryKey(), enabled: isAuthenticated } });
  const cartCount = cart?.items?.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0) ?? 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-orange-500 hover:opacity-90">
          <UtensilsCrossed className="h-6 w-6" />
          QuickBite
        </Link>

        <nav className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/orders">My Orders</Link>
              </Button>

              <Button variant="ghost" size="sm" asChild>
                <Link href="/wishlist">Wishlist</Link>
              </Button>

              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link href="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-500">
                      {cartCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white border border-gray-200 shadow-lg">
                  <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">{user?.name}</div>
                  <div className="px-2 pb-1 text-xs text-gray-500">{user?.email}</div>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  {user?.role === "customer" && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/past-orders")} className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer">
                        <Clock className="mr-2 h-4 w-4" />
                        Past Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/saved-addresses")} className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer">
                        <Heart className="mr-2 h-4 w-4" />
                        Saved Addresses
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === "restaurant_owner" && (
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                  )}
                  {user?.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600" asChild>
                <Link href="/register">Sign Up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

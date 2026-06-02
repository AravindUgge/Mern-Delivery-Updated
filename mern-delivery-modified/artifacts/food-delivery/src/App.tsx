import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";

// Set API base URL to the backend server
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
setBaseUrl(API_BASE_URL);
import Header from "@/components/header";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import RestaurantPage from "@/pages/restaurant";
import CartPage from "@/pages/cart";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import PastOrdersPage from "@/pages/past-orders";
import SavedAddressesPage from "@/pages/saved-addresses";
import WishlistPage from "@/pages/wishlist";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function Router() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <Header />
      <div className="flex-1 w-full">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/restaurant/:id" component={RestaurantPage} />
          <Route path="/cart" component={CartPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/past-orders" component={PastOrdersPage} />
          <Route path="/wishlist" component={WishlistPage} />
          <Route path="/saved-addresses" component={SavedAddressesPage} />
          <Route path="/orders/:id" component={OrderDetailPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

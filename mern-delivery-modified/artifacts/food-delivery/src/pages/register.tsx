import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UtensilsCrossed, ShoppingBag, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer" as "customer" | "restaurant_owner",
  });
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { mutate, isPending } = useRegister({
    mutation: {
      onSuccess(data) {
        login(data.token, data.user);
        toast({ title: `Welcome to QuickBite, ${data.user.name}!` });
        navigate(data.user.role === "restaurant_owner" ? "/dashboard" : "/");
      },
      onError(err: unknown) {
        const msg = (err as { data?: { error?: string } })?.data?.error ?? "Registration failed";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ data: form });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <UtensilsCrossed className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join QuickBite today</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {/* Role picker as cards */}
            <div className="space-y-2">
              <Label>I am a…</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "customer" })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    form.role === "customer"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <ShoppingBag className="h-6 w-6" />
                  <span className="text-sm font-medium">Customer</span>
                  <span className="text-xs text-center opacity-70">Order food online</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "restaurant_owner" })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    form.role === "restaurant_owner"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Store className="h-6 w-6" />
                  <span className="text-sm font-medium">Restaurant</span>
                  <span className="text-xs text-center opacity-70">Accept & manage orders</span>
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={isPending}>
              {isPending ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-orange-500 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { UtensilsCrossed, ShoppingBag, Store, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

const TEST_ACCOUNTS = [
  {
    label: "Restaurant Owner",
    email: "mario@qb.com",
    password: "pass123",
    icon: Store,
    bg: "bg-blue-500",
    light: "bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800",
    desc: "Mario's Pizza Palace",
  },
  {
    label: "Restaurant Owner",
    email: "chen@qb.com",
    password: "pass123",
    icon: Store,
    bg: "bg-indigo-500",
    light: "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-800",
    desc: "Dragon Wok",
  },
  {
    label: "Customer",
    email: "",
    password: "",
    icon: ShoppingBag,
    bg: "bg-orange-500",
    light: "bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-800",
    desc: "Register a new account →",
    isRegister: true,
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { mutate, isPending } = useLogin({
    mutation: {
      onSuccess(data) {
        login(data.token, data.user);
        toast({ title: `Welcome back, ${data.user.name}! 🎉` });
        if (data.user.role === "restaurant_owner") navigate("/dashboard");
        else navigate("/");
      },
      onError(err: unknown) {
        const msg = (err as { data?: { error?: string } })?.data?.error ?? "Login failed";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ data: { email, password } });
  }

  function fillAccount(acc: typeof TEST_ACCOUNTS[0]) {
    if (acc.isRegister) { navigate("/register"); return; }
    setActiveCard(acc.email);
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="w-full max-w-md space-y-4">

        {/* Quick Test Panel */}
        <motion.div
          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-yellow-400 p-1.5 rounded-lg">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-800">Quick Test Login</span>
            <span className="text-xs text-gray-400 ml-auto">Click any card</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TEST_ACCOUNTS.map((acc, i) => {
              const Icon = acc.icon;
              const isActive = activeCard === acc.email;
              return (
                <motion.button
                  key={acc.email || "register"}
                  type="button"
                  onClick={() => fillAccount(acc)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                    isActive
                      ? "border-orange-400 shadow-md shadow-orange-100"
                      : `${acc.light} border-transparent`
                  }`}
                >
                  <motion.div
                    className={`${acc.bg} p-2 rounded-xl`}
                    animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </motion.div>
                  <p className="text-xs font-bold leading-tight">{acc.label}</p>
                  <p className="text-xs opacity-60 leading-tight">{acc.desc}</p>
                  {!acc.isRegister && (
                    <p className="text-xs font-mono opacity-50 truncate w-full text-center">{acc.email}</p>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <Card className="shadow-sm">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <UtensilsCrossed className="h-9 w-9 text-orange-500" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your QuickBite account</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <motion.div
                  className="space-y-1.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setActiveCard(null); }}
                    className="transition-all duration-200 focus:scale-[1.01]"
                    required
                  />
                </motion.div>
                <motion.div
                  className="space-y-1.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.28 }}
                >
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setActiveCard(null); }}
                    className="transition-all duration-200 focus:scale-[1.01]"
                    required
                  />
                </motion.div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <motion.div className="w-full" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    disabled={isPending}
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Signing in...
                      </span>
                    ) : "Sign In →"}
                  </Button>
                </motion.div>
                <p className="text-sm text-center text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-orange-500 hover:underline font-medium">
                    Sign up
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>

      </div>
    </div>
  );
}

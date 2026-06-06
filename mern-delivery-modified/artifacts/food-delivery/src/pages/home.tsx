import { useState } from "react";
import { Link } from "wouter";
import { Search, Clock, Star, Bike } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useListRestaurants } from "@workspace/api-client-react";
import type { Restaurant } from "@workspace/api-client-react";
import { motion } from "framer-motion";

const CUISINES = ["All", "Pizza", "Burgers", "Sushi", "Mexican", "Indian", "Chinese", "Thai"];

const CUISINE_COLORS: Record<string, string> = {
  Pizza:   "bg-red-500",
  Burgers: "bg-yellow-500",
  Sushi:   "bg-pink-500",
  Mexican: "bg-green-500",
  Indian:  "bg-orange-500",
  Chinese: "bg-rose-500",
  Thai:    "bg-teal-500",
  default: "bg-purple-500",
};

const CARD_BORDER_ACCENTS = [
  "border-t-orange-500",
  "border-t-blue-500",
  "border-t-purple-500",
  "border-t-green-500",
  "border-t-pink-500",
  "border-t-indigo-500",
  "border-t-yellow-500",
  "border-t-teal-500",
];

function RestaurantCard({ r, index }: { r: Restaurant; index: number }) {
  const accentClass = CARD_BORDER_ACCENTS[index % CARD_BORDER_ACCENTS.length];
  const cuisineColor = CUISINE_COLORS[r.cuisine] ?? CUISINE_COLORS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/restaurant/${r.id}`}>
        <div
          className={`group cursor-pointer rounded-xl border-t-4 ${accentClass} bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
        >
          <div className="relative h-44 bg-gray-100 overflow-hidden">
            {r.image ? (
              <img
                src={r.image}
                alt={r.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                <span className="text-5xl animate-float">🍽️</span>
              </div>
            )}
            {!r.isOpen && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-white text-gray-800 font-semibold text-sm px-3 py-1 rounded-full">Closed</span>
              </div>
            )}
            <span className={`absolute top-2 left-2 ${cuisineColor} text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm transition-transform duration-200 group-hover:scale-105`}>
              {r.cuisine}
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-gray-900 group-hover:text-orange-500 transition-colors duration-200 leading-tight">{r.name}</h3>
              <div className="flex items-center gap-0.5 shrink-0 bg-yellow-50 border border-yellow-200 rounded-lg px-1.5 py-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-700">{r.rating.toFixed(1)}</span>
              </div>
            </div>
            {r.description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span className="font-medium">{r.deliveryTime} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Bike className="h-3.5 w-3.5 text-green-500" />
                <span className="font-medium">{r.deliveryFee === 0 ? "Free" : `$${r.deliveryFee.toFixed(2)}`}</span>
              </div>
              {r.reviewCount !== undefined && r.reviewCount > 0 && (
                <span className="ml-auto text-gray-300">({r.reviewCount})</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border-t-4 border-t-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="h-44 bg-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
      </div>
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [activeCuisine, setActiveCuisine] = useState("All");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((window as unknown as { _st?: ReturnType<typeof setTimeout> })._st);
    (window as unknown as { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedSearch(val), 400);
  }

  const params = {
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(activeCuisine !== "All" && { category: activeCuisine }),
    limit: 24,
  };

  const { data, isLoading } = useListRestaurants(params);
  const restaurants = data?.restaurants ?? [];

  return (
    <main>
      {/* Animated Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 text-white px-4 py-16">
        {/* Background floating blobs */}
        <div className="absolute top-4 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute bottom-2 left-20 w-24 h-24 bg-orange-300/30 rounded-full blur-2xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-hero-glow" />

        <div className="w-full max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex justify-center mb-3">
              <motion.span
                className="text-5xl inline-block"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                🍔
              </motion.span>
            </div>
            <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
              Hungry? We've got you covered
            </h1>
            <p className="text-orange-100 mb-8 text-lg">Order from the best local restaurants with fast delivery</p>
          </motion.div>
          <motion.div
            className="relative max-w-lg mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors" />
            <Input
              placeholder="Search restaurants or cuisines..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 bg-white text-gray-900 placeholder:text-gray-400 border-0 h-13 text-base shadow-xl rounded-xl py-4 focus:scale-[1.02] transition-transform duration-200"
            />
          </motion.div>
        </div>
      </div>

      <div className="w-full px-4 py-6">
        {/* Cuisine pills */}
        <motion.div
          className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {CUISINES.map((c, i) => {
            const isActive = activeCuisine === c;
            const color = c === "All" ? "" : CUISINE_COLORS[c] ?? CUISINE_COLORS.default;
            return (
              <motion.button
                key={c}
                onClick={() => setActiveCuisine(c)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.04 }}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm ${
                  isActive
                    ? c === "All"
                      ? "bg-orange-500 text-white shadow-orange-200 shadow-md"
                      : `${color} text-white shadow-md`
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {c}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Results header */}
        <motion.div
          className="flex items-center justify-between mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h2 className="text-lg font-bold text-gray-800">
            {debouncedSearch || activeCuisine !== "All" ? "Search Results" : "All Restaurants"}
          </h2>
          {data?.total !== undefined && (
            <motion.span
              className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.5 }}
            >
              {data.total} {data.total === 1 ? "restaurant" : "restaurants"}
            </motion.span>
          )}
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : restaurants.length === 0 ? (
          <motion.div
            className="text-center py-20 bg-gray-50 rounded-2xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-5xl mb-3 animate-float inline-block">🔍</p>
            <p className="text-gray-600 font-medium mt-2">No restaurants found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or cuisine filter</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {restaurants.map((r, i) => <RestaurantCard key={r.id} r={r} index={i} />)}
          </div>
        )}
      </div>
    </main>
  );
}

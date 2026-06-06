import { UtensilsCrossed } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-orange-400 font-bold text-lg mb-3">
              <UtensilsCrossed className="h-5 w-5" />
              QuickBite
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Fast, fresh food delivery connecting hungry customers with the best local restaurants.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h4 className="text-white font-semibold mb-3">For Customers</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/" className="hover:text-orange-400 transition-colors">Browse Restaurants</Link></li>
              <li><Link href="/orders" className="hover:text-orange-400 transition-colors">Track Orders</Link></li>
              <li><Link href="/register" className="hover:text-orange-400 transition-colors">Create Account</Link></li>
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="text-white font-semibold mb-3">For Restaurants</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/register" className="hover:text-orange-400 transition-colors">Partner With Us</Link></li>
              <li><Link href="/dashboard" className="hover:text-orange-400 transition-colors">Restaurant Dashboard</Link></li>
              <li><Link href="/login" className="hover:text-orange-400 transition-colors">Owner Login</Link></li>
            </ul>
          </motion.div>
        </div>
        <div className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <span>© 2026 Aravind Ugge. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Made with <span className="text-red-500">♥</span> for fast delivery
          </span>
        </div>
      </div>
    </footer>
  );
}

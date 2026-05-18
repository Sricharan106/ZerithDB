"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Zap,
} from "lucide-react";
import Footer from "@/components/Footer";

const plans = [
  {
    name: "Starter",
    price: "$0",
    description: "Perfect for experiments and personal projects.",
    features: [
      "Unlimited Local Data",
      "P2P Synchronization",
      "Community Support",
      "Basic Analytics",
    ],
    cta: "Start for free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    description: "For production apps that need more power.",
    features: [
      "Everything in Starter",
      "Priority P2P Relay Nodes",
      "Advanced CRDT Tools",
      "Priority Email Support",
      "Custom Schemas",
    ], 
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Tailored solutions for large-scale deployments.",
    features: [
      "Everything in Pro",
      "Dedicated Relay Infrastructure",
      "SLA Guarantees",
      "Custom Integration Support",
      "On-premise Options",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl">ZerithDB</span>
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-black flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <section className="pt-20 pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Simple, transparent pricing
            </h1>

            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Choose the plan that fits your needs. ZerithDB is open source and free to start.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-8 rounded-3xl border ${
                  plan.highlight
                    ? "border-blue-600 shadow-xl shadow-blue-500/10 relative"
                    : "border-gray-100 shadow-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" />
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>

                  {plan.price !== "Custom" && (
                    <span className="text-gray-500">/mo</span>
                  )}
                </div>

                <p className="text-gray-500 mb-8">
                  {plan.description}
                </p>

                <button
                  className={`w-full py-3 rounded-xl font-medium mb-8 transition-all ${
                    plan.highlight
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                      : "bg-gray-50 text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {plan.cta}
                </button>

                <ul className="space-y-4">
                  {plan.features.map((feature, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-3 text-sm text-gray-600"
                    >
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
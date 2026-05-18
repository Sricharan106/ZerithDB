"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, User } from "lucide-react";
import Footer from "@/components/Footer";

const blogPosts = [
  {
    title: "Introducing ZerithDB: The Future of Local-First Apps",
    excerpt:
      "Learn how ZerithDB is changing the way developers think about data persistence and synchronization.",
    date: "Oct 24, 2024",
    author: "Pranav Shankar",
    category: "Product",
  },
  {
    title: "Deep Dive into P2P Synchronization",
    excerpt: "Understanding the underlying architecture of ZerithDB's peer-to-peer sync engine.",
    date: "Oct 20, 2024",
    author: "Zerith Team",
    category: "Engineering",
  },
  {
    title: "Building a Collaborative To-Do App in 5 Minutes",
    excerpt:
      "A step-by-step guide to building your first real-time collaborative application with ZerithDB.",
    date: "Oct 15, 2024",
    author: "Community",
    category: "Tutorial",
  },
];

export default function BlogPage() {
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
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>

      <section className="pt-20 pb-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-20"
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Blog</h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Insights, updates, and tutorials from the team building the future of the local-first
              web.
            </p>
          </motion.div>

          <div className="grid gap-12">
            {blogPosts.map((post, i) => (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                        {post.category}
                      </span>
                      <span className="text-sm text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {post.date}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-500 text-lg leading-relaxed mb-6">{post.excerpt}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{post.author}</span>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

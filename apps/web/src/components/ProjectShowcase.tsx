"use client";

import { motion } from "framer-motion";
import { ExternalLink, Star, Code2 } from "lucide-react";

const projects = [
  {
    title: "ZenDraw",
    desc: "A collaborative whiteboard for teams to brainstorm in real-time.",
    stars: "1.2k",
    tags: ["Canvas", "P2P"],
    gradient: "from-purple-500 to-blue-500",
  },
  {
    title: "FlowNotes",
    desc: "Offline-first markdown editor with instant mobile sync.",
    stars: "840",
    tags: ["Markdown", "CRDT"],
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    title: "TaskPeer",
    desc: "Kanban board that works without a central server.",
    stars: "450",
    tags: ["Kanban", "Local-first"],
    gradient: "from-orange-500 to-red-500",
  },
];

export default function ProjectShowcase() {
  return (
    <section className="py-24 px-6 bg-gray-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Built with ZerithDB
            </h2>
            <p className="text-xl text-gray-500">
              Discover what developers are building on the local-first stack.
            </p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm">
            Showcase your project <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {projects.map((p, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.gradient} mb-6 flex items-center justify-center text-white shadow-lg shadow-blue-500/10`}
              >
                <Code2 className="w-8 h-8" />
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-bold text-gray-900">{p.title}</h3>
                <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                  <Star className="w-4 h-4 fill-current" /> {p.stars}
                </div>
              </div>
              <p className="text-gray-500 leading-relaxed mb-6">{p.desc}</p>
              <div className="flex flex-wrap gap-2">
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-gray-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { MousePointer2, WifiOff, Cloud } from "lucide-react";
import { useState, useEffect } from "react";

export default function VisualShowcase() {
  const [todoText, setTodoText] = useState("");
  const [todos, setTodos] = useState(["Buy milk", "Build P2P DB"]);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });

  // Simulate real-time sync
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorPos({
        x: 40 + Math.random() * 20,
        y: 40 + Math.random() * 20,
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            See it in action
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Experience the power of local-first sync across multiple environments.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Sync Demo */}
          <div className="space-y-8">
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 relative">
              <div className="absolute top-4 left-6 flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="mt-6 flex gap-4">
                {/* Window 1 */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative overflow-hidden">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-3">
                    Browser A
                  </div>
                  <div className="space-y-2">
                    {todos.map((t, i) => (
                      <motion.div
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        key={i}
                        className="p-2 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 flex justify-between"
                      >
                        {t}
                      </motion.div>
                    ))}
                    <div className="pt-2 border-t border-gray-50 flex gap-1">
                      <input
                        className="flex-1 text-[10px] p-1 bg-gray-50 border border-gray-100 rounded outline-none"
                        placeholder="Add todo..."
                        value={todoText}
                        onChange={(e) => setTodoText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && todoText) {
                            setTodos([...todos, todoText]);
                            setTodoText("");
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sync Arrow */}
                <div className="flex items-center justify-center">
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-blue-500"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                </div>

                {/* Window 2 */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-3">
                    Browser B
                  </div>
                  <div className="space-y-2">
                    {todos.map((t, i) => (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={i}
                        className="p-2 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100"
                      >
                        {t}
                      </motion.div>
                    ))}
                  </div>
                  {/* Collaborative Cursor */}
                  <motion.div
                    animate={{
                      x: cursorPos.x,
                      y: cursorPos.y,
                    }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="absolute z-20 text-blue-600 flex flex-col items-start pointer-events-none"
                  >
                    <MousePointer2 className="w-4 h-4 fill-current" />
                    <span className="bg-blue-600 text-white text-[8px] px-1 rounded ml-3">
                      User A
                    </span>
                  </motion.div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                  Instant Peer-to-Peer Sync via WebRTC
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  <Cloud className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">Always Online</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Data syncs instantly when peers are connected.
                </p>
              </div>
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mb-4">
                  <WifiOff className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">Offline First</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Continue working without internet. Changes merge automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="lg:pl-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-6">Collaborative by design.</h3>
            <div className="space-y-6">
              {[
                {
                  title: "Real-time Multi-user",
                  desc: "Share state, cursors, and presence across browsers with zero backend code.",
                },
                {
                  title: "Deterministic Consistency",
                  desc: "Powered by CRDTs, ensure every user sees the exact same state without merge conflicts.",
                },
                {
                  title: "Local-First Speed",
                  desc: "0ms latency for all local interactions. The UI never waits for the network.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold mt-1">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

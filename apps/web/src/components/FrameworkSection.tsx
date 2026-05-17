"use client";

import { motion } from "framer-motion";

const frameworks = [
  {
    name: "Next.js",
    icon: (
      <svg
        viewBox="0 0 394 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path
          fill="currentColor"
          d="M262 0h68.5v12.7h-27.2v66.6h-13.6V12.7H262V0ZM149 0v12.7H94v20.4h44.3v12.6H94v21h55v12.6H80.5V0h68.7zm34.3 0h-17.8l63.8 79.4h17.9l-32-39.7 32-39.6h-17.9l-23 28.6-23-28.6zm18.3 56.7-9-11-27.1 33.7h17.8l18.3-22.7z"
        />
        <path
          fill="currentColor"
          d="M81 79.3 17 0H0v79.3h13.6V17l50.2 62.3H81Zm252.6-.4c-1 0-1.8-.4-2.5-1s-1.1-1.6-1.1-2.6.3-1.8 1-2.5 1.6-1 2.6-1 1.8.3 2.5 1a3.4 3.4 0 0 1 .6 4.3 3.7 3.7 0 0 1-3 1.8zm23.2-33.5h6v23.3c0 2.1-.4 4-1.3 5.5a9.1 9.1 0 0 1-3.8 3.5c-1.6.8-3.5 1.3-5.7 1.3-2 0-3.7-.4-5.3-1s-2.8-1.8-3.7-3.2c-.9-1.3-1.4-3-1.4-5h6c.1.8.3 1.6.7 2.2s1 1.2 1.6 1.5c.7.4 1.5.5 2.4.5 1 0 1.8-.2 2.4-.6a4 4 0 0 0 1.6-1.8c.3-.8.5-1.8.5-3V45.5zm30.9 9.1a4.4 4.4 0 0 0-2-3.3 7.5 7.5 0 0 0-4.3-1.1c-1.3 0-2.4.2-3.3.5-.9.4-1.6 1-2 1.6a3.5 3.5 0 0 0-.3 4c.3.5.7.9 1.3 1.2l1.8 1 2 .5 3.2.8c1.3.3 2.5.7 3.7 1.2a13 13 0 0 1 3.2 1.8 8.1 8.1 0 0 1 3 6.5c0 2-.5 3.7-1.5 5.1a10 10 0 0 1-4.4 3.5c-1.8.8-4.1 1.2-6.8 1.2-2.6 0-4.9-.4-6.8-1.2-2-.8-3.4-2-4.5-3.5a10 10 0 0 1-1.7-5.6h6a5 5 0 0 0 3.5 4.6c1 .4 2.2.6 3.4.6 1.3 0 2.5-.2 3.5-.6 1-.4 1.8-1 2.4-1.7a4 4 0 0 0 .8-2.4c0-.9-.2-1.6-.7-2.2a11 11 0 0 0-2.1-1.4l-3.2-1-3.8-1c-2.8-.7-5-1.7-6.6-3.2a7.2 7.2 0 0 1-2.4-5.7 8 8 0 0 1 1.7-5 10 10 0 0 1 4.3-3.5c2-.8 4-1.2 6.4-1.2 2.3 0 4.4.4 6.2 1.2 1.8.8 3.2 2 4.3 3.4 1 1.4 1.5 3 1.5 5h-5.8z"
        />
      </svg>
    ),
    color: "currentColor",
    hoverBg: "hover:shadow-black/10",
    size: "w-24 h-8 text-foreground",
  },
  {
    name: "React",
    icon: (
      <svg
        viewBox="-11.5 -10.23174 23 20.46348"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle cx="0" cy="0" r="2.05" />
        <g stroke="currentColor" strokeWidth="1" fill="none">
          <ellipse rx="11" ry="4.2" />
          <ellipse rx="11" ry="4.2" transform="rotate(60)" />
          <ellipse rx="11" ry="4.2" transform="rotate(120)" />
        </g>
      </svg>
    ),
    color: "#61DAFB",
    hoverBg: "hover:shadow-[#61DAFB]/20",
    size: "w-12 h-12",
  },
  {
    name: "Vue",
    icon: (
      <svg
        viewBox="0 0 118 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path fill="currentColor" d="M0 0h24L59 60l35-60h24L59 100 0 0z" />
        <path fill="#34495E" d="M24 0h24l11 19 11-19h24L59 60 24 0z" />
      </svg>
    ),
    color: "#41B883",
    hoverBg: "hover:shadow-[#41B883]/20",
    size: "w-12 h-10",
  },
  {
    name: "Astro",
    icon: <span className="font-bold tracking-tighter">astro</span>,
    color: "#FF5D01",
    hoverBg: "hover:shadow-[#FF5D01]/20",
    size: "text-3xl font-bold tracking-tighter [filter:none]",
  },
  {
    name: "Nuxt",
    icon: (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path fill="currentColor" d="M50 10 L90 80 L10 80 Z" opacity="0.3" />
        <path fill="currentColor" d="M60 30 L95 90 L25 90 Z" />
      </svg>
    ),
    color: "#00C58E",
    hoverBg: "hover:shadow-[#00C58E]/20",
    size: "w-12 h-10",
  },
  {
    name: "Python",
    icon: (
      <svg
        viewBox="0 0 448 512"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path d="M439.8 200.5c-7.7-30.9-22.3-54.2-53.4-54.2h-40.1v47.4c0 36.8-31.2 67.8-68.6 67.8H172.7c-4.5 0-8.1 3.6-8.1 8.1v4.8c0 4.5 3.6 8.1 8.1 8.1h104.6c40.2 0 73.9-33.3 73.9-73.5V146.3h-40.1c-31.1 0-45.7 23.3-53.4 54.2-7.8 31.4-1.1 63.8 18.5 86.4l2.1 2.4c19.9 23 48 37.1 79.1 37.1h39.1c31.1 0 45.7-23.3 53.4-54.2 7.7-31.4 1.1-63.8-18.5-86.4l-2.1-2.4c-19.9-23-48-37.1-79.1-37.1zM282.1 407.1c-16.1 0-29.1-13-29.1-29.1 0-16.1 13-29.1 29.1-29.1s29.1 13 29.1 29.1c0 16.1-13 29.1-29.1 29.1zM111.9 220.3c-7.8-31.4-1.1-63.8 18.5-86.4l2.1-2.4c19.9-23 48-37.1 79.1-37.1h39.1c31.1 0 45.7 23.3 53.4 54.2 7.7 31.4 1.1 63.8-18.5 86.4l-2.1 2.4c-19.9 23-48 37.1-79.1 37.1h-39.1c-31.1 0-45.7-23.3-53.4-54.2zM165.9 104.9c16.1 0 29.1 13 29.1 29.1 0 16.1-13 29.1-29.1 29.1s-29.1-13-29.1-29.1c0-16.1 13-29.1 29.1-29.1z" />
      </svg>
    ),
    color: "#3776AB",
    hoverBg: "hover:shadow-[#3776AB]/20",
    size: "w-12 h-12",
  },
];

export default function FrameworkSection() {
  return (
    <div className="py-20 px-6 relative overflow-hidden bg-transparent">
      {/* Background gradients for depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground mb-12">
            Works seamlessly with your favorite frameworks
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 justify-items-center justify-center">
          {frameworks.map((fw, index) => (
            <motion.div
              key={fw.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{
                y: -6,
                scale: 1.02,
                transition: { duration: 0.2, ease: "easeOut" },
              }}
              className={`
                group relative flex flex-col items-center justify-center p-6
                bg-white dark:bg-zinc-900 border border-gray-100/80 dark:border-zinc-800/80
                rounded-[1.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] 
                transition-all duration-500 ease-out
                w-full aspect-square
                overflow-hidden
              `}
            >
              {/* Floating animation wrapper */}
              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.8,
                }}
                className="flex flex-col items-center w-full relative z-10"
              >
                <div
                  className={`mb-4 flex items-center justify-center transition-all duration-500 group-hover:scale-105 ${fw.size}`}
                  style={{ color: fw.color }}
                >
                  {fw.icon}
                </div>
                <span className="text-lg font-bold text-foreground tracking-tight transition-colors duration-300">
                  {fw.name}
                </span>
              </motion.div>

              {/* Card accent glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500 pointer-events-none"
                style={{ backgroundColor: fw.color }}
              />

              {/* Subtle bottom border glow on hover */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-full group-hover:translate-y-0"
                style={{ backgroundColor: fw.color }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

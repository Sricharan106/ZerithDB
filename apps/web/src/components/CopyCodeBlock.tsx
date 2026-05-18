"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyCodeBlockProps {
  code: string;
  language?: string;
}

export default function CopyCodeBlock({ code, language }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group rounded-xl overflow-hidden bg-gray-900 border border-gray-700">
      {/* Language badge */}
      {language && (
        <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {language}
          </span>
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
          bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500
          text-gray-300 hover:text-white
          text-xs font-medium
          opacity-0 group-hover:opacity-100
          transition-all duration-200"
        title={copied ? "Copied!" : "Copy code"}
        aria-label={copied ? "Copied!" : "Copy code to clipboard"}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>

      {/* Code block */}
      <pre className="text-[13px] font-mono text-gray-300 leading-relaxed p-4 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}


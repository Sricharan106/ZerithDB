"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Wifi, WifiOff, Laptop, Save, Database } from "lucide-react";
import { createApp } from "zerithdb-sdk";
import type { Document } from "zerithdb-sdk";

type Note = {
  text: string;
  client: "Browser A" | "Browser B";
  createdAt: number;
};

type PlaygroundNote = Document<Note>;

const PLAYGROUND_APP_ID = "web-playground";
const PLAYGROUND_COLLECTION = "playground_notes";

function sortNotes(notes: PlaygroundNote[]): PlaygroundNote[] {
  return [...notes].sort((left, right) => right._updatedAt - left._updatedAt);
}

interface PanelProps {
  title: string;
  accentClass: string;
  notes: PlaygroundNote[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  saveLabel: string;
}

function PlaygroundPanel({
  title,
  accentClass,
  notes,
  input,
  onInputChange,
  onSubmit,
  isLoading,
  saveLabel,
}: PanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[600px]">
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-2 text-white">
          <Laptop className={`w-4 h-4 ${accentClass}`} />
          <span className="text-sm font-semibold tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          <Database className="w-3.5 h-3.5" /> IndexedDB
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {isLoading && notes.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 text-sm">Loading real SDK data...</div>
        ) : notes.length === 0 ? (
          <div className="text-center text-gray-400 mt-20 text-sm">No documents yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((note) => (
              <div
                key={note._id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-gray-800">{note.text}</p>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                    {note.client}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider font-mono">
                  ID: {note._id} • {new Date(note.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <button
            type="submit"
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saveLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  const t = useTranslations();
  const sdk = useMemo(
    () =>
      createApp({
        appId: PLAYGROUND_APP_ID,
        sync: { maxPeers: 8 },
        logLevel: "silent",
      }),
    []
  );
  const collection = useMemo(() => sdk.db<Note>(PLAYGROUND_COLLECTION), [sdk]);
  const mountedRef = useRef(true);

  const [notes, setNotes] = useState<PlaygroundNote[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      void sdk.dispose();
    };
  }, [sdk]);

  const refreshNotes = useCallback(async () => {
    try {
      const documents = await collection.find();
      if (!mountedRef.current) {
        return;
      }

      setNotes(sortNotes(documents));
      setError(null);
    } catch (fetchError) {
      if (!mountedRef.current) {
        return;
      }

      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load playground data."
      );
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [collection]);

  useEffect(() => {
    const initialRefreshTimer = window.setTimeout(() => {
      void refreshNotes();
    }, 0);

    if (!isLive) {
      return () => {
        window.clearTimeout(initialRefreshTimer);
      };
    }

    const intervalId = window.setInterval(() => {
      void refreshNotes();
    }, 1500);

    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(intervalId);
    };
  }, [isLive, refreshNotes]);

  const addNote = useCallback(
    async (client: "A" | "B", text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      try {
        await collection.insert({
          text: trimmed,
          client: client === "A" ? "Browser A" : "Browser B",
          createdAt: Date.now(),
        });

        if (client === "A") {
          setInputA("");
        } else {
          setInputB("");
        }

        await refreshNotes();
      } catch (insertError) {
        if (mountedRef.current) {
          setError(insertError instanceof Error ? insertError.message : "Failed to save document.");
        }
      }
    },
    [collection, refreshNotes]
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-500 hover:text-black transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> {t("common.backHome")}
          </Link>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/logo.svg" alt="ZerithDB Logo" className="w-full h-full" />
            </div>
            <span className="font-semibold text-gray-900 text-lg tracking-tight">
              {t("nav.playground")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            <Database className="w-3.5 h-3.5" /> Real SDK records: {notes.length}
          </div>
          <button
            onClick={() => setIsLive((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm border ${
              isLive
                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {isLive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isLive ? "Live updates" : "Updates paused"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="mx-auto w-full max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      ) : null}

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid md:grid-cols-2 gap-8 items-start mt-4">
        <PlaygroundPanel
          title="Browser A"
          accentClass="text-blue-400"
          notes={notes}
          input={inputA}
          onInputChange={setInputA}
          onSubmit={() => {
            void addNote("A", inputA);
          }}
          isLoading={isLoading}
          saveLabel={t("common.save")}
        />

        <PlaygroundPanel
          title="Browser B"
          accentClass="text-purple-400"
          notes={notes}
          input={inputB}
          onInputChange={setInputB}
          onSubmit={() => {
            void addNote("B", inputB);
          }}
          isLoading={isLoading}
          saveLabel={t("common.save")}
        />
      </main>
    </div>
  );
}

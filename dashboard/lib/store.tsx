"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { demoBotLines, demoConversations, demoCourses, demoLeads, demoMessages, demoUserLines } from "./demo";
import { Conversation, Course, Lead, Message, Sentiment } from "./types";

type Status = "loading" | "live" | "demo" | "error";

interface Store {
  status: Status;
  updatedAt: Date | null;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  leads: Lead[];
  courses: Course[];
  selectedId: string | null;
  select: (id: string | null) => void;
  loadMessages: (conversationId: string) => Promise<void>;
  takeOver: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  sendOperator: (id: string, text: string) => Promise<void>;
  markEnrolled: (id: string) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside DataProvider");
  return v;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const convRef = useRef(conversations);
  convRef.current = conversations;
  const demo = status === "demo";

  const patchConversation = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const pushMessage = useCallback(
    (m: Message) => {
      setMessages((prev) => ({ ...prev, [m.conversation_id]: [...(prev[m.conversation_id] ?? []), m] }));
      patchConversation(m.conversation_id, {
        last_message_at: m.created_at,
        last_message: { content: m.content, role: m.role },
      });
    },
    [patchConversation]
  );

  // ---------- Live data: first snapshot, then Server-Sent Events ----------
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    const apply = (d: { conversations: Conversation[]; leads: Lead[]; courses: Course[] }) => {
      setConversations(d.conversations);
      setLeads(d.leads);
      setCourses(d.courses);
      setUpdatedAt(new Date());
      setStatus("live");
    };

    const startDemo = () => {
      setConversations(demoConversations);
      setMessages(demoMessages);
      setLeads(demoLeads);
      setCourses(demoCourses);
      setStatus("demo");
    };

    (async () => {
      try {
        const res = await fetch("/api/snapshot", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 503) return startDemo();
        if (!res.ok) throw new Error("snapshot failed");
        apply(await res.json());
      } catch {
        if (!cancelled) setStatus("error");
      }
      if (cancelled) return;
      es = new EventSource("/api/stream");
      es.addEventListener("snapshot", (e) => apply(JSON.parse((e as MessageEvent).data)));
      es.addEventListener("problem", () => setStatus("error"));
      es.onerror = () => setStatus("error");
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  const loadMessages = useCallback(
    async (id: string) => {
      if (demo || status === "loading") return;
      try {
        const res = await fetch(`/api/messages?conversation_id=${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const list = (await res.json()) as Message[];
        setMessages((prev) => ({ ...prev, [id]: list }));
      } catch {
        /* the next snapshot triggers another load */
      }
    },
    [demo, status]
  );

  // ---------- Demo mode: simulated traffic when there is no database ----------
  useEffect(() => {
    if (!demo) return;
    let n = 0;
    const timer = setInterval(() => {
      const list = convRef.current;
      const c = list[Math.floor(Math.random() * list.length)];
      if (!c) return;
      n += 1;
      pushMessage({
        id: `demo-u-${n}`,
        conversation_id: c.id,
        role: "user",
        content: demoUserLines[n % demoUserLines.length],
        media_type: "text",
        created_at: new Date().toISOString(),
      });
      if (!c.ai_paused) {
        setTimeout(() => {
          pushMessage({
            id: `demo-a-${n}`,
            conversation_id: c.id,
            role: "assistant",
            content: demoBotLines[n % demoBotLines.length],
            media_type: "text",
            created_at: new Date().toISOString(),
          });
        }, 2000);
      }
      if (n % 4 === 0) {
        const opts: Sentiment[] = ["interested", "doubtful", "frustrated", "hot_lead"];
        patchConversation(c.id, { sentiment: opts[Math.floor(Math.random() * opts.length)] });
      }
    }, 7000);
    return () => clearInterval(timer);
  }, [demo, pushMessage, patchConversation]);

  // ---------- Operator actions ----------
  const callApi = useCallback(async (body: object) => {
    const res = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
  }, []);

  const takeOver = useCallback(
    async (id: string) => {
      patchConversation(id, { ai_paused: true, paused_by: "operator" });
      if (!demo) await callApi({ action: "takeover", conversation_id: id });
    },
    [demo, patchConversation, callApi]
  );

  const resume = useCallback(
    async (id: string) => {
      patchConversation(id, { ai_paused: false, paused_by: null });
      if (!demo) await callApi({ action: "resume", conversation_id: id });
    },
    [demo, patchConversation, callApi]
  );

  const sendOperator = useCallback(
    async (id: string, text: string) => {
      if (demo) {
        patchConversation(id, { ai_paused: true, paused_by: "operator" });
        pushMessage({
          id: `op-${Date.now()}`,
          conversation_id: id,
          role: "operator",
          content: text,
          media_type: "text",
          created_at: new Date().toISOString(),
        });
        return;
      }
      await callApi({ action: "send", conversation_id: id, text });
      patchConversation(id, { ai_paused: true, paused_by: "operator" });
      await loadMessages(id);
    },
    [demo, patchConversation, pushMessage, callApi, loadMessages]
  );

  const markEnrolled = useCallback(
    async (id: string) => {
      const contactId = convRef.current.find((c) => c.id === id)?.contact_id;
      if (!demo) await callApi({ action: "enroll", conversation_id: id });
      patchConversation(id, { stage: "enrolled" });
      setLeads((ls) => ls.map((l) => (l.contact_id === contactId && (l.stage === "asked_enroll" || l.stage === "ready_to_close") ? { ...l, stage: "enrolled" } : l)));
    },
    [demo, patchConversation, callApi]
  );

  const value = useMemo<Store>(
    () => ({ status, updatedAt, conversations, messages, leads, courses, selectedId, select: setSelectedId, loadMessages, takeOver, resume, sendOperator, markEnrolled }),
    [status, updatedAt, conversations, messages, leads, courses, selectedId, loadMessages, takeOver, resume, sendOperator, markEnrolled]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

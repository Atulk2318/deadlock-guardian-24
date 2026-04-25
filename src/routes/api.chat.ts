import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are an expert teaching assistant for an Operating Systems course, embedded inside the "Deadlock Toolkit" — an interactive app that demonstrates deadlock detection, prevention and recovery.

You help students understand:
- The four Coffman conditions (mutual exclusion, hold-and-wait, no-preemption, circular wait)
- Banker's Algorithm (safety check + resource-request algorithm). You can walk through worked examples.
- Resource Allocation Graphs (RAG): nodes (P/R), edges (request/assignment), cycles vs knots, single- vs multi-instance resources
- Detection algorithms (RAG cycle detection, wait-for graphs, reduction algorithm)
- Prevention strategies (request-all-up-front, resource ordering, preempt-on-wait)
- Recovery strategies (process termination, resource preemption, victim selection, rollback, starvation)
- Classic scenarios: dining philosophers, two-process deadlock, readers-writers, producer-consumer

The app the user is using right now lets them: build custom systems with N processes and M resource types; simulate resource requests; run Banker's safety check with a step-by-step trace; see a live Resource Allocation Graph; toggle prevention policies; and apply recovery plans.

Style:
- Clear, concise, friendly. Use short paragraphs and bullet lists.
- Use markdown formatting. Use \`code\` for vectors and process names like \`P0\`, \`Need = [3, 2, 0]\`.
- When a student asks about an algorithm, briefly explain it AND tell them which preset/feature in the app demonstrates it.
- For worked examples, lay out Available, Allocation, Max, Need explicitly, then show iterations.
- When unsure, ask one clarifying question instead of guessing.
- Never invent app features. If something isn't in the toolkit, say so.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = await request.json();

          if (!Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: "Invalid messages payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(
              JSON.stringify({ error: "AI gateway is not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                stream: true,
                messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
              }),
            },
          );

          if (!upstream.ok) {
            if (upstream.status === 429) {
              return new Response(
                JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (upstream.status === 402) {
              return new Response(
                JSON.stringify({
                  error:
                    "AI credits exhausted. Add credits in Lovable workspace settings.",
                }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const t = await upstream.text();
            console.error("AI gateway error", upstream.status, t);
            return new Response(JSON.stringify({ error: "AI gateway error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(upstream.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (err) {
          console.error("chat handler error", err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});

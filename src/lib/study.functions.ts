import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const StudyInput = z.object({
  text: z.string().min(80).max(60000),
  fileName: z.string().min(1).max(180),
});

const StudyOutput = z.object({
  summary: z.string(),
  keyConcepts: z.array(z.object({ title: z.string(), explanation: z.string() })),
  flashcards: z.array(z.object({ front: z.string(), back: z.string() })),
  quiz: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  explainLike15: z.string(),
});

export type StudyResults = z.infer<typeof StudyOutput>;

export const generateStudyKit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StudyInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is temporarily unavailable.");

    const { createStudyAi } = await import("./ai-gateway.server");
    const gateway = createStudyAi(key);
    const { output } = await generateText({
      model: gateway.chatModel("google/gemini-3-flash-preview"),
      output: Output.object({ schema: StudyOutput }),
      system:
        "You are an expert study coach. Produce accurate, concise, student-friendly material using only the provided source. Quiz options must contain exactly four plausible choices and the answer must exactly match one option. Create 6-10 key concepts, 10 flashcards, and 8 quiz questions.",
      prompt: `Create a complete study kit for ${data.fileName}.\n\nSOURCE MATERIAL:\n${data.text}`,
    });

    return output;
  });
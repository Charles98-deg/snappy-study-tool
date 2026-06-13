import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const StudyInput = z.object({
  text: z.string().min(80).max(300000),
  fileName: z.string().min(1).max(180),
});

const DIRECT_INPUT_LIMIT = 55_000;
const CHUNK_SIZE = 24_000;

function chunkText(text: string) {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > CHUNK_SIZE) {
    const paragraphBreak = remaining.lastIndexOf("\n\n", CHUNK_SIZE);
    const sentenceBreak = remaining.lastIndexOf(". ", CHUNK_SIZE);
    const splitAt = Math.max(paragraphBreak, sentenceBreak, Math.floor(CHUNK_SIZE * 0.75));
    chunks.push(remaining.slice(0, splitAt + (splitAt === sentenceBreak ? 1 : 0)).trim());
    remaining = remaining.slice(splitAt + (splitAt === sentenceBreak ? 1 : 0)).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

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
    const model = gateway.chatModel("google/gemini-3-flash-preview");
    let source = data.text;

    if (source.length > DIRECT_INPUT_LIMIT) {
      const chunks = chunkText(source);
      const condensed: string[] = [];

      for (let index = 0; index < chunks.length; index += 1) {
        const { text } = await generateText({
          model,
          system:
            "Condense source material for a later study-kit generation step. Preserve definitions, mechanisms, formulas, dates, names, examples, contrasts, and conclusions. Remove repetition and filler. Do not add outside facts.",
          prompt: `Document section ${index + 1} of ${chunks.length}:\n\n${chunks[index]}`,
        });
        condensed.push(`SECTION ${index + 1}\n${text}`);
      }

      source = condensed.join("\n\n").slice(0, DIRECT_INPUT_LIMIT);
    }

    const { output } = await generateText({
      model,
      output: Output.object({ schema: StudyOutput }),
      system:
        "You are an expert study coach. Produce accurate, concise, student-friendly material using only the provided source. Quiz options must contain exactly four plausible choices and the answer must exactly match one option. Create 6-10 key concepts, 10 flashcards, and 8 quiz questions.",
      prompt: `Create a complete study kit for ${data.fileName}.\n\nSOURCE MATERIAL:\n${source}`,
    });

    return output;
  });

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
  documentIntelligence: z.object({
    discipline: z.string(),
    documentType: z.string(),
    complexityLevel: z.string(),
    prerequisiteKnowledge: z.array(z.string()),
  }),
  executiveSummary: z.string(),
  learningRoadmap: z.array(z.object({
    step: z.number(),
    concept: z.string(),
    whyThisFirst: z.string(),
  })),
  keyConcepts: z.array(z.object({
    title: z.string(),
    explanation: z.string(),
    whyItMatters: z.string(),
    commonMisconception: z.string(),
  })),
  essentialDefinitions: z.array(z.object({
    term: z.string(),
    definition: z.string(),
  })),
  flashcards: z.array(z.object({
    front: z.string(),
    back: z.string(),
    difficulty: z.enum(["foundational", "intermediate", "advanced"]),
  })),
  quiz: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    answer: z.string(),
    explanation: z.string(),
    difficulty: z.enum(["foundational", "intermediate", "advanced"]),
  })),
  commonMistakes: z.array(z.object({
    mistake: z.string(),
    correction: z.string(),
  })),
  practicalApplications: z.array(z.object({
    scenario: z.string(),
    howConceptApplies: z.string(),
  })),
  beginnerExplanation: z.string(),
  examPreparationNotes: z.string(),
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
        "You are an expert study coach and curriculum designer. Analyze the source material and build a rich, student-friendly study kit. documentIntelligence: identify discipline, documentType, complexityLevel, and prerequisiteKnowledge. executiveSummary: 3–5 concise paragraphs. learningRoadmap: order concepts from foundational to advanced with rationale. keyConcepts: include title, explanation, whyItMatters, and commonMisconception. essentialDefinitions: list critical terms. flashcards and quiz: include difficulty (foundational/intermediate/advanced); quiz must have exactly four plausible options with answer matching one exactly. commonMistakes: frequent student errors and corrections. practicalApplications: real-world scenarios. beginnerExplanation: explain core ideas like talking to a curious 15-year-old. examPreparationNotes: focus areas for assessments. Use only the provided source. Create 6–10 key concepts, 8–12 flashcards, and 8–10 quiz questions.",
      prompt: `Create a complete study kit for ${data.fileName}.\n\nSOURCE MATERIAL:\n${source}`,
    });

    return output;
  });

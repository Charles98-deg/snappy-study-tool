import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers3,
  Lightbulb,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractPdfText } from "@/lib/pdf";
import { generateStudyKit, type StudyResults } from "@/lib/study.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnappyStudy AI — AI PDF Study Assistant" },
      {
        name: "description",
        content:
          "Upload a PDF and instantly generate summaries, key concepts, flashcards, quizzes, and simple explanations.",
      },
      { property: "og:title", content: "SnappyStudy AI — AI PDF Study Assistant" },
      { property: "og:description", content: "Turn any PDF into a complete study kit in seconds." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const inputRef = useRef<HTMLInputElement>(null);
  const generate = useServerFn(generateStudyKit);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "extracting" | "ready" | "generating" | "done">(
    "idle",
  );
  const [error, setError] = useState("");
  const [results, setResults] = useState<StudyResults | null>(null);
  const [dragging, setDragging] = useState(false);

  const selectFile = useCallback(async (nextFile?: File) => {
    if (!nextFile) return;
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setError("Please choose a PDF under 20 MB.");
      return;
    }
    setFile(nextFile);
    setError("");
    setResults(null);
    setStatus("extracting");
    try {
      const extracted = await extractPdfText(nextFile);
      if (extracted.length < 80)
        throw new Error(
          "This PDF has too little selectable text. Scanned image PDFs are not supported yet.",
        );
      setText(extracted);
      setStatus("ready");
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "We couldn't read that PDF.");
    }
  }, []);

  const handleGenerate = async () => {
    if (!file || !text) return;
    setError("");
    setStatus("generating");
    try {
      const output = await generate({ data: { text, fileName: file.name } });
      setResults(output);
      setStatus("done");
      window.setTimeout(
        () => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch (caught) {
      setStatus("ready");
      const message = caught instanceof Error ? caught.message : "Study kit generation failed.";
      setError(
        message.includes("402")
          ? "AI credits are unavailable right now."
          : message.includes("429")
            ? "AI is busy. Please try again shortly."
            : message,
      );
    }
  };

  const reset = () => {
    setFile(null);
    setText("");
    setResults(null);
    setError("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-button)]">
            <Zap className="size-5" />
          </span>
          SnappyStudy <span className="text-primary">AI</span>
        </div>
        <div className="hidden items-center gap-2 text-sm font-medium text-muted-foreground sm:flex">
          <Sparkles className="size-4 text-primary" />
          Study smarter, not longer
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:pt-16">
        <div className="animate-float-in">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-bold text-primary shadow-sm">
            <Sparkles className="size-3.5" />
            AI-powered study companion
          </div>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
            Turn any PDF into your <span className="text-primary">study superpower.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Upload your notes or textbook chapter. Get a focused summary, memorable flashcards, key
            concepts, and a quiz—ready in moments.
          </p>
          <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              { icon: BrainCircuit, text: "Clear summaries" },
              { icon: Layers3, text: "Smart flashcards" },
              { icon: CheckCircle2, text: "Practice quizzes" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 font-semibold text-foreground">
                <Icon className="size-4 text-primary" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="animate-float-in rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold">Create your study kit</h2>
              <p className="mt-1 text-sm text-muted-foreground">PDF only · Up to 20 MB</p>
            </div>
            <span className="rounded-xl bg-secondary p-2.5 text-secondary-foreground">
              <BookOpen className="size-5" />
            </span>
          </div>
          {!file ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void selectFile(event.dataTransfer.files[0]);
              }}
              className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border surface-soft hover:border-primary/50"}`}
              onClick={() => inputRef.current?.click()}
            >
              <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-card text-primary shadow-sm">
                <UploadCloud className="size-7" />
              </span>
              <p className="font-display text-base font-bold">Drop your PDF here</p>
              <p className="mt-1 text-sm text-muted-foreground">or click to browse your files</p>
              <Button variant="outline" className="mt-5" type="button">
                Choose PDF
              </Button>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-border surface-soft p-5">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-primary">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={reset} aria-label="Remove PDF">
                  <X />
                </Button>
              </div>
              <div className="my-6 h-px bg-border" />
              {status === "extracting" ? (
                <Status icon={LoaderCircle} label="Reading your PDF…" spinning />
              ) : status === "generating" ? (
                <Status icon={BrainCircuit} label="Building your study kit…" spinning />
              ) : (
                <Status
                  icon={CheckCircle2}
                  label={`${text.split(/\s+/).length.toLocaleString()} words extracted`}
                />
              )}
              <Button
                variant="hero"
                size="xl"
                className="mt-5 w-full"
                disabled={status === "extracting" || status === "generating"}
                onClick={handleGenerate}
              >
                {status === "generating" ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles />
                    Generate study kit
                    <ChevronRight />
                  </>
                )}
              </Button>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Your PDF is processed securely and never stored.
          </p>
        </div>
      </section>

      {results && <Results results={results} fileName={file?.name ?? "Your PDF"} onReset={reset} />}
    </main>
  );
}

function Status({
  icon: Icon,
  label,
  spinning = false,
}: {
  icon: typeof CheckCircle2;
  label: string;
  spinning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-semibold">
      <Icon className={`size-5 ${spinning ? "animate-spin text-primary" : "text-success"}`} />
      {label}
    </div>
  );
}

function Results({
  results,
  fileName,
  onReset,
}: {
  results: StudyResults;
  fileName: string;
  onReset: () => void;
}) {
  const tabs = [
    { value: "summary", label: "Summary", icon: FileText },
    { value: "concepts", label: "Concepts", icon: Lightbulb },
    { value: "cards", label: "Flashcards", icon: Layers3 },
    { value: "quiz", label: "Quiz", icon: CheckCircle2 },
    { value: "simple", label: "Explain simply", icon: BrainCircuit },
  ];
  return (
    <section id="results" className="border-t border-border bg-card/70 py-14">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Your study kit
            </p>
            <h2 className="mt-1 truncate text-2xl font-extrabold sm:text-3xl">Ready to sprint</h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{fileName}</p>
          </div>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw />
            New PDF
          </Button>
        </div>
        <Tabs defaultValue="summary" className="mt-8">
          <div className="overflow-x-auto pb-2">
            <TabsList className="h-auto min-w-max gap-1 rounded-xl p-1.5">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="gap-2 px-4 py-2.5">
                  <Icon />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value="summary">
            <ResultPanel>
              <p className="whitespace-pre-line leading-7 text-muted-foreground">
                {results.summary}
              </p>
            </ResultPanel>
          </TabsContent>
          <TabsContent value="concepts">
            <ResultPanel>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.keyConcepts.map((item, index) => (
                  <article
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-border p-5"
                  >
                    <span className="text-xs font-extrabold text-primary">0{index + 1}</span>
                    <h3 className="mt-2 font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.explanation}
                    </p>
                  </article>
                ))}
              </div>
            </ResultPanel>
          </TabsContent>
          <TabsContent value="cards">
            <ResultPanel>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.flashcards.map((card, index) => (
                  <article
                    key={index}
                    className="group min-h-40 rounded-2xl border border-border bg-background p-5 transition-transform hover:-translate-y-1"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      Question {index + 1}
                    </p>
                    <h3 className="mt-3 font-bold">{card.front}</h3>
                    <div className="mt-4 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">
                      {card.back}
                    </div>
                  </article>
                ))}
              </div>
            </ResultPanel>
          </TabsContent>
          <TabsContent value="quiz">
            <ResultPanel>
              <div className="space-y-5">
                {results.quiz.map((item, index) => (
                  <details key={index} className="rounded-2xl border border-border p-5">
                    <summary className="cursor-pointer list-none font-bold">
                      <span className="mr-2 text-primary">{index + 1}.</span>
                      {item.question}
                    </summary>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {item.options.map((option) => (
                        <div key={option} className="rounded-xl bg-muted px-4 py-3 text-sm">
                          {option}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">
                      <strong>Answer: {item.answer}</strong>
                      <p className="mt-1 text-secondary-foreground">{item.explanation}</p>
                    </div>
                  </details>
                ))}
              </div>
            </ResultPanel>
          </TabsContent>
          <TabsContent value="simple">
            <ResultPanel>
              <div className="mb-5 inline-flex rounded-xl bg-accent p-3 text-accent-foreground">
                <BrainCircuit />
              </div>
              <p className="whitespace-pre-line text-base leading-8 text-muted-foreground">
                {results.explainLike15}
              </p>
            </ResultPanel>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function ResultPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-8">
      {children}
    </div>
  );
}

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";



export interface ExtractedTopic {
  name: string;
  category: string;
  description: string;
  locationDetails: string;
}

export interface ConsolidatedTopic {
  name: string;
  category: string;
  description: string;
  difficulty: "LOW" | "MEDIUM" | "HIGH";
  subtopics: { name: string; details: string }[];
  exercises: { name: string; details: string }[];
  exams: { name: string; details: string }[];
  sources: { fileId: string; fileName: string; fileType: "SLIDES" | "EXERCISES" | "EXAMS"; page?: number | null }[];
}

// Schema for the final Synthesizer agent (consolidated topics)
const synthesizerSchema = {
  type: "ARRAY" as const,
  description: "Konsolidierte Haupt-Prüfungsthemen (maximal 10-20 Stück) mit verlinkten Subthemen, Übungen und Altklausuren",
  items: {
    type: "OBJECT" as const,
    properties: {
      name: { type: "STRING" as const, description: "Name des übergeordneten Hauptthemas (z.B. 'Replikation & Konsistenz')" },
      category: { type: "STRING" as const, description: "Kategorie (z.B. 'Verteilte Systeme')" },
      description: { type: "STRING" as const, description: "Kurze Zusammenfassung, worum es in diesem Hauptthema geht" },
      difficulty: { 
        type: "STRING" as const, 
        enum: ["LOW", "MEDIUM", "HIGH"], 
        description: "Relevanz oder Schwierigkeit für die Prüfung" 
      },
      subtopics: {
        type: "ARRAY" as const,
        description: "Theoretische Unterthemen aus den Slides/Vorlesungen",
        items: {
          type: "OBJECT" as const,
          properties: {
            name: { type: "STRING" as const, description: "Name des Unterthemas (z.B. 'Eventual Consistency')" },
            details: { type: "STRING" as const, description: "Details und Seitenverweise aus den Slides (z.B. 'Folie 12-15')" }
          },
          required: ["name", "details"]
        }
      },
      exercises: {
        type: "ARRAY" as const,
        description: "Zugehörige praktische Übungsaufgaben",
        items: {
          type: "OBJECT" as const,
          properties: {
            name: { type: "STRING" as const, description: "Name des Aufgabentyps (z.B. 'Vektoruhr berechnen')" },
            details: { type: "STRING" as const, description: "Details und Aufgabenverweise (z.B. 'Übungsblatt 3, Aufgabe 2')" }
          },
          required: ["name", "details"]
        }
      },
      exams: {
        type: "ARRAY" as const,
        description: "Bisherige Fragen aus Altklausuren zu diesem Thema",
        items: {
          type: "OBJECT" as const,
          properties: {
            name: { type: "STRING" as const, description: "Fragestellung / Aufgabentyp" },
            details: { type: "STRING" as const, description: "Details und Klausurverweise (z.B. 'Klausur WS23, Aufgabe 4')" },
            type: { 
              type: "STRING" as const, 
              enum: ["APPLICATION", "ROTE_LEARNING"], 
              description: "Klassifizierung der Frage: APPLICATION (Anwendungsaufgabe/Praktisch) oder ROTE_LEARNING (Auswendiglernen/Theoriefrage)" 
            }
          },
          required: ["name", "details", "type"]
        }
      },
      sources: {
        type: "ARRAY" as const,
        description: "Verweise auf die genauen Quelldateien aus den übergebenen Dateizuordnungen",
        items: {
          type: "OBJECT" as const,
          properties: {
            fileId: { type: "STRING" as const, description: "Die exakte ID der Datei aus der Dateizuordnungs-Tabelle" },
            fileName: { type: "STRING" as const, description: "Der Name der Datei" },
            fileType: { type: "STRING" as const, enum: ["SLIDES", "EXERCISES", "EXAMS"] },
            page: { type: "INTEGER" as const, description: "Die Start-Seitennummer im Dokument (1-basiert) für den Link, falls bestimmbar (z.B. 12). Wenn nicht bestimmbar, weglassen.", nullable: true }
          },
          required: ["fileId", "fileName", "fileType"]
        }
      }
    },
    required: ["name", "category", "description", "difficulty", "subtopics", "exercises", "exams", "sources"]
  }
};

/**
 * Custom PDF page joiner to inject page headers
 */
function pageHeaderRender(pageData: any) {
  return pageData.getTextContent()
    .then((textContent: any) => {
      let lastY: number | undefined;
      let text = "";
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += "\n" + item.str;
        }
        lastY = item.transform[5];
      }
      return `\n--- PAGE ${pageData.pageIndex + 1} ---\n` + text;
    });
}

/**
 * Processes a database file: extracts text if possible, otherwise uploads to Gemini Files API
 */
async function processFile(
  file: { id: string; name: string; mimeType: string; base64: string; type: "SLIDES" | "EXERCISES" | "EXAMS" },
  uploadedFilesToCleanup: string[],
  ai: GoogleGenAI
): Promise<any[]> {
  const buffer = Buffer.from(file.base64, "base64");
  let extractedText = "";
  let isTextRich = false;

  // 1. Attempt local text extraction
  try {
    if (file.mimeType === "application/pdf") {
      // @ts-ignore
      const { PDFParse } = require("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      if (result && result.pages) {
        extractedText = result.pages
          .map((p: any) => `--- PAGE ${p.num} ---\n${p.text}`)
          .join("\n\n");
        
        if (extractedText.trim().length > 150) {
          isTextRich = true;
        }
      }
    } else if (file.mimeType.startsWith("text/")) {
      extractedText = buffer.toString("utf-8");
      isTextRich = true;
    }
  } catch (e) {
    console.warn(`Text extraction failed for ${file.name}, falling back to Files API:`, e);
  }

  // 2. Return text if extracted, otherwise upload to Gemini Files API
  if (isTextRich) {
    console.log(`[AI Pipeline] Extracted text from ${file.name} (${extractedText.length} chars)`);
    return [
      `DOCUMENT DETAILS:\n` +
      `- ID: ${file.id}\n` +
      `- Name: ${file.name}\n` +
      `- Type: ${file.type}\n` +
      `CONTENT:\n${extractedText}\n\n`
    ];
  } else {
    console.log(`[AI Pipeline] Falling back to Gemini Files API for scanned/complex document: ${file.name}`);
    
    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    
    const tempFilePath = path.join(tmpDir, `temp_${file.id}.pdf`);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: file.mimeType,
        }
      });
      if (!uploadedFile.name) {
        throw new Error("Uploaded file has no name ref.");
      }
      uploadedFilesToCleanup.push(uploadedFile.name);

      // Wait for file state to become ACTIVE
      let fileState = await ai.files.get({ name: uploadedFile.name });
      let retries = 0;
      while (fileState.state === "PROCESSING" && retries < 15) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        fileState = await ai.files.get({ name: uploadedFile.name });
        retries++;
      }

      if (fileState.state !== "ACTIVE") {
        throw new Error(`File upload processing timed out or failed. State: ${fileState.state}`);
      }

      return [
        {
          fileData: {
            fileUri: uploadedFile.uri,
            mimeType: uploadedFile.mimeType,
          },
        },
        `Obiges Dokument ist: ${file.name} (ID: ${file.id}, Typ: ${file.type}). Bitte analysiere es.`
      ];
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }
}

/**
 * Runs the single-request AI pipeline on the subject's files.
 */
export async function runMultiAgentAnalysis(
  slides: { id: string; name: string; mimeType: string; base64: string }[],
  exercises: { id: string; name: string; mimeType: string; base64: string }[],
  exams: { id: string; name: string; mimeType: string; base64: string }[],
  userApiKey?: string | null
): Promise<ConsolidatedTopic[]> {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Bitte hinterlege deinen eigenen Gemini API-Key in den Profileinstellungen, um die AI-Analyse auszuführen.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const modelName = "gemini-3.5-flash";
  const uploadedFilesToCleanup: string[] = [];
  const contents: any[] = [];

  // Group all files with their types
  const allFiles = [
    ...slides.map(f => ({ ...f, type: "SLIDES" as const })),
    ...exercises.map(f => ({ ...f, type: "EXERCISES" as const })),
    ...exams.map(f => ({ ...f, type: "EXAMS" as const }))
  ];

  if (allFiles.length === 0) {
    return [];
  }

  try {
    // 1. Process files (extract text or upload via Files API)
    console.log(`[AI Pipeline] Starting file parsing/processing for ${allFiles.length} files...`);
    for (const file of allFiles) {
      const parts = await processFile(file, uploadedFilesToCleanup, ai);
      contents.push(...parts);
    }

    // 2. Add System Prompt and Instructions
    const fileIdMappings = allFiles.map(f => ({ fileId: f.id, fileName: f.name, fileType: f.type }));
     const systemInstruction = `
Du bist ein Experte für Klausurvorbereitung und Software Engineering.
Deine Aufgabe ist es, die bereitgestellten Lernmaterialien (Vorlesungsfolien, Übungsaufgaben und Altklausuren) zu analysieren und eine präzise, übersichtliche Liste von maximal 10 bis 20 Haupt-Lernbereichen / Prüfungsthemen (z.B. entsprechend den Vorlesungsterminen oder Hauptkapiteln des Skripts) zu erstellen.

WICHTIGE ANWEISUNGEN:
1. KONSOLIDIERUNG: Erstelle maximal 10 bis 20 Hauptthemen. Wir wollen KEINE flache Liste mit hunderten von Einzelthemen. Konsolidiere ähnliche Inhalte!
2. NESTING: Ordne alle theoretischen Unterpunkte, Übungsaufgaben und Altklausur-Fragen direkt unter diesen 10-20 Hauptthemen ein:
   - 'subtopics' enthält die theoretischen Punkte aus den Folien (mit genauen Seiten-/Foliennummern, z.B. 'Folie 12-15').
   - 'exercises' enthält die praktischen Übungsaufgaben-Typen (mit genauen Blatt-/Aufgabennummern, z.B. 'Übungsblatt 3, Aufgabe 2').
   - 'exams' enthält die Fragestellungen aus Altklausuren (mit genauen Klausur-/Aufgabenangaben, z.B. 'Klausur WS23, Aufgabe 4') sowie eine Klassifizierung 'type' ("APPLICATION" für praktische/Anwendungsaufgaben oder "ROTE_LEARNING" für reine Theorie-/Auswendiglernfragen).
3. VERLINKUNG: Bestimme für jeden Quellverweis in 'sources' die genaue Start-Seitennummer im Dokument (als Integer-Wert im Feld 'page', z.B. 12). Falls du sie nicht bestimmen kannst, lasse das Feld 'page' leer. Verwende dafür ausschließlich die exakten Datei-IDs aus dieser Liste der Dateizuordnungen:
${JSON.stringify(fileIdMappings, null, 2)}
4. SPRACHE: Halte dich strikt an die Originalsprache der Dokumente. Wenn die Vorlesungsfolien, Übungen oder Klausuren auf Englisch sind, erstelle die Themennamen (name), Unterthemen (subtopics), Übungsbeschreibungen (exercises) und Klausurfragen (exams) ebenfalls auf Englisch! Übersetze sie NICHT ins Deutsche, es sei denn, die Dokumente selbst sind auf Deutsch. Die Sprache des Outputs soll der Sprache des Inputs entsprechen.

Gib das Ergebnis ausschließlich als valides JSON-Array zurück, das der geforderten Schema-Struktur entspricht.
`;

    contents.push(systemInstruction);

    console.log(`[AI Pipeline] Sending unified analysis request to model ${modelName}...`);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: synthesizerSchema,
      }
    });

    if (response.text) {
      console.log(`[AI Pipeline] Analysis successful! Extracted topics.`);
      const parsedTopics = JSON.parse(response.text) as ConsolidatedTopic[];
      
      if (parsedTopics.length === 0) {
        throw new Error("Das AI-Modell hat 0 Themen zurückgegeben. Bitte lade aussagekräftigere Dateien hoch.");
      }
      
      return parsedTopics;
    } else {
      throw new Error("Keine Antwort vom AI-Modell erhalten.");
    }

  } catch (error: any) {
    console.error("[AI Pipeline] Error in AI pipeline execution:", error);
    throw new Error(error.message || "Fehler bei der AI-Analyse. Bitte überprüfen Sie Ihre API-Quota oder versuchen Sie es später erneut.");
  } finally {
    // 3. Cleanup files from Gemini Files API
    if (uploadedFilesToCleanup.length > 0) {
      console.log(`[AI Pipeline] Cleaning up ${uploadedFilesToCleanup.length} files from Gemini Files API...`);
      for (const fileName of uploadedFilesToCleanup) {
        try {
          await ai.files.delete({ name: fileName });
          console.log(`[AI Pipeline] Cleaned up Gemini file: ${fileName}`);
        } catch (cleanupError) {
          console.error(`[AI Pipeline] Failed to delete Gemini file ${fileName}:`, cleanupError);
        }
      }
    }
  }
}

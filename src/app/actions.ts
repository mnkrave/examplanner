"use server";

import { prisma } from "@/lib/db";
import { runMultiAgentAnalysis, ConsolidatedTopic } from "@/lib/agents";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export interface SubjectListItem {
  id: string;
  name: string;
  filesCount: number;
  topicsCount: number;
  progress: number; // calculated readiness percentage
  createdAt: string;
}

// Helper to calculate progress percentage based on topic statuses
// Green = 100%, Yellow = 50%, Red = 0%
function calculateProgress(topics: { status: string }[]): number {
  if (topics.length === 0) return 0;
  let totalScore = 0;
  for (const topic of topics) {
    if (topic.status === "GREEN") totalScore += 1.0;
    else if (topic.status === "YELLOW") totalScore += 0.5;
  }
  return Math.round((totalScore / topics.length) * 100);
}

// Helper to get authenticated user ID or throw error
async function getRequiredSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user.id) {
    throw new Error("Nicht autorisiert. Bitte melde dich an.");
  }
  return session.user.id;
}

/**
 * Update the user's custom Gemini API Key
 */
export async function updateGeminiApiKey(key: string) {
  try {
    const userId = await getRequiredSession();
    await prisma.user.update({
      where: { id: userId },
      data: { geminiApiKey: key ? key.trim() : null }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating Gemini API key:", error);
    throw new Error(error.message || "Fehler beim Speichern des API-Keys");
  }
}

/**
 * Fetch the user's custom Gemini API Key status
 */
export async function getGeminiApiKey() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true }
    });
    
    return user?.geminiApiKey || null;
  } catch (error) {
    console.error("Error reading Gemini API key:", error);
    return null;
  }
}

/**
 * Fetch all subjects with file/topic counts and progress (scoped to user)
 */
export async function getSubjects(): Promise<SubjectListItem[]> {
  try {
    const userId = await getRequiredSession();
    const subjects = await prisma.subject.findMany({
      where: {
        OR: [
          { userId },
          { userId: null } // allow migration of legacy subjects
        ]
      },
      include: {
        _count: {
          select: { files: true, topics: true }
        },
        topics: {
          select: { status: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return subjects.map((sub) => ({
      id: sub.id,
      name: sub.name,
      filesCount: sub._count.files,
      topicsCount: sub._count.topics,
      progress: calculateProgress(sub.topics),
      createdAt: sub.createdAt.toISOString()
    }));
  } catch (error) {
    console.error("Error fetching subjects:", error);
    throw new Error("Fehler beim Laden der Fächer");
  }
}

/**
 * Create a new subject (scoped to user)
 */
export async function createSubject(name: string) {
  if (!name || name.trim() === "") {
    throw new Error("Name des Fachs darf nicht leer sein");
  }
  try {
    const userId = await getRequiredSession();
    const newSubject = await prisma.subject.create({
      data: { 
        name: name.trim(),
        userId
      }
    });
    revalidatePath("/");
    return {
      id: newSubject.id,
      name: newSubject.name,
      createdAt: newSubject.createdAt.toISOString(),
      updatedAt: newSubject.updatedAt.toISOString()
    };
  } catch (error) {
    console.error("Error creating subject:", error);
    throw new Error("Fehler beim Erstellen des Fachs");
  }
}

/**
 * Delete a subject (scoped to user)
 */
export async function deleteSubject(id: string) {
  try {
    const userId = await getRequiredSession();
    
    // Check ownership
    const subject = await prisma.subject.findFirst({
      where: {
        id,
        OR: [{ userId }, { userId: null }]
      }
    });

    if (!subject) {
      throw new Error("Fach nicht gefunden oder nicht autorisiert");
    }

    await prisma.subject.delete({
      where: { id }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting subject:", error);
    throw new Error(error.message || "Fehler beim Löschen des Fachs");
  }
}

/**
 * Fetch a single subject with files and topics (scoped to user)
 */
export async function getSubjectDetail(id: string) {
  try {
    const userId = await getRequiredSession();
    const subject = await prisma.subject.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { userId: null }
        ]
      },
      include: {
        files: {
          select: {
            id: true,
            name: true,
            type: true,
            mimeType: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" }
        },
        topics: {
          orderBy: [{ status: "asc" }, { name: "asc" }]
        }
      }
    });

    if (!subject) return null;

    return {
      id: subject.id,
      name: subject.name,
      createdAt: subject.createdAt.toISOString(),
      updatedAt: subject.updatedAt.toISOString(),
      files: subject.files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        mimeType: f.mimeType,
        createdAt: f.createdAt.toISOString()
      })),
      topics: subject.topics.map(t => {
        let parsedSources = [];
        let parsedSubtopics = [];
        let parsedExercises = [];
        let parsedExams = [];
        try { parsedSources = JSON.parse(t.sources); } catch(e){}
        try { parsedSubtopics = JSON.parse(t.subtopics); } catch(e){}
        try { parsedExercises = JSON.parse(t.exercises); } catch(e){}
        try { parsedExams = JSON.parse(t.exams); } catch(e){}

        return {
          id: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          status: t.status,
          difficulty: t.difficulty,
          sources: parsedSources,
          subtopics: parsedSubtopics,
          exercises: parsedExercises,
          exams: parsedExams,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString()
        };
      }),
      progress: calculateProgress(subject.topics)
    };
  } catch (error) {
    console.error("Error fetching subject details:", error);
    throw new Error("Fehler beim Laden des Fachs");
  }
}

/**
 * Upload a file as base64 string (scoped to user)
 */
export async function uploadFile(formData: FormData) {
  try {
    const userId = await getRequiredSession();
    const subjectId = formData.get("subjectId") as string;
    const type = formData.get("type") as "SLIDES" | "EXERCISES" | "EXAMS";
    const file = formData.get("file") as File;

    if (!file || !subjectId || !type) {
      throw new Error("Fehlende Upload-Daten");
    }

    // Verify ownership of the subject
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        OR: [{ userId }, { userId: null }]
      }
    });

    if (!subject) {
      throw new Error("Fach nicht gefunden oder nicht autorisiert");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const name = file.name;
    const mimeType = file.type;

    const newFile = await prisma.file.create({
      data: {
        subjectId,
        name,
        type,
        mimeType,
        base64
      }
    });

    revalidatePath(`/subjects/${subjectId}`);
    return {
      id: newFile.id,
      name: newFile.name,
      type: newFile.type,
      mimeType: newFile.mimeType,
      createdAt: newFile.createdAt.toISOString()
    };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    throw new Error(error.message || "Fehler beim Hochladen der Datei");
  }
}

/**
 * Upload a file directly from Google Drive using user's access token
 */
export async function uploadFileFromDrive(
  subjectId: string,
  fileId: string,
  fileName: string,
  mimeType: string,
  type: "SLIDES" | "EXERCISES" | "EXAMS"
) {
  try {
    const userId = await getRequiredSession();
    
    // 1. Verify subject ownership
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        OR: [{ userId }, { userId: null }]
      }
    });

    if (!subject) {
      throw new Error("Fach nicht gefunden oder nicht autorisiert");
    }

    // 2. Fetch session to get OAuth accessToken
    const session = await getServerSession(authOptions);
    const accessToken = (session as any)?.accessToken;

    if (!accessToken) {
      throw new Error("Kein Google Drive Zugriffstoken vorhanden. Bitte melde dich erneut mit Google an.");
    }

    // 3. Download file from Google Drive API
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google Drive download failed:", errText);
      throw new Error("Download von Google Drive fehlgeschlagen. Bitte überprüfe die Berechtigungen.");
    }

    // 4. Read response as base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // 5. Store in database
    const newFile = await prisma.file.create({
      data: {
        subjectId,
        name: fileName,
        type,
        mimeType,
        base64
      }
    });

    revalidatePath(`/subjects/${subjectId}`);
    return {
      id: newFile.id,
      name: newFile.name,
      type: newFile.type,
      mimeType: newFile.mimeType,
      createdAt: newFile.createdAt.toISOString()
    };
  } catch (error: any) {
    console.error("Error uploading file from Google Drive:", error);
    throw new Error(error.message || "Fehler beim Laden aus Google Drive");
  }
}


/**
 * Delete a file (scoped to user)
 */
export async function deleteFile(subjectId: string, fileId: string) {
  try {
    const userId = await getRequiredSession();
    
    // Check subject ownership
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        OR: [{ userId }, { userId: null }]
      }
    });

    if (!subject) {
      throw new Error("Fach nicht gefunden oder nicht autorisiert");
    }

    await prisma.file.delete({
      where: { id: fileId }
    });
    revalidatePath(`/subjects/${subjectId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting file:", error);
    throw new Error(error.message || "Fehler beim Löschen der Datei");
  }
}

/**
 * Toggle the status of a topic (scoped to user)
 */
export async function toggleTopicStatus(subjectId: string, topicId: string, status: "RED" | "YELLOW" | "GREEN") {
  try {
    const userId = await getRequiredSession();
    
    // Check subject ownership
    const subject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        OR: [{ userId }, { userId: null }]
      }
    });

    if (!subject) {
      throw new Error("Fach nicht gefunden oder nicht autorisiert");
    }

    const updatedTopic = await prisma.topic.update({
      where: { id: topicId },
      data: { status }
    });
    
    revalidatePath(`/subjects/${subjectId}`);
    revalidatePath("/");
    return {
      id: updatedTopic.id,
      name: updatedTopic.name,
      category: updatedTopic.category,
      description: updatedTopic.description,
      status: updatedTopic.status,
      difficulty: updatedTopic.difficulty,
      sources: updatedTopic.sources,
      createdAt: updatedTopic.createdAt.toISOString(),
      updatedAt: updatedTopic.updatedAt.toISOString()
    };
  } catch (error: any) {
    console.error("Error updating topic status:", error);
    throw new Error(error.message || "Fehler beim Aktualisieren des Status");
  }
}

/**
 * Run the Multi-Agent AI Analysis on the subject's uploaded files (scoped to user and using user API key)
 */
export async function analyzeSubject(subjectId: string) {
  try {
    const userId = await getRequiredSession();

    // 1. Fetch subject and check ownership
    const subject = await prisma.subject.findFirst({
      where: { 
        id: subjectId,
        OR: [
          { userId },
          { userId: null }
        ]
      },
      include: { files: true }
    });

    if (!subject) {
      throw new Error("Fach nicht gefunden oder nicht autorisiert");
    }

    if (subject.files.length === 0) {
      throw new Error("Bitte lade zuerst mindestens eine Datei hoch");
    }

    // Fetch user's custom API key
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { geminiApiKey: true }
    });

    // 2. Group files by type
    const slides = subject.files.filter(f => f.type === "SLIDES");
    const exercises = subject.files.filter(f => f.type === "EXERCISES");
    const exams = subject.files.filter(f => f.type === "EXAMS");

    // 3. Run the AI pipeline
    const consolidatedTopics: ConsolidatedTopic[] = await runMultiAgentAnalysis(
      slides,
      exercises,
      exams,
      dbUser?.geminiApiKey
    );

    // 4. Delete existing topics for this subject
    await prisma.topic.deleteMany({
      where: { subjectId }
    });

    // 5. Create new topics in database
    if (consolidatedTopics.length > 0) {
      await prisma.topic.createMany({
        data: consolidatedTopics.map((topic) => ({
          subjectId,
          name: topic.name,
          category: topic.category,
          description: topic.description,
          status: "RED", // default new topics to RED
          difficulty: topic.difficulty,
          sources: JSON.stringify(topic.sources),
          subtopics: JSON.stringify(topic.subtopics),
          exercises: JSON.stringify(topic.exercises),
          exams: JSON.stringify(topic.exams)
        }))
      });
    }

    revalidatePath(`/subjects/${subjectId}`);
    revalidatePath("/");
    return { success: true, count: consolidatedTopics.length };
  } catch (error: any) {
    console.error("Error analyzing subject:", error);
    throw new Error(error.message || "Fehler bei der AI-Analyse");
  }
}

/**
 * Fetch all whitelisted emails (Admin only)
 */
export async function getWhitelistedEmails(): Promise<string[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      throw new Error("Nicht autorisiert. Nur Admins können die Whitelist einsehen.");
    }
    const emails = await prisma.whitelistedEmail.findMany({
      orderBy: { email: "asc" }
    });
    return emails.map(e => e.email);
  } catch (error: any) {
    console.error("Error fetching whitelist:", error);
    throw new Error(error.message || "Fehler beim Laden der Whitelist");
  }
}

/**
 * Add an email to the whitelist (Admin only)
 */
export async function addWhitelistedEmail(email: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      throw new Error("Nicht autorisiert. Nur Admins können die Whitelist bearbeiten.");
    }
    if (!email || !email.trim()) {
      throw new Error("Email darf nicht leer sein.");
    }
    const emailLower = email.trim().toLowerCase();
    
    // Check if already whitelisted
    const exists = await prisma.whitelistedEmail.findUnique({
      where: { email: emailLower }
    });
    if (exists) {
      throw new Error("Diese Email ist bereits whitelisted.");
    }

    await prisma.whitelistedEmail.create({
      data: { email: emailLower }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error adding to whitelist:", error);
    throw new Error(error.message || "Fehler beim Hinzufügen zur Whitelist");
  }
}

/**
 * Remove an email from the whitelist (Admin only)
 */
export async function removeWhitelistedEmail(email: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      throw new Error("Nicht autorisiert. Nur Admins können die Whitelist bearbeiten.");
    }
    const emailLower = email.trim().toLowerCase();
    if (emailLower === "lukasreinle0@gmail.com") {
      throw new Error("Der Super-Admin kann nicht von der Whitelist entfernt werden.");
    }

    await prisma.whitelistedEmail.delete({
      where: { email: emailLower }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error removing from whitelist:", error);
    throw new Error(error.message || "Fehler beim Entfernen von der Whitelist");
  }
}


import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import * as fs from "fs";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, tasks, subtasks, contacts, delegationNotes, userStats, teamInvites, teamMembers } from "@shared/schema";
import { eq, and, inArray, or } from "drizzle-orm";

const upload = multer({ 
  dest: "/tmp/audio-uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  async function transcribeWithGroq(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not configured");

    const formData = new FormData();
    const uint8Array = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    formData.append("file", blob, "audio.m4a");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq error:", response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    return result.text || "";
  }

  async function transcribeWithOpenAI(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const formData = new FormData();
    const uint8Array = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    formData.append("file", blob, "audio.m4a");
    formData.append("model", "whisper-1");
    formData.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.text || "";
  }

  app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioFilePath = req.file.path;
      const audioBuffer = fs.readFileSync(audioFilePath);
      const mimeType = req.file.mimetype || "audio/m4a";
      
      console.log("Transcribing audio, size:", audioBuffer.length, "bytes");

      let transcript = "";
      let usedProvider = "";

      // Try Groq first (free tier), fallback to OpenAI
      try {
        if (process.env.GROQ_API_KEY) {
          transcript = await transcribeWithGroq(audioBuffer, mimeType);
          usedProvider = "Groq";
        } else {
          throw new Error("Groq not configured, using fallback");
        }
      } catch (groqError) {
        console.log("Groq failed, falling back to OpenAI:", groqError);
        transcript = await transcribeWithOpenAI(audioBuffer, mimeType);
        usedProvider = "OpenAI";
      }

      console.log(`Transcription via ${usedProvider}:`, transcript.substring(0, 100));

      fs.unlink(audioFilePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
      
      res.json({ text: transcript });
    } catch (error: any) {
      console.error("Transcription error:", error);
      
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }

      if (error.status === 401) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/tasks/extract", async (req: Request, res: Response) => {
    try {
      const { transcript } = req.body;

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }

      if (transcript.trim().length === 0) {
        return res.json({ tasks: [] });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OPENAI_API_KEY not configured");
        return res.status(500).json({ error: "AI service not configured" });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a task extraction assistant for an ADHD productivity app. Your job is to extract actionable tasks from natural speech.

Rules:
1. Extract only clear, actionable tasks (things someone can DO)
2. Convert each task to a concise, imperative title (e.g., "Call mom", "Buy groceries", "Schedule dentist appointment")
3. Ignore filler words, thinking out loud, questions, and non-actionable statements
4. If someone mentions timing (tomorrow, next week, etc.), don't include it in the title - just extract the core task
5. Split compound tasks into separate items (e.g., "call mom and dad" becomes two tasks)
6. If no clear tasks are found, return an empty array

Return JSON in this exact format:
{"tasks": [{"title": "Task title here"}]}

Examples:
Input: "I need to call my mom tomorrow and also I was thinking maybe I should clean the garage"
Output: {"tasks": [{"title": "Call mom"}, {"title": "Clean garage"}]}

Input: "So yeah, it's been a long day, not sure what to do"
Output: {"tasks": []}

Input: "Pick up the dry cleaning, oh and get milk, and I should probably email Sarah about the meeting"
Output: {"tasks": [{"title": "Pick up dry cleaning"}, {"title": "Get milk"}, {"title": "Email Sarah about meeting"}]}`
            },
            {
              role: "user",
              content: transcript
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI error:", response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        return res.json({ tasks: [] });
      }

      try {
        const parsed = JSON.parse(content);
        const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        res.json({ tasks: tasks.filter((t: any) => t.title && typeof t.title === "string") });
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        res.json({ tasks: [] });
      }
    } catch (error: any) {
      console.error("Task extraction error:", error);
      res.status(500).json({ error: "Failed to extract tasks" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      const result = await db.insert(users).values({
        email: normalizedEmail,
        passwordHash,
      }).returning();
      
      const user = result[0];
      
      await db.insert(userStats).values({
        userId: user.id,
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email,
          createdAt: user.createdAt,
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      
      if (existing.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const user = existing[0];
      
      if (!user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email,
          createdAt: user.createdAt,
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      
      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      
      const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (existing.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const user = existing[0];
      
      if (!user.passwordHash) {
        return res.status(400).json({ error: "Cannot change password for this account" });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      
      if (existing.length === 0) {
        return res.json({ success: true, message: "If an account exists with this email, you will receive a reset code" });
      }
      
      const user = existing[0];
      
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);
      
      await db.update(users).set({
        resetToken: resetCode,
        resetTokenExpiry: resetExpiry,
      }).where(eq(users.id, user.id));
      
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error("SENDGRID_API_KEY not configured");
        return res.status(500).json({ error: "Email service not configured" });
      }
      
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: normalizedEmail }],
            },
          ],
          from: { email: "info@simplenow.co", name: "I Get It Done" },
          subject: "I Get It Done - Password Reset Code",
          content: [
            {
              type: "text/plain",
              value: `Your password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nIf you did not request this reset, please ignore this email.`,
            },
            {
              type: "text/html",
              value: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #FF3B30;">Password Reset Code</h2>
                <p>Your password reset code is:</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333; background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">${resetCode}</p>
                <p style="color: #666;">This code expires in 15 minutes.</p>
                <p style="color: #999; font-size: 12px;">If you did not request this reset, please ignore this email.</p>
              </div>`,
            },
          ],
        }),
      });
      
      if (response.status !== 202 && !response.ok) {
        const errorText = await response.text();
        console.error("SendGrid error:", response.status, errorText);
        return res.status(500).json({ error: "Failed to send reset email" });
      }
      
      res.json({ success: true, message: "Reset code sent to your email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedCode = code.toString().trim();
      
      console.log("Reset password attempt:", { email: normalizedEmail, codeProvided: normalizedCode });
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      
      if (existing.length === 0) {
        console.log("Reset password: User not found for email:", normalizedEmail);
        return res.status(400).json({ error: "Invalid reset code" });
      }
      
      const user = existing[0];
      
      console.log("Reset password: DB token:", user.resetToken, "Provided:", normalizedCode, "Match:", user.resetToken === normalizedCode);
      
      if (!user.resetToken || user.resetToken !== normalizedCode) {
        return res.status(400).json({ error: "Invalid reset code" });
      }
      
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        console.log("Reset password: Token expired. Expiry:", user.resetTokenExpiry, "Now:", new Date());
        return res.status(400).json({ error: "Reset code has expired. Please request a new code." });
      }
      
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      await db.update(users).set({
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiry: null,
      }).where(eq(users.id, user.id));
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/support/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;
      
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required" });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }
      
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error("SENDGRID_API_KEY not configured");
        return res.status(500).json({ error: "Email service not configured" });
      }
      
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: "info@simplenow.co" }],
            },
          ],
          from: { email: "info@simplenow.co", name: "I Get It Done Support" },
          reply_to: { email: email, name: name },
          subject: `Support Request from ${name}`,
          content: [
            {
              type: "text/plain",
              value: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            },
            {
              type: "text/html",
              value: `<h2>Support Request</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><hr><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
            },
          ],
        }),
      });
      
      if (response.status !== 202 && !response.ok) {
        const errorText = await response.text();
        console.error("SendGrid error:", response.status, errorText);
        return res.status(500).json({ error: "Failed to send message" });
      }
      
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Support contact error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/users/init", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      
      let user = null;
      if (deviceId) {
        const existing = await db.select().from(users).where(eq(users.deviceId, deviceId)).limit(1);
        if (existing.length > 0) {
          user = existing[0];
        }
      }
      
      if (!user) {
        const result = await db.insert(users).values({
          deviceId: deviceId || null,
          email: null,
        }).returning();
        user = result[0];
        
        await db.insert(userStats).values({
          userId: user.id,
        });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("User init error:", error);
      res.status(500).json({ error: "Failed to initialize user" });
    }
  });

  app.get("/api/tasks/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
      
      const taskIds = userTasks.map(t => t.id);
      let taskSubtasks: any[] = [];
      let taskNotes: any[] = [];
      
      if (taskIds.length > 0) {
        taskSubtasks = await db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds));
        taskNotes = await db.select().from(delegationNotes).where(inArray(delegationNotes.taskId, taskIds));
      }
      
      const tasksWithDetails = userTasks.map(task => ({
        ...task,
        subtasks: taskSubtasks.filter(st => st.taskId === task.id),
        delegationNotes: taskNotes.filter(n => n.taskId === task.id),
      }));
      
      res.json({ tasks: tasksWithDetails });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const { id, userId, title, notes, lane, reminderType, dueDate, assignedTo } = req.body;
      
      const taskValues: any = {
        userId,
        title,
        notes: notes || null,
        lane: lane || "now",
        reminderType: reminderType || "soft",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null,
      };
      
      if (id) {
        taskValues.id = id;
      }
      
      const result = await db.insert(tasks).values(taskValues).returning();
      
      res.json({ task: { ...result[0], subtasks: [], delegationNotes: [] } });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const existingTask = await db.select().from(tasks).where(eq(tasks.id, id));
      const wasCompleted = existingTask.length > 0 && existingTask[0].completedAt !== null;
      const isBeingCompleted = updates.completedAt && !wasCompleted;
      
      if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
      if (updates.completedAt) updates.completedAt = new Date(updates.completedAt);
      if (updates.delegatedAt) updates.delegatedAt = new Date(updates.delegatedAt);
      if (updates.lastDelegationUpdate) updates.lastDelegationUpdate = new Date(updates.lastDelegationUpdate);
      
      delete updates.subtasks;
      delete updates.delegationNotes;
      delete updates.createdAt;
      
      const result = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      if (isBeingCompleted && existingTask[0].userId) {
        const userId = existingTask[0].userId;
        const existingStats = await db.select().from(userStats).where(eq(userStats.userId, userId));
        
        const today = new Date().toISOString().split('T')[0];
        
        if (existingStats.length > 0) {
          const stats = existingStats[0];
          const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate).toISOString().split('T')[0] : null;
          
          let newStreak = stats.currentStreak || 0;
          if (lastActive !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (lastActive === yesterdayStr) {
              newStreak = (stats.currentStreak || 0) + 1;
            } else {
              newStreak = 1;
            }
          }
          
          const newPoints = (stats.points || 0) + 10;
          const newTotalCompleted = (stats.totalTasksCompleted || 0) + 1;
          const newLongestStreak = Math.max(stats.longestStreak || 0, newStreak);
          
          let newLevel = 'starter';
          if (newPoints >= 1000) newLevel = 'master';
          else if (newPoints >= 500) newLevel = 'expert';
          else if (newPoints >= 200) newLevel = 'focused';
          else if (newPoints >= 100) newLevel = 'achiever';
          
          await db.update(userStats).set({
            points: newPoints,
            totalTasksCompleted: newTotalCompleted,
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
            level: newLevel,
            lastActiveDate: today,
          }).where(eq(userStats.userId, userId));
        } else {
          await db.insert(userStats).values({
            userId,
            points: 10,
            totalTasksCompleted: 1,
            currentStreak: 1,
            longestStreak: 1,
            level: 'starter',
            lastActiveDate: today,
          });
        }
      }
      
      res.json({ task: result[0] });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(tasks).where(eq(tasks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.post("/api/subtasks", async (req: Request, res: Response) => {
    try {
      const { id, taskId, title } = req.body;
      
      const subtaskValues: any = {
        taskId,
        title,
        completed: false,
      };
      
      if (id) {
        subtaskValues.id = id;
      }
      
      const result = await db.insert(subtasks).values(subtaskValues).returning();
      
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Create subtask error:", error);
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });

  app.put("/api/subtasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { completed, title } = req.body;
      
      const updates: any = {};
      if (completed !== undefined) updates.completed = completed;
      if (title !== undefined) updates.title = title;
      
      const result = await db.update(subtasks).set(updates).where(eq(subtasks.id, id)).returning();
      
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Update subtask error:", error);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  app.delete("/api/subtasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(subtasks).where(eq(subtasks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subtask error:", error);
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });

  app.get("/api/contacts/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const userContacts = await db.select().from(contacts).where(eq(contacts.userId, userId));
      res.json({ contacts: userContacts });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", async (req: Request, res: Response) => {
    try {
      const { id, userId, name, role, color } = req.body;
      
      const contactValues: any = {
        userId,
        name,
        role: role || null,
        color: color || "#007AFF",
      };
      
      if (id) {
        contactValues.id = id;
      }
      
      const result = await db.insert(contacts).values(contactValues).returning();
      
      res.json({ contact: result[0] });
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(contacts).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.put("/api/users/:id/push-token", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pushToken, notificationsEnabled } = req.body;
      
      const updates: any = {};
      if (pushToken !== undefined) updates.pushToken = pushToken;
      if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
      
      const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ user: result[0] });
    } catch (error) {
      console.error("Update push token error:", error);
      res.status(500).json({ error: "Failed to update push token" });
    }
  });

  app.get("/api/stats/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const stats = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
      
      if (stats.length === 0) {
        const result = await db.insert(userStats).values({ userId }).returning();
        return res.json({ stats: result[0] });
      }
      
      res.json({ stats: stats[0] });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.put("/api/stats/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      delete updates.id;
      delete updates.userId;
      
      if (updates.lastActiveDate) updates.lastActiveDate = updates.lastActiveDate;
      
      const result = await db.update(userStats).set(updates).where(eq(userStats.userId, userId)).returning();
      
      if (result.length === 0) {
        const inserted = await db.insert(userStats).values({ userId, ...updates }).returning();
        return res.json({ stats: inserted[0] });
      }
      
      res.json({ stats: result[0] });
    } catch (error) {
      console.error("Update stats error:", error);
      res.status(500).json({ error: "Failed to update stats" });
    }
  });

  app.post("/api/sync", async (req: Request, res: Response) => {
    try {
      const { userId, tasks: clientTasks, contacts: clientContacts, stats: clientStats } = req.body;
      
      for (const task of clientTasks || []) {
        const existing = await db.select().from(tasks).where(eq(tasks.id, task.id)).limit(1);
        
        if (existing.length === 0) {
          await db.insert(tasks).values({
            id: task.id,
            userId,
            title: task.title,
            notes: task.notes || null,
            lane: task.lane,
            reminderType: task.reminderType || "soft",
            focusTimeMinutes: task.focusTimeMinutes || 0,
            isOverdue: task.isOverdue || false,
            createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            assignedTo: task.assignedTo || null,
            delegationStatus: task.delegationStatus || null,
            delegatedAt: task.delegatedAt ? new Date(task.delegatedAt) : null,
            lastDelegationUpdate: task.lastDelegationUpdate ? new Date(task.lastDelegationUpdate) : null,
          });
          
          for (const st of task.subtasks || []) {
            await db.insert(subtasks).values({
              id: st.id,
              taskId: task.id,
              title: st.title,
              completed: st.completed || false,
            }).onConflictDoNothing();
          }
          
          for (const note of task.delegationNotes || []) {
            await db.insert(delegationNotes).values({
              id: note.id,
              taskId: task.id,
              type: note.type,
              text: note.text || null,
              createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
            }).onConflictDoNothing();
          }
        }
      }
      
      for (const contact of clientContacts || []) {
        const existing = await db.select().from(contacts).where(eq(contacts.id, contact.id)).limit(1);
        
        if (existing.length === 0) {
          await db.insert(contacts).values({
            id: contact.id,
            userId,
            name: contact.name,
            role: contact.role || null,
            color: contact.color || "#007AFF",
            createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
          });
        }
      }
      
      if (clientStats) {
        await db.insert(userStats).values({
          userId,
          ...clientStats,
          lastActiveDate: clientStats.lastActiveDate || null,
        }).onConflictDoUpdate({
          target: userStats.userId,
          set: clientStats,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  function generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  app.put("/api/users/:id/display-name", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { displayName } = req.body;
      
      const result = await db.update(users).set({ displayName }).where(eq(users.id, id)).returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ user: { id: result[0].id, email: result[0].email, displayName: result[0].displayName } });
    } catch (error) {
      console.error("Update display name error:", error);
      res.status(500).json({ error: "Failed to update display name" });
    }
  });

  app.post("/api/team/invite", async (req: Request, res: Response) => {
    try {
      const { inviterId, inviteeEmail } = req.body;
      
      let inviteCode = generateInviteCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db.select().from(teamInvites).where(eq(teamInvites.inviteCode, inviteCode)).limit(1);
        if (existing.length === 0) break;
        inviteCode = generateInviteCode();
        attempts++;
      }
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const result = await db.insert(teamInvites).values({
        inviteCode,
        inviterId,
        inviteeEmail: inviteeEmail || null,
        status: "pending",
        expiresAt,
      }).returning();
      
      res.json({ invite: result[0] });
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/team/invites/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const sentInvites = await db.select().from(teamInvites).where(
        and(eq(teamInvites.inviterId, userId), eq(teamInvites.status, "pending"))
      );
      
      const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const userEmail = userRecord[0]?.email;
      
      let receivedInvites: any[] = [];
      if (userEmail) {
        const invites = await db.select().from(teamInvites).where(
          and(eq(teamInvites.inviteeEmail, userEmail), eq(teamInvites.status, "pending"))
        );
        
        for (const invite of invites) {
          const inviter = await db.select().from(users).where(eq(users.id, invite.inviterId!)).limit(1);
          receivedInvites.push({
            ...invite,
            inviterEmail: inviter[0]?.email,
            inviterName: inviter[0]?.displayName,
          });
        }
      }
      
      res.json({ sentInvites, receivedInvites });
    } catch (error) {
      console.error("Get invites error:", error);
      res.status(500).json({ error: "Failed to get invites" });
    }
  });

  app.post("/api/team/invite/accept", async (req: Request, res: Response) => {
    try {
      const { inviteCode, userId } = req.body;
      
      const inviteResult = await db.select().from(teamInvites).where(eq(teamInvites.inviteCode, inviteCode)).limit(1);
      
      if (inviteResult.length === 0) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      const invite = inviteResult[0];
      
      if (invite.status !== "pending") {
        return res.status(400).json({ error: "Invite is no longer valid" });
      }
      
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }
      
      if (invite.inviterId === userId) {
        return res.status(400).json({ error: "Cannot accept your own invite" });
      }
      
      const existingRelation = await db.select().from(teamMembers).where(
        or(
          and(eq(teamMembers.userId, invite.inviterId!), eq(teamMembers.teammateId, userId)),
          and(eq(teamMembers.userId, userId), eq(teamMembers.teammateId, invite.inviterId!))
        )
      ).limit(1);
      
      if (existingRelation.length > 0) {
        await db.update(teamInvites).set({ status: "accepted" }).where(eq(teamInvites.id, invite.id));
        return res.json({ message: "Already team members", teamMember: existingRelation[0] });
      }
      
      const colors = ["#FF3B30", "#FF9500", "#007AFF", "#AF52DE", "#34C759", "#5856D6"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const inviterUser = await db.select().from(users).where(eq(users.id, invite.inviterId!)).limit(1);
      const acceptingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      await db.insert(teamMembers).values({
        userId: invite.inviterId!,
        teammateId: userId,
        nickname: acceptingUser[0]?.displayName || acceptingUser[0]?.email?.split("@")[0] || "Teammate",
        color: randomColor,
      });
      
      const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
      const result = await db.insert(teamMembers).values({
        userId: userId,
        teammateId: invite.inviterId!,
        nickname: inviterUser[0]?.displayName || inviterUser[0]?.email?.split("@")[0] || "Teammate",
        color: randomColor2,
      }).returning();
      
      await db.update(teamInvites).set({ status: "accepted" }).where(eq(teamInvites.id, invite.id));
      
      res.json({ teamMember: result[0] });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.post("/api/team/invite/decline", async (req: Request, res: Response) => {
    try {
      const { inviteId } = req.body;
      
      await db.update(teamInvites).set({ status: "declined" }).where(eq(teamInvites.id, inviteId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Decline invite error:", error);
      res.status(500).json({ error: "Failed to decline invite" });
    }
  });

  app.get("/api/team/members/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const members = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
      
      const membersWithDetails: any[] = [];
      for (const member of members) {
        const teammate = await db.select().from(users).where(eq(users.id, member.teammateId!)).limit(1);
        if (teammate[0]) {
          membersWithDetails.push({
            ...member,
            teammateEmail: teammate[0].email,
            teammateName: teammate[0].displayName || teammate[0].email?.split("@")[0],
          });
        }
      }
      
      res.json({ members: membersWithDetails });
    } catch (error) {
      console.error("Get team members error:", error);
      res.status(500).json({ error: "Failed to get team members" });
    }
  });

  app.delete("/api/team/members/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const member = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
      if (member.length === 0) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      await db.delete(teamMembers).where(eq(teamMembers.id, id));
      
      await db.delete(teamMembers).where(
        and(
          eq(teamMembers.userId, member[0].teammateId!),
          eq(teamMembers.teammateId, userId)
        )
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Remove team member error:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  app.get("/api/delegated-to-me/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const delegatedTasks = await db.select().from(tasks).where(
        and(
          eq(tasks.delegatedToUserId, userId),
          eq(tasks.completedAt, null as any)
        )
      );
      
      const taskIds = delegatedTasks.map(t => t.id);
      let taskSubtasks: any[] = [];
      let taskNotes: any[] = [];
      
      if (taskIds.length > 0) {
        taskSubtasks = await db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds));
        taskNotes = await db.select().from(delegationNotes).where(inArray(delegationNotes.taskId, taskIds));
      }
      
      const tasksWithDetails = await Promise.all(delegatedTasks.map(async (task) => {
        const owner = await db.select().from(users).where(eq(users.id, task.userId!)).limit(1);
        return {
          ...task,
          subtasks: taskSubtasks.filter(s => s.taskId === task.id),
          delegationNotes: taskNotes.filter(n => n.taskId === task.id),
          ownerName: owner[0]?.displayName || owner[0]?.email?.split("@")[0] || "Unknown",
          ownerEmail: owner[0]?.email,
        };
      }));
      
      res.json({ tasks: tasksWithDetails });
    } catch (error) {
      console.error("Get delegated tasks error:", error);
      res.status(500).json({ error: "Failed to get delegated tasks" });
    }
  });

  app.put("/api/delegation-status/:taskId", async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const { userId, status, note } = req.body;
      
      const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      
      if (task.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      if (task[0].delegatedToUserId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }
      
      const result = await db.update(tasks).set({
        delegationStatus: status,
        lastDelegationUpdate: new Date(),
      }).where(eq(tasks.id, taskId)).returning();
      
      if (note) {
        await db.insert(delegationNotes).values({
          taskId,
          authorId: userId,
          type: "status_update",
          text: note,
        });
      }
      
      res.json({ task: result[0] });
    } catch (error) {
      console.error("Update delegation status error:", error);
      res.status(500).json({ error: "Failed to update delegation status" });
    }
  });

  app.post("/api/delegation-notes", async (req: Request, res: Response) => {
    try {
      const { taskId, authorId, type, text } = req.body;
      
      const result = await db.insert(delegationNotes).values({
        taskId,
        authorId: authorId || null,
        type,
        text: text || null,
      }).returning();
      
      res.json({ note: result[0] });
    } catch (error) {
      console.error("Create delegation note error:", error);
      res.status(500).json({ error: "Failed to create delegation note" });
    }
  });

  app.delete("/api/account/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      if (!password) {
        return res.status(400).json({ error: "Password is required to delete account" });
      }
      
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const user = userResult[0];
      
      if (!user.passwordHash) {
        return res.status(400).json({ error: "Account cannot be deleted - no password set" });
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid password" });
      }
      
      await db.delete(delegationNotes).where(eq(delegationNotes.authorId, userId));
      await db.delete(subtasks).where(
        inArray(subtasks.taskId, 
          db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId))
        )
      );
      await db.delete(tasks).where(eq(tasks.userId, userId));
      await db.delete(contacts).where(eq(contacts.userId, userId));
      await db.delete(teamMembers).where(
        or(eq(teamMembers.userId, userId), eq(teamMembers.teammateId, userId))
      );
      await db.delete(teamInvites).where(eq(teamInvites.inviterId, userId));
      await db.delete(userStats).where(eq(userStats.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

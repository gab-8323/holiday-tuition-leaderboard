import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Configuration
const supabaseBucket = process.env.SUPABASE_BUCKET || "student-photos";

let supabase: any = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL?.trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
    
    console.log("Initializing Supabase...");
    console.log("URL exists:", !!url, url ? `(${url.substring(0, 10)}...)` : "");
    console.log("Key exists:", !!key, key ? `(${key.substring(0, 5)}...)` : "");

    if (!url || !key) {
      throw new Error("Supabase URL and Key are required. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.");
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

const storage = multer.memoryStorage();
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request Logger
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Helper to upload to Supabase Storage
  const uploadToSupabase = async (file: Express.Multer.File) => {
    const client = getSupabase();
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const { data, error } = await client.storage
      .from(supabaseBucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error("Supabase storage error:", error);
      throw error;
    }

    const { data: { publicUrl } } = client.storage
      .from(supabaseBucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    res.json({ 
      status: "ok", 
      supabaseConfigured: !!(url && key),
      env: process.env.NODE_ENV
    });
  });

  app.get(["/api/data", "/api/data/"], async (req, res) => {
    console.log("GET /api/data");
    try {
      const client = getSupabase();
      const { data: students, error: sError } = await client
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: points, error: pError } = await client
        .from("points")
        .select("*")
        .order("created_at", { ascending: false });

      if (sError || pError) throw sError || pError;

      // Map snake_case to camelCase
      const mappedStudents = (students || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        photo: s.photo,
        createdAt: s.created_at
      }));

      const mappedPoints = (points || []).map((p: any) => ({
        id: p.id,
        studentId: p.student_id,
        points: p.points,
        description: p.description,
        date: p.date,
        createdAt: p.created_at
      }));

      res.json({ students: mappedStudents, points: mappedPoints });
    } catch (error: any) {
      console.error("Error reading data from Supabase:", error);
      res.status(500).json({ error: error.message || "Failed to read data" });
    }
  });

  app.post(["/api/login", "/api/login/"], async (req, res) => {
    const { password } = req.body;
    try {
      const client = getSupabase();
      const { data, error } = await client
        .from("settings")
        .select("value")
        .eq("key", "admin_password")
        .single();

      const adminPassword = data?.value || "admin";
      if (password === adminPassword) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: "Invalid password" });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  app.post(["/api/students", "/api/students/"], upload.single("photo"), async (req, res) => {
    const { name } = req.body;
    try {
      const client = getSupabase();
      let photoUrl = null;
      if (req.file) {
        photoUrl = await uploadToSupabase(req.file);
      }

      const { data, error } = await client
        .from("students")
        .insert([{ name, photo: photoUrl }])
        .select()
        .single();

      if (error) throw error;
      res.json({
        id: data.id,
        name: data.name,
        photo: data.photo,
        createdAt: data.created_at
      });
    } catch (error: any) {
      console.error("Error creating student:", error);
      res.status(500).json({ error: error.message || "Failed to create student" });
    }
  });

  app.put(["/api/students/:id", "/api/students/:id/"], upload.single("photo"), async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
      const client = getSupabase();
      let updateData: any = { name };
      if (req.file) {
        updateData.photo = await uploadToSupabase(req.file);
      }

      const { data, error } = await client
        .from("students")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      res.json({
        id: data.id,
        name: data.name,
        photo: data.photo,
        createdAt: data.created_at
      });
    } catch (error: any) {
      console.error("Error updating student:", error);
      res.status(500).json({ error: error.message || "Failed to update student" });
    }
  });

  app.delete(["/api/students/:id", "/api/students/:id/"], async (req, res) => {
    const { id } = req.params;
    try {
      const client = getSupabase();
      // Points will be deleted by cascade if configured in DB, 
      // but let's be explicit if not.
      await client.from("points").delete().eq("student_id", id);
      const { error } = await client.from("students").delete().eq("id", id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: error.message || "Failed to delete student" });
    }
  });

  app.post(["/api/points", "/api/points/"], async (req, res) => {
    const { studentId, points, description, date } = req.body;
    try {
      const client = getSupabase();
      const { data, error } = await client
        .from("points")
        .insert([{ 
          student_id: studentId, 
          points: parseInt(points), 
          description, 
          date: date || new Date().toISOString() 
        }])
        .select()
        .single();

      if (error) throw error;
      res.json({
        id: data.id,
        studentId: data.student_id,
        points: data.points,
        description: data.description,
        date: data.date,
        createdAt: data.created_at
      });
    } catch (error: any) {
      console.error("Error adding points:", error);
      res.status(500).json({ error: error.message || "Failed to add points" });
    }
  });

  app.delete(["/api/points/:id", "/api/points/:id/"], async (req, res) => {
    const { id } = req.params;
    try {
      const client = getSupabase();
      const { error } = await client.from("points").delete().eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting points:", error);
      res.status(500).json({ error: error.message || "Failed to delete points" });
    }
  });

  app.post(["/api/points/bulk", "/api/points/bulk/"], async (req, res) => {
    const { points: newPoints } = req.body;
    try {
      const client = getSupabase();
      const addedPoints = newPoints
        .filter((p: any) => p.points > 0)
        .map((p: any) => ({
          student_id: p.studentId,
          points: parseInt(p.points),
          description: p.description,
          date: p.date || new Date().toISOString()
        }));

      const { error } = await client.from("points").insert(addedPoints);
      if (error) throw error;
      res.json({ success: true, count: addedPoints.length });
    } catch (error: any) {
      console.error("Error bulk adding points:", error);
      res.status(500).json({ error: error.message || "Failed to bulk add points" });
    }
  });

  // Catch-all for unmatched API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

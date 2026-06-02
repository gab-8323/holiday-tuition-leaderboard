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
  console.log("Starting server.ts...");
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

  // Helper to read student roll numbers from settings table
  const getRollNumbers = async (client: any) => {
    try {
      const { data, error } = await client
        .from("settings")
        .select("value")
        .eq("key", "student_roll_numbers")
        .single();
      if (error) return {};
      return JSON.parse(data.value || "{}");
    } catch {
      return {};
    }
  };

  // Helper to save student roll numbers to settings table
  const saveRollNumbers = async (client: any, rollNumbers: any) => {
    const value = JSON.stringify(rollNumbers);
    const { data: existing } = await client
      .from("settings")
      .select("key")
      .eq("key", "student_roll_numbers");
    
    if (existing && existing.length > 0) {
      await client
        .from("settings")
        .update({ value })
        .eq("key", "student_roll_numbers");
    } else {
      await client
        .from("settings")
        .insert([{ key: "student_roll_numbers", value }]);
    }
  };

  // Helper to read homework tests from settings table
  const getHomeworkTests = async (client: any) => {
    try {
      const { data, error } = await client
        .from("settings")
        .select("value")
        .eq("key", "homework_tests")
        .single();
      if (error) return [];
      return JSON.parse(data.value || "[]");
    } catch {
      return [];
    }
  };

  // Helper to save homework tests to settings table
  const saveHomeworkTests = async (client: any, tests: any) => {
    const value = JSON.stringify(tests);
    const { data: existing } = await client
      .from("settings")
      .select("key")
      .eq("key", "homework_tests");
    
    if (existing && existing.length > 0) {
      await client
        .from("settings")
        .update({ value })
        .eq("key", "homework_tests");
    } else {
      await client
        .from("settings")
        .insert([{ key: "homework_tests", value }]);
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    console.log("Health check request received");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      supabaseConfigured: !!(url && key),
      env: process.env.NODE_ENV
    });
  });

  app.get(["/api/data", "/api/data/"], async (req, res) => {
    console.log("GET /api/data - Start");
    try {
      const client = getSupabase();
      console.log("Supabase client initialized");
      const { data: students, error: sError } = await client
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: points, error: pError } = await client
        .from("points")
        .select("*")
        .order("created_at", { ascending: false });

      if (sError || pError) throw sError || pError;

      const { data: gallery, error: gError } = await client
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });

      if (gError) {
        console.warn("Gallery table might not exist yet:", gError.message);
      }

      const mappedGallery = (gallery || []).map((item: any) => ({
        id: item.id,
        url: item.url,
        caption: item.caption,
        createdAt: item.created_at
      }));

      // Fetch settings safely
      let fetchedSettings: any[] = [];
      try {
        const { data: dbSettings, error: sErr } = await client
          .from("settings")
          .select("*");
        if (sErr) throw sErr;
        fetchedSettings = dbSettings || [];
      } catch (err: any) {
        console.warn("Failed to fetch settings from table:", err.message);
      }

      // Read roll numbers and homework tests
      const rollNumbersSet = fetchedSettings.find((set: any) => set.key === "student_roll_numbers");
      const parsedRollNumbers = rollNumbersSet ? JSON.parse(rollNumbersSet.value) : {};

      const homeworkTestsSet = fetchedSettings.find((set: any) => set.key === "homework_tests");
      const parsedHomeworkTests = homeworkTestsSet ? JSON.parse(homeworkTestsSet.value) : [];

      // Map snake_case to camelCase and inject roll numbers
      const mappedStudents = (students || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        photo: s.photo,
        rollNumber: parsedRollNumbers[s.id] || "",
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

      res.json({ 
        students: mappedStudents, 
        points: mappedPoints,
        gallery: mappedGallery,
        settings: fetchedSettings,
        tests: parsedHomeworkTests
      });
    } catch (error: any) {
      console.error("Error reading data from Supabase:", error);
      res.status(500).json({ error: error.message || "Failed to read data" });
    }
  });

  app.post(["/api/gallery", "/api/gallery/"], async (req, res) => {
    const { url, caption } = req.body;
    try {
      const client = getSupabase();
      const { data, error } = await client
        .from("gallery")
        .insert([{ url, caption }])
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Error adding to gallery:", error);
      res.status(500).json({ error: error.message || "Failed to add to gallery" });
    }
  });

  app.delete(["/api/gallery/:id", "/api/gallery/:id/"], async (req, res) => {
    const { id } = req.params;
    try {
      const client = getSupabase();
      const { error } = await client.from("gallery").delete().eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting from gallery:", error);
      res.status(500).json({ error: error.message || "Failed to delete from gallery" });
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

  app.post(["/api/settings/upsert", "/api/settings/upsert/"], async (req, res) => {
    const { key, value } = req.body;
    try {
      const client = getSupabase();
      
      // Let's check if the setting key exists or upsert it
      const { data: existing, error: findError } = await client
        .from("settings")
        .select("key")
        .eq("key", key);
      
      let error;
      if (existing && existing.length > 0) {
        // Update
        const { error: updateError } = await client
          .from("settings")
          .update({ value })
          .eq("key", key);
        error = updateError;
      } else {
        // Insert
        const { error: insertError } = await client
          .from("settings")
          .insert([{ key, value }]);
        error = insertError;
      }

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error upserting setting:", error);
      res.status(500).json({ error: error.message || "Failed to upsert setting" });
    }
  });

  app.post(["/api/students", "/api/students/"], upload.single("photo"), async (req, res) => {
    const { name, rollNumber } = req.body;
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

      if (rollNumber) {
        const currentRolls = await getRollNumbers(client);
        currentRolls[data.id] = String(rollNumber).trim();
        await saveRollNumbers(client, currentRolls);
      }

      res.json({
        id: data.id,
        name: data.name,
        photo: data.photo,
        rollNumber: rollNumber || "",
        createdAt: data.created_at
      });
    } catch (error: any) {
      console.error("Error creating student:", error);
      res.status(500).json({ error: error.message || "Failed to create student" });
    }
  });

  app.put(["/api/students/:id", "/api/students/:id/"], upload.single("photo"), async (req, res) => {
    const { id } = req.params;
    const { name, rollNumber } = req.body;
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

      if (rollNumber !== undefined) {
        const currentRolls = await getRollNumbers(client);
        currentRolls[data.id] = String(rollNumber).trim();
        await saveRollNumbers(client, currentRolls);
      }

      res.json({
        id: data.id,
        name: data.name,
        photo: data.photo,
        rollNumber: rollNumber || "",
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

      const currentRolls = await getRollNumbers(client);
      if (currentRolls[id]) {
        delete currentRolls[id];
        await saveRollNumbers(client, currentRolls);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: error.message || "Failed to delete student" });
    }
  });

  // Homework Tests API Routes
  app.post(["/api/tests", "/api/tests/"], async (req, res) => {
    const { studentId, date, questions, id } = req.body;
    try {
      const client = getSupabase();
      const currentTests = await getHomeworkTests(client);
      
      let updatedTests;
      if (id) {
        // Update existing test
        updatedTests = currentTests.map((t: any) => 
          t.id === id ? { ...t, studentId, date, questions } : t
        );
      } else {
        // Insert new test
        const newTest = {
          id: uuidv4(),
          studentId,
          date: date || new Date().toISOString().split("T")[0],
          questions,
          createdAt: new Date().toISOString()
        };
        updatedTests = [newTest, ...currentTests];
      }
      
      await saveHomeworkTests(client, updatedTests);
      res.json({ success: true, tests: updatedTests });
    } catch (error: any) {
      console.error("Error saving content for homework tests:", error);
      res.status(500).json({ error: error.message || "Failed to save homework tests" });
    }
  });

  app.delete(["/api/tests/:id", "/api/tests/:id/"], async (req, res) => {
    const { id } = req.params;
    const { studentId, date } = req.query;
    console.log(`[DELETE TEST] Request received. Params ID: "${id}", Query studentId: "${studentId}", Query date: "${date}"`);
    try {
      const client = getSupabase();
      const currentTests = await getHomeworkTests(client);
      console.log(`[DELETE TEST] Loaded ${currentTests.length} tests from database.`);
      
      let matchedCount = 0;
      const updatedTests = currentTests.filter((t: any) => {
        // 1. Match by exact ID if we have a valid, non-placeholder ID
        if (id && id !== "legacy" && id !== "undefined" && t.id && String(t.id) === String(id)) {
          console.log(`[DELETE TEST] Found match by ID: ${t.id}`);
          matchedCount++;
          return false;
        }
        
        // 2. Match by studentId and date fields
        if (studentId && date && String(t.studentId) === String(studentId) && String(t.date) === String(date)) {
          console.log(`[DELETE TEST] Found match by studentId (${t.studentId}) and date (${t.date})`);
          matchedCount++;
          return false;
        }
        
        return true;
      });

      console.log(`[DELETE TEST] Matched and filtered out ${matchedCount} test(s). Remaining tests: ${updatedTests.length}`);
      
      await saveHomeworkTests(client, updatedTests);
      res.json({ success: true, deletedCount: matchedCount, tests: updatedTests });
    } catch (error: any) {
      console.error("[DELETE TEST] Error deleting content for homework tests:", error);
      res.status(500).json({ error: error.message || "Failed to delete homework test" });
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
          points: parseFloat(points), 
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
        .filter((p: any) => p.points !== 0)
        .map((p: any) => ({
          student_id: p.studentId,
          points: parseFloat(p.points),
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

  app.post(["/api/attendance/mark", "/api/attendance/mark/"], async (req, res) => {
    const { studentId, date, status, points } = req.body;
    try {
      const client = getSupabase();
      
      // Determine the date range: start of day (date) to start of next day
      const d = new Date(date + "T12:00:00");
      const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const nextDate = nextD.toISOString().split("T")[0];
      
      // 1. Delete any existing attendance records for this student on this date
      const { error: deleteError } = await client
        .from("points")
        .delete()
        .eq("student_id", studentId)
        .gte("date", date)
        .lt("date", nextDate)
        .in("description", ["Attendance", "Attendance: Present", "Attendance: Absent", "Attendance: Late"]);

      if (deleteError) {
        console.error("Error deleting old attendance record:", deleteError);
        throw deleteError;
      }

      // 2. If status is provided, insert a new record
      if (status) {
        const { data, error: insertError } = await client
          .from("points")
          .insert([{
            student_id: studentId,
            points: parseFloat(points || "0"),
            description: `Attendance: ${status}`,
            date: date
          }])
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting attendance record:", insertError);
          throw insertError;
        }
        res.json({ success: true, record: data });
      } else {
        res.json({ success: true, deleted: true });
      }
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      res.status(500).json({ error: error.message || "Failed to mark attendance" });
    }
  });

  // Catch-all for unmatched API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("GLOBAL ERROR:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("Vite dev server middleware initialized.");
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode, serving dist...");
    const distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(distPath)) {
      console.warn("WARNING: dist directory does not exist. Run 'npm run build' first.");
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  console.log(`Binding to port ${PORT}...`);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

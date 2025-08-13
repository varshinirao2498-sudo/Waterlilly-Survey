const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database("./data.db");
db.exec(`PRAGMA journal_mode = WAL;`);

// If someone created "submission" (singular), rename it to "submissions"
const hasSubmissions = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='submissions'"
).get();
const hasSubmission = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='submission'"
).get();

if (!hasSubmissions && hasSubmission) {
  db.exec(`ALTER TABLE submission RENAME TO submissions;`);
}

// Ensure final schema is correct
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT (datetime('now')),
    payload TEXT NOT NULL
  );
`);


// Questions
const QUESTIONS = [
  { id: 1, title: "Care Goal", description: "Top priority for the next 12 months.", input_type: "select", required: true,
    options: ["Age-in-place safely", "Prevent falls", "Manage memory issues", "Assess community options"] },
  { id: 2, title: "ADL Level", description: "Help needed with daily activities.", input_type: "select", required: true,
    options: ["Independent", "Some help (1–2)", "Moderate (3–4)", "Extensive (5–6)"] },
  { id: 3, title: "Recent Falls", description: "Any falls in the last year?", input_type: "select", required: true,
    options: ["None", "One (no injury)", "Multiple or injury"] },
  { id: 4, title: "Notes (optional)", description: "Context, meds, diagnoses, home safety, etc.", input_type: "textarea", required: false },
];

// API endpoints
app.get("/api/questions", (_, res) => res.json(QUESTIONS));

app.post("/api/submit", (req, res) => {
  const answers = req.body?.answers;
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "No answers provided" });
  }
  const byId = new Map(QUESTIONS.map(q => [q.id, q]));
  for (const a of answers) {
    const q = byId.get(a.question_id);
    if (!q) return res.status(400).json({ error: `Invalid question_id: ${a.question_id}` });
    if (q.required && !String(a.answer_text ?? "").trim()) {
      return res.status(400).json({ error: `Required: ${q.title}` });
    }
  }
  const id = db.prepare(`INSERT INTO submissions (payload) VALUES (?)`)
    .run(JSON.stringify({ answers })).lastInsertRowid;
  res.json({ id, items: answers });
});

app.get("/api/submissions/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM submissions WHERE id = ?`).get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ id: row.id, created_at: row.created_at, items: JSON.parse(row.payload).answers });
});

app.listen(4000, () => console.log(`Backend running http://localhost:4000`));

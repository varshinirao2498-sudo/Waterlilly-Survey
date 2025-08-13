import { useEffect, useMemo, useState } from "react";
type Question = { id:number; title:string; description?:string; input_type:"text"|"select"|"textarea"; required:boolean; options?:string[]|null };
type AnswerRow = { question_id:number; question_title:string; answer_text:string };
const API = "http://localhost:4000/api";

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string|null>>({});
  const [submitted, setSubmitted] = useState<{id:number; items:AnswerRow[]}|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => { fetch(`${API}/questions`).then(r=>r.json()).then(setQuestions); }, []);
  const progress = useMemo(() => {
    const req = questions.filter(q=>q.required);
    return req.length ? Math.round(req.filter(q=>answers[q.id]?.trim()).length / req.length * 100) : 0;
  }, [questions, answers]);

  function onChange(id:number, val:string) { setAnswers(a=>({...a,[id]:val})); setErrors(e=>({...e,[id]:null})); }
  function validate() { const e:Record<number,string|null>={}; for(const q of questions){ if(q.required && !answers[q.id]?.trim()) e[q.id]="Required"; } setErrors(e); return Object.values(e).every(v=>!v); }
  async function submit() {
    if(!validate()) return;
    setLoading(true);
    try {
      const payload = { answers: questions.map(q=>({question_id:q.id, question_title:q.title, answer_text:answers[q.id]||""})) };
      const res = await fetch(`${API}/submit`, {method:"POST", headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      if (!res.ok) {
      let message = "Submit failed";
      try {
        const maybeJson = await res.json();
        if (maybeJson?.error) message = maybeJson.error;
      } catch {
        const txt = await res.text();
        // common server HTML errors start with <!DOCTYPE ...
        if (txt) message = txt.slice(0, 200);
      }
      throw new Error(message);
    }
      setSubmitted(await res.json());
    } catch(e:any){ setErr(e.message); } finally{ setLoading(false); }
  }

  if(submitted) return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">✅ Submission #{submitted.id}</h1>
      {submitted.items.map((it,i)=>(
        <div key={i} className="border-b pb-2 mb-2">
          <div className="font-medium">{it.question_title}</div>
          <div>{it.answer_text || "—"}</div>
        </div>
      ))}
      <button onClick={()=>{setSubmitted(null);setAnswers({});}} className="px-4 py-2 bg-blue-600 text-white rounded">New Response</button>
    </div>
  );

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Waterlily Mini Survey</h1>
      <div className="mb-4 text-sm">Progress: {progress}%</div>
      {questions.map(q=>(
        <div key={q.id} className="mb-4">
          <div className="font-medium">{q.title} {q.required && <span className="text-red-500">*</span>}</div>
          <div className="text-sm text-gray-600">{q.description}</div>
          {q.input_type==="select" ? (
            <select value={answers[q.id]||""} onChange={e=>onChange(q.id,e.target.value)} className="border p-2 w-full">
              <option value="">Select...</option>
              {(q.options||[]).map(opt=><option key={opt}>{opt}</option>)}
            </select>
          ) : q.input_type==="textarea" ? (
            <textarea value={answers[q.id]||""} onChange={e=>onChange(q.id,e.target.value)} className="border p-2 w-full"/>
          ) : (
            <input value={answers[q.id]||""} onChange={e=>onChange(q.id,e.target.value)} className="border p-2 w-full"/>
          )}
          {errors[q.id] && <div className="text-red-500 text-sm">{errors[q.id]}</div>}
        </div>
      ))}
      <button onClick={submit} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading?"Submitting...":"Submit"}</button>
      {err && <div className="text-red-500 mt-2">{err}</div>}
    </div>
  );
}

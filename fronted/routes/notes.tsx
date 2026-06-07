import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StickyNote, Plus, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const NOTES_KEY = "crm.notes";

function getNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export const Route = createFileRoute("/notes")({
  component: NotesPage,
});

function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });

  useEffect(() => {
    setNotes(getNotes());
  }, []);

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  function addNote() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const now = new Date().toISOString();
    if (editingId) {
      const updated = notes.map((n) =>
        n.id === editingId ? { ...n, title: form.title, content: form.content, updatedAt: now } : n
      );
      setNotes(updated);
      saveNotes(updated);
      toast.success("Note updated");
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        title: form.title,
        content: form.content,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [newNote, ...notes];
      setNotes(updated);
      saveNotes(updated);
      toast.success("Note added");
    }
    setForm({ title: "", content: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function editNote(note: Note) {
    setForm({ title: note.title, content: note.content });
    setEditingId(note.id);
    setShowForm(true);
  }

  function deleteNote(id: string) {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
    toast.success("Note deleted");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notes</h1>
            <p className="text-sm text-muted-foreground">Personal notes and reminders</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setForm({ title: "", content: "" });
            }}
            className="h-10 px-4 gradient-orange text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:opacity-90"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "Add Note"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-lg">{editingId ? "Edit Note" : "New Note"}</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Note title"
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your note here..."
                rows={5}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({ title: "", content: "" });
                }}
                className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button onClick={addNote} className="h-10 px-4 gradient-orange text-white rounded-lg text-sm font-medium shadow-lg hover:opacity-90">
                {editingId ? "Update Note" : "Save Note"}
              </button>
            </div>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full h-10 pl-10 pr-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {filteredNotes.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <StickyNote className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mt-3">No notes yet. Click "Add Note" to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <div key={note.id} className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-sm">{note.title}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => editNote(note)} className="h-7 w-7 rounded grid place-items-center hover:bg-accent text-xs">
                      ✏️
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="h-7 w-7 rounded grid place-items-center hover:bg-accent text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{note.content || "No content"}</p>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
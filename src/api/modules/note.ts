import { invoke } from "@tauri-apps/api/core";

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function listNotes() {
  return invoke<Note[]>("list_notes");
}

export function createNote(title: string, content: string) {
  return invoke<Note>("create_note", { title, content });
}

export function updateNote(id: number, title: string, content: string) {
  return invoke<Note>("update_note", { id, title, content });
}

export function deleteNote(id: number) {
  return invoke<void>("delete_note", { id });
}

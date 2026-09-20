import { ipcInvoke } from "../client";

export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function listNotes() {
  return ipcInvoke<Note[]>("list_notes");
}

export function createNote(title: string, content: string) {
  return ipcInvoke<Note>("create_note", { title, content });
}

export function updateNote(id: number, title: string, content: string) {
  return ipcInvoke<Note>("update_note", { id, title, content });
}

export function deleteNote(id: number) {
  return ipcInvoke<void>("delete_note", { id });
}

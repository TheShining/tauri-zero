import { ipcInvoke } from "../client";

// 字段为 camelCase：Rust Note 通过 serde rename_all = "camelCase" 序列化，
// 与窗口管理等其他 IPC 类型的命名风格保持一致。
// Fields are camelCase: the Rust Note serializes through serde rename_all = "camelCase",
// staying consistent with other IPC types such as the window module.
export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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

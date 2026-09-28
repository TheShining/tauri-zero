import { emit } from "@tauri-apps/api/event";
import { APP_EVENTS } from "../api/ipc/events";
import { createNote, type Note } from "../api/ipc/modules/note";
import { openWindow } from "../api/ipc/modules/window";

// 「新建笔记并打开编辑窗口」是主窗口按钮与托盘菜单共用的链路，收口在此避免两处行为漂移；
// 创建后广播 note://changed，任何已挂载的列表页都会自动刷新。
// "Create note and open its editor" is the shared path of the main-window button and the tray menu,
// centralized here so the two entry points never drift apart. After creation it broadcasts
// note://changed, and any mounted list page refreshes itself.
export async function createAndOpenNote(untitledTitle: string): Promise<Note> {
  const note = await createNote(untitledTitle, "");
  await emit(APP_EVENTS.noteChanged, note.id);
  await openWindow({ kind: "document", contextId: String(note.id) });
  return note;
}

// SQLite 的 datetime('now') 产出 UTC "YYYY-MM-DD HH:MM:SS"；末尾补 Z 显式按 UTC 解析，否则各时区显示会偏移。
// SQLite datetime('now') produces a UTC "YYYY-MM-DD HH:MM:SS" string; appending "Z" forces UTC parsing,
// otherwise the displayed time shifts across time zones.
export function formatNoteTime(iso: string, locale: string): string {
  const date = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

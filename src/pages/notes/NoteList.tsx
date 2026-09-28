import { App as AntdApp, Button, Empty, Flex, Skeleton, Typography, theme } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { APP_EVENTS } from "../../api/ipc/events";
import { deleteNote, listNotes, type Note } from "../../api/ipc/modules/note";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { useWindowStore } from "../../stores/useWindowStore";
import { createAndOpenNote, formatNoteTime } from "../../utils/notes";
import { feedback } from "../../utils/feedback";
import { PlusIcon, TrashIcon } from "./icons";
import "./notes.scss";

export default function NoteList() {
  const { t, i18n } = useTranslation();
  const { modal } = AntdApp.useApp();
  const { token } = theme.useToken();
  const openWindow = useWindowStore((state) => state.open);
  // null 表示首次加载中（渲染骨架屏），与空列表区分开。
  // null means the first load is still running (renders a skeleton), distinct from an empty list.
  const [notes, setNotes] = useState<Note[] | null>(null);

  const reload = useCallback(async () => {
    setNotes(await listNotes());
  }, []);

  useEffect(() => {
    reload().catch((error: unknown) => {
      console.error("[NoteList] load failed:", error);
      feedback.error(t("notes.loadFailed"));
    });
  }, [reload, t]);

  // 编辑窗口保存或托盘新建后，列表据此事件刷新，跨窗口状态靠事件而非共享 store。
  // The list refreshes on this event after an editor saves or the tray creates a note;
  // cross-window state stays event-driven instead of living in a shared store.
  useTauriEvent(APP_EVENTS.noteChanged, () => {
    reload().catch(console.error);
  });

  const handleCreate = () => {
    createAndOpenNote(t("notes.untitled")).catch((error: unknown) => {
      console.error("[NoteList] create failed:", error);
      feedback.error(t("notes.createFailed"));
    });
  };

  // 同一笔记已打开时后端会聚焦既有窗口而非重复创建，这里直接透传 contextId 即可。
  // The backend focuses the existing window instead of creating a duplicate for an already-open
  // note, so forwarding the contextId here is all that is needed.
  const handleOpen = (note: Note) => {
    openWindow({ kind: "document", contextId: String(note.id) }).catch(console.error);
  };

  const handleDelete = (note: Note) => {
    modal.confirm({
      title: t("notes.deleteConfirm"),
      okText: t("notes.deleteOk"),
      okButtonProps: { danger: true },
      cancelText: t("notes.deleteCancel"),
      onOk: async () => {
        await deleteNote(note.id);
        feedback.success(t("notes.deleted"));
        await reload();
      },
    });
  };

  return (
    <Flex vertical gap="middle" style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
      <Flex justify="space-between" align="center">
        <Flex vertical gap={2}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t("notes.title")}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t("notes.count", { count: notes?.length ?? 0 })}
          </Typography.Text>
        </Flex>
        <Button type="primary" icon={<PlusIcon />} onClick={handleCreate}>
          {t("notes.newNote")}
        </Button>
      </Flex>

      {notes === null ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : notes.length === 0 ? (
        <Empty description={t("notes.empty")}>
          <Button type="primary" icon={<PlusIcon />} onClick={handleCreate}>
            {t("notes.newNote")}
          </Button>
        </Empty>
      ) : (
        <Flex vertical>
          {notes.map((note) => (
            <Flex
              key={note.id}
              align="center"
              gap="small"
              className="note-list-item"
              onClick={() => handleOpen(note)}
              style={{ padding: 12, borderRadius: token.borderRadiusLG, cursor: "pointer" }}
            >
              <Flex vertical gap={2} flex={1} style={{ minWidth: 0 }}>
                <Typography.Text strong ellipsis>
                  {note.title}
                </Typography.Text>
                <Typography.Text type="secondary" ellipsis>
                  {note.content || "…"}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {t("editor.updatedAt", {
                    time: formatNoteTime(note.updatedAt, i18n.language),
                  })}
                </Typography.Text>
              </Flex>
              <Button
                type="text"
                danger
                size="small"
                icon={<TrashIcon />}
                aria-label={t("notes.deleteOk")}
                // 删除按钮在行点击区域内，必须阻断冒泡，否则点击删除会误触发打开编辑窗口。
                // The delete button sits inside the row's click area, so stop propagation or
                // clicking delete would also open the editor window.
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(note);
                }}
              />
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

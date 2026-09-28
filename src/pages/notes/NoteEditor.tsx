import { App as AntdApp, Button, Empty, Flex, Input, Tooltip, Typography, theme } from "antd";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { APP_EVENTS } from "../../api/ipc/events";
import { getNote, updateNote, type Note } from "../../api/ipc/modules/note";
import { closeWindow, documentLabel, setWindowDirty } from "../../api/ipc/modules/window";
import { useTauriEvent } from "../../hooks/useTauriEvent";
import { useWindowStore } from "../../stores/useWindowStore";
import { feedback } from "../../utils/feedback";
import { formatNoteTime } from "../../utils/notes";
import TitleBar from "../../layouts/titlebar/TitleBar";
import { CheckIcon } from "./icons";
import "./notes.scss";

export default function NoteEditor() {
  const { t, i18n } = useTranslation();
  const { modal } = AntdApp.useApp();
  const { token } = theme.useToken();
  const { contextId = "" } = useParams<{ contextId: string }>();
  const id = Number(contextId);
  const currentLabel = getCurrentWebviewWindow().label;
  // 主窗口手动导航到 /notes/:id 不是真编辑窗口：dirty 同步与关窗拦截只作用于窗口管理器创建的窗口。
  // Manually navigating to /notes/:id in the main window is not a real note window:
  // dirty sync and close interception only apply to windows created by the window manager.
  const isNoteWindow = currentLabel === documentLabel(contextId);

  const [note, setNote] = useState<Note | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const forceClose = useWindowStore((state) => state.forceClose);

  // 非法 id 走派生值 missing（不进 state），加载失败才置 loadFailed：避免在 effect 里同步 setState。
  // An invalid id is handled by the derived `missing` value (no state); only a load failure sets
  // loadFailed, which keeps synchronous setState out of the effect.
  const validId = Number.isInteger(id);
  useEffect(() => {
    if (!validId) return;
    getNote(id)
      .then((loaded) => {
        setNote(loaded);
        setTitle(loaded.title);
        setContent(loaded.content);
      })
      .catch((error: unknown) => {
        console.error("[NoteEditor] load failed:", error);
        setLoadFailed(true);
      });
  }, [id, validId]);
  const missing = loadFailed || !validId;

  // note 是「已保存快照」，dirty 由编辑态与快照对比得出，避免任何手动标记入口。
  // `note` is the saved snapshot; dirty is derived by comparing the editing state against it,
  // so there is no manual "mark dirty" entry point anywhere.
  const dirty = note !== null && (title !== note.title || content !== note.content);
  const syncedDirtyRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isNoteWindow || dirty === syncedDirtyRef.current) return;
    syncedDirtyRef.current = dirty;
    void setWindowDirty(currentLabel, dirty).catch((error: unknown) => {
      console.error("[NoteEditor] sync dirty failed:", error);
    });
  }, [dirty, isNoteWindow, currentLabel]);

  const save = useCallback(async () => {
    if (!note || !dirty || saving) return;
    if (!title.trim()) {
      feedback.error(t("editor.titleRequired"));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateNote(note.id, title.trim(), content);
      setNote(updated);
      setTitle(updated.title);
      setContent(updated.content);
      // 广播变更让列表页刷新标题预览；payload 带上 id 便于将来做精细化更新。
      // Broadcast the change so the list refreshes its title preview; the id rides along in
      // the payload to allow fine-grained updates later.
      await emit(APP_EVENTS.noteChanged, updated.id);
      feedback.success(t("editor.saved"));
    } catch (error) {
      console.error("[NoteEditor] save failed:", error);
      feedback.error(t("editor.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [note, dirty, saving, title, content, t]);

  // Ctrl/Cmd+S 保存。用 ref 持有最新 save，避免监听器因闭包变化反复注册。
  // Ctrl/Cmd+S to save. The latest save is held in a ref so the listener isn't
  // re-registered whenever the closure changes.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 后端会阻止有未保存内容窗口的关闭，并改为请求当前页面确认；确认事件只定向发送给当前窗口。
  // The backend prevents closing a dirty window and asks this page to confirm instead.
  // The confirm event is targeted at this window only.
  useTauriEvent(APP_EVENTS.windowConfirmClose, () => {
    if (!isNoteWindow) return;
    modal.confirm({
      title: t("editor.unsavedTitle"),
      content: t("editor.unsavedContent"),
      okText: t("editor.discardAndClose"),
      okButtonProps: { danger: true },
      cancelText: t("editor.keepEditing"),
      onOk: () => forceClose(currentLabel).catch(console.error),
    });
  });

  if (missing) {
    return (
      <Flex vertical style={{ height: "100vh" }}>
        <TitleBar />
        <Flex flex={1} justify="center" align="center">
          <Empty description={t("editor.notFound")}>
            {isNoteWindow ? (
              <Button onClick={() => void closeWindow(currentLabel).catch(console.error)}>
                {t("editor.closeWindow")}
              </Button>
            ) : (
              <Link to="/">
                <Button type="primary">{t("common.backHome")}</Button>
              </Link>
            )}
          </Empty>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex vertical style={{ height: "100vh" }}>
      <TitleBar title={note ? title : undefined} />

      <div className="note-editor-body">
        <Input
          variant="borderless"
          className="note-editor-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("editor.titlePlaceholder")}
          maxLength={128}
        />
        <div className="note-editor-divider" style={{ background: token.colorBorderSecondary }} />
        <Input.TextArea
          variant="borderless"
          className="note-editor-textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("editor.contentPlaceholder")}
        />
      </div>

      <footer className="note-editor-footer" style={{ borderTopColor: token.colorBorderSecondary }}>
        <div className="note-editor-footer__inner">
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {note
              ? t("editor.updatedAt", { time: formatNoteTime(note.updatedAt, i18n.language) })
              : " "}
          </Typography.Text>
          <Tooltip title="Ctrl + S">
            <Button
              size="small"
              type="primary"
              icon={<CheckIcon />}
              disabled={!dirty}
              loading={saving}
              onClick={() => void save()}
            >
              {t("editor.save")}
            </Button>
          </Tooltip>
        </div>
      </footer>
    </Flex>
  );
}

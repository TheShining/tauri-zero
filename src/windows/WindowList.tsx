import { Button, Empty, Space, Table, Tag, type TableProps } from "antd";
import { useTranslation } from "react-i18next";
import type { WindowSnapshot } from "../api/ipc/modules/window";
import { WINDOW_LABELS } from "./constants";
import { useWindowStore } from "./store";

export default function WindowList() {
  const { t } = useTranslation();
  const windows = useWindowStore((state) => state.windows);
  const focus = useWindowStore((state) => state.focus);
  const hide = useWindowStore((state) => state.hide);
  const close = useWindowStore((state) => state.close);

  const columns: TableProps<WindowSnapshot>["columns"] = [
    {
      title: t("windows.label"),
      dataIndex: "label",
      key: "label",
      render: (_: unknown, record: WindowSnapshot) => (
        <Space size={4} wrap>
          <span>{record.label}</span>
          {record.contextId ? <Tag>{record.contextId}</Tag> : null}
        </Space>
      ),
    },
    {
      title: t("windows.kind"),
      dataIndex: "kind",
      key: "kind",
      render: (kind: WindowSnapshot["kind"]) => <Tag color="geekblue">{kind}</Tag>,
    },
    {
      title: t("windows.status"),
      key: "status",
      render: (_: unknown, record: WindowSnapshot) => (
        <Space size={4} wrap>
          {record.focused ? (
            <Tag color="processing">{t("windows.focused")}</Tag>
          ) : record.visible ? (
            <Tag color="success">{t("windows.visible")}</Tag>
          ) : (
            <Tag>{t("windows.hidden")}</Tag>
          )}
          {record.dirty ? <Tag color="warning">{t("windows.dirty")}</Tag> : null}
        </Space>
      ),
    },
    {
      title: t("windows.actions"),
      key: "actions",
      align: "end",
      render: (_: unknown, record: WindowSnapshot) => {
        const canHide = record.visible && record.kind !== WINDOW_LABELS.trayPopup;
        const canClose = record.kind === "settings" || record.kind === "document";

        return (
          <Space size={4}>
            <Button
              size="small"
              disabled={record.focused}
              onClick={() => void focus(record.label).catch(console.error)}
            >
              {t("windows.focus")}
            </Button>
            <Button
              size="small"
              disabled={!canHide}
              onClick={() => void hide(record.label).catch(console.error)}
            >
              {t("windows.hide")}
            </Button>
            {canClose ? (
              <Button
                size="small"
                danger
                onClick={() => void close(record.label).catch(console.error)}
              >
                {t("windows.close")}
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Table<WindowSnapshot>
      columns={columns}
      dataSource={windows}
      rowKey="label"
      size="small"
      pagination={false}
      locale={{ emptyText: <Empty description={t("windows.noWindows")} /> }}
    />
  );
}

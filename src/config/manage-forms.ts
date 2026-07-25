export type ManagementFieldKind = "text" | "date" | "textarea" | "select";
export type ManagementValidation = "safe-id" | "item-id" | "hex-color" | "date";

export interface ManagementField {
  id: string;
  label: string;
  kind: ManagementFieldKind;
  required?: boolean;
  options?: readonly string[];
  placeholder?: string;
  description?: string;
  maxLength?: number;
  validation?: ManagementValidation;
}

export interface ManagementFormDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  workflowTitlePrefix: string;
  workflowLabel: string;
  summaryField: string;
  confirmText: string;
  fields: readonly ManagementField[];
}

export interface ManagementRequestPayload {
  formId: string;
  fields: Record<string, string>;
  title: string;
  body: string;
  labels: string[];
}

export const MANAGEMENT_FORMS: readonly ManagementFormDefinition[] = [
  {
    id: "add-report-item",
    name: "新增周报事项",
    description: "直接记录本周的新进展。",
    icon: "✎",
    workflowTitlePrefix: "[新增事项]",
    workflowLabel: "report:add",
    summaryField: "事项内容",
    confirmText: "我确认内容可以公开，并拥有所引用图片的使用权。",
    fields: [
      {
        id: "date",
        label: "事项日期",
        kind: "date",
        required: true,
        validation: "date",
        description: "系统会自动归入正确的 ISO 周。"
      },
      {
        id: "category",
        label: "分类",
        kind: "select",
        required: true,
        options: ["为科协做了什么", "为自己做了什么", "其他"]
      },
      {
        id: "content",
        label: "事项内容",
        kind: "textarea",
        required: true,
        maxLength: 4000,
        description: "只填写纯文本，不使用 Markdown 或 HTML。"
      },
      {
        id: "projects",
        label: "项目",
        kind: "textarea",
        maxLength: 1000,
        description: "多个项目使用中文逗号或换行分隔。"
      },
      {
        id: "tags",
        label: "标签",
        kind: "textarea",
        maxLength: 1000,
        description: "填写已经在百宝阁创建的标签名称。"
      },
      {
        id: "emoji-type",
        label: "事项主表情类型",
        kind: "select",
        required: true,
        options: ["unicode", "custom"]
      },
      {
        id: "emoji",
        label: "Unicode 表情或自定义表情 ID",
        kind: "text",
        required: true,
        placeholder: "📝",
        maxLength: 64
      },
      {
        id: "calendar-icon",
        label: "日历记录球",
        kind: "text",
        required: true,
        placeholder: "huizhou-pattern",
        validation: "safe-id"
      },
      {
        id: "images",
        label: "图片",
        kind: "textarea",
        maxLength: 6000,
        description: "可粘贴最多 9 个 GitHub 托管图片 URL，每行一个；请求内容不会进入公开 Issue。"
      }
    ]
  },
  {
    id: "update-report-item",
    name: "修改已有事项",
    description: "按事项 ID 更新内容，留空项保持不变。",
    icon: "↻",
    workflowTitlePrefix: "[修改事项]",
    workflowLabel: "report:update",
    summaryField: "事项 ID",
    confirmText: "我确认修改后的内容可以公开。",
    fields: [
      {
        id: "item-id",
        label: "事项 ID",
        kind: "text",
        required: true,
        placeholder: "20260725-c04e51",
        validation: "item-id"
      },
      { id: "date", label: "新日期", kind: "date", validation: "date" },
      {
        id: "category",
        label: "新分类",
        kind: "select",
        options: ["_未填写_", "为科协做了什么", "为自己做了什么", "其他"]
      },
      {
        id: "content",
        label: "新内容",
        kind: "textarea",
        maxLength: 4000,
        description: "留空保持原值。"
      },
      { id: "projects", label: "新项目", kind: "textarea", maxLength: 1000 },
      { id: "tags", label: "新标签", kind: "textarea", maxLength: 1000 },
      { id: "emoji", label: "新主表情", kind: "text", maxLength: 64 },
      { id: "calendar-icon", label: "新记录球", kind: "text", validation: "safe-id" },
      {
        id: "replace-images",
        label: "是否替换图片",
        kind: "select",
        options: ["否", "是"]
      },
      {
        id: "images",
        label: "新图片",
        kind: "textarea",
        maxLength: 6000,
        description: "选择替换时粘贴 GitHub 托管图片 URL。"
      }
    ]
  },
  {
    id: "change-report-status",
    name: "隐藏、删除或恢复",
    description: "管理事项的公开状态，不物理删除历史。",
    icon: "♲",
    workflowTitlePrefix: "[状态管理]",
    workflowLabel: "report:status",
    summaryField: "事项 ID",
    confirmText: "我理解该操作不会物理删除文件，历史仍保存在 Git 中。",
    fields: [
      {
        id: "item-id",
        label: "事项 ID",
        kind: "text",
        required: true,
        placeholder: "20260725-c04e51",
        validation: "item-id"
      },
      {
        id: "operation",
        label: "操作",
        kind: "select",
        required: true,
        options: ["隐藏", "放入回收站", "恢复公开"]
      }
    ]
  },
  {
    id: "add-tag",
    name: "新增标签",
    description: "创建标签名称、网址标识、颜色和像素徽章。",
    icon: "#",
    workflowTitlePrefix: "[标签管理]",
    workflowLabel: "asset:tag",
    summaryField: "标签名称",
    confirmText: "我确认名称和 URL 标识没有与现有标签重复。",
    fields: [
      { id: "name", label: "标签名称", kind: "text", required: true, maxLength: 40 },
      {
        id: "slug",
        label: "标签 slug",
        kind: "text",
        required: true,
        placeholder: "frontend",
        validation: "safe-id"
      },
      {
        id: "color",
        label: "标签颜色",
        kind: "text",
        required: true,
        placeholder: "#4F88C6",
        validation: "hex-color"
      },
      {
        id: "icon",
        label: "标签图标",
        kind: "select",
        required: true,
        options: ["mechanical", "scroll", "star", "mountain", "上传新图标"]
      },
      {
        id: "image",
        label: "新图标图片",
        kind: "textarea",
        maxLength: 1000,
        description: "选择上传新图标时粘贴 GitHub 托管图片 URL。"
      }
    ]
  },
  {
    id: "manage-project-creature",
    name: "管理项目灵兽",
    description: "绑定项目、灵兽和村落地图站位。",
    icon: "✦",
    workflowTitlePrefix: "[项目灵兽管理]",
    workflowLabel: "asset:project",
    summaryField: "项目名称",
    confirmText: "我确认项目、灵兽和地图站位信息正确。",
    fields: [
      { id: "project-name", label: "项目名称", kind: "text", required: true, maxLength: 80 },
      {
        id: "project-slug",
        label: "项目 slug",
        kind: "text",
        required: true,
        placeholder: "weekly-system",
        validation: "safe-id"
      },
      {
        id: "creature-id",
        label: "灵兽 ID",
        kind: "text",
        required: true,
        placeholder: "water-01",
        validation: "safe-id"
      },
      {
        id: "map-position",
        label: "地图站位",
        kind: "select",
        required: true,
        options: ["academy-door", "stone-bridge", "lotus-pond", "village-gate", "waterside-courtyard"]
      },
      {
        id: "visible",
        label: "是否在地图显示",
        kind: "select",
        required: true,
        options: ["是", "否"]
      }
    ]
  },
  {
    id: "manage-calendar-icon",
    name: "管理记录球",
    description: "新增、替换、启用或停用原创记录球。",
    icon: "●",
    workflowTitlePrefix: "[记录球管理]",
    workflowLabel: "asset:calendar-icon",
    summaryField: "记录球 ID",
    confirmText: "我确认记录球为原创素材或拥有使用权。",
    fields: [
      {
        id: "operation",
        label: "操作",
        kind: "select",
        required: true,
        options: ["新增", "替换", "启用", "停用"]
      },
      {
        id: "id",
        label: "记录球 ID",
        kind: "text",
        required: true,
        placeholder: "cloud-pattern",
        validation: "safe-id"
      },
      { id: "name", label: "名称", kind: "text", required: true, maxLength: 64 },
      {
        id: "image",
        label: "图片",
        kind: "textarea",
        maxLength: 1000,
        description: "新增或替换时粘贴 GitHub 托管图片 URL。"
      }
    ]
  },
  {
    id: "manage-emoji",
    name: "管理自定义表情",
    description: "新增、替换、启用或停用自定义表情。",
    icon: "☺",
    workflowTitlePrefix: "[表情管理]",
    workflowLabel: "asset:emoji",
    summaryField: "表情 ID",
    confirmText: "我确认表情素材可以公开使用。",
    fields: [
      {
        id: "operation",
        label: "操作",
        kind: "select",
        required: true,
        options: ["新增", "替换", "启用", "停用"]
      },
      {
        id: "id",
        label: "表情 ID",
        kind: "text",
        required: true,
        placeholder: "soc",
        validation: "safe-id"
      },
      { id: "name", label: "名称", kind: "text", required: true, maxLength: 64 },
      {
        id: "image",
        label: "图片",
        kind: "textarea",
        maxLength: 1000,
        description: "新增或替换时粘贴 GitHub 托管图片 URL。"
      }
    ]
  },
  {
    id: "update-profile",
    name: "更新个人资料",
    description: "调整网站资料、头像、站位和外部链接。",
    icon: "人",
    workflowTitlePrefix: "[个人资料]",
    workflowLabel: "profile:update",
    summaryField: "网站名称",
    confirmText: "我确认个人资料和外部链接可以公开。",
    fields: [
      { id: "site-title", label: "网站名称", kind: "text", maxLength: 80 },
      { id: "name", label: "昵称", kind: "text", maxLength: 64 },
      { id: "description", label: "简介", kind: "textarea", maxLength: 500 },
      {
        id: "avatar",
        label: "像素头像",
        kind: "textarea",
        maxLength: 1000,
        description: "粘贴 GitHub 托管图片 URL。"
      },
      {
        id: "position",
        label: "地图站位",
        kind: "select",
        options: ["_未填写_", "village-gate", "waterside-courtyard", "academy-door", "stone-bridge", "lotus-pond"]
      },
      {
        id: "scale",
        label: "头像缩放倍数",
        kind: "select",
        options: ["_未填写_", "1", "2", "3", "4"]
      },
      {
        id: "show-name",
        label: "是否显示昵称",
        kind: "select",
        required: true,
        options: ["是", "否"]
      },
      {
        id: "links",
        label: "外部链接",
        kind: "textarea",
        maxLength: 2000,
        description: "每行使用“名称 | https://example.com”格式。"
      }
    ]
  }
];

function validateValue(field: ManagementField, value: string): void {
  if (field.required && !value) throw new Error(`请填写“${field.label}”`);
  if (!value || value === "_未填写_") return;
  if (value.includes("\0") || /^###\s+/m.test(value)) {
    throw new Error(`“${field.label}”包含不允许的内容`);
  }
  if (value.length > (field.maxLength ?? 4000)) {
    throw new Error(`“${field.label}”内容过长`);
  }
  if (field.options && !field.options.includes(value)) {
    throw new Error(`“${field.label}”选项无效`);
  }
  if (field.validation === "safe-id" && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) {
    throw new Error(`“${field.label}”只能包含小写字母、数字和连字符`);
  }
  if (field.validation === "item-id" && !/^\d{8}-[a-f0-9]{6}$/.test(value)) {
    throw new Error("事项 ID 格式错误");
  }
  if (field.validation === "hex-color" && !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error("标签颜色必须是 #RRGGBB 格式");
  }
  if (field.validation === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`“${field.label}”必须使用 YYYY-MM-DD 格式`);
  }
}

export function buildManagementRequest(
  formId: string,
  rawValues: Record<string, unknown>
): ManagementRequestPayload {
  const definition = MANAGEMENT_FORMS.find((form) => form.id === formId);
  if (!definition) throw new Error("不支持的管理操作");

  const values = new Map<string, string>();
  const fields: Record<string, string> = {};
  for (const field of definition.fields) {
    const raw = rawValues[field.id];
    const value = typeof raw === "string" ? raw.replaceAll("\r\n", "\n").trim() : "";
    validateValue(field, value);
    values.set(field.label, value);
    fields[field.id] = value;
  }

  const summary = (values.get(definition.summaryField) || definition.name)
    .replace(/\s+/g, " ")
    .slice(0, 72);
  const body = definition.fields
    .map((field) => `### ${field.label}\n\n${values.get(field.label) || "_未填写_"}`)
    .join("\n\n");
  if (body.length > 28_000) throw new Error("提交内容过长");

  return {
    formId,
    fields,
    title: `${definition.workflowTitlePrefix} ${summary}`,
    body,
    labels: [definition.workflowLabel]
  };
}

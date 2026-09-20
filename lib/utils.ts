import { createCn } from "cn/config"

// Class merger (tailwind-merge compatible). The design system's named text styles
// (docs/05-design-system.md — `text-body`, `text-button-text`, …) set a whole font
// shorthand (size, weight, line height). Without telling the merger so, it reads them
// as text *colours* and silently drops them whenever a colour class such as
// `text-ink-muted` sits beside them. Registering them as font-size utilities keeps both.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "stat-xl",
            "heading",
            "page-title",
            "body",
            "body-sm",
            "label",
            "caption",
            "button-text",
          ],
        },
      ],
    },
  },
})

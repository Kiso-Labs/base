import { useAtomValue } from "@effect/atom-react";

import { shortcutLabelForCommand } from "~/keybindings";
import { primaryServerKeybindingsAtom } from "~/state/server";

export function useCommandPaletteShortcutLabel(): string | null {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  return shortcutLabelForCommand(keybindings, "commandPalette.toggle");
}

import { Link, useLocation } from "@tanstack/react-router";
import { Columns3Icon, ListTodoIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

export function IssueViewToggle() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const boardActive = pathname === "/board";

  return (
    <div className="inline-flex rounded-md border border-border/60 bg-background p-0.5">
      <Button
        aria-label="Show issues as a list"
        className="h-6 rounded-[4px] px-2"
        render={<Link to="/issues" />}
        size="xs"
        variant={boardActive ? "ghost" : "secondary"}
      >
        <ListTodoIcon />
        List
      </Button>
      <Button
        aria-label="Show issues as a board"
        className="h-6 rounded-[4px] px-2"
        render={<Link to="/board" />}
        size="xs"
        variant={boardActive ? "secondary" : "ghost"}
      >
        <Columns3Icon />
        Board
      </Button>
    </div>
  );
}

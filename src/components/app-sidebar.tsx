import {
  Home,
  Inbox,
  Settings,
  HelpCircle,
  Store,
  Bot,
  BookOpen,
  PanelLeft,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import { useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatList } from "./ChatList";
import { AppList } from "./AppList";
import { HelpDialog } from "./HelpDialog"; // Import the new dialog

// Menu items.
const items = [
  {
    title: "Apps",
    to: "/",
    icon: Home,
  },
  {
    title: "Chat",
    to: "/chat",
    icon: Inbox,
  },
  {
    title: "AI",
    to: "/ai",
    icon: Bot,
  },
  {
    title: "Hub",
    to: "/hub",
    icon: Store,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: Settings,
  },
  {
    title: "Support",
    to: "/help",
    icon: BookOpen, // or another suitable icon
  },
];

// Hover state types
type HoverState =
  | "start-hover:app"
  | "start-hover:chat"
  | "clear-hover"
  | "no-hover";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar(); // retrieve current sidebar state
  const [hoverState, setHoverState] = useState<HoverState>("no-hover");
  const expandedByHover = useRef(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false); // State for dialog
  const [isDropdownOpen] = useAtom(dropdownOpenAtom);

  useEffect(() => {
    if (
      (hoverState === "start-hover:app" || hoverState === "start-hover:chat") &&
      state === "collapsed"
    ) {
      expandedByHover.current = true;
      toggleSidebar();
    }
    if (
      hoverState === "clear-hover" &&
      state === "expanded" &&
      expandedByHover.current &&
      !isDropdownOpen
    ) {
      toggleSidebar();
      expandedByHover.current = false;
      setHoverState("no-hover");
    }
  }, [hoverState, toggleSidebar, state, setHoverState, isDropdownOpen]);

  const routerState = useRouterState();
  const isAppRoute =
    routerState.location.pathname === "/" ||
    routerState.location.pathname.startsWith("/app-details");
  const isChatRoute = routerState.location.pathname === "/chat";

  let selectedItem: string | null = null;
  if (hoverState === "start-hover:app") {
    selectedItem = "Apps";
  } else if (hoverState === "start-hover:chat") {
    selectedItem = "Chat";
  } else if (state === "expanded") {
    if (isAppRoute) {
      selectedItem = "Apps";
    } else if (isChatRoute) {
      selectedItem = "Chat";
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseLeave={() => {
        if (!isDropdownOpen) {
          setHoverState("clear-hover");
        }
      }}
      className="bg-background shadow-xl backdrop-blur-xl border-r-0 !rounded-r-3xl !border-none !overflow-visible relative"
      style={{ borderRight: "none" }}
    >
      <SidebarContent className="overflow-hidden">
        <div className="flex mt-8">
          {/* Left Column: Menu items */}
          <div className="">
            <SidebarTrigger
              onMouseEnter={() => {
                setHoverState("clear-hover");
              }}
              className="bg-background hover:bg-background text-white shadow-lg rounded-2xl border-none"
            >
              <PanelLeft className="h-5 w-5" />
            </SidebarTrigger>
            <AppIcons onHoverChange={setHoverState} />
          </div>
          {/* Right Column: Chat List Section */}
          <div className="w-[240px]">
            <AppList show={selectedItem === "Apps"} />
            <ChatList show={selectedItem === "Chat"} />
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="bg-background rounded-b-3xl shadow-inner border-t-0">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Change button to open dialog instead of linking */}
            <SidebarMenuButton
              size="sm"
              className="font-medium w-14 flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl bg-background hover:bg-background text-white shadow-lg border-none"
              onClick={() => setIsHelpDialogOpen(true)} // Open dialog on click
            >
              <HelpCircle className="h-5 w-5 drop-shadow-pink" />
              <span className={"text-xs"}>Help</span>
            </SidebarMenuButton>
            <HelpDialog
              isOpen={isHelpDialogOpen}
              onClose={() => setIsHelpDialogOpen(false)}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
      {/* Removed pink glow effect */}
    </Sidebar>
  );
}

function AppIcons({
  onHoverChange,
}: {
  onHoverChange: (state: HoverState) => void;
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    // When collapsed: only show the main menu
    <SidebarGroup className="pr-0">
      {/* <SidebarGroupLabel>Dyad</SidebarGroupLabel> */}

      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              (item.to === "/" && pathname === "/") ||
              (item.to !== "/" && pathname.startsWith(item.to));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  className="font-medium w-14"
                >
                  <Link
                    to={item.to}
                    className={`flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl ${
                      isActive ? "bg-sidebar-accent" : ""
                    }`}
                    onMouseEnter={() => {
                      if (item.title === "Apps") {
                        onHoverChange("start-hover:app");
                      } else if (item.title === "Chat") {
                        onHoverChange("start-hover:chat");
                      }
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <item.icon className="h-5 w-5" />
                      <span className={"text-xs"}>{item.title}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

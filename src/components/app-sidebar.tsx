import {
  Home,
  Inbox,
  Settings,
  HelpCircle,
  Store,
  PanelLeft,
  LifeBuoy,
  BookOpen,
  MessageCircle,
  Milestone,
  Bot,
  CheckCircle,
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
    labelElement: (
      <span className="flex items-center gap-1">
        A
        <span className="relative inline-flex items-center ml-0.5">
          I
          <span
            className="ml-0.5 inline-flex items-center justify-center rounded-full bg-blue-500"
            style={{ width: 16, height: 16 }}
          >
            <CheckCircle className="h-3 w-3 text-white" aria-label="Verified" />
          </span>
        </span>
        <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full font-semibold animate-pulse animate-blink">
          new
        </span>
      </span>
    ),
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
    to: "/support",
    icon: LifeBuoy,
  },
  {
    title: "FAQ",
    to: "/faq",
    icon: BookOpen,
  },
  {
    title: "Feedback",
    to: "/feedback",
    icon: MessageCircle,
  },
  {
    title: "Roadmap",
    to: "/roadmap",
    icon: Milestone,
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
      className="bg-gradient-to-b from-pink-500 via-pink-400 to-pink-300/80 shadow-xl backdrop-blur-xl border-r-0 !rounded-r-3xl !border-none !overflow-visible relative"
      style={{
        boxShadow: "0 8px 32px 0 rgba(255, 95, 143, 0.25)",
        borderRight: "none",
      }}
    >
      <SidebarContent className="overflow-hidden">
        <div className="flex mt-8">
          {/* Left Column: Menu items */}
          <div className="">
            <SidebarTrigger
              onMouseEnter={() => {
                setHoverState("clear-hover");
              }}
              className="bg-pink-400/30 hover:bg-pink-500/40 text-white shadow-lg rounded-2xl border-none flex items-center justify-center h-14 w-14 mb-2"
            >
              <PanelLeft className="h-6 w-6" />
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

      <SidebarFooter className="bg-gradient-to-t from-pink-200/60 to-transparent rounded-b-3xl shadow-inner border-t-0">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Change button to open dialog instead of linking */}
            <SidebarMenuButton
              size="sm"
              className="font-medium w-14 flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl transition-all duration-200 text-white hover:bg-pink-500/40 shadow-lg border-none bg-pink-400/30 drop-shadow-lg focus:ring-2 focus:ring-pink-400 focus:outline-none active:scale-95"
              onClick={() => setIsHelpDialogOpen(true)} // Open dialog on click
            >
              <HelpCircle className="h-5 w-5 drop-shadow-pink transition-all duration-200 group-hover:scale-110" />
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
      {/* Pink glow effect */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-[-1] rounded-r-3xl"
        style={{ boxShadow: "0 0 80px 10px #ff5f8f55, 0 8px 32px 0 #ff5f8f33" }}
      />
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
    <SidebarGroup className="pr-0">
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
                    className={`flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl transition-colors duration-200
                      text-white hover:bg-pink-500/40 shadow-lg border-none
                      ${isActive ? "bg-pink-400/60" : "bg-pink-400/30"}
                    `}
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
                      <span className={"text-xs"}>
                        {item.labelElement ? item.labelElement : item.title}
                      </span>
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

"use client";

import { useState } from "react";
import { Topbar } from "@/components/layouts/Topbar";
import { ChatPanel } from "@/components/features/chat/ChatPanel";
import { ChatSidebar } from "@/components/features/chat/ChatSidebar";
import { ViewingOutreachWizard } from "@/components/features/chat/ViewingOutreachWizard";
import { useAgentChat } from "@/hooks/useAgentChat";
import type { ChatSidebarSuggestPayload } from "@/constants/chat-suggestions";

export default function ChatPage() {
  const [viewingWizardOpen, setViewingWizardOpen] = useState(false);
  const {
    messages,
    isLoading,
    sendMessage,
    sessions,
    activeSessionId,
    newChat,
    selectSession,
    deleteSession,
    updateAssistantMessage,
    deleteMessage,
  } = useAgentChat();

  function handleSuggest(payload: ChatSidebarSuggestPayload) {
    if (payload.type === "viewing_wizard") {
      setViewingWizardOpen(true);
      return;
    }
    sendMessage(payload.text);
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-page)" }}
    >
      <Topbar />

      <div
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-4 py-6 sm:px-6 lg:mx-auto lg:w-full lg:max-w-[1280px] lg:flex-row lg:px-8"
      >
        {/* Chat panel — 65%; scroll jen uvnitř ChatPanel */}
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl lg:flex-[65]"
          style={{
            backgroundColor: "var(--color-bg-subtle)",
            border: "1px solid rgba(199,196,215,0.25)",
            boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
          }}
        >
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSend={sendMessage}
            onEditAssistant={updateAssistantMessage}
            onDeleteMessage={deleteMessage}
          />
        </div>

        {/* Sidebar — 35% */}
        <div className="w-full shrink-0 lg:flex-[35] min-w-0 min-h-0 max-h-40 sm:max-h-52 lg:max-h-none overflow-y-auto lg:overflow-y-auto overscroll-contain">
          <ChatSidebar
            onSuggest={handleSuggest}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={selectSession}
            onNewChat={newChat}
            onDeleteSession={deleteSession}
          />
        </div>
      </div>

      <ViewingOutreachWizard open={viewingWizardOpen} onClose={() => setViewingWizardOpen(false)} />
    </div>
  );
}

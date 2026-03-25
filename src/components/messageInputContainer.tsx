import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { config } from "@/utils/config";

// necessary because of VAD in MessageInput
const DynamicMessageInput = dynamic(() =>
  import("@/components/messageInput"), {
    ssr: false
  }
);

/**
 * Provides text input and voice input
 *
 * Automatically send when speech recognition is completed,
 * and disable input while generating response text
 */
export const MessageInputContainer = ({
  isChatProcessing,
}: {
  isChatProcessing: boolean;
}) => {
  const [userMessage, setUserMessage] = useState("");
  const showMessageInput = config("show_message_input") === "true";

  useEffect(() => {
    if (!isChatProcessing) {
      setUserMessage("");
    }
  }, [isChatProcessing]);

  if (!showMessageInput) {
    return null;
  }

  return (
    <DynamicMessageInput
      userMessage={userMessage}
      setUserMessage={setUserMessage}
      isChatProcessing={isChatProcessing}
      onChangeUserMessage={(e) => setUserMessage(e.target.value)}
    />
  );
};

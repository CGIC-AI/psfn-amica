import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { config } from "@/utils/config";

export const UserText = ({ message }: { message: string }) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const showMessageInput = config("show_message_input") === "true";

  // Replace all of the emotion tag in message with ""
  message = message.replace(/\[(.*?)\]/g, "");

  useEffect(() => {
    scrollRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

  return (
    <div className={clsx("fixed bottom-0 left-0 w-full", showMessageInput ? "mb-20" : "mb-3")}>
      <div className="mx-auto max-w-4xl w-full px-2 md:px-6">
        <div className="backdrop-blur-lg rounded-lg">
          <div className="bg-white/70 rounded-lg backdrop-blur-lg shadow-lg">
            <div className="px-3 pr-1 py-1.5 bg-rose/90 rounded-t-lg text-white font-bold tracking-wider">
              <span className="px-2.5 py-1 bg-cyan-600/80 rounded-lg rounded-tl-none rounded-tr-none shadow-sm">
                {t("YOU")}
              </span>
            </div>

            <div className="px-3 py-2 max-h-32 overflow-y-auto">
              <div className="min-h-8 max-h-full text-[0.9rem] font-semibold leading-5 text-gray-600">
                {message.replace(/\[([a-zA-Z]*?)\]/g, "")}
                <div ref={scrollRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

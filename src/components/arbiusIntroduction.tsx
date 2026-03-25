import { useTranslation } from 'react-i18next';
import { config } from "@/utils/config";

export const ArbiusIntroduction = ({ open, close }: {
  open: boolean;
  close: () => void;
}) => {
  const { t } = useTranslation();
  const brand = config("name");

  if (!open) {
    return null;
  }

  return (
    <div className="absolute z-40 h-full w-full bg-black/30 mx-auto sm:px-24 lg:px-32 font-M_PLUS_2"
    >
      <div className="mx-auto max-h-full overflow-auto rounded-lg bg-white/80 p-4 backdrop-blur-lg shadow-lg">
        <div className="my-4">
          <div className="my-8 font-bold text-xl">
            {t("Welcome to")} {brand} {t("by Arbius")}
          </div>
          <p>{t("arbius_intro", `
            ${brand} is the best way for AI to interact with humans. The Arbius interface shows how people may interact with decentralized AI. With this setup, anyone may prompt ${brand} by spending a small amount of AIUS tokens, and when an Arbius miner solves the prompt, the users connected will receive a response. This is set up as a global demonstration, so do not expect any privacy.
          `)}
          </p>
        </div>

        <div className="my-8">
          <button
            onClick={() => {
              close();
            }}
            className="ml-3 inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            {t("Continue to")} {brand}
          </button>
        </div>
      </div>
    </div>
  );
};

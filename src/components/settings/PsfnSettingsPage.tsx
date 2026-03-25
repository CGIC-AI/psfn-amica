import { BasicPage, FormRow, NotUsingAlert } from './common';
import { TextInput } from '@/components/textInput';
import { SecretTextInput } from '@/components/secretTextInput';
import { config, updateConfig } from "@/utils/config";

export function PsfnSettingsPage({
  openAIApiKey,
  setOpenAIApiKey,
  openAIUrl,
  setOpenAIUrl,
  openAIModel,
  setOpenAIModel,
  setSettingsUpdated,
}: {
  openAIApiKey: string;
  setOpenAIApiKey: (key: string) => void;
  openAIUrl: string;
  setOpenAIUrl: (url: string) => void;
  openAIModel: string;
  setOpenAIModel: (model: string) => void;
  setSettingsUpdated: (updated: boolean) => void;
}) {
  return (
    <BasicPage
      title="PSFN Settings"
      description="Configure the PSFN-backed OpenAI-compatible chat endpoint. Leave the API key blank if PSFN does not require one."
    >
      { config("chatbot_backend") !== "psfn" && (
        <NotUsingAlert>
          You are not currently using PSFN as your ChatBot backend. These settings will not be used.
        </NotUsingAlert>
      ) }
      <ul role="list" className="divide-y divide-gray-100 max-w-xs">
        <li className="py-4">
          <FormRow label="API Key">
            <SecretTextInput
              value={openAIApiKey}
              onChange={(event: React.ChangeEvent<any>) => {
                setOpenAIApiKey(event.target.value);
                updateConfig("openai_apikey", event.target.value);
                setSettingsUpdated(true);
              }}
            />
          </FormRow>
        </li>
        <li className="py-4">
          <FormRow label="OpenAI-Compatible URL">
            <TextInput
              value={openAIUrl}
              onChange={(event: React.ChangeEvent<any>) => {
                setOpenAIUrl(event.target.value);
                updateConfig("openai_url", event.target.value);
                setSettingsUpdated(true);
              }}
            />
          </FormRow>
        </li>
        <li className="py-4">
          <FormRow label="Model">
            <TextInput
              value={openAIModel}
              onChange={(event: React.ChangeEvent<any>) => {
                setOpenAIModel(event.target.value);
                updateConfig("openai_model", event.target.value);
                setSettingsUpdated(true);
              }}
            />
          </FormRow>
        </li>
      </ul>
    </BasicPage>
  );
}

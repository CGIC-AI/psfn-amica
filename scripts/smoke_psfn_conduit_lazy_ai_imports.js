const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const chatSource = fs.readFileSync(path.join(root, "src/features/chat/chat.ts"), "utf8");

const forbiddenStaticImports = [
  "@/features/elevenlabs/elevenlabs",
  "@/features/speecht5/speecht5",
  "@/features/openaiTTS/openaiTTS",
  "@/features/localXTTS/localXTTS",
  "@/features/piper/piper",
  "@/features/coquiLocal/coquiLocal",
  "@/features/rvc/rvc",
  "../kokoro/kokoro",
  "./arbiusChat",
  "./openAiChat",
  "./llamaCppChat",
  "./ollamaChat",
  "./koboldAiChat",
  "./openRouterChat",
  "./windowAiChat",
  "./reasoiningEngineChat",
  "../externalAPI/externalAPI",
  "@/lib/VRMAnimation/loadVRMAnimation",
];

for (const specifier of forbiddenStaticImports) {
  if (chatSource.includes(`from "${specifier}"`) || chatSource.includes(`from '${specifier}'`)) {
    throw new Error(`chat.ts still statically imports ${specifier}`);
  }
}

for (const specifier of forbiddenStaticImports) {
  if (!chatSource.includes(`import("${specifier}")`) && !chatSource.includes(`import('${specifier}')`)) {
    if (specifier === "../externalAPI/externalAPI" || specifier === "@/lib/VRMAnimation/loadVRMAnimation") {
      throw new Error(`chat.ts no longer lazy-loads expected legacy helper ${specifier}`);
    }
  }
}

console.log("PSFN conduit lazy AI import smoke check passed.");

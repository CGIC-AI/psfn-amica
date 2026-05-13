type HomeRuntimeOptions = {
  psfnConduitMode: boolean;
  amicaLifeEnabled?: boolean;
  amicaLifeMode?: string;
};

export function shouldInitializeAmicaLife({
  psfnConduitMode,
  amicaLifeEnabled = false,
  amicaLifeMode = "",
}: HomeRuntimeOptions): boolean {
  return !psfnConduitMode || (
    amicaLifeEnabled &&
    amicaLifeMode === "animation_only"
  );
}

export function shouldWriteExternalChatLogs({
  psfnConduitMode,
}: HomeRuntimeOptions): boolean {
  return !psfnConduitMode;
}

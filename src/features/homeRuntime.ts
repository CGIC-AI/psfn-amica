type HomeRuntimeOptions = {
  psfnConduitMode: boolean;
};

export function shouldInitializeAmicaLife({
  psfnConduitMode,
}: HomeRuntimeOptions): boolean {
  return !psfnConduitMode;
}

export function shouldWriteExternalChatLogs({
  psfnConduitMode,
}: HomeRuntimeOptions): boolean {
  return !psfnConduitMode;
}

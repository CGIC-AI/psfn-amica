const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(source, needle, message) {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

const menuKeys = read("src/components/settings/menuKeys.ts");
assertContains(
  menuKeys,
  '"character_model"',
  "Appearance settings must expose the Character Model page.",
);
assertContains(
  menuKeys,
  '"character_animation"',
  "Appearance settings must expose the Character Animation page.",
);

const viewer = read("src/features/vrmViewer/viewer.ts");
assertContains(
  viewer,
  'config("animation_url")',
  "Viewer VRM loading must still honor animation_url.",
);
assertContains(
  viewer,
  'config("animation_procedural") !== "true"',
  "Viewer VRM loading must skip idle file loading only when procedural animation is enabled.",
);

const model = read("src/features/vrmViewer/model.ts");
assertContains(
  model,
  'config("animation_procedural") === "true"',
  "Model update loop must keep procedural animation independent of Amica Life.",
);
assertContains(
  model,
  "this.emoteController?.update(delta)",
  "Model update loop must keep face, gaze, blink, and lip-sync expression updates active.",
);

const homeRuntime = read("src/features/homeRuntime.ts");
assertContains(
  homeRuntime,
  "return !psfnConduitMode;",
  "Home runtime must keep Amica Life loops disabled in PSFN conduit mode.",
);

console.log("PSFN conduit VRM controls smoke check passed.");

import { describe, expect, test } from "@jest/globals";

import {
  appearanceSettingsMenuKeys,
  getSettingsMenuKeys,
  mainSettingsMenuKeys,
} from "../src/components/settings/menuKeys";

describe("settings menu keys", () => {
  test("keeps VRM model and animation controls reachable from Appearance", () => {
    expect(mainSettingsMenuKeys).toContain("appearance");
    expect(appearanceSettingsMenuKeys).toEqual(
      expect.arrayContaining(["character_model", "character_animation"]),
    );
  });

  test("keeps VRM controls in conduit settings while omitting Amica Life loops", () => {
    expect(getSettingsMenuKeys("main_menu", true)).toContain("appearance");
    expect(getSettingsMenuKeys("main_menu", true)).not.toContain("amica_life");
    expect(getSettingsMenuKeys("appearance", true)).toEqual(
      expect.arrayContaining(["character_model", "character_animation"]),
    );
  });
});

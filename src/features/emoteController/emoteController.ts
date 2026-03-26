import * as THREE from "three";
import { VRM, VRMExpressionPresetName } from "@pixiv/three-vrm";
import { ExpressionController } from "./expressionController";

/**
 * 感情表現としてExpressionとMotionを操作する為のクラス
 * デモにはExpressionのみが含まれています
 */
export class EmoteController {
  private _expressionController: ExpressionController;

  constructor(vrm: VRM, camera: THREE.Object3D) {
    this._expressionController = new ExpressionController(vrm, camera);
  }

  public playEmotion(preset: VRMExpressionPresetName | string) {
    this._expressionController.playEmotion(preset);
  }

  public lipSync(preset: VRMExpressionPresetName | string, value: number) {
    this._expressionController.lipSync(preset, value);
  }

  public setLookAtOffset(x: number, y: number, z: number) {
    this._expressionController.setLookAtOffset(x, y, z);
  }

  public update(delta: number) {
    this._expressionController.update(delta);
  }
}

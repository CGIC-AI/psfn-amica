const FACE_CASCADE_URL = "/opencv/haarcascade_frontalface_default.xml";
const FACE_CASCADE_FILENAME = "haarcascade_frontalface_default.xml";

let openCvPromise: Promise<any> | null = null;
let faceCascadePromise: Promise<string> | null = null;

export async function loadOpenCv(): Promise<any> {
  if (!openCvPromise) {
    openCvPromise = (async () => {
      const importedModule = await import("@techstark/opencv-js");
      const moduleValue = importedModule.default as any;

      if (moduleValue instanceof Promise) {
        return moduleValue;
      }
      if (typeof moduleValue.getBuildInformation === "function") {
        return moduleValue;
      }

      await new Promise<void>((resolve) => {
        const previousHandler = moduleValue.onRuntimeInitialized;
        moduleValue.onRuntimeInitialized = () => {
          if (typeof previousHandler === "function") {
            previousHandler();
          }
          resolve();
        };
      });

      return moduleValue;
    })();
  }

  return openCvPromise;
}

export async function ensureFaceCascade(cv: any): Promise<string> {
  if (!faceCascadePromise) {
    faceCascadePromise = (async () => {
      const response = await fetch(FACE_CASCADE_URL);
      if (!response.ok) {
        throw new Error(`Failed to load face cascade (${response.status})`);
      }

      const fileData = new Uint8Array(await response.arrayBuffer());
      const filePath = `/${FACE_CASCADE_FILENAME}`;

      try {
        cv.FS_createDataFile("/", FACE_CASCADE_FILENAME, fileData, true, false, false);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("File exists")) {
          throw error;
        }
      }

      return filePath;
    })();
  }

  return faceCascadePromise;
}

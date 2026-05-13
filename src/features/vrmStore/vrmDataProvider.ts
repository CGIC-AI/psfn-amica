import { VrmDexie } from "./vrmDb";
import VrmDbModel from "./vrmDbModel";
import { db } from "./vrmDb";
import { Base64ToBlob } from "@/utils/blobDataUtils";

export class VrmDataProvider {
    private db: VrmDexie;

    constructor() {
        this.db = db;
    }

    componentWillUnmount() {
        this.db.close();
    }
    
    public addItem(hash: string, saveType: 'local' | 'web', vrmData: string = "", vrmUrl: string = "", thumbData: string = ""): Promise<unknown> {
        return this.db.vrms.put(new VrmDbModel(hash, saveType, vrmData, vrmUrl, thumbData));
    }

    public async getItems(): Promise<VrmDbModel[]> {
        return this.db.vrms.toArray();
    }

    public updateItemThumb(hash: string, vrmThumbData: string): Promise<number> {
        return this.db.vrms.where("hash").equals(hash).modify({ thumbData: vrmThumbData });
    }

    public getItemAsBlob(hash: string): Promise<Blob | undefined> {
        return this.db.vrms.where("hash").equals(hash).first()
            .then(vrmDbModel => { console.log(`hash: ${hash}`); console.log(`vrmDbModel: ${vrmDbModel}`); return vrmDbModel ? Base64ToBlob(vrmDbModel?.vrmData) : undefined; });
    }

    public addItemUrl(hash: string, url: string): Promise<number> {
        return this.db.vrms.where("hash").equals(hash).modify({ vrmUrl: url, saveType: 'web' });
    }
}

export const vrmDataProvider = new VrmDataProvider();

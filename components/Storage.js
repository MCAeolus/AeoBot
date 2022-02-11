import { constants } from 'buffer';
import { access, readFile, writeFile } from 'fs/promises';


class StorageManager {

    constructor() {
        this.loadedStorage = [];
    }

    addStorage(stg) {
        this.loadedStorage.push(stg);
    }

    onExit() {
        this.loadedStorage.forEach(stg => stg.save());
        console.log("loaded storages have been saved.");
    }
}

export const storageManager = new StorageManager();

export class Storage {
    constructor(fileName) {
        this.fileName = fileName;
        this.filePath = `./storage/${this.fileName}.json`;
        this.initJSON();
    }

    async initJSON() {
        try {
            await access(this.filePath);
        } catch {
            await writeFile(this.filePath, '{}', {flag: 'wx'});
            console.log(`Created file ${this.fileName}.`);
        }

        const fileDat = await readFile(this.filePath, {encoding: 'utf8'});
        try {
            this.json = JSON.parse(fileDat.trim(), 'utf8');
        } catch (err) {
            console.log(`Couldn't parse JSON of ${this.filePath}. Any calls to this file will error.`);
            return;
        }
        storageManager.addStorage(this);
    }

    async save() {
        await writeFile(this.filePath, JSON.stringify(this.json));
        console.log(`Storage ${this.fileName} has been saved.`);
    }

    json() {
        return this.json;
    }
}
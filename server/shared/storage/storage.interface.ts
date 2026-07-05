export interface IStorageService {
    uploadFile(filePath: string, folderName?: string): Promise<string>;
};
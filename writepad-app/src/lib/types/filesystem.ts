// File System Access API types
export interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
  
  isSameEntry(other: FileSystemHandle): Promise<boolean>;
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file';
  
  getFile(): Promise<File>;
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory';
  
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write(data: FileSystemWriteChunkType): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

export interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

export interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean;
}

export interface FileSystemGetDirectoryOptions {
  create?: boolean;
}

export interface FileSystemGetFileOptions {
  create?: boolean;
}

export interface FileSystemRemoveOptions {
  recursive?: boolean;
}

export type FileSystemWriteChunkType = 
  | BufferSource 
  | Blob 
  | string 
  | WriteParams;

export interface WriteParams {
  type: 'write' | 'seek' | 'truncate';
  data?: BufferSource | Blob | string;
  position?: number;
  size?: number;
}

// Window interface extension
declare global {
  interface Window {
    showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  }
}

export interface DirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: FileSystemHandle | string;
}

export interface OpenFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  id?: string;
  multiple?: boolean;
  startIn?: FileSystemHandle | string;
  types?: FilePickerAcceptType[];
}

export interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  id?: string;
  startIn?: FileSystemHandle | string;
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

export interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
} 
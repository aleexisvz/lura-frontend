export interface ParsedMangaMetadata {
  title: string;
  titleKanji?: string;
  author?: string;
  description?: string;
  genres: string[];
  status?: string;
}

export interface ParsedVolume {
  folderName: string;
  volumeNumber: number;
  volumeTitle?: string;
  coverFile?: File;
  coverPreview?: string;
  pageFiles: File[];
}

export interface ParsedMangaFolder {
  folderName: string;
  metadata: ParsedMangaMetadata;
  mangaCoverFile?: File;
  mangaCoverPreview?: string;
  volumes: ParsedVolume[];
  rawFilesCount: number;
}

// Alphanumeric natural sort for filenames
export function naturalSortFiles(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
}

// Extract all files recursively from Drag and Drop DataTransfer
export async function getAllFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const items = dataTransfer.items;
  const files: File[] = [];

  if (!items || items.length === 0) {
    return Array.from(dataTransfer.files || []);
  }

  const entries: { entry: FileSystemEntry; path: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      entries.push({ entry, path: entry.name });
    }
  }

  async function traverseEntry(entry: FileSystemEntry, currentPath: string): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file((f) => {
          // Attach relative path
          try {
            Object.defineProperty(f, "webkitRelativePath", {
              value: currentPath,
              configurable: true,
            });
          } catch {
            // ignore if read-only
          }
          resolve(f);
        }, reject);
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();

      const readBatch = (): Promise<FileSystemEntry[]> => {
        return new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
      };

      let batch = await readBatch();
      while (batch.length > 0) {
        for (const childEntry of batch) {
          await traverseEntry(childEntry, `${currentPath}/${childEntry.name}`);
        }
        batch = await readBatch();
      }
    }
  }

  for (const { entry, path } of entries) {
    await traverseEntry(entry, path);
  }

  return files.length > 0 ? files : Array.from(dataTransfer.files || []);
}

// Parse files structured like mangadex-cli output
export async function parseMangadexFolder(files: File[]): Promise<ParsedMangaFolder> {
  if (files.length === 0) {
    throw new Error("No se detectaron archivos en la carpeta seleccionada.");
  }

  let folderName = "Manga Importado";
  let metadata: ParsedMangaMetadata = {
    title: "",
    genres: [],
  };
  let mangaCoverFile: File | undefined;
  const volumesMap = new Map<string, { cover?: File; pages: File[] }>();

  // Determine top folder name if available
  const samplePath = files.find((f) => f.webkitRelativePath)?.webkitRelativePath;
  if (samplePath) {
    const parts = samplePath.split(/[/\\]/);
    if (parts.length > 1) {
      folderName = parts[0];
    }
  }

  // 1. Scan for metadata.json and covers
  for (const file of files) {
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split(/[/\\]/).filter(Boolean);
    const fileName = file.name.toLowerCase();

    // Check for metadata.json
    if (fileName === "metadata.json") {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        const kanji =
          typeof json.altTitles?.kanji === "string"
            ? json.altTitles.kanji
            : typeof json.altTitles?.ja === "string"
            ? json.altTitles.ja
            : undefined;

        metadata = {
          title: json.title || folderName,
          titleKanji: kanji || undefined,
          author: json.author || undefined,
          description: json.description || undefined,
          genres: Array.isArray(json.genres)
            ? json.genres
            : Array.isArray(json.tags)
            ? json.tags
            : [],
          status: json.status || undefined,
        };
      } catch (err) {
        console.warn("No se pudo leer metadata.json correctamente", err);
      }
      continue;
    }

    if (file.size === 0 || file.name.startsWith(".")) continue;

    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|avif)$/i.test(file.name);
    if (!isImage) continue;

    // Check if it's the root manga cover (e.g. MangaName/cover.png or cover.jpg at top level)
    if (parts.length <= 2 && /^cover\.(jpe?g|png|webp|avif)$/i.test(file.name)) {
      mangaCoverFile = file;
      continue;
    }

    // Check if it belongs to a volume or chapter folder
    // e.g. MangaName/vol_1/001.png or MangaName/vol_29/cover.jpg
    if (parts.length >= 2) {
      const volumeFolder = parts[parts.length - 2]; // Folder name immediately containing the file

      if (!volumesMap.has(volumeFolder)) {
        volumesMap.set(volumeFolder, { pages: [] });
      }
      const volEntry = volumesMap.get(volumeFolder)!;

      if (/^cover\.(jpe?g|png|webp|avif)$/i.test(file.name)) {
        volEntry.cover = file;
      } else {
        volEntry.pages.push(file);
      }
    }
  }

  // Fallback title if metadata.json was absent
  if (!metadata.title) {
    metadata.title = folderName;
  }

  // Parse volume folders
  const volumes: ParsedVolume[] = [];

  for (const [volFolderName, volData] of volumesMap.entries()) {
    // If the folder is only the root folder containing cover, skip
    if (volFolderName === folderName && volData.pages.length === 0) continue;

    // Extract volume number
    let volNumber = 1;
    const volNumMatch = volFolderName.match(/(?:vol(?:ume)?|tomo|cap(?:itulo)?)[_\-\s]*(\d+)/i);
    if (volNumMatch) {
      volNumber = parseInt(volNumMatch[1], 10);
    } else {
      const numOnlyMatch = volFolderName.match(/^(\d+)$/);
      if (numOnlyMatch) {
        volNumber = parseInt(numOnlyMatch[1], 10);
      }
    }

    const sortedPages = naturalSortFiles(volData.pages);

    volumes.push({
      folderName: volFolderName,
      volumeNumber: volNumber,
      volumeTitle: volFolderName.startsWith("cap_") ? `Capítulo ${volNumber}` : undefined,
      coverFile: volData.cover,
      coverPreview: volData.cover ? URL.createObjectURL(volData.cover) : undefined,
      pageFiles: sortedPages,
    });
  }

  // Sort volumes by volume number
  volumes.sort((a, b) => a.volumeNumber - b.volumeNumber);

  return {
    folderName,
    metadata,
    mangaCoverFile,
    mangaCoverPreview: mangaCoverFile ? URL.createObjectURL(mangaCoverFile) : undefined,
    volumes,
    rawFilesCount: files.length,
  };
}

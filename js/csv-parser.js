(function (global) {
  const Utils = global.DatasetDiffUtils;
  const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
  const DEFAULT_PASTE_OPTIONS = {
    hasHeader: true,
    delimiter: "\t",
  };

  function parseCsvFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No file provided."));
        return;
      }

      parseCsvInput(file, file.name, reject, resolve);
    });
  }

  function parseCsvText(text, fileName, options) {
    return new Promise((resolve, reject) => {
      if (!Utils.normalizeCellValue(text)) {
        reject(new Error("Paste a CSV block before parsing."));
        return;
      }

      const parsedOptions = {
        ...DEFAULT_PASTE_OPTIONS,
        ...(options || {}),
      };

      // TOAD snapshots are expected as tab-delimited text. Keep parsing strict.
      const parsed = parseDelimitedText(text, fileName || "pasted.tsv", parsedOptions);
      if (parsed.error) {
        reject(new Error(parsed.error));
        return;
      }

      resolve(parsed.value);
    });
  }

  function parseCsvInput(input, fileName, reject, resolve) {
    Papa.parse(input, {
      header: true,
      skipEmptyLines: "greedy",
      worker: false,
      transformHeader: Utils.normalizeHeader,
      complete: (result) => {
        const headers = (result.meta.fields || []).map((header) => Utils.normalizeHeader(header)).filter(Boolean);
        if (!headers.length) {
          reject(new Error(`"${fileName}" does not contain headers.`));
          return;
        }

        const rows = (result.data || [])
          .filter((row) => row && Object.values(row).some((value) => Utils.normalizeCellValue(value) !== ""))
          .map((row) => {
            const normalized = {};
            headers.forEach((header) => {
              normalized[header] = Utils.normalizeCellValue(row[header]);
            });
            return normalized;
          });

        if (result.errors && result.errors.length) {
          const fatal = result.errors.find((error) => error && error.type === "Quotes" && error.code);
          if (fatal) {
            reject(new Error(fatal.message || "CSV parsing failed."));
            return;
          }
        }

        resolve({
          file: input,
          fileName,
          headers,
          rows,
          errors: result.errors || [],
        });
      },
      error: (error) => {
        reject(error instanceof Error ? error : new Error("CSV parsing failed."));
      },
    });
  }

  function parseDelimitedText(rawText, fileName, options) {
    const delimiter = options.delimiter;
    const hasHeader = Boolean(options.hasHeader);
    const text = String(rawText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text.split("\n").filter((line) => line.trim().length > 0);

    if (!lines.length) {
      return { error: "Paste a CSV block before parsing." };
    }

    const tokenized = lines.map((line) => splitDelimitedLine(line, delimiter).map((cell) => Utils.normalizeCellValue(cell)));
    const expectedColumns = tokenized[0].length;

    if (!expectedColumns) {
      return { error: "The pasted block does not contain columns." };
    }

    for (let i = 0; i < tokenized.length; i += 1) {
      const row = tokenized[i];
      if (row.length !== expectedColumns) {
        return {
          error: `Row ${i + 1} has ${row.length} columns but expected ${expectedColumns}. Check tab or wide-space separation.`,
        };
      }
    }

    let headers = [];
    let dataRows = tokenized;

    if (hasHeader) {
      headers = tokenized[0].map((header) => Utils.normalizeHeader(header)).filter(Boolean);
      if (!headers.length) {
        return { error: `"${fileName}" does not contain headers.` };
      }
      if (headers.length !== expectedColumns) {
        return { error: "Header row contains empty column names." };
      }
      dataRows = tokenized.slice(1);
    } else {
      headers = Array.from({ length: expectedColumns }, (_, index) => `Col_${index + 1}`);
    }

    const rows = dataRows
      .filter((row) => row.some((value) => Utils.normalizeCellValue(value) !== ""))
      .map((row) => {
        const normalized = {};
        headers.forEach((header, index) => {
          normalized[header] = Utils.normalizeCellValue(row[index]);
        });
        return normalized;
      });

    return {
      value: {
        file: rawText,
        fileName,
        headers,
        rows,
        errors: [],
      },
    };
  }

  function splitDelimitedLine(line, delimiter) {
    const cells = line.split(delimiter);
    if (delimiter !== "\t" || cells.length > 1) {
      return cells;
    }

    // Some TOAD copies use wide spaces instead of literal tabs.
    const hasWideGaps = /[ \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]{2,}/.test(line);
    if (!hasWideGaps) {
      return cells;
    }

    const normalized = line
      .replace(/\u00A0/g, " ")
      .replace(/[\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      .trim();

    return normalized.split(/ {2,}/);
  }

  function validateCsvFile(file) {
    if (!file) {
      return "Select a CSV file.";
    }
    if (!Utils.isCsvFile(file)) {
      return "Only .csv files are supported in the MVP.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `The selected file is larger than ${Utils.formatFileSize(MAX_FILE_SIZE_BYTES)}.`;
    }
    return "";
  }

  global.DatasetDiffCsvParser = {
    MAX_FILE_SIZE_BYTES,
    parseCsvFile,
    parseCsvText,
    validateCsvFile,
  };
})(window);

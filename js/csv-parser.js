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
        reject(new Error("Paste CSV or JSON data before parsing."));
        return;
      }

      const parsedOptions = {
        ...DEFAULT_PASTE_OPTIONS,
        ...(options || {}),
      };

      if (looksLikeJsonText(text)) {
        resolve(parseRawTextDataset(text, fileName || "pasted.txt"));
        return;
      }

      const parsedJson = parseJsonText(text, fileName || "pasted.json", parsedOptions);
      if (!parsedJson.error) {
        resolve(parsedJson.value);
        return;
      }

      // TOAD snapshots are expected as tab-delimited text. Keep parsing strict.
      const parsed = parseDelimitedText(text, fileName || "pasted.tsv", parsedOptions);
      if (!parsed.error) {
        resolve(parsed.value);
        return;
      }

      resolve(parseRawTextDataset(text, fileName || "pasted.txt"));
    });
  }

  function parseJsonText(rawText, fileName, options) {
    const text = String(rawText || "").trim();
    if (!text || !/^[\[{]/.test(text)) {
      return { error: "Input is not JSON." };
    }

    const candidates = buildJsonCandidates(text);
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i];
      let parsed;
      try {
        parsed = JSON.parse(candidate);
      } catch (error) {
        continue;
      }

      if (Array.isArray(parsed)) {
        if (!parsed.length) {
          return { error: "The pasted JSON array is empty." };
        }

        if (parsed.every((item) => isPlainObject(item))) {
          return buildDatasetFromObjectArray(parsed, rawText, fileName);
        }

        if (parsed.every((item) => Array.isArray(item))) {
          return buildDatasetFromArrayRows(parsed, rawText, fileName, options);
        }
      }

      if (isPlainObject(parsed)) {
        return buildDatasetFromObjectArray([parsed], rawText, fileName);
      }

      return { error: "JSON format unsupported for tabular comparison." };
    }
    return { error: "Input is not valid JSON." };
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
      return { error: "Paste CSV or JSON data before parsing." };
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

  function buildDatasetFromObjectArray(items, rawText, fileName) {
    const headerSet = new Set();
    items.forEach((item) => {
      Object.keys(item).forEach((key) => {
        const normalized = Utils.normalizeHeader(key);
        if (normalized) {
          headerSet.add(normalized);
        }
      });
    });

    const headers = [...headerSet];
    if (!headers.length) {
      return { error: `"${fileName}" does not contain headers.` };
    }

    const rows = items.map((item) => {
      const normalized = {};
      headers.forEach((header) => {
        normalized[header] = toCellValue(item[header]);
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

  function buildDatasetFromArrayRows(lines, rawText, fileName, options) {
    const rows = lines.map((line) => line.map((cell) => Utils.normalizeCellValue(cell)));
    const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    if (!maxColumns) {
      return { error: "The pasted block does not contain columns." };
    }

    let headers = [];
    let dataRows = rows;
    if (options.hasHeader) {
      headers = (rows[0] || []).map((header) => Utils.normalizeHeader(header)).filter(Boolean);
      if (!headers.length) {
        return { error: `"${fileName}" does not contain headers.` };
      }
      dataRows = rows.slice(1);
    } else {
      headers = Array.from({ length: maxColumns }, (_, index) => `Col_${index + 1}`);
    }

    if (!headers.length) {
      return { error: `"${fileName}" does not contain headers.` };
    }

    const normalizedRows = dataRows.map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = Utils.normalizeCellValue(row[index] ?? "");
      });
      return record;
    });

    return {
      value: {
        file: rawText,
        fileName,
        headers,
        rows: normalizedRows,
        errors: [],
      },
    };
  }

  function toCellValue(value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return Utils.normalizeCellValue(String(value));
      }
    }
    return Utils.normalizeCellValue(value);
  }

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  function buildJsonCandidates(text) {
    const candidates = [];
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      return candidates;
    }

    candidates.push(trimmed);

    const noTrailingComma = trimmed.replace(/,\s*$/, "");
    if (noTrailingComma !== trimmed) {
      candidates.push(noTrailingComma);
    }

    // Accept pasted object streams like:
    // {...}
    // {...}
    // or
    // {...},
    // {...},
    const wrapped = `[${noTrailingComma}]`;
    candidates.push(wrapped);

    return uniqueCandidates(candidates);
  }

  function uniqueCandidates(values) {
    const seen = new Set();
    const out = [];
    values.forEach((value) => {
      if (!value || seen.has(value)) {
        return;
      }
      seen.add(value);
      out.push(value);
    });
    return out;
  }

  function parseRawTextDataset(rawText, fileName) {
    const lines = extractTextRecords(rawText);
    const rows = lines.map((value, index) => ({
      Line: String(index + 1),
      Value: Utils.normalizeCellValue(value),
    }));

    return {
      file: rawText,
      fileName,
      headers: ["Line", "Value"],
      rows,
      errors: [],
    };
  }

  function looksLikeJsonText(text) {
    return /^\s*[\[{]/.test(String(text || ""));
  }

  function extractTextRecords(rawText) {
    const text = String(rawText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^[\[\]\{\}\s,]+$/.test(line))
      .map((line) => line.replace(/,\s*$/, ""));

    if (!lines.length) {
      return [];
    }

    return lines;
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

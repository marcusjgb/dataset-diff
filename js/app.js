(function () {
  const Utils = window.DatasetDiffUtils;
  const CsvParser = window.DatasetDiffCsvParser;
  const Comparator = window.DatasetDiffComparator;
  const Exporter = window.DatasetDiffExporter;
  const UI = window.DatasetDiffUI;

  const state = {
    datasetA: null,
    datasetB: null,
    key: "",
    comparison: null,
    messages: [],
    loading: {
      a: false,
      b: false,
    },
    requestToken: {
      a: 0,
      b: 0,
    },
    pasteConfigA: {
      hasHeader: false,
      delimiter: "\t",
    },
    pasteConfigB: {
      hasHeader: false,
      delimiter: "\t",
    },
  };

  function init() {
    UI.init();
    bindEvents();
    refreshUi();
  }

  function bindEvents() {
    const refs = UI.getRefs();

    document.getElementById("file-a-input").addEventListener("change", (event) => handleFileChange("a", event));
    document.getElementById("file-b-input").addEventListener("change", (event) => handleFileChange("b", event));
    document.getElementById("paste-a-btn").addEventListener("click", () => handlePasteSubmit("a"));
    document.getElementById("paste-b-btn").addEventListener("click", () => handlePasteSubmit("b"));
    document.getElementById("paste-compare-btn").addEventListener("click", handlePasteAndCompare);
    document.getElementById("paste-a-has-header").addEventListener("change", (event) => {
      state.pasteConfigA.hasHeader = Boolean(event.target.checked);
    });
    document.getElementById("paste-b-has-header").addEventListener("change", (event) => {
      state.pasteConfigB.hasHeader = Boolean(event.target.checked);
    });
    refs.keySelect.addEventListener("change", () => {
      state.key = refs.keySelect.value;
      if (state.datasetA && state.datasetB) {
        runComparison(false);
      }
    });
    refs.compareBtn.addEventListener("click", () => runComparison(true));
    document.getElementById("reset-btn").addEventListener("click", handleReset);
    refs.exportBtn.addEventListener("click", handleExport);
    refs.prevPage.addEventListener("click", () => {
      if (!state.comparison) {
        return;
      }
      UI.renderTablePage(UI.getCurrentPage() - 1);
    });
    refs.nextPage.addEventListener("click", () => {
      if (!state.comparison) {
        return;
      }
      UI.renderTablePage(UI.getCurrentPage() + 1);
    });
  }

  async function handleFileChange(side, event) {
    const file = event.target.files && event.target.files[0];
    const message = CsvParser.validateCsvFile(file);
    if (message) {
      showInputError(side, message);
      return;
    }

    const token = Date.now() + Math.random();
    state.requestToken[side] = token;
    state.loading[side] = true;
    state.comparison = null;
    UI.setResults(null);
    UI.setStatus("warn", `Parsing dataset ${side.toUpperCase()}`);
    refreshUi();

    try {
      const parsed = await CsvParser.parseCsvFile(file);
      if (state.requestToken[side] !== token) {
        return;
      }

      applyParsedDataset(side, parsed);
    } catch (error) {
      state.loading[side] = false;
      state[`dataset${side.toUpperCase()}`] = null;
      UI.setUploadState(side, null);
      state.messages = [{ type: "error", text: error.message || "Unable to parse the selected file." }];
      UI.setResults(null);
      refreshUi();
    }
  }

  async function handlePasteSubmit(side) {
    const refs = UI.getRefs();
    const input = side === "a" ? document.getElementById("paste-a-input") : document.getElementById("paste-b-input");
    const config = side === "a" ? state.pasteConfigA : state.pasteConfigB;
    const rawText = input.value;
    const token = Date.now() + Math.random();
    state.requestToken[side] = token;
    state.loading[side] = true;
    state.comparison = null;
    UI.setResults(null);
    UI.setStatus("warn", `Parsing pasted data ${side.toUpperCase()}`);
    refreshUi();

    try {
      const parsed = await CsvParser.parseCsvText(rawText, `pasted-${side}.tsv`, {
        hasHeader: config.hasHeader,
        delimiter: config.delimiter,
      });
      if (state.requestToken[side] !== token) {
        return;
      }

      if (!Utils.normalizeCellValue(rawText)) {
        throw new Error("Paste CSV or JSON data before parsing.");
      }

      document.getElementById(`file-${side}-input`).value = "";
      applyParsedDataset(side, parsed);
      refs.keySelect.focus();
      return true;
    } catch (error) {
      state.loading[side] = false;
      state[`dataset${side.toUpperCase()}`] = null;
      UI.setUploadState(side, null);
      state.messages = [{ type: "error", text: error.message || "Unable to parse pasted data." }];
      UI.setResults(null);
      refreshUi();
      return false;
    }
  }

  async function handlePasteAndCompare() {
    const okA = await handlePasteSubmit("a");
    const okB = await handlePasteSubmit("b");
    if (!okA || !okB) {
      return;
    }
    runComparison(true);
  }

  function showInputError(side, message) {
    state.comparison = null;
    state.messages = [{ type: "error", text: message }];
    state[`dataset${side.toUpperCase()}`] = null;
    UI.setUploadState(side, null);
    UI.setResults(null);
    refreshUi();
  }

  function applyParsedDataset(side, parsed) {
    state[`dataset${side.toUpperCase()}`] = parsed;
    state.messages = [];
    state.loading[side] = false;
    UI.setUploadState(side, parsed);
    rebuildKeyOptions();
    refreshUi();
    maybeAutoCompare();
  }

  function rebuildKeyOptions() {
    const datasetA = state.datasetA;
    const datasetB = state.datasetB;

    if (!datasetA || !datasetB) {
      state.key = "";
      UI.setKeyOptions([], state.key);
      UI.setCompareEnabled(false);
      return;
    }

    const sharedHeaders = Utils.intersection(datasetA.headers, datasetB.headers);
    const duplicates = [
      ...Utils.getDuplicateValues(datasetA.headers),
      ...Utils.getDuplicateValues(datasetB.headers),
    ];

    if (duplicates.length) {
      state.messages = [{ type: "error", text: `Duplicate headers found: ${Utils.uniqueValues(duplicates).join(", ")}.` }];
      state.key = "";
      UI.setKeyOptions([], "");
      UI.setResults(null);
      UI.setCompareEnabled(false);
      return;
    }

    if (!sharedHeaders.length) {
      state.messages = [{ type: "error", text: "The files do not share any common headers, so there is no valid comparison key." }];
      state.key = "";
      UI.setKeyOptions([], "");
      UI.setCompareEnabled(false);
      UI.renderMessages(null, state.messages);
      return;
    }

    const preferredKey = sharedHeaders.includes(state.key) ? state.key : sharedHeaders[0];
    state.key = preferredKey;
    UI.setKeyOptions(sharedHeaders, preferredKey);
    UI.setCompareEnabled(true);
  }

  function maybeAutoCompare() {
    if (state.datasetA && state.datasetB && state.key) {
      runComparison(false);
    }
  }

  function runComparison(showMessages) {
    const datasetA = state.datasetA;
    const datasetB = state.datasetB;
    if (!datasetA || !datasetB) {
      state.messages = [{ type: "error", text: "Upload both CSV files before comparing." }];
      refreshUi();
      return;
    }

    if (!state.key) {
      state.messages = [{ type: "error", text: "Choose a shared column to use as the primary key." }];
      refreshUi();
      return;
    }

    if (!datasetA.headers.includes(state.key) || !datasetB.headers.includes(state.key)) {
      state.messages = [{ type: "error", text: buildInvalidKeyMessage(datasetA, datasetB, state.key) }];
      refreshUi();
      return;
    }

    const duplicatesA = Utils.getDuplicateValues(datasetA.rows.map((row) => row[state.key]));
    const duplicatesB = Utils.getDuplicateValues(datasetB.rows.map((row) => row[state.key]));
    if (duplicatesA.length || duplicatesB.length) {
      const parts = [];
      if (duplicatesA.length) {
        parts.push(`Dataset A has duplicate key values: ${Utils.uniqueValues(duplicatesA).join(", ")}.`);
      }
      if (duplicatesB.length) {
        parts.push(`Dataset B has duplicate key values: ${Utils.uniqueValues(duplicatesB).join(", ")}.`);
      }
      state.messages = [{ type: "error", text: parts.join(" ") }];
      refreshUi();
      return;
    }

    const comparison = Comparator.compareDatasets(datasetA, datasetB, state.key);
    state.comparison = comparison;
    state.messages = [];
    UI.setResults(comparison, 1);
    UI.setStatus("ready", "Comparison ready");
    if (showMessages) {
      UI.renderMessages(comparison, state.messages);
    }
    refreshUi();
  }

  function handleExport() {
    if (!state.comparison) {
      return;
    }
    Exporter.exportDiscrepancies(state.comparison);
  }

  function handleReset() {
    const refs = UI.getRefs();
    const fileAInput = document.getElementById("file-a-input");
    const fileBInput = document.getElementById("file-b-input");
    const pasteAInput = document.getElementById("paste-a-input");
    const pasteBInput = document.getElementById("paste-b-input");
    const pasteAHasHeader = document.getElementById("paste-a-has-header");
    const pasteBHasHeader = document.getElementById("paste-b-has-header");

    state.datasetA = null;
    state.datasetB = null;
    state.key = "";
    state.comparison = null;
    state.messages = [];
    state.loading.a = false;
    state.loading.b = false;
    state.requestToken.a = Date.now() + Math.random();
    state.requestToken.b = Date.now() + Math.random();
    state.pasteConfigA.hasHeader = false;
    state.pasteConfigB.hasHeader = false;

    fileAInput.value = "";
    fileBInput.value = "";
    pasteAInput.value = "";
    pasteBInput.value = "";
    pasteAHasHeader.checked = false;
    pasteBHasHeader.checked = false;

    UI.setUploadState("a", null);
    UI.setUploadState("b", null);
    UI.setKeyOptions([], "");
    UI.setResults(null);
    refs.keySelect.blur();
    refreshUi();
  }

  function refreshUi() {
    const datasetReady = Boolean(state.datasetA && state.datasetB && state.key);
    const hasComparison = Boolean(state.comparison);
    UI.setCompareEnabled(datasetReady);

    if (state.messages.length) {
      UI.renderMessages(state.comparison, state.messages);
      const first = state.messages[0];
      UI.setStatus(first.type === "error" ? "error" : "warn", first.text);
    } else if (hasComparison) {
      UI.renderMessages(state.comparison, []);
    } else if (state.datasetA || state.datasetB) {
      UI.setStatus("warn", "Waiting for the second file");
    } else {
      UI.setStatus("idle", "Waiting for files");
    }
  }

  function buildInvalidKeyMessage(datasetA, datasetB, key) {
    if (!key) {
      return "Choose a shared column to use as the primary key.";
    }

    if (/^Col_\d+$/.test(key)) {
      const maxA = datasetA.headers.length;
      const maxB = datasetB.headers.length;
      return `Key ${key} is outside the available range. Dataset A has ${maxA} columns and Dataset B has ${maxB}.`;
    }

    return "The selected key must exist in both files.";
  }

  init();
})();

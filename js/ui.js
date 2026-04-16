(function (global) {
  const Utils = global.DatasetDiffUtils;

  const refs = {};
  let currentRows = [];
  let currentPage = 1;
  const pageSize = 12;

  function init() {
    refs.fileAMeta = document.getElementById("file-a-meta");
    refs.fileADetails = document.getElementById("file-a-details");
    refs.fileBMeta = document.getElementById("file-b-meta");
    refs.fileBDetails = document.getElementById("file-b-details");
    refs.keySelect = document.getElementById("key-select");
    refs.compareBtn = document.getElementById("compare-btn");
    refs.onlyInA = document.getElementById("only-in-a");
    refs.onlyInB = document.getElementById("only-in-b");
    refs.schemaStrip = document.getElementById("schema-strip");
    refs.summaryA = document.getElementById("summary-a");
    refs.summaryB = document.getElementById("summary-b");
    refs.summaryNew = document.getElementById("summary-new");
    refs.summaryDeleted = document.getElementById("summary-deleted");
    refs.summaryModified = document.getElementById("summary-modified");
    refs.summaryUnchanged = document.getElementById("summary-unchanged");
    refs.resultsCaption = document.getElementById("results-caption");
    refs.resultCount = document.getElementById("result-count");
    refs.messageStack = document.getElementById("message-stack");
    refs.resultsTbody = document.getElementById("results-tbody");
    refs.pageIndicator = document.getElementById("page-indicator");
    refs.prevPage = document.getElementById("prev-page");
    refs.nextPage = document.getElementById("next-page");
    refs.exportBtn = document.getElementById("export-btn");
  }

  function setUploadState(side, data) {
    const meta = side === "a" ? refs.fileAMeta : refs.fileBMeta;
    const details = side === "a" ? refs.fileADetails : refs.fileBDetails;
    meta.textContent = data?.fileName ? `${data.fileName} loaded` : "No file selected";
    if (!data) {
      details.textContent = "Awaiting upload.";
      return;
    }
    details.textContent = `${Utils.formatNumber(data.rows.length)} rows, ${Utils.formatNumber(data.headers.length)} columns`;
  }

  function setKeyOptions(headers, selectedValue) {
    refs.keySelect.innerHTML = "";
    if (!headers.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Load or paste both datasets to detect shared columns";
      refs.keySelect.appendChild(option);
      refs.keySelect.disabled = true;
      return;
    }

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a key";
    refs.keySelect.appendChild(placeholder);

    headers.forEach((header) => {
      const option = document.createElement("option");
      option.value = header;
      option.textContent = header;
      refs.keySelect.appendChild(option);
    });

    refs.keySelect.disabled = false;
    refs.keySelect.value = selectedValue && headers.includes(selectedValue) ? selectedValue : headers[0] || "";
  }

  function setCompareEnabled(enabled) {
    refs.compareBtn.disabled = !enabled;
  }

  function setResults(result, page) {
    currentRows = result?.discrepancies || [];
    currentPage = page || 1;
    renderSummary(result);
    renderSchema(result);
    renderMessages(result);
    renderTablePage(currentPage);
    refs.resultsCaption.textContent = result
      ? `${Utils.formatNumber(result.summary.totalDiscrepancies)} discrepancy rows across ${Utils.formatNumber(result.summary.modifiedRecords)} modified records.`
      : "Load or paste both datasets to see the comparison.";
    refs.resultCount.textContent = `${Utils.formatNumber(currentRows.length)} discrepancy rows`;
    refs.exportBtn.disabled = !result || !currentRows.length;
  }

  function renderSchema(result) {
    if (!result || (!result.onlyInA.length && !result.onlyInB.length)) {
      refs.schemaStrip.hidden = true;
      return;
    }

    refs.schemaStrip.hidden = false;
    refs.onlyInA.textContent = result.onlyInA.length ? result.onlyInA.join(", ") : "None";
    refs.onlyInB.textContent = result.onlyInB.length ? result.onlyInB.join(", ") : "None";
  }

  function renderSummary(result) {
    const summary = result?.summary || {};
    refs.summaryA.textContent = Utils.formatNumber(summary.recordsA || 0);
    refs.summaryB.textContent = Utils.formatNumber(summary.recordsB || 0);
    refs.summaryNew.textContent = Utils.formatNumber(summary.newRecords || 0);
    refs.summaryDeleted.textContent = Utils.formatNumber(summary.deletedRecords || 0);
    refs.summaryModified.textContent = Utils.formatNumber(summary.modifiedRecords || 0);
    refs.summaryUnchanged.textContent = Utils.formatNumber(summary.unchangedRecords || 0);
  }

  function renderMessages(result, messages = []) {
    refs.messageStack.innerHTML = "";
    if (!messages.length) {
      if (result) {
        const message = document.createElement("div");
        message.className = "message message--success";
        message.textContent = `Comparison complete. ${Utils.formatNumber(result.summary.fieldDifferences)} field-level differences found.`;
        refs.messageStack.appendChild(message);
      }
      return;
    }

    messages.forEach((entry) => {
      const message = document.createElement("div");
      message.className = `message message--${entry.type || "info"}`;
      message.textContent = entry.text;
      refs.messageStack.appendChild(message);
    });
  }

  function renderTablePage(page) {
    const totalRows = currentRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    currentPage = Math.min(Math.max(page, 1), totalPages);
    const start = (currentPage - 1) * pageSize;
    const rows = currentRows.slice(start, start + pageSize);

    refs.pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    refs.prevPage.disabled = currentPage <= 1;
    refs.nextPage.disabled = currentPage >= totalPages;

    refs.resultsTbody.innerHTML = "";
    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.className = "table-empty";
      td.textContent = "No discrepancy rows to display.";
      tr.appendChild(td);
      refs.resultsTbody.appendChild(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = `result-row result-row--${row.type}`;

      const badgeCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `result-badge result-badge--${row.type}`;
      badge.textContent = row.status;
      badgeCell.appendChild(badge);

      const keyCell = document.createElement("td");
      keyCell.textContent = row.keyValue;

      const attributeCell = document.createElement("td");
      attributeCell.textContent = row.attribute;

      const valueACell = document.createElement("td");
      valueACell.className = "result-value";
      appendValueWithDiff(valueACell, row, "a");

      const valueBCell = document.createElement("td");
      valueBCell.className = "result-value";
      appendValueWithDiff(valueBCell, row, "b");

      const noteCell = document.createElement("td");
      noteCell.className = "result-note";
      noteCell.textContent = row.note;

      tr.appendChild(badgeCell);
      tr.appendChild(keyCell);
      tr.appendChild(attributeCell);
      tr.appendChild(valueACell);
      tr.appendChild(valueBCell);
      tr.appendChild(noteCell);
      refs.resultsTbody.appendChild(tr);
    });
  }

  function appendValueWithDiff(cell, row, side) {
    const left = String(row.valueA ?? "");
    const right = String(row.valueB ?? "");
    const value = side === "a" ? left : right;
    const shouldHighlight = shouldHighlightCell(row, side);

    if (!shouldHighlight || isPlaceholderValue(value)) {
      cell.textContent = value;
      return;
    }

    cell.classList.add("result-value--changed");
    const block = document.createElement("span");
    block.className = "result-value-block";
    const mark = document.createElement("mark");
    mark.className = "diff-mark";
    mark.textContent = value;
    block.appendChild(mark);
    cell.appendChild(block);
  }

  function isPlaceholderValue(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "present" || normalized === "missing";
  }

  function shouldHighlightCell(row, side) {
    if (!row || !row.type) {
      return false;
    }

    if (row.type === "modified") {
      return true;
    }

    if (row.type === "deleted") {
      // Highlight the side that still has the value (lost from the other dataset).
      return side === "a";
    }

    if (row.type === "new") {
      // Highlight the side that has the concrete value.
      return side === "b";
    }

    if (row.type === "schema") {
      const status = String(row.status || "").toLowerCase();
      if (status.includes("only in a")) {
        return side === "a";
      }
      if (status.includes("only in b")) {
        return side === "b";
      }
      return true;
    }

    return false;
  }

  function getCurrentPage() {
    return currentPage;
  }

  function setStatus(type, text) {
    Utils.setStatus(type, text);
  }

  function getRefs() {
    return refs;
  }

  global.DatasetDiffUI = {
    init,
    getRefs,
    setStatus,
    setUploadState,
    setKeyOptions,
    setCompareEnabled,
    setResults,
    renderTablePage,
    getCurrentPage,
    renderMessages,
  };
})(window);

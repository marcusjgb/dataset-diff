(function (global) {
  const Utils = {
    formatNumber(value) {
      const number = Number(value || 0);
      return new Intl.NumberFormat("en-US").format(Number.isNaN(number) ? 0 : number);
    },

    formatFileSize(bytes) {
      if (!Number.isFinite(bytes)) {
        return "0 B";
      }
      if (bytes < 1024) {
        return `${bytes} B`;
      }
      const units = ["KB", "MB", "GB"];
      let size = bytes / 1024;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
      }
      return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
    },

    normalizeHeader(value) {
      return String(value ?? "").replace(/^\uFEFF/, "").trim();
    },

    normalizeCellValue(value) {
      if (value === null || value === undefined) {
        return "";
      }
      return String(value).replace(/\r?\n/g, " ").trim();
    },

    isCsvFile(file) {
      if (!file) {
        return false;
      }
      const name = String(file.name || "").toLowerCase();
      return name.endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
    },

    downloadBlob(content, filename, mimeType) {
      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 250);
    },

    uniqueValues(values) {
      return [...new Set(values)];
    },

    intersection(left, right) {
      const rightSet = new Set(right);
      return left.filter((item) => rightSet.has(item));
    },

    difference(left, right) {
      const rightSet = new Set(right);
      return left.filter((item) => !rightSet.has(item));
    },

    getDuplicateValues(values) {
      const counts = new Map();
      for (const value of values) {
        const key = this.normalizeHeader(value);
        if (!key) {
          continue;
        }
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
    },

    setStatus(type, text) {
      const node = document.getElementById("app-status");
      if (!node) {
        return;
      }
      node.classList.remove("status-pill--idle", "status-pill--ready", "status-pill--warn", "status-pill--error");
      node.classList.add(`status-pill--${type}`);
      node.textContent = text;
    },

    safeText(value) {
      return this.normalizeCellValue(value) || "-";
    },
  };

  global.DatasetDiffUtils = Utils;
})(window);

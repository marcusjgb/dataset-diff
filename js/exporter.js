(function (global) {
  const Utils = global.DatasetDiffUtils;

  function exportDiscrepancies(result) {
    const rows = (result?.discrepancies || []).map((row) => ({
      status: row.status,
      key: row.keyValue,
      attribute: row.attribute,
      value_a: row.valueA,
      value_b: row.valueB,
      note: row.note,
    }));

    const csv = Papa.unparse(rows, {
      quotes: true,
      newline: "\n",
    });

    const stamp = new Date().toISOString().slice(0, 10);
    Utils.downloadBlob(csv, `datasetdiff-discrepancies-${stamp}.csv`, "text/csv;charset=utf-8");
  }

  global.DatasetDiffExporter = {
    exportDiscrepancies,
  };
})(window);

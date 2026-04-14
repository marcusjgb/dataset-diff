(function (global) {
  const Utils = global.DatasetDiffUtils;

  function createRowIndex(rows, key) {
    const index = new Map();
    const duplicates = [];

    rows.forEach((row, rowIndex) => {
      const keyValue = Utils.normalizeCellValue(row[key]);
      if (!keyValue) {
        return;
      }
      if (index.has(keyValue)) {
        duplicates.push({ keyValue, rowIndex });
        return;
      }
      index.set(keyValue, { row, rowIndex });
    });

    return { index, duplicates };
  }

  function compareDatasets(datasetA, datasetB, key) {
    const headersA = datasetA.headers || [];
    const headersB = datasetB.headers || [];
    const onlyInA = Utils.difference(headersA, headersB);
    const onlyInB = Utils.difference(headersB, headersA);
    const sharedHeaders = Utils.intersection(headersA, headersB);
    const comparableHeaders = sharedHeaders.filter((header) => header !== key);

    const rowsA = datasetA.rows || [];
    const rowsB = datasetB.rows || [];
    const indexA = createRowIndex(rowsA, key);
    const indexB = createRowIndex(rowsB, key);

    const discrepancies = [];
    let modifiedRecords = 0;
    let unchangedRecords = 0;
    let newRecords = 0;
    let deletedRecords = 0;
    let fieldDifferences = 0;

    for (const [keyValue, entryA] of indexA.index.entries()) {
      const entryB = indexB.index.get(keyValue);
      if (!entryB) {
        deletedRecords += 1;
        discrepancies.push({
          type: "deleted",
          status: "Deleted",
          keyValue,
          attribute: "Record",
          valueA: "Present",
          valueB: "Missing",
          note: "Exists only in dataset A.",
        });
        continue;
      }

      const differences = [];
      for (const header of comparableHeaders) {
        const valueA = Utils.normalizeCellValue(entryA.row[header]);
        const valueB = Utils.normalizeCellValue(entryB.row[header]);
        if (valueA !== valueB) {
          differences.push({
            type: "modified",
            status: "Modified",
            keyValue,
            attribute: header,
            valueA: valueA || "N/A",
            valueB: valueB || "N/A",
            note: "Value mismatch.",
          });
        }
      }

      if (differences.length) {
        modifiedRecords += 1;
        fieldDifferences += differences.length;
        discrepancies.push(...differences);
      } else {
        unchangedRecords += 1;
      }
    }

    for (const [keyValue] of indexB.index.entries()) {
      if (indexA.index.has(keyValue)) {
        continue;
      }
      newRecords += 1;
      discrepancies.push({
        type: "new",
        status: "New",
        keyValue,
        attribute: "Record",
        valueA: "Missing",
        valueB: "Present",
        note: "Exists only in dataset B.",
      });
    }

    onlyInA.forEach((header) => {
      discrepancies.unshift({
        type: "schema",
        status: "Column only in A",
        keyValue: "Schema",
        attribute: header,
        valueA: "Present",
        valueB: "Missing",
        note: "Schema difference.",
      });
    });

    onlyInB.forEach((header) => {
      discrepancies.unshift({
        type: "schema",
        status: "Column only in B",
        keyValue: "Schema",
        attribute: header,
        valueA: "Missing",
        valueB: "Present",
        note: "Schema difference.",
      });
    });

    return {
      key,
      headersA,
      headersB,
      onlyInA,
      onlyInB,
      sharedHeaders,
      discrepancies,
      summary: {
        recordsA: rowsA.length,
        recordsB: rowsB.length,
        newRecords,
        deletedRecords,
        modifiedRecords,
        unchangedRecords,
        fieldDifferences,
        totalDiscrepancies: discrepancies.length,
      },
      duplicatesA: indexA.duplicates,
      duplicatesB: indexB.duplicates,
    };
  }

  global.DatasetDiffComparator = {
    compareDatasets,
  };
})(window);

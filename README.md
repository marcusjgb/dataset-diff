# datasetdiff

Mini web tool to compare datasets in the browser, with no backend.

Built for quick daily analysis:
- compare CSV files
- paste snapshots from TOAD (tabular, with or without headers)
- paste JSON blocks (object, array of objects, or array of arrays)
- spot differences by row and by exact value
- export discrepancies to CSV

## Features

- Compares Dataset A vs Dataset B using a selected key
- Classifies results as `new`, `deleted`, `modified`, `schema`
- Highlights changes visually in the results table
- Supports manual CSV/JSON paste and one-click `Paste and compare`
- Includes `Reset` button to clear all state in one click
- Exports discrepancy rows to `.csv`

## Stack

- HTML + CSS + Vanilla JS
- [Papa Parse](https://www.papaparse.com/) for CSV parsing
- Static client-only app

## Project Structure

```txt
.
|-- index.html
|-- css/
|-- js/
|-- sample-data/
`-- assets/
```

## Quick Start

1. Open `index.html` in your browser.
2. Load two CSV files, or paste two CSV/JSON data blocks.
3. Select the primary key.
4. Click `Compare datasets` or `Paste and compare`.
5. Review results and export discrepancies if needed.

## TOAD Workflow

- Paste query output in Dataset A and Dataset B.
- If there are no headers, keep `Los datos incluyen headers` unchecked.
- Parser uses strict tab mode and also handles wide-space pastes.
- You can also paste JSON directly (single object, array of objects, array of arrays).
- Select `Col_1`, `Col_2`, etc. as key when headers are missing.

## Local Run

You can open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Project Status

- Functional MVP
- No backend
- No persistence (no history storage)
- Exact matching focused

## Sample Data

Use:
- `sample-data/dataset-a.csv`
- `sample-data/dataset-b.csv`

## License

Internal/demo use. Adjust as needed for your project.

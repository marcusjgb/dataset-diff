# Dataset Diff App — MVP

## 1. Objetivo del MVP

Crear una aplicación web simple, visual y rápida para comparar dos datasets en formato CSV directamente desde el navegador, sin backend.

La app debe permitir:
- cargar dos archivos CSV
- seleccionar una clave única para comparar registros
- detectar diferencias entre ambos datasets
- mostrar resultados de forma clara
- exportar el resultado

El objetivo no es resolver todos los casos posibles desde el inicio, sino lanzar una primera versión limpia, útil y publicable en GitHub Pages o Netlify.

---

## 2. Alcance exacto del MVP

### Incluye
- carga de 2 archivos CSV
- parseo de archivos en el navegador con JavaScript
- selección manual de columna clave
- comparación entre dataset A y dataset B
- detección de:
  - columnas presentes en A y no en B
  - columnas presentes en B y no en A
  - registros nuevos
  - registros eliminados
  - registros modificados
- resumen visual con totales
- tabla de resultados
- exportación de diferencias en CSV
- interfaz responsive básica
- diseño minimalista, claro y entendible

### No incluye en esta primera versión
- login o usuarios
- base de datos
- historial de comparaciones
- guardado de proyectos
- soporte para Excel `.xlsx`
- drag and drop avanzado
- comparación masiva de archivos muy pesados
- filtros complejos
- dark mode
- colaboración en tiempo real

---

## 3. Flujo de usuario

1. El usuario entra a la app.
2. Ve una pantalla simple con una breve explicación.
3. Sube el dataset A.
4. Sube el dataset B.
5. La app detecta las columnas.
6. El usuario elige la columna clave.
7. Presiona el botón de comparar.
8. La app muestra:
   - cantidad de registros en A
   - cantidad de registros en B
   - registros nuevos
   - registros eliminados
   - registros modificados
   - diferencias de columnas
9. El usuario revisa la tabla de resultados.
10. Puede exportar un CSV con el resultado de la comparación.

---

## 4. Reglas funcionales del MVP

### Entrada
- solo archivos `.csv`
- ambos archivos deben tener encabezados
- el usuario debe elegir una columna clave existente en ambos archivos
- si no existe una clave común, la app debe mostrar un mensaje claro

### Comparación
Cada fila se compara por la clave elegida.

La app debe clasificar:
- **nuevo**: existe en B pero no en A
- **eliminado**: existe en A pero no en B
- **modificado**: existe en ambos, pero cambia uno o más campos
- **sin cambios**: existe en ambos y no presenta diferencias

### Salida
- resumen numérico
- tabla con diferencias
- exportación de filas con diferencias

---

## 5. Requerimientos visuales

La interfaz debe transmitir:
- limpieza
- claridad
- espacio
- buena jerarquía visual
- foco en la lectura

### Estilo visual
- blanco y negro
- tipografía protagonista
- mucho espacio en blanco
- bordes sutiles
- sombras muy suaves o inexistentes
- layout centrado
- componentes grandes y cómodos
- tablas legibles
- sin emojis
- sin saturación visual
- sin exceso de colores

### Sensación buscada
Una herramienta técnica, moderna y confiable, pero agradable visualmente.

---

## 6. Stack sugerido

### Opción recomendada para salir rápido
- HTML
- CSS
- JavaScript vanilla

### Librerías útiles
- Papa Parse para leer CSV
- opcional: FileSaver si luego se quiere mejorar exportación

---

## 7. Estructura de carpetas

```txt
dataset-diff-app/
│
├── index.html
├── README.md
├── .gitignore
│
├── assets/
│   ├── icons/
│   └── images/
│
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── responsive.css
│
├── js/
│   ├── app.js
│   ├── csv-parser.js
│   ├── comparator.js
│   ├── exporter.js
│   ├── ui.js
│   └── utils.js
│
└── sample-data/
    ├── dataset-a.csv
    └── dataset-b.csv
```

---

## 8. Responsabilidad de cada archivo

### `index.html`
Contiene la estructura principal de la app:
- header
- sección introductoria
- inputs para subir archivos
- selector de clave
- botón comparar
- resumen
- tabla de resultados
- botón exportar

### `css/reset.css`
Normalización básica.

### `css/variables.css`
Variables visuales:
- colores
- espaciados
- tamaños tipográficos
- bordes
- ancho máximo

### `css/base.css`
Estilos globales:
- body
- tipografía
- contenedores
- botones
- inputs

### `css/layout.css`
Distribución de secciones y grillas.

### `css/components.css`
Cards, tabla, badges, mensajes, toolbar, etc.

### `css/responsive.css`
Ajustes para tablet y mobile.

### `js/app.js`
Inicialización general y eventos principales.

### `js/csv-parser.js`
Lectura y parseo de archivos CSV.

### `js/comparator.js`
Lógica de comparación entre datasets.

### `js/exporter.js`
Generación y descarga del archivo de salida.

### `js/ui.js`
Render del resumen, tabla y mensajes.

### `js/utils.js`
Funciones auxiliares reutilizables.

---

## 9. Módulos mínimos a desarrollar

### Módulo 1 — Carga de archivos
- input dataset A
- input dataset B
- validación de tipo CSV
- lectura de contenido

### Módulo 2 — Detección de columnas
- obtener encabezados
- poblar selector de clave
- validar que exista en ambos datasets

### Módulo 3 — Comparación
- indexar filas por clave
- detectar nuevos
- detectar eliminados
- detectar modificados
- contar sin cambios

### Módulo 4 — UI de resultados
- mostrar resumen
- mostrar tabla
- mostrar mensajes de error o éxito

### Módulo 5 — Exportación
- crear CSV con diferencias
- descargar desde navegador

---

## 10. Entregable mínimo para hoy

Si queremos dejarlo listo en pocas horas, el objetivo realista sería:

### Versión 0.1
- carga de dos CSV
- selección de clave
- comparación funcional
- resumen con métricas
- tabla básica de diferencias
- exportación CSV
- diseño minimalista usable

Eso ya sería suficiente para:
- subir a GitHub
- publicar demo
- mostrar en portfolio
- iterar luego con mejoras

---

## 11. Mejoras futuras

- soporte para `.xlsx`
- drag and drop
- filtros por tipo de cambio
- búsqueda en resultados
- paginación
- comparación por múltiples claves
- historial local en navegador
- modo oscuro
- diff visual campo por campo
- importar datasets desde URL
- versión con backend para archivos grandes

---

## 12. Prompt para diseñar la estética de la app

Usa este prompt para Stitch o cualquier IA de diseño:

```txt
Design a clean and minimal web application for comparing two CSV datasets.

The interface should feel modern, elegant, spacious, and highly readable. Use a black and white visual system only, with strong typography, subtle borders, large spacing, and a very clean layout. No emojis, no bright colors, no playful style, no visual clutter.

The app should include:
- a simple top header with the product name
- a short explanatory subtitle
- two upload areas for Dataset A and Dataset B
- a select input to choose the unique key column
- one primary button to start the comparison
- a summary section with key metrics
- a large table for comparison results
- an export button

Visual direction:
- minimalist SaaS style
- generous whitespace
- grid-based layout
- clean alignment
- monochrome palette
- elegant typography
- thin dividers
- subtle hover states
- clear visual hierarchy
- calm and professional interface
- attractive but not overloaded
- understandable for non-technical users

Avoid:
- gradients
- strong shadows
- too many cards
- excessive rounded corners
- flashy UI
- unnecessary icons
- crowded spacing

The final design should look premium, simple, technical, and easy to use.
```

---

## 13. Prompt extra para pedir el HTML/CSS inicial a una IA

```txt
Create a landing-style single-page interface for a dataset comparison web app.

Use only HTML and CSS. The design must be black and white, minimalistic, spacious, elegant, and highly readable. The interface should include:
- app title
- short subtitle
- two file upload sections
- one select input for key column
- one compare button
- one summary section with metrics cards
- one results table section
- one export button

The visual style must be clean and premium, with lots of whitespace, strong typography, subtle borders, and a centered layout. Avoid colorful elements, gradients, heavy shadows, and visual clutter. Make it responsive.
```

---

## 14. Nombre tentativo de la app

Opciones:
- DiffData
- DataDelta
- Dataset Compare
- CSV Diff
- Diffset

Recomendación inicial:
**DiffData**

Suena simple, técnico y fácil de recordar.

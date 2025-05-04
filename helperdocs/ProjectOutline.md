# WebCraft (MVP) - Project Outline

## 1. Goal

Define the Minimum Viable Product (MVP) for an adaptive, multi-agent web scraping system capable of extracting user-defined structured data from a **single target web page**. The system will automatically generate and potentially update its scraping schema based on a user-provided URL and a **comma-separated list of desired data fields**.

## 2. Core Components

*   **Agent Orchestrator:** Manages the workflow and communication between agents.
    *   *Proposed Tech:* CrewAI (initial recommendation) or custom script.
*   **Schema Extractor Agent:** Analyzes target page HTML (using a list of desired field names) and generates a CSS-based extraction schema dictionary.
    *   *Tech:* LLM (e.g., Gemini 2.5 Pro via `google-generativeai`), Python.
*   **Scraper Executor Agent:** Executes the scraping task **on a single page** using the schema provided by the Schema Extractor.
    *   *Tech:* Direct `playwright` + `beautifulsoup4`, Python.
*   **Monitor Logic:** Oversees the process, handles basic error conditions (like schema validation failure or no data extracted), and triggers schema regeneration logic.
    *   *Tech:* Implemented within the Orchestrator logic or main execution script.

## 3. MVP Workflow

1.  **User Input:**
    *   User provides the **Target URL** (pointing to the specific page containing the desired data).
    *   User provides a **Comma-Separated List** of the desired fields in a text area (e.g., `name, price, rating`).
    *   User selects the **Desired Output Format** (JSON or CSV).
2.  **Input Processing:**
    *   The comma-separated string is parsed into a list of field names (e.g., `['name', 'price', 'rating']`).
3.  **Initialization:**
    *   Monitor Logic checks if a valid schema exists in storage (e.g., SQLite DB) for the given Target URL (or a derived identifier).
    *   If no valid schema exists, Monitor triggers the Schema Extractor Agent.
4.  **Schema Generation:**
    *   Schema Extractor Agent fetches HTML for the **Target URL**.
    *   Schema Extractor Agent prompts the configured LLM (Gemini 2.5 Pro) with the fetched HTML and the **list of target fields** to generate a dictionary-based schema (defining `baseSelector` and `fields` with CSS selectors).
5.  **Schema Validation (New Step):**
    *   **Before saving,** a validation function uses the *just-generated schema* and the *fetched HTML*.
    *   It attempts to find elements matching the `baseSelector`.
    *   If found, it attempts to find elements for each `field` selector within the first `baseSelector` match.
    *   If validation fails (selectors don't find elements on the original page), the schema is discarded, an error is logged, and the process stops for this run (schema generation failed).
6.  **Schema Saving:**
    *   If validation passes, the schema is saved to storage (e.g., SQLite DB associated with the Target URL/identifier). Logs success.
7.  **Scraping Execution:**
    *   Monitor Logic retrieves the validated schema from storage. If retrieval fails (e.g., concurrent process deleted it), the process stops.
    *   Monitor Logic triggers the Scraper Executor Agent, providing the Target URL and the schema.
    *   Scraper Executor Agent uses its configured tool (`playwright` + `beautifulsoup4`) with the provided schema to scrape data **from the single Target URL page (`max_pages = 1`)**.
    *   Scraper Executor Agent returns the list of extracted raw data dictionaries.
8.  **Monitoring & Basic Adaptation:**
    *   Monitor Logic receives results from the Scraper Executor.
    *   If data is returned (`len(extracted_data) > 0`):
        *   Log success.
        *   The raw data (list of dictionaries) is processed into the **User's Chosen Format** (JSON or CSV).
        *   Save the formatted data to storage or return to the user.
    *   If *no* data is returned from the scraping execution:
        *   Log the failure (scraping returned empty despite valid schema).
        *   Assume the schema is stale/invalid due to site changes *since* generation/validation.
        *   Delete the schema from storage (or mark it invalid). This ensures the Schema Extractor runs on the *next* request for this target.
9.  **Logging:**
    *   Each agent/step logs its key actions, decisions, and outcomes to a central log file (e.g., `crawler.log`).
    *   The Monitor logic may write high-level summary status updates to `log.md`.

## 4. Key Technologies

*   **Programming Language:** Python 3.9+
*   **Agent Framework:** CrewAI (initial recommendation) or custom script
*   **LLM Interface:** `google-generativeai` (for Gemini Pro/Flash)
*   **Scraping Tool:** `playwright`, `beautifulsoup4`, `httpx`
*   **Data Handling:** JSON (native), CSV (native `csv` library)
*   **Storage:** SQLite, Redis (for caching schemas)

## 5. MVP Scope & Limitations

*   **Target:** General purpose for extracting structured data from a **single web page**, tested primarily on list-based pages.
*   **Input:** Requires a direct URL to the data page and a **comma-separated list** of desired fields.
*   **Navigation:** **No automated navigation or interaction.**
*   **Schema Generation:** Relies on the LLM's ability to generate a usable schema dictionary from one sample page and a field list; includes **basic structural validation and immediate selector validation** on the source page.
*   **Adaptation:** Minimal feedback loop. Schema is regenerated on next request if generation validation fails, or if scraping execution yields no data.
*   **Scraping:** Limited to a **single page (`max_pages=1`)**. No pagination handling.
*   **Error Handling:** Basic error handling within tools and workflow, including schema validation failures.
*   **Data Processing:** Converts extracted list of dictionaries to basic JSON or CSV.
*   **Anti-Scraping:** Relies on basic Playwright capabilities.
*   **Configuration:** LLM model names, target URLs (provided by user), basic settings.

## 6. Success Criteria

*   The system correctly parses a comma-separated string into a list of target fields.
*   The Schema Extractor Agent successfully generates a schema that **passes immediate validation** against the target URL's HTML.
*   The validated schema is successfully saved.
*   The Scraper Executor Agent successfully uses the validated schema to extract structured data (matching the requested fields) from the **single target page**.
*   The extracted data is successfully formatted into the user's chosen format (JSON or CSV) and saved/returned.
*   If schema validation fails, the schema is discarded.
*   If scraping execution fails to extract any data (after using a validated schema), the corresponding schema is deleted/invalidated for the target.
*   Key steps of the workflow are logged appropriately. 
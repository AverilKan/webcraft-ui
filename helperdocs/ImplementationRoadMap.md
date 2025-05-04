# Implementation Plan: WebCraft (MVP) - Prompt-Based Adaptive Data Retrieval

## 1. Environment & Initial Setup

**Goal:** Prepare the development environment, project structure, and essential configurations.

**Tasks:**
*   [ ] Install required system tools: Python (3.9+), Docker, Docker Compose. (Assuming Python 3.9+ is present via Conda)
*   [x] Set up the project directory structure.
*   [x] Create a `.env` file for storing the `GOOGLE_API_KEY`. (Placeholder created/requested)
*   [x] Initialize a virtual environment and install core Python packages. (Conda env created, packages installed via pip and pyproject.toml)
*   [x] Install Playwright browsers (`playwright install --with-deps chromium`).

**Directory Structure Example:**
(Refer to previous detailed plan for example structure)

**Core Packages (`pyproject.toml`):**
```toml
# Defined in [project.dependencies] and [project.optional-dependencies.dev]
# Example core:
# pydantic[dotenv]
# sqlmodel
# structlog
# tenacity
# prometheus-client
# anyio
# httpx[http2]
# playwright
# beautifulsoup4
# lxml
# google-generativeai
# redis # Optional
```

**Development Goals:**
*   [x] Confirm Python, Docker, and Docker Compose are installed. (Python via Conda confirmed; Docker/Compose assumed outside scope for now)
*   [x] Create the defined directory structure.
*   [x] Populate `.env` with a valid `GOOGLE_API_KEY`. (Placeholder requested; user needs to add key)
*   [x] Successfully install all packages from `pyproject.toml`.
*   [x] Successfully install Playwright browser dependencies.

**Outcome:** A ready-to-use development environment with the basic project structure and necessary dependencies installed.

---

## 2. Database & Caching Setup: SQLite + Redis

**Goal:** Configure persistent storage for schemas and results, and caching for efficiency.

**Tasks:**
*   [x] Implement a `DataManager` class using SQLite for storing generated schemas and scraping results. (Implemented as `SQLiteRepository`)
*   [x] Integrate Redis for caching retrieved schemas. (Implemented as `RedisCache`)
*   [x] Define database schema for storing schemas and results, keyed by a target identifier (e.g., derived from URL). (Defined in `models.py`)

**Development Goals:**
*   [ ] **SQLite Integration**: `DataManager` connects and creates the DB file and tables. (Code written, needs test/runtime verification)
*   [ ] **Redis Connection**: `DataManager` connects to a running Redis instance. (Code written, needs test/runtime verification)
*   [ ] **Schema CRUD**: Implement and test `save_schema`, `get_schema`, `delete_schema`. (Code written, needs test)
*   [ ] **Result Saving**: Implement and test `save_result`. (Code written, needs test)
*   [ ] **Caching Logic**: Ensure schema caching (get/set/delete) works correctly. (Code written, needs test)

**Outcome:** A reliable `DataManager` capable of storing/retrieving schemas and results, leveraging Redis for schema caching.

---

## 3. AI Model Initialization (Direct API)

**Goal:** Set up clients for interacting directly with Google's Generative AI models.

**Tasks:**
*   [x] Load the `GOOGLE_API_KEY` from the `.env` file. (Handled by `config.py` and `llm/client.py`)
*   [x] Configure the `google-generativeai` library. (Done in `llm/client.py`)
*   [x] Define helper functions or constants for accessing specific models (e.g., Gemini 2.5 Pro for schema generation). (Added `get_generative_model` in `llm/client.py`)

**Development Goals:**
*   [x] **API Key Loading**: Successfully load the key from `.env`. (Handled by `pydantic-settings`)
*   [x] **Library Configuration**: `genai.configure` runs without error. (Handled in `llm/client.py`, includes basic check)
*   [x] **Model Access**: Define constants/functions for easy access to the chosen models. (`get_generative_model` function created)
*   [ ] **Basic Test Call**: (Optional but recommended) Make a simple `generate_content` call using one model to confirm authentication and connectivity. (Will be done during agent implementation/testing)

**Outcome:** Configured access to the required Google AI models via direct API calls using the `google-generativeai` library.

---

## 4. Core Workflow Logic & Multi-Agent Implementation

**Goal:** Implement the core application logic using a Multi-Agent System (MAS) approach orchestrated via a custom `asyncio` script, ensuring robust schema validation before scraping.

**Tasks:**
*   [x] **Input Parsing:** Implement function in `utils/parsing.py` to parse comma-separated field string into a list.
*   [ ] **Define Core Agent Classes:** Implement distinct agent classes, each with clear responsibilities, async methods, inputs, and outputs.
    *   **`FetcherAgent` (`utils/network.py` or dedicated module):**
        *   [x] Responsibility: Retrieve raw HTML, handle retries (`tenacity`), check `robots.txt`, manage user-agent.
        *   Input: `target_url: str`
        *   Output: `html_content: str` | `FetchError`
    *   **`SchemaGeneratorAgent` (`schema_agent/extractor.py`):**
        *   Responsibility: Generate CSS selector schema via LLM (Gemini), handle LLM interaction, basic response parsing/sanitization, circuit breaker logic.
        *   Input: `html_content: str`, `fields: list[str]`
        *   Output: `proposed_schema: dict` (Pydantic model) | `SchemaGenerationError`
    *   **`SchemaValidatorAgent` (`schema_agent/validator.py`):**
        *   Responsibility: **Statically** validate proposed schema against **fetched HTML content** using `BeautifulSoup` + `lxml`. **(MVP: No Playwright here)**.
        *   Input: `proposed_schema: dict`, `html_content: str`
        *   Output: `validation_result: bool`, `validation_report: dict` (optional details) | `ValidationError`
    *   **`ScraperAgent` (`scraper_agent/executor.py`):**
        *   Responsibility: Execute scraping on the **live target URL** using a **validated schema** and **Playwright** (for dynamic content), extract data, handle Playwright errors.
        *   Input: `target_url: str`, `validated_schema: dict`
        *   Output: `scraped_data: list[dict[str, str]]` | `ScrapingError`
    *   **`StorageAgent` (Interface in `storage/repository.py`, implementations e.g., `SQLiteRepository`, `RedisCache`):**
        *   Responsibility: Persist/cache schemas, save results and run logs.
        *   Input: Schemas, results, keys, run info.
        *   Output: Confirmation/IDs | `StorageError`
*   [ ] **Implement Orchestrator (`agent_orchestrator/orchestrator.py`):**
    *   **`OrchestratorAgent` (or main workflow function):**
        *   Responsibility: Manage the end-to-end workflow, sequence agent calls, handle state, make decisions (schema validation -> save/fail, scrape success/fail -> format/invalidate), interact with `StorageAgent`, format final output.
        *   Input: User request (`url: str`, `fields: list[str]`, `output_format: str`)
        *   Output: Final result (file path, JSON/CSV string) | `WorkflowError`
    *   Implement the main `run_extraction_workflow` function using `asyncio` to coordinate the agents.
    *   [x] Integrate logging (`structlog`) throughout the orchestration process. (Logging setup done, integration needed)
*   [x] **Implement Utilities & Core:**
    *   [x] Define custom exception hierarchy (`core/exceptions.py`).
    *   [x] Implement output formatting/saving (`utils/file_handling.py`).
    *   [x] Setup logging configuration (`utils/logging_config.py` or similar).
*   [ ] **Implement CLI Entrypoint (`cli.py`):**
    *   Use `argparse` or `typer` for argument parsing.
    *   Initialize dependencies (Config, StorageAgent).
    *   Instantiate and run the `OrchestratorAgent`'s main workflow.
    *   Handle overall errors and print results/status to the console.

**Development Goals:**
*   [ ] **Agent Implementation**: Each agent class is implemented with its core logic and async methods, testable in isolation (with mocks).
*   [ ] **Orchestration Logic**: `OrchestratorAgent` correctly sequences calls to other agents based on outcomes (esp. validation).
*   [ ] **State Management**: State (HTML, schema, results) is passed correctly between agents via the orchestrator.
*   [ ] **Schema Validation Integration**: Ensure the `SchemaValidatorAgent` (using BS4 only) correctly gates the saving/use of schemas.
*   [ ] **Error Handling**: Implement robust error handling and propagation using the custom exception hierarchy within the orchestrator.
*   [ ] **Basic End-to-End Run**: Successfully execute the CLI for a simple case: fetch -> generate -> validate (pass) -> save schema -> scrape -> save results -> format output. Test validation failure path.

**Outcome:** A functional backend workflow implemented as a coordinated multi-agent system, capable of generating, validating (statically), and executing scraping tasks for a single page based on user input, with adaptive logic tied to validation and scraping success.

---

## 5. Web Scraping Implementation Details

**Goal:** Ensure the `ScraperAgent` correctly utilizes `playwright` and `beautifulsoup4` for dynamic, single-page extraction using a validated schema.

**Tasks:**
*   [ ] Implement the `ScraperAgent.scrape()` method using `playwright` to:
    *   Launch browser/context (managed lifecycle).
    *   Navigate to the `target_url`.
    *   Wait for relevant page state if necessary (e.g., elements to be present, though MVP focuses on static pages mostly).
    *   Apply the CSS selectors from the `validated_schema` using `page.query_selector_all()` or similar Playwright methods.
    *   Extract text or attributes as defined in the schema.
    *   Ensure browser/context is properly closed.
*   [ ] Integrate `beautifulsoup4` *within* the `ScraperAgent` if needed for complex parsing of HTML snippets obtained via Playwright, but prioritize Playwright's own selectors/methods.
*   [ ] Implement robust error handling within the agent to catch `playwright` navigation/interaction/timeout exceptions and parsing exceptions.
*   [ ] Ensure the agent returns data in a consistent format (`list[dict[str, str]]`) or raises specific `ScrapingError` exceptions.

**Development Goals:**
*   [ ] **Playwright Integration**: Confirm `ScraperAgent` correctly uses Playwright to load the live page and extract data based on the `validated_schema`.
*   [ ] **Schema Application**: Verify selectors (`baseSelector`, `fields`) are correctly applied in the Playwright context.
*   [ ] **Dynamic Content Handling (Basic)**: Ensure it works on pages requiring basic JS rendering, which Playwright handles by default.
*   [ ] **Lifecycle Management**: Verify browser/context are created and destroyed cleanly to prevent resource leaks.
*   [ ] **Output Handling**: Test successful data return, return of `[]` when base selector matches but field selectors don't find sub-elements, and appropriate `ScrapingError` for critical failures (page load fail, base selector not found on live page).

**Outcome:** A reliable `ScraperAgent` capable of executing dynamic extraction on a single live page based on a previously validated schema.

---

## 6. Data Processing & Storage Flow

**Goal:** Integrate the `StorageAgent` (or its direct repository implementations) and final data formatting into the orchestration flow.

**Tasks:**
*   [ ] Ensure the `OrchestratorAgent` correctly calls `StorageAgent` methods (e.g., `get_schema`, `save_schema`, `cache_schema`, `delete_schema_from_cache`, `save_result`, `log_run`) at the appropriate steps based on validation and scraping outcomes.
*   [ ] Implement formatting functions (`utils/file_handling.py`) to convert the `list[dict]` from `ScraperAgent` into JSON and CSV strings/files.
*   [ ] Ensure the `OrchestratorAgent` directs the final formatted data to the correct output (stdout or file via `utils/file_handling.py`).

**Development Goals:**
*   [ ] **Schema Persistence/Caching**: Verify validated schemas are saved to SQLite and Redis cache via `StorageAgent` calls from the orchestrator.
*   [ ] **Schema Retrieval**: Verify orchestrator correctly retrieves existing schemas via `StorageAgent`.
*   [ ] **Result Persistence**: Verify orchestrator saves extracted data and run logs via `StorageAgent`.
*   [ ] **Schema Invalidation Logic**: Verify orchestrator calls `StorageAgent` to potentially invalidate/remove schemas from cache/DB if `ScraperAgent` fails critically or returns no data after a previously successful validation (indicating staleness).
*   [ ] **Output Formatting**: Verify orchestrator uses formatting functions correctly based on user request.

**Outcome:** A complete workflow where the `OrchestratorAgent` manages schema/result persistence and caching via the `StorageAgent`, formats data correctly, and implements adaptive logic tied to storage based on agent outcomes.

---

## 7. API Integration (FastAPI - Optional MVP+)

**Goal:** Expose the adaptive scraping workflow via a simple REST API.

**Tasks:**
*   [ ] Set up a basic FastAPI application.
*   [ ] Create an endpoint (e.g., `/scrape`) that accepts target URL, comma-separated fields, and format.
*   [ ] Use FastAPI's `BackgroundTasks` to run the main workflow function asynchronously.
*   [ ] Implement endpoints to check status or retrieve results/schemas using the `DataManager`.

**Development Goals:**
*   [ ] **FastAPI Setup**: Basic app runs.
*   [ ] **Endpoint Definition**: `/scrape`, `/results/{id}`, `/schema/{id}` endpoints created (adjust as needed).
*   [ ] **Background Task**: Triggering the scrape endpoint successfully queues the workflow.
*   [ ] **Result Retrieval**: Fetching results/schemas via the API works.

**Outcome:** A basic API layer allowing external triggering and monitoring of the adaptive scraping process.

---

## 8. Frontend Integration (React Example - Optional MVP+)

**Goal:** Provide a minimal UI to interact with the API.

**Tasks:**
*   [ ] Create a simple React form to input target URL, comma-separated fields, and select format.
*   [ ] Call the `/scrape` endpoint on form submission.
*   [ ] Implement polling/display mechanism for job status.
*   [ ] Display results/schema fetched from API.

**Development Goals:**
*   [ ] **UI Form**: User can input scraping parameters.
*   [ ] **API Call**: Frontend successfully calls the `/scrape` endpoint.
*   [ ] **Result Display**: Frontend can poll/fetch and display results.

**Outcome:** A basic web interface for initiating and viewing adaptive scraping jobs.

---

## 9. Testing & Quality Assurance

**Goal:** Ensure the reliability and correctness of individual agents, the orchestration logic, and the overall workflow.

**Tasks:**
*   [ ] Write unit tests (`pytest`, `pytest-asyncio`) for:
    *   Individual `Agent` methods (e.g., `FetcherAgent.fetch`, `SchemaGeneratorAgent.generate`, `SchemaValidatorAgent.validate`, `ScraperAgent.scrape`), mocking external dependencies (HTTP calls, LLM API, Playwright, DB/Cache).
    *   `StorageAgent` repository methods.
    *   Utility functions (parsing, formatting).
    *   Core data models (`models.py`).
*   [ ] Write integration tests for:
    *   The `OrchestratorAgent`'s main workflow, mocking agent *interactions* but testing the flow logic (e.g., does validation failure correctly prevent scraping?).
    *   Schema Generation -> Static Validation sequence.
    *   Static Validation -> Live Scraping sequence (using a fixed, valid schema and potentially a local static HTML server).
    *   End-to-end CLI execution for key scenarios (happy path, validation fail, scraping fail), potentially mocking external services but testing the agent coordination and data flow through the orchestrator.
*   [ ] If API is implemented, write API tests (`httpx` against test client).

**Development Goals:**
*   [ ] **Unit Test Coverage**: Achieve high coverage for individual agent logic and utilities.
*   [ ] **Integration Test Coverage**: Key agent interaction sequences and orchestration logic paths are tested.
*   [ ] **Error Handling Tests**: Ensure the orchestrator and agents handle and propagate expected errors correctly (e.g., `FetchError`, `ValidationError`, `ScrapingError`).
*   [ ] **Schema Validation Test**: Specific unit tests for the `SchemaValidatorAgent` logic (using sample HTML and schemas).
*   [ ] **Agent Coordination Tests**: Integration tests verify the `OrchestratorAgent` calls the right agents in the right order based on intermediate results.

**Outcome:** A robust and reliable codebase with automated checks for agent functionalities, orchestration logic, error handling, and key workflow scenarios.

---

## 10. Docker & Deployment

**Goal:** Containerize the application for consistent deployment and execution.

**Tasks:**
*   [ ] Create a `Dockerfile` for the Python application (including Playwright browser install).
*   [ ] Update `docker-compose.yml` to define services (`app`, `redis`).
*   [ ] Ensure the `GOOGLE_API_KEY` is passed securely to the `app` service via the `.env` file.

**Development Goals:**
*   [ ] **Dockerfile Builds**: The `Dockerfile` successfully builds the application image, including Playwright setup.
*   [ ] **Docker Compose**: `docker-compose up` successfully starts the `app` and `redis` services.
*   [ ] **Connectivity**: The application within the container can connect to Redis.
*   [ ] **Environment Variables**: `GOOGLE_API_KEY` is correctly accessible within the `app` container.
*   [ ] **Workflow Execution**: The core workflow runs successfully within the containerized environment.

**Outcome:** A containerized version of the application, ready for local testing or deployment, ensuring a consistent environment.

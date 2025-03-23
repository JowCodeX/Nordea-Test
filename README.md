# Nordea SPAR Lookup Service

This project provides a service to look up person information from the Swedish Population Address Register (SPAR) using SOAP requests. It's built with Node.js, Express, and TypeScript.

## Overview

The service exposes a single endpoint (`/`) that accepts a Swedish personal identity number (`personnummer`) and returns the corresponding information from SPAR. It handles SOAP request construction, certificate-based authentication, XML parsing, and response formatting.

## Features

-   **SOAP Request Generation:** Dynamically generates SOAP requests based on an XML template and provided credentials.
-   **Certificate-Based Authentication:** Uses SSL certificates for secure communication with the SPAR service.
-   **XML Parsing:** Parses the SOAP response using `fast-xml-parser`.
-   **Data Transformation:** Formats the raw SPAR response into a more user-friendly JSON structure.
-   **Error Handling:** Implements robust error handling for various scenarios, including:
    -   Missing `personnummer`
    -   Failed certificate loading
    -   Failed SOAP request
    -   XML parsing errors
    -   Invalid SPAR response structure
    -   Protected identity
    -   Person not found
    -   SPAR service unavailability
    -   SSL certificate validation errors
-   **Environment-Specific Configuration:** Supports different configurations for development, testing, and production environments.
-   **Detailed Logging:** Logs important events, errors, and request/response details for debugging.
- **Test Environment Support:** The code has a specific logic for the test environment.

## Technologies

-   **Node.js:** JavaScript runtime environment.
-   **Express:** Web framework for Node.js.
-   **TypeScript:** Typed superset of JavaScript.
-   **Axios:** Promise-based HTTP client.
-   **fast-xml-parser:** Fast XML parser for Node.js.
-   **HTTPS:** Node.js built-in module for secure HTTP requests.
-   **fs:** Node.js built-in module for file system operations.
-   **path:** Node.js built-in module for working with file and directory paths.

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/JowCodeX/Nordea-Test.git
    cd Nordea-Test
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Variables:**

    Create a `.env` file in the root directory and define the following environment variables:

    ```
    SPAR_CUSTOMER_NUMBER=<your-spar-customer-number>
    SPAR_ASSIGNMENT_ID=<your-spar-assignment-id>
    SPAR_WSDL_URL=<your-spar-wsdl-url>
    SPAR_CERTS_CERT=<path-to-your-cert-file>
    SPAR_CERTS_KEY=<path-to-your-key-file>
    SPAR_CERTS_CA=<path-to-your-ca-file>
    NODE_ENV=<environment> # e.g., development, test, production
    ```

    -   `SPAR_CUSTOMER_NUMBER`: Your customer number for SPAR.
    -   `SPAR_ASSIGNMENT_ID`: Your assignment ID for SPAR.
    -   `SPAR_WSDL_URL`: The WSDL URL for the SPAR service.
    -   `SPAR_CERTS_CERT`: The path to your client certificate file.
    -   `SPAR_CERTS_KEY`: The path to your client key file.
    -   `SPAR_CERTS_CA`: The path to the CA certificate file.
    - `NODE_ENV`: The current environment.

4. **Certificate Files:**
    - Place your certificate files (`.crt`, `.key`, `.pem`) in a secure location and update the paths in the `.env` file.

5.  **Build the project:**

    ```bash
    npm run build
    ```

6.  **Start the server:**

    ```bash
    npm start
    ```

## Usage

### Endpoint

-   **`GET /`**

    -   **Request:**
        -   **Query Parameter:** `personnummer` (Swedish personal identity number)
        -   Example: `GET /?personnummer=199001011234`
    -   **Response:**
        -   **200 OK:** Person found.
            ```json
            {
                "data": {
                    "name": "John Doe",
                    "birthDate": "1990-01-01",
                    "adress": {
                        "street": "Example Street 123",
                        "postalCode": "12345",
                        "city": "Example City"
                    },
                    "protectedIdentity": false,
                    "lastUpdated": "2023-10-27"
                }
            }
            ```
        -   **400 Bad Request:** Missing `personnummer`.
            ```json
            {
                "error": "Missing personnummer",
                "code": "MISSING_PARAM"
            }
            ```
        -   **403 Forbidden:** Protected identity.
            ```json
            {
                "error": "Protected identity",
                "code": "PROTECTED"
            }
            ```
        -   **404 Not Found:** Person not found.
            ```json
            {
                "error": "Person not found",
                "code": "PERSON_NOT_FOUND"
            }
            ```
        -   **500 Internal Server Error:** Various internal errors.
            ```json
            {
                "error": "Failed to load SOAP request template",
                "code": "TEMPLATE_NOT_FOUND"
            }
            ```
            ```json
            {
                "error": "Failed to parse SOAP response",
                "code": "XML_PARSE_ERROR"
            }
            ```
            ```json
            {
                "error": "Invalid SPAR response structure",
                "code": "INVALID_RESPONSE"
            }
            ```
            ```json
            {
                "error": "Failed to load SSL certificates",
                "code": "CERT_LOAD_ERROR"
            }
            ```
            ```json
            {
                "error": "SSL certificate validation failed",
                "code": "SSL_CERT_ERROR",
                "message": "The application could not verify the SPAR server's SSL certificate"
            }
            ```
        - **503 Service Unavailable:** SPAR service is unavailable.
            ```json
            {
                "error": "SPAR service unavailable",
                "code": "SPAR_UNAVAILABLE"
            }
            ```

## Project Structure


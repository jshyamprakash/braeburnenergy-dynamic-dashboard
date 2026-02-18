The Losant Enterprise IoT Platform is organized into five primary pillars: End-User Experiences, the Visual Workflow Engine, Data Visualization, Devices and Data Sources, and Edge Compute. These features collectively allow for scaling IoT applications from initial prototypes to millions of concurrent device connections.
1. Device Management and Connectivity
Devices in Losant represent physical sensors or virtual resources that store data as attributes in a time-series database.
• Device Classes: The platform supports multiple connectivity models, including Standalone (direct cloud connection), Gateway (proxy for other devices), Peripheral (indirect connection via gateway), Edge Compute (runs local logic), Embedded (logic for microcontrollers), and System (logical digital twins).
• Device State: Represents a snapshot of a device's condition at a specific time, which can be reported via MQTT or REST APIs.
• Device Recipes: These templates allow for the rapid creation of multiple devices with identical configurations, attributes, and tags.
2. Visual Workflow Engine
Workflows are the "brains" of the platform, enabling devices to communicate and trigger actions without traditional server management.
• Workflow Types: There are four specialized types: Application (cloud-based general processing), Experience (back-end logic for web interfaces), Edge (local execution on gateways), and Embedded (logic updateable on-the-fly for microcontrollers).
• Drag-and-Drop Editor: Users implement business logic using various nodes, such as Logic nodes (Conditional), Data nodes (Table/Device state), and Output nodes (SMS/Email/WhatsApp).
• Function Node: Allows for the execution of arbitrary JavaScript for complex data manipulation, supported by an AI-powered code generation service.
3. Data Visualization (Dashboards)
Dashboards provide a flexible interface for analyzing patterns and detecting anomalies in real-time or historical data.
• Visualization Blocks: Dozens of pre-built blocks are available, including Time Series Graphs, Gauge blocks, GPS History, and Image Overlays for SCADA-style displays.
• Custom HTML Block: Offers full control over data representation by allowing developers to use their own HTML, CSS, and JavaScript libraries like Chart.js or D3.js.
• Reporting: Dashboards can be sent as one-time or recurring PDF email reports.
4. End-User Experiences
This component enables the delivery of custom-branded web interfaces and APIs directly from the Losant platform.
• Architecture: Experiences are built using Endpoints (HTTP routes), Workflows (processing logic), and Views (HTML/Handlebars templates or Dashboard Pages).
• User Management: Includes built-in support for Experience Users and Groups to manage multi-tenancy and secure access.
• Streaming Endpoints: Uses Server-Sent Events (SSE) to push real-time device data to a user's browser without constant polling.
5. Advanced Analytics and Data Storage
Beyond real-time processing, Losant provides tools for batch analysis and structured data management.
• Jupyter Notebooks: Integrates with Jupyter to perform batch processing on large historical datasets, such as predicting equipment failure.
• Resource Jobs: Designed for mass-resource operations, such as performing bulk updates to thousands of devices or data table rows.
• Data Tables: A relational storage system for semi-static metadata like fault codes or user preferences.
• Application Files: A hosted environment for storing binary assets like images, stylesheets, or firmware binaries for OTA updates.
6. Administrative and Security Features
• Connected Product Foundation (CPF): A production-ready template that includes pre-built implementation for multitenancy, user roles, and white-labeling to reduce development time.
• Service Credentials: A secure vault for storing encrypted authentication keys for third-party providers like AWS, Azure, and Google Cloud.
• API Tokens: Provides granular, scoped access to the Losant REST API for external integrations.
• Application Globals: Stores up to 100 key/value pairs accessible across the platform as a "single source of truth" for configuration.
• Application Archiving: Performs automatic daily backups of application configurations to a third-party Git repository.
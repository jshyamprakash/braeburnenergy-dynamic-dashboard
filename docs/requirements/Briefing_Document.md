Losant IoT Platform: Comprehensive Briefing Document

Executive Summary

The Losant Enterprise IoT Platform is an application enablement environment designed to manage, visualize, and analyze data for connected products at scale. Central to its current offering is the Connected Product Foundation (CPF), a production-ready template that simplifies the creation of multi-tenant IoT applications. The platform’s architecture is built on five pillars: End-User Experiences, a Visual Workflow Engine, Data Visualization (including Jupyter Notebook integration), Devices/Data Sources, and Edge Compute.

Critical takeaways include:

* Multi-tenancy Architecture: The CPF uses a "Customer > Site > Device" hierarchy to ensure secure data isolation and delegated management.
* Flexible Visualization: Beyond standard dashboards, Losant provides advanced blocks like "Custom HTML" (supporting AI-assisted code generation) and "Image Overlay" for SCADA-style displays.
* Hybrid Logic Execution: Workflows can execute in the cloud (Application/Experience) or at the edge (Gateway/Embedded), allowing for local decision-making in resource-constrained environments.
* Advanced Batch Analytics: Integration with Jupyter Notebooks allows for complex, historical data analysis that goes beyond real-time stream processing.


--------------------------------------------------------------------------------


1. The Connected Product Foundation (CPF)

The CPF is a prebuilt application template designed to reduce development complexity. It provides out-of-the-box functionality for user management, multitenancy, and device administration.

Hierarchy and Tenancy

The CPF operates on a tiered structure to maintain data security and organizational clarity:

* Customers: The top-level tenant. Only System Administrators can create customers.
* Sites: Locations or groupings under a customer. Sites are created by System or Customer Admins.
* Devices: The physical assets associated with a specific site.

User Roles and Permissions

The platform defines three primary roles for users within the CPF:

* Viewer: Read-only access to device properties, dashboards, and events.
* Editor: Can modify device and site properties and edit event comments/statuses.
* Admin: Full management capabilities, including adding/removing users, devices, and sites.

White Labeling and Customization

The CPF allows for extensive "White Labeling" through its admin interface, enabling developers to modify the look and feel without custom code:

* Logos and Branding: Supports large logos for login pages, small logos for navigation, and favicons for browser tabs.
* Color Schemes: Allows customization of primary/secondary colors, success/danger indicators, and text/background shades to match corporate branding.
* Navigation: System Admins can control the visibility of navigation items based on tenancy level and user role.


--------------------------------------------------------------------------------


2. Device Connectivity and Communication

Losant utilizes industry-standard protocols, primarily MQTT and REST, for device-to-cloud communication.

Gateways and Peripherals

Devices are classified based on their connectivity capabilities:

* Gateways: Devices that connect directly to Losant and can report state for themselves or for "Peripheral" devices.
* Peripherals: Devices (e.g., Bluetooth sensors) that cannot connect to the internet directly and rely on a gateway to proxy their data.
* Floating Peripherals: Devices permitted to report state through any gateway within an application.

State and Commands

* State: A snapshot of a device’s attributes (e.g., temperature, GPS) at a specific point in time.
* Commands: Instructions sent from the platform to a device to trigger a physical action.
* Custom MQTT Topics: Users can configure custom topics to trigger workflows, allowing for data pre-processing or transformation before state is officially recorded.


--------------------------------------------------------------------------------


3. Visual Workflow Engine

The Visual Workflow Engine is a drag-and-drop editor for implementing business logic. Workflows are categorized by where they execute and what they interact with.

Workflow Classifications

Workflow Type	Execution Location	Primary Use Case
Application	Losant Cloud	Backend business logic and device interactions.
Experience	Losant Cloud	Powering custom end-user interfaces and APIs.
Edge	Gateway Edge Agent (GEA)	Local processing on gateway hardware (e.g., Raspberry Pi).
Embedded	Embedded Edge Agent (EEA)	Execution on resource-constrained hardware (e.g., microcontrollers).

Embedded Workflow Limitations

Due to the low-power nature of embedded hardware, EEA workflows have specific constraints:

* No parallel execution paths.
* Maximum payload path depth of 16 levels.
* No support for native Handlebars or format helpers.
* Requires manual MQTT client integration in the device's native code.


--------------------------------------------------------------------------------


4. Data Storage and Advanced Management

Device State vs. Data Tables

* Device State: Optimized for time-series data. It is the primary source for all dashboard visualizations and aggregations.
* Data Tables: Intended for static or semi-static data (e.g., fault codes, metadata, security rules). They support up to 50 custom columns and three data types: String, Number, and Boolean.

Resource Jobs

Resource Jobs enable batch processing across application resources (Devices, Data Table Rows, or Users).

* Execution: Can be serial (one iteration at a time) or parallel (up to 10 at once).
* Acknowledgment: Workflows must use a "Job: Acknowledge Node" to mark an iteration as a success or failure, ensuring the job tracks progress accurately.


--------------------------------------------------------------------------------


5. Advanced Visualization and Analytics

Custom HTML Block

This advanced dashboard block allows for bespoke visualizations using HTML, CSS, and JavaScript.

* AI Code Generation: Developers can use a prompt-based AI service to generate graphing code (e.g., using Chart.js or Google Charts) based on their configured data queries.
* Interactivity: Blocks can emit and subscribe to custom events, allowing one block to influence another on the same dashboard.

Jupyter Notebook Integration

Notebooks provide a mechanism for batch analytics on historical data.

* Inputs: Can ingest Device Data, Metadata, Connection History, Data Tables, and Event Data.
* Query Time: An "anchor point" used to build relative time ranges (e.g., "60 minutes before the query time").
* Outputs: Insights can be saved back to Application Files (e.g., a histogram PNG) or written to Data Tables.

Image Overlay and SCADA Displays

The Image Overlay block allows users to place dynamic indicators, bars, and labels over a background image (e.g., a blueprint or a machine diagram). This is commonly used for:

* Smart Environments: Visualizing occupancy or temperature on a floor plan.
* SCADA: Displaying tank fill levels or valve statuses in an industrial setting.


--------------------------------------------------------------------------------


6. Real-Time Interactions: Streaming Endpoints

Streaming Endpoints utilize Server-Sent Events (SSE) to push real-time data to experience pages without constant polling.

* Mechanism: A persistent HTTP connection remains open, pushing new device state or MQTT messages as they occur.
* Implementation: Requires an Experience Endpoint configured with an "SSE Stream" reply type and client-side JavaScript using the EventSource API.

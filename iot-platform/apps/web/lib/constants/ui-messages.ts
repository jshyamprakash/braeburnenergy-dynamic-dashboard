/**
 * UI prerequisite guard messages.
 *
 * Used as `title` tooltip text on disabled Create buttons (ADR-035, ADR-036).
 * Import from this file — never hardcode these strings inline.
 */
export const PREREQ_TOOLTIPS = {
  /** Global list pages (/devices, /workflows, /dashboards): no application exists yet */
  NO_APPLICATION: 'Create an application first — go to Applications to get started',

  /** Application Detail > Workflows tab: application has no devices */
  NO_DEVICE_FOR_WORKFLOW: 'Create a device first to add workflows',

  /** Application Detail > Dashboards tab: application has no devices AND no workflows */
  NO_DEVICE_AND_WORKFLOW_FOR_DASHBOARD: 'Create a device and workflow first to add dashboards',

  /** Application Detail > Dashboards tab: application has no devices (but has workflows) */
  NO_DEVICE_FOR_DASHBOARD: 'Create a device first to add dashboards',

  /** Application Detail > Dashboards tab: application has no workflows (but has devices) */
  NO_WORKFLOW_FOR_DASHBOARD: 'Create a workflow first to add dashboards',
} as const;

/**
 * Empty-state guidance text shown when entity lists are empty and
 * the user needs to be directed to create prerequisites first.
 */
export const EMPTY_STATE_GUIDANCE = {
  /** /devices empty state when no applications exist */
  NO_APPLICATION_FOR_DEVICES:
    'Create an application first, then add devices from the Application Detail page.',

  /** /workflows empty state when no applications exist */
  NO_APPLICATION_FOR_WORKFLOWS:
    'Create an application first, then add workflows from the Application Detail page.',
} as const;

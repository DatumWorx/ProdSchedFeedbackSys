// Type augmentations for Asana SDK
// The @types/asana package is missing some methods that exist in the runtime SDK

import 'asana';

declare module 'asana' {
  namespace resources {
    interface Projects {
      /**
       * Returns the compact project records for some filtered set of projects.
       * Use one or more of the provided filters to search for specific projects.
       * @param workspaceGid Globally unique identifier for the workspace or organization.
       * @param params Parameters for the request
       * @param dispatchOptions Options, if any, to pass the dispatcher for the request
       * @return The response from the API
       */
      getProjectsForWorkspace(
        workspaceGid: string | number,
        params?: any,
        dispatchOptions?: any
      ): Promise<{ data: Projects.Type[] }>;
    }

    interface Sections {
      /**
       * Returns the compact records for all sections in the specified project.
       * @param projectGid The project to get sections from.
       * @param params Parameters for the request
       * @param dispatchOptions Options, if any, to pass the dispatcher for the request
       * @return The response from the API
       */
      getSectionsForProject(
        projectGid: string | number,
        params?: any,
        dispatchOptions?: any
      ): Promise<{ data: Sections.Type[] }>;
    }

    interface Attachments {
      /**
       * Returns the complete record for a single attachment.
       * @param attachmentGid Globally unique identifier for the attachment.
       * @param params Parameters for the request
       * @param dispatchOptions Options, if any, to pass the dispatcher for the request
       * @return The requested resource
       */
      getAttachment(
        attachmentGid: string | number,
        params?: any,
        dispatchOptions?: any
      ): Promise<Attachments.Type>;
    }

    interface CustomField {
      /**
       * Text value for text custom fields
       */
      text_value?: string | null;
      
      /**
       * Date value for date custom fields (ISO 8601 date string)
       */
      date_value?: string | null;
      
      /**
       * Array of enum values for multi_enum custom fields
       */
      multi_enum_values?: Array<{
        gid: string;
        name: string;
        enabled: boolean;
        color: string;
      }> | null;
    }
  }
}

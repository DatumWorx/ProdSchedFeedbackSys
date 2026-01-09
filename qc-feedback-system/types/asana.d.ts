declare module 'asana' {
  export interface Client {
    projects: {
      getProjectsForWorkspace(workspaceGid: string, options?: any): Promise<any>;
    };
    sections: {
      getSectionsForProject(projectGid: string, options?: any): Promise<any>;
    };
    tasks: {
      getTasksForSection(sectionGid: string, options?: any): Promise<any>;
      getTask(taskGid: string, options?: any): Promise<any>;
    };
    customFields: {
      getCustomField(fieldGid: string, options?: any): Promise<any>;
    };
  }

  export namespace Client {
    function create(options: { authType: string; token: string }): Client;
  }
}


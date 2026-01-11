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
    attachments: {
      getAttachment(attachmentGid: string, options?: any): Promise<any>;
    };
    dispatcher: {
      get(path: string, params?: any, options?: any): Promise<any>;
    };
    customfields: {
      findByWorkspace(workspaceGid: string, options?: any): Promise<any>;
      findById(customFieldGid: string, options?: any): Promise<any>;
    };
    users: {
      getUser(userGid: string, options?: any): Promise<any>;
    };
    workspaces: {
      getWorkspace(workspaceGid: string, options?: any): Promise<any>;
      getWorkspaces(options?: any): Promise<any>;
    };
  }

  export namespace Client {
    function create(options: { authType: string; token: string }): Client;
  }
}


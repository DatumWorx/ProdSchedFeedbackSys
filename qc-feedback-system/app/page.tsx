'use client';

import { useState, useEffect } from 'react';

interface Department {
  gid: string;
  name: string;
}

interface Machine {
  gid: string;
  name: string;
  color: string;
}

interface Operator {
  name: string;
}

interface Task {
  gid: string;
  name: string;
  section: string;
  startDate: string | null;
  dueDate: string | null;
  machine: string | null;
  customFields: Record<string, any>;
}

interface CompletedTask {
  gid: string;
  name: string;
  section: string;
  startDate: string | null;
  dueDate: string | null;
  customFields: Record<string, any>;
}

interface Attachment {
  gid: string;
  name: string;
  downloadUrl: string | null;
  viewUrl: string | null;
  resourceSubtype: string;
  createdAt: string;
}

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<string>('');

  const [loading, setLoading] = useState(false);

  // Load Production Departments (Asana Projects) on mount
  useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => {
        if (data.departments) {
          setDepartments(data.departments);
        }
      })
      .catch(console.error);
  }, []);

  // Load Machines (Prod Dept custom field enum values) when Department changes
  useEffect(() => {
    if (!selectedDepartment) {
      setMachines([]);
      return;
    }

    fetch(`/api/machines?department=${encodeURIComponent(selectedDepartment)}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          console.error(`HTTP error! status: ${res.status}`, data);
          throw new Error(data.error || `HTTP error! status: ${res.status}`);
        }
        return data;
      })
      .then(data => {
        if (data.error) {
          console.error('Error from machines API:', data.error, data.details || '');
          setMachines([]);
        } else if (data.machines) {
          setMachines(data.machines);
        } else {
          console.warn('No machines data in response:', data);
          setMachines([]);
        }
      })
      .catch(err => {
        console.error('Error fetching machines:', err);
        setMachines([]);
      });
  }, [selectedDepartment]);

  // Load Operators when Department changes
  // Note: Operators are stored in DB for pay scale/utilization tracking, not used for filtering
  useEffect(() => {
    fetch(`/api/operators${selectedDepartment ? `?department=${encodeURIComponent(selectedDepartment)}` : ''}`)
      .then(res => res.json())
      .then(data => {
        if (data.operators) {
          setOperators(data.operators);
        }
      })
      .catch(console.error);
  }, [selectedDepartment]);

  // Load Parts (Tasks) when Department is selected
  // Domain Model:
  //   - Department = Production Department (corresponds to Asana Project)
  //   - Machine = Prod Dept custom field value
  //   - Operator = who is running the job (stored in DB for pay scale/utilization tracking)
  //   - Part = Tasks on the selected Production Department, filtered by Prod Dept custom field if Machine is selected
  // Note: Tasks are NOT filtered by operator - operators are selected manually for logging data
  // Tasks are filtered by the selected department's project (required), then optionally by Machine (Prod Dept custom field)
  useEffect(() => {
    if (!selectedDepartment) {
      setTasks([]);
      setCompletedTasks([]);
      return;
    }

    const department = departments.find(d => d.name === selectedDepartment);
    if (!department) return;

    setLoading(true);
    // Filter Parts (Tasks) by the selected department's project GID
    // Then optionally filter by Machine (Prod Dept custom field) if Machine is selected
    const projectGid = department.gid; // Department is an Asana Project, so gid is the project GID
    fetch(`/api/tasks?projectGid=${projectGid}${selectedMachine ? `&machine=${encodeURIComponent(selectedMachine)}` : ''}`)
      .then(res => res.json())
      .then(data => {
        if (data.tasks) {
          setTasks(data.tasks);
        }
        if (data.completedTasks) {
          setCompletedTasks(data.completedTasks);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedDepartment, selectedMachine, departments]);

  // Auto-select Machine (Prod Dept custom field) when a Part (Task) is selected
  useEffect(() => {
    if (!selectedPart || machines.length === 0) {
      return;
    }

    const task = tasks.find(t => t.gid === selectedPart);
    if (!task) return;

    // Get Machine (Prod Dept custom field) value from the Part's machine field or custom fields
    let taskMachine: string | null = null;
    
    if (task.machine) {
      taskMachine = task.machine;
    } else if (task.customFields) {
      // Try to find Prod Dept custom field (GID: 1210998867548457)
      const prodDeptField = Object.values(task.customFields).find(
        (field: any) => field.name === 'Prod Dept' || field.gid === '1210998867548457'
      );
      if (prodDeptField && prodDeptField.value) {
        taskMachine = String(prodDeptField.value);
      }
    }

    // If Part has a Machine value and it's in the available machines list, auto-select it
    // Only update if the machine is different to avoid unnecessary reloads
    if (taskMachine && taskMachine !== selectedMachine && machines.some(m => m.name === taskMachine)) {
      setSelectedMachine(taskMachine);
    }
  }, [selectedPart, tasks, machines, selectedMachine]);

  // Load attachments when a task is selected
  useEffect(() => {
    if (!selectedPart) {
      setAttachments([]);
      return;
    }

    setLoadingAttachments(true);
    fetch(`/api/attachments?taskGid=${encodeURIComponent(selectedPart)}`)
      .then(res => res.json())
      .then(data => {
        if (data.attachments) {
          setAttachments(data.attachments);
        } else {
          setAttachments([]);
        }
        setLoadingAttachments(false);
      })
      .catch(err => {
        console.error('Error fetching attachments:', err);
        setAttachments([]);
        setLoadingAttachments(false);
      });
  }, [selectedPart]);

  const selectedTask = tasks.find(t => t.gid === selectedPart);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Production Scheduling Feedback System
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Production Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedMachine('');
                  setSelectedPart('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.gid} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Machine Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => {
                  setSelectedMachine(e.target.value);
                  setSelectedPart('');
                }}
                disabled={!selectedDepartment}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
              >
                <option value="">Select Machine</option>
                {machines.map(machine => (
                  <option key={machine.gid} value={machine.name}>
                    {machine.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Operator Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operator
              </label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                disabled={!selectedDepartment}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
              >
                <option value="">Select Operator</option>
                {operators.map(op => (
                  <option key={op.name} value={op.name}>
                    {op.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Part Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part
              </label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                disabled={!selectedDepartment || loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
              >
                <option value="">Select Part</option>
                {loading ? (
                  <option disabled>Loading...</option>
                ) : (
                  tasks.map(task => (
                    <option key={task.gid} value={task.gid}>
                      {task.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Part (Task) Details */}
        {selectedTask && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Part Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-base font-medium text-gray-700">Task Name</p>
                <p className="text-lg text-gray-900">{selectedTask.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-gray-700">Section</p>
                <p className="text-lg text-gray-900">{selectedTask.section}</p>
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-gray-700">Start Date/Time</p>
                <p className="text-lg text-gray-900">
                  {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-gray-700">Due Date/Time</p>
                <p className="text-lg text-gray-900">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-gray-700">Machine</p>
                <p className="text-lg text-gray-900">{selectedTask.machine || 'Not assigned'}</p>
              </div>
            </div>

            {/* Custom Fields */}
            {Object.keys(selectedTask.customFields).length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Custom Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(selectedTask.customFields).map(([gid, field]: [string, any]) => (
                    <div key={gid} className="border-l-4 border-blue-500 pl-4 py-2 space-y-1">
                      <p className="text-base font-medium text-gray-700">{field.name}</p>
                      <p className="text-lg text-gray-900">
                        {field.value !== null && field.value !== undefined
                          ? String(field.value)
                          : 'Not set'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDF Attachments */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">PDF Attachments</h3>
              {loadingAttachments ? (
                <p className="text-gray-600">Loading attachments...</p>
              ) : attachments.length > 0 ? (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.gid}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <svg
                          className="w-8 h-8 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="text-base font-medium text-gray-900">{attachment.name}</p>
                          {attachment.createdAt && (
                            <p className="text-sm text-gray-500">
                              Added: {new Date(attachment.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {attachment.viewUrl && (
                          <a
                            href={attachment.viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            View
                          </a>
                        )}
                        {attachment.downloadUrl && (
                          <a
                            href={attachment.downloadUrl}
                            download
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                          >
                            Download
                          </a>
                        )}
                        {!attachment.viewUrl && !attachment.downloadUrl && (
                          <span className="text-sm text-gray-500">External attachment</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No PDF attachments found for this task.</p>
              )}
            </div>
          </div>
        )}

        {/* Last 3 Completed Parts (Tasks) */}
        {completedTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Last 3 Completed Parts</h2>
            <div className="space-y-4">
              {completedTasks.map(task => (
                <div key={task.gid} className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-medium">{task.name}</p>
                  <p className="text-sm text-gray-600">
                    Completed: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

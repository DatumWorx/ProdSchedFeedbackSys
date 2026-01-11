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

  // Work session state
  const [activeSession, setActiveSession] = useState<any>(null);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [runningTotal, setRunningTotal] = useState<number>(0);
  const [checkingSession, setCheckingSession] = useState(false);
  const [partsCount, setPartsCount] = useState<string>('');
  const [submittingParts, setSubmittingParts] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

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

  // Check for active work session when operator or part changes
  useEffect(() => {
    if (!selectedPart) {
      setActiveSession(null);
      setAllSessions([]);
      setRunningTotal(0);
      return;
    }

    if (!selectedOperator) {
      // Still fetch all sessions even if no operator selected
      setCheckingSession(true);
      fetch(`/api/work-session?operator=&partGid=${encodeURIComponent(selectedPart)}`)
        .then(res => res.json())
        .then(data => {
          setAllSessions(data.allSessions || []);
          setRunningTotal(data.runningTotal || 0);
          setActiveSession(null);
          setCheckingSession(false);
        })
        .catch(err => {
          console.error('Error fetching work sessions:', err);
          setAllSessions([]);
          setRunningTotal(0);
          setActiveSession(null);
          setCheckingSession(false);
        });
      return;
    }

    setCheckingSession(true);
    fetch(`/api/work-session?operator=${encodeURIComponent(selectedOperator)}&partGid=${encodeURIComponent(selectedPart)}`)
      .then(res => res.json())
      .then(data => {
        if (data.active && data.session) {
          setActiveSession(data.session);
        } else {
          setActiveSession(null);
        }
        setAllSessions(data.allSessions || []);
        setRunningTotal(data.runningTotal || 0);
        setCheckingSession(false);
      })
      .catch(err => {
        console.error('Error checking work session:', err);
        setActiveSession(null);
        setAllSessions([]);
        setRunningTotal(0);
        setCheckingSession(false);
      });
  }, [selectedOperator, selectedPart]);

  const selectedTask = tasks.find(t => t.gid === selectedPart);

  // Helper function to get custom field value by name
  const getCustomFieldValue = (fieldName: string): any => {
    if (!selectedTask?.customFields) return null;
    const field = Object.values(selectedTask.customFields).find(
      (f: any) => f.name === fieldName
    );
    return field?.value ?? null;
  };

  // Extract specific fields
  const totalTime = getCustomFieldValue('Total Time');
  const qty = getCustomFieldValue('Qty Parts');
  const pickList = getCustomFieldValue('Pick List');
  const scheduledPPM = getCustomFieldValue('Scheduled PPM');
  const actualPPM = getCustomFieldValue('Actual PPM');
  const shiftsScheduled = getCustomFieldValue('Shifts');

  // Calculate Scheduling Accuracy (Actual PPM / Scheduled PPM) × 100
  const schedulingAccuracy = 
    scheduledPPM && actualPPM && scheduledPPM !== 0
      ? ((actualPPM / scheduledPPM) * 100).toFixed(1) + '%'
      : 'N/A';

  // Work session handlers
  const handleStartWork = async () => {
    if (!selectedOperator || !selectedPart) {
      alert('Please select an operator and part');
      return;
    }

    try {
      const department = departments.find(d => d.name === selectedDepartment);
      const partName = selectedTask?.name || null;
      
      const response = await fetch('/api/work-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorName: selectedOperator,
          partGid: selectedPart,
          partName: partName,
          department: selectedDepartment || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to start work session');
        return;
      }

      setActiveSession(data.session);
      // Refresh all sessions
      const refreshResponse = await fetch(`/api/work-session?operator=${encodeURIComponent(selectedOperator)}&partGid=${encodeURIComponent(selectedPart)}`);
      const refreshData = await refreshResponse.json();
      setAllSessions(refreshData.allSessions || []);
      setRunningTotal(refreshData.runningTotal || 0);
      alert('Work session started successfully');
    } catch (error) {
      console.error('Error starting work session:', error);
      alert('Failed to start work session');
    }
  };

  const handleSubmitPartsCount = async () => {
    if (!activeSession) {
      alert('No active work session');
      return;
    }

    const parts = parseInt(partsCount);
    if (isNaN(parts) || parts < 0) {
      alert('Please enter a valid parts count');
      return;
    }

    setSubmittingParts(true);
    try {
      const response = await fetch('/api/work-session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          partsCount: parts,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to submit parts count');
        return;
      }

      // Refresh sessions to get updated data
      const refreshResponse = await fetch(`/api/work-session?operator=${encodeURIComponent(selectedOperator)}&partGid=${encodeURIComponent(selectedPart)}`);
      const refreshData = await refreshResponse.json();
      if (refreshData.active && refreshData.session) {
        setActiveSession(refreshData.session);
      }
      setAllSessions(refreshData.allSessions || []);
      setRunningTotal(refreshData.runningTotal || 0);
      setPartsCount('');
      alert('Parts count submitted successfully');
    } catch (error) {
      console.error('Error submitting parts count:', error);
      alert('Failed to submit parts count');
    } finally {
      setSubmittingParts(false);
    }
  };

  const handleEndWork = async () => {
    if (!activeSession) {
      alert('No active work session');
      return;
    }

    if (!confirm('Are you sure you want to end this work session? This will create a QC entry.')) {
      return;
    }

    setEndingSession(true);
    try {
      const response = await fetch('/api/work-session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to end work session');
        return;
      }

      // Refresh sessions to get updated data
      const refreshResponse = await fetch(`/api/work-session?operator=${encodeURIComponent(selectedOperator)}&partGid=${encodeURIComponent(selectedPart)}`);
      const refreshData = await refreshResponse.json();
      setActiveSession(refreshData.active && refreshData.session ? refreshData.session : null);
      setAllSessions(refreshData.allSessions || []);
      setRunningTotal(refreshData.runningTotal || 0);
      setPartsCount('');
      alert('Work session ended successfully. QC entry created.');
    } catch (error) {
      console.error('Error ending work session:', error);
      alert('Failed to end work session');
    } finally {
      setEndingSession(false);
    }
  };

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
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Part
                {loading && (
                  <svg
                    className="animate-spin h-4 w-4 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              </label>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                disabled={!selectedDepartment || loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
              >
                <option value="">Select Part</option>
                {loading ? (
                  <option disabled>Loading parts...</option>
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

        {/* Job Status */}
        {selectedPart && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Job Status</h2>
            
            {checkingSession ? (
              <p className="text-gray-600">Loading job status...</p>
            ) : (
              <div className="space-y-6">
                {/* Running Total */}
                {selectedTask && qty && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-lg font-semibold text-gray-900">
                      {runningTotal} of {qty} parts {selectedDepartment ? `cut in ${selectedDepartment}` : 'produced'}
                    </p>
                  </div>
                )}

                {/* Active Sessions by Other Operators */}
                {allSessions.filter(s => s.end_timestamp === null && (!selectedOperator || s.operator_name !== selectedOperator)).length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-3">Active Sessions by Other Operators</h3>
                    <div className="space-y-2">
                      {allSessions
                        .filter(s => s.end_timestamp === null && (!selectedOperator || s.operator_name !== selectedOperator))
                        .map(session => (
                          <div key={session.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-800">
                              <strong>{session.operator_name}</strong> - Started: {new Date(session.start_timestamp).toLocaleString()}
                            </p>
                            {session.total_parts_produced > 0 && (
                              <p className="text-sm text-gray-600 mt-1">
                                Parts produced: <strong>{session.total_parts_produced}</strong>
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Current Operator's Workflow */}
                {selectedOperator ? (
                  !activeSession ? (
                    <div className="space-y-4">
                      <p className="text-gray-700">
                        No active work session for <strong>{selectedOperator}</strong> on part <strong>{selectedTask?.name || selectedPart}</strong>
                      </p>
                      <button
                        onClick={handleStartWork}
                        className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                      >
                        Start Work
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-gray-800 font-medium mb-2">
                          Active work session for <strong>{selectedOperator}</strong>
                        </p>
                        <p className="text-sm text-gray-600">
                          Started: {new Date(activeSession.start_timestamp).toLocaleString()}
                        </p>
                        {activeSession.total_parts_produced > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            Parts produced: <strong>{activeSession.total_parts_produced}</strong>
                          </p>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Parts Count
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={partsCount}
                            onChange={(e) => setPartsCount(e.target.value)}
                            placeholder="Enter parts count"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          />
                        </div>
                        
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-gray-700">
                            <strong>Important:</strong> Please track your parts produced and log parts before breaks and at the end of running the job.
                          </p>
                        </div>

                        <div className="flex gap-4">
                          <button
                            onClick={handleSubmitPartsCount}
                            disabled={submittingParts || !partsCount}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {submittingParts ? 'Submitting...' : 'Submit Parts Count'}
                          </button>
                          
                          <button
                            onClick={handleEndWork}
                            disabled={endingSession}
                            className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {endingSession ? 'Ending...' : 'End Work'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-gray-600">Select an operator to start work on this part.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Part (Task) Details */}
        {selectedTask && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Part Details</h2>
            
            {/* Basic Information */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Task Name</p>
                  <p className="text-base text-gray-900">{selectedTask.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Section</p>
                  <p className="text-base text-gray-900">{selectedTask.section || 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* Scheduling Information */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Scheduling Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Start Date/Time</p>
                  <p className="text-base text-gray-900">
                    {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleString() : 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Due Date/Time</p>
                  <p className="text-base text-gray-900">
                    {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleString() : 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Machine</p>
                  <p className="text-base text-gray-900">{selectedTask.machine || 'Not assigned'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Runtime in Shifts</p>
                  <p className="text-base text-gray-900">
                    {shiftsScheduled !== null && shiftsScheduled !== undefined ? shiftsScheduled : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Production Information */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Production Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Total Time</p>
                  <p className="text-base text-gray-900">
                    {totalTime !== null && totalTime !== undefined ? `${totalTime} min` : 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Qty</p>
                  <p className="text-base text-gray-900">
                    {qty !== null && qty !== undefined ? qty : 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Material</p>
                  <p className="text-base text-gray-900">
                    {pickList !== null && pickList !== undefined ? String(pickList) : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Scheduled PPM</p>
                  <p className="text-base text-gray-900">
                    {scheduledPPM !== null && scheduledPPM !== undefined ? scheduledPPM.toFixed(4) : 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Actual PPM</p>
                  <p className="text-base text-gray-900">
                    {actualPPM !== null && actualPPM !== undefined ? actualPPM.toFixed(4) : 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Scheduling Accuracy</p>
                  <p className="text-base text-gray-900">{schedulingAccuracy}</p>
                </div>
              </div>
            </div>

            {/* PDF Attachments */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800">PDF Attachment</h3>
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
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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

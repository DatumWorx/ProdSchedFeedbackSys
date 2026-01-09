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

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<string>('');

  const [loading, setLoading] = useState(false);

  // Load departments on mount
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

  // Load machines when department changes
  useEffect(() => {
    if (!selectedDepartment) {
      setMachines([]);
      return;
    }

    fetch(`/api/machines?department=${encodeURIComponent(selectedDepartment)}`)
      .then(res => res.json())
      .then(data => {
        if (data.machines) {
          setMachines(data.machines);
        }
      })
      .catch(console.error);
  }, [selectedDepartment]);

  // Load operators when department changes
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

  // Load tasks when project and machine are selected
  useEffect(() => {
    if (!selectedDepartment) {
      setTasks([]);
      setCompletedTasks([]);
      return;
    }

    const department = departments.find(d => d.name === selectedDepartment);
    if (!department) return;

    setLoading(true);
    fetch(`/api/tasks?projectGid=${department.gid}${selectedMachine ? `&machine=${encodeURIComponent(selectedMachine)}` : ''}`)
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

        {/* Task Details */}
        {selectedTask && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Task Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Task Name</p>
                <p className="font-medium">{selectedTask.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Section</p>
                <p className="font-medium">{selectedTask.section}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Start Date/Time</p>
                <p className="font-medium">
                  {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Due Date/Time</p>
                <p className="font-medium">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Machine</p>
                <p className="font-medium">{selectedTask.machine || 'Not assigned'}</p>
              </div>
            </div>

            {/* Custom Fields */}
            {Object.keys(selectedTask.customFields).length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Custom Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(selectedTask.customFields).map(([gid, field]: [string, any]) => (
                    <div key={gid} className="border-l-4 border-blue-500 pl-3">
                      <p className="text-sm text-gray-600">{field.name}</p>
                      <p className="font-medium">
                        {field.value !== null && field.value !== undefined
                          ? String(field.value)
                          : 'Not set'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Last 3 Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Last 3 Completed Tasks</h2>
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

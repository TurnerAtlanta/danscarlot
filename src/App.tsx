// client/src/App.tsx
import React, { useState, useEffect } from 'react';
import { useAgent } from 'agents/react';
import { IntegrationsPanel } from './IntegrationsPanel';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_by: string;
  created_at: string;
}

interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  purchase_price: number;
  purchase_date: string;
  sale_price?: number;
  sale_date?: string;
  status: 'available' | 'sold' | 'reserved';
  location: string;
}

interface Service {
  id: string;
  vehicle_id: string;
  service_type: string;
  description: string;
  cost: number;
  service_date: string;
}

interface Comment {
  id: string;
  entity_type: string;
  entity_id: string;
  user_name: string;
  comment: string;
  created_at: string;
}

interface Analytics {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  margin: string;
  soldCount: number;
  inventoryCount: number;
  avgProfitPerVehicle: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'inventory' | 'analytics' | 'integrations'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userName, setUserName] = useState('');

  // Connect to CarLot Agent via WebSocket using useAgent hook
  const agent = useAgent({
    agent: 'carlot-agent',
    name: 'main',
    onMessage: (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'state') {
        setTasks(data.data.tasks || []);
        setVehicles(data.data.vehicles || []);
      } else if (data.type === 'task_update') {
        loadTasks();
      } else if (data.type === 'inventory_update') {
        loadVehicles();
      } else if (data.type === 'service_add') {
        if (selectedVehicle) loadServices(selectedVehicle.id);
      } else if (data.type === 'comment_add') {
        loadComments(data.payload.entity_type, data.payload.entity_id);
      }
    },
    onOpen: () => {
      console.log('Connected to CarLot Agent');
    },
    onClose: () => {
      console.log('Disconnected from CarLot Agent');
    }
  });

  useEffect(() => {
    const name = localStorage.getItem('userName') || prompt('Enter your name:') || 'Anonymous';
    localStorage.setItem('userName', name);
    setUserName(name);

    loadTasks();
    loadVehicles();
    loadAnalytics();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to load tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('Failed to load vehicles');
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadServices = async (vehicleId: string) => {
    try {
      const response = await fetch(`/api/services?vehicleId=${vehicleId}`);
      if (!response.ok) throw new Error('Failed to load services');
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadComments = async (entityType: string, entityId: string) => {
    try {
      const response = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
      if (!response.ok) throw new Error('Failed to load comments');
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const sendMessage = (message: any) => {
    agent.send(JSON.stringify(message));
  };

  const createTask = () => {
    const title = prompt('Task title:');
    if (!title) return;

    const description = prompt('Description:');
    const assignee = prompt('Assign to:') || 'Unassigned';
    const dueDate = prompt('Due date (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];

    const task: Task = {
      id: crypto.randomUUID(),
      title,
      description: description || '',
      assignee,
      due_date: dueDate,
      status: 'pending',
      created_by: userName,
      created_at: new Date().toISOString(),
    };

    sendMessage({ type: 'task_update', payload: task });
    setTimeout(loadTasks, 500);
  };

  const updateTaskStatus = (task: Task, newStatus: Task['status']) => {
    sendMessage({
      type: 'task_update',
      payload: { ...task, status: newStatus }
    });
    setTimeout(loadTasks, 500);
  };

  const createVehicle = () => {
    const vin = prompt('VIN:');
    if (!vin) return;

    const make = prompt('Make:') || '';
    const model = prompt('Model:') || '';
    const year = parseInt(prompt('Year:') || '2020', 10);
    const purchasePrice = parseFloat(prompt('Purchase Price:') || '0');
    const location = prompt('Location:') || 'Lot A';

    const vehicle: Vehicle = {
      id: crypto.randomUUID(),
      vin,
      make,
      model,
      year,
      purchase_price: purchasePrice,
      purchase_date: new Date().toISOString(),
      status: 'available',
      location
    };

    sendMessage({ type: 'inventory_update', payload: vehicle });
    setTimeout(loadVehicles, 500);
  };

  const markVehicleSold = (vehicle: Vehicle) => {
    const salePrice = parseFloat(prompt('Sale Price:') || '0');
    if (salePrice === 0) return;

    sendMessage({
      type: 'inventory_update',
      payload: {
        ...vehicle,
        status: 'sold',
        sale_price: salePrice,
        sale_date: new Date().toISOString()
      }
    });
    setTimeout(loadVehicles, 500);
    setTimeout(loadAnalytics, 1000);
  };

  const addService = async () => {
    if (!selectedVehicle) return;

    const serviceType = prompt('Service Type (e.g., Oil Change, Brakes):');
    if (!serviceType) return;

    const description = prompt('Description:') || '';
    const cost = parseFloat(prompt('Cost:') || '0');
    const serviceDate = prompt('Service Date (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];

    const service: Service = {
      id: crypto.randomUUID(),
      vehicle_id: selectedVehicle.id,
      service_type: serviceType,
      description,
      cost,
      service_date: serviceDate
    };

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      });
      if (response.ok) {
        loadServices(selectedVehicle.id);
        loadAnalytics();
      }
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const addComment = (entityType: string, entityId: string) => {
    const comment = prompt('Add comment:');
    if (!comment) return;

    const payload: Omit<Comment, 'created_at'> = {
      id: crypto.randomUUID(),
      entity_type: entityType,
      entity_id: entityId,
      user_name: userName,
      comment,
    };

    sendMessage({ type: 'comment_add', payload });
    setTimeout(() => loadComments(entityType, entityId), 500);
  };

  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    loadServices(vehicle.id);
    loadComments('vehicle', vehicle.id);
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #e5e5e5', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: '700', margin: '0 0 10px 0' }}>CarLot Manager</h1>
        <p style={{ color: '#666', margin: 0 }}>Logged in as: {userName}</p>
      </header>

      <nav style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e5e5e5' }}>
        {(['tasks', 'inventory', 'analytics', 'integrations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab ? '#007AFF' : 'transparent',
              color: activeTab === tab ? 'white' : '#007AFF',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Tasks</h2>
            <button
              onClick={createTask}
              style={{
                padding: '10px 20px',
                background: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '500'
              }}
            >
              + New Task
            </button>
          </div>

          <div style={{ display: 'grid', gap: '15px' }}>
            {tasks.map(task => (
              <div
                key={task.id}
                style={{
                  background: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600' }}>{task.title}</h3>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '15px' }}>{task.description}</p>
                    <div style={{ fontSize: '13px', color: '#999' }}>
                      Assigned to: {task.assignee} • Due: {task.due_date} • Created by: {task.created_by}
                    </div>
                  </div>
                  <select
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task, e.target.value as Task['status'])}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e5e5e5',
                      fontSize: '14px',
                      background: task.status === 'completed' ? '#34C759' : task.status === 'in_progress' ? '#FF9500' : '#8E8E93',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <button
                  onClick={() => addComment('task', task.id)}
                  style={{
                    marginTop: '10px',
                    padding: '6px 12px',
                    background: 'transparent',
                    color: '#007AFF',
                    border: '1px solid #007AFF',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  💬 Add Comment
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>No tasks yet. Click "+ New Task" to create one.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Inventory</h2>
            <button
              onClick={createVehicle}
              style={{
                padding: '10px 20px',
                background: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '500'
              }}
            >
              + Add Vehicle
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: selectedVehicle ? '1fr 1fr' : '1fr', gap: '20px' }}>
            <div style={{ display: 'grid', gap: '15px' }}>
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  onClick={() => selectVehicle(vehicle)}
                  style={{
                    background: 'white',
                    border: selectedVehicle?.id === vehicle.id ? '2px solid #007AFF' : '1px solid #e5e5e5',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '600' }}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>VIN: {vehicle.vin}</p>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '13px' }}>Location: {vehicle.location}</p>
                      <p style={{ margin: '0', fontSize: '15px', fontWeight: '500' }}>
                        Purchase: ${Number(vehicle.purchase_price || 0).toLocaleString()}
                        {vehicle.sale_price && ` → Sale: $${Number(vehicle.sale_price).toLocaleString()}`}
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: vehicle.status === 'sold' ? '#34C759' : vehicle.status === 'reserved' ? '#FF9500' : '#007AFF',
                        color: 'white'
                      }}
                    >
                      {vehicle.status}
                    </span>
                  </div>
                  {vehicle.status === 'available' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markVehicleSold(vehicle);
                      }}
                      style={{
                        marginTop: '10px',
                        padding: '8px 16px',
                        background: '#34C759',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      Mark as Sold
                    </button>
                  )}
                </div>
              ))}
              {vehicles.length === 0 && (
                <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>No vehicles yet. Click "+ Add Vehicle" to add one.</p>
              )}
            </div>

            {selectedVehicle && (
              <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '17px', fontWeight: '600', margin: 0 }}>Service History</h4>
                    <button
                      onClick={addService}
                      style={{
                        padding: '6px 12px',
                        background: '#007AFF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      + Add Service
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {services.map(service => (
                      <div
                        key={service.id}
                        style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e5e5'
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>
                          {service.service_type}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                          {service.description}
                        </div>
                        <div style={{ fontSize: '13px', color: '#999' }}>
                          ${Number(service.cost || 0).toLocaleString()} • {service.service_date}
                        </div>
                      </div>
                    ))}
                    {services.length === 0 && (
                      <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                        No service records yet
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '17px', fontWeight: '600', margin: 0 }}>Comments</h4>
                    <button
                      onClick={() => addComment('vehicle', selectedVehicle.id)}
                      style={{
                        padding: '6px 12px',
                        background: '#007AFF',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      + Add Comment
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {comments.map(comment => (
                      <div
                        key={comment.id}
                        style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e5e5'
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                          {comment.user_name}
                        </div>
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          {comment.comment}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>Financial Analytics</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                Total Revenue
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#34C759' }}>
                ${Number(analytics.totalRevenue || 0).toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                Total Costs
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF3B30' }}>
                ${Number(analytics.totalCost || 0).toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                Net Profit
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: Number(analytics.profit || 0) >= 0 ? '#34C759' : '#FF3B30' }}>
                ${Number(analytics.profit || 0).toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                Profit Margin
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#007AFF' }}>
                {analytics.margin}%
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                Vehicles Sold
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>
                {analytics.soldCount}
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                Current Inventory
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>
                {analytics.inventoryCount}
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
                Avg Profit/Vehicle
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#007AFF' }}>
                ${analytics.avgProfitPerVehicle}
              </div>
            </div>
          </div>

          <button
            onClick={loadAnalytics}
            style={{
              padding: '10px 20px',
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '500'
            }}
          >
            🔄 Refresh Analytics
          </button>
        </div>
      )}

      {activeTab === 'integrations' && (
        <IntegrationsPanel />
      )}
    </div>
  );
}

export default App;


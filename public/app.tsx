// public/app.tsx
import React, { useState, useEffect } from ‘react’;
import { useAgent } from ‘agents/react’;
import { IntegrationsPanel } from ‘./integrations.tsx’;

interface Task {
id: string;
title: string;
description: string;
assignee: string;
dueDate: string;
status: ‘pending’ | ‘in_progress’ | ‘completed’;
createdBy: string;
createdAt: string;
}

interface Vehicle {
id: string;
vin: string;
make: string;
model: string;
year: number;
purchasePrice: number;
purchaseDate: string;
salePrice?: number;
saleDate?: string;
status: ‘available’ | ‘sold’ | ‘reserved’;
location: string;
}

interface Service {
id: string;
vehicleId: string;
serviceType: string;
description: string;
cost: number;
serviceDate: string;
}

interface Comment {
id: string;
entityType: string;
entityId: string;
userName: string;
comment: string;
createdAt: string;
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
const [activeTab, setActiveTab] = useState<‘tasks’ | ‘inventory’ | ‘analytics’ | ‘integrations’>(‘tasks’);
const [tasks, setTasks] = useState<Task[]>([]);
const [vehicles, setVehicles] = useState<Vehicle[]>([]);
const [analytics, setAnalytics] = useState<Analytics | null>(null);
const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
const [services, setServices] = useState<Service[]>([]);
const [comments, setComments] = useState<Comment[]>([]);
const [userName, setUserName] = useState(’’);

const agent = useAgent({
agent: ‘carlot-agent’,
name: ‘main’,
onMessage: (event) => {
const data = JSON.parse(event.data);
if (data.type === ‘task_update’) {
loadTasks();
} else if (data.type === ‘inventory_update’) {
loadVehicles();
} else if (data.type === ‘service_add’) {
if (selectedVehicle) loadServices(selectedVehicle.id);
} else if (data.type === ‘comment_add’) {
loadComments(data.payload.entityType, data.payload.entityId);
}
},
});

useEffect(() => {
const name = localStorage.getItem(‘userName’) || prompt(‘Enter your name:’) || ‘Anonymous’;
localStorage.setItem(‘userName’, name);
setUserName(name);


loadTasks();
loadVehicles();
loadAnalytics();


}, []);

const loadTasks = async () => {
const response = await fetch(’/api/tasks’);
const data = await response.json();
setTasks(data);
};

const loadVehicles = async () => {
const response = await fetch(’/api/vehicles’);
const data = await response.json();
setVehicles(data);
};

const loadAnalytics = async () => {
const response = await fetch(’/api/analytics’);
const data = await response.json();
setAnalytics(data);
};

const loadServices = async (vehicleId: string) => {
const response = await fetch(`/api/services?vehicleId=${vehicleId}`);
const data = await response.json();
setServices(data);
};

const loadComments = async (entityType: string, entityId: string) => {
const response = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
const data = await response.json();
setComments(data);
};

const createTask = () => {
const title = prompt(‘Task title:’);
if (!title) return;


const description = prompt('Description:');
const assignee = prompt('Assign to:') || 'Unassigned';
const dueDate = prompt('Due date (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];

const task: Task = {
  id: crypto.randomUUID(),
  title,
  description: description || '',
  assignee,
  dueDate,
  status: 'pending',
  createdBy: userName,
  createdAt: new Date().toISOString()
};

agent.send(JSON.stringify({ type: 'task_update', payload: task }));


};

const updateTaskStatus = (task: Task, newStatus: Task[‘status’]) => {
agent.send(JSON.stringify({
type: ‘task_update’,
payload: { …task, status: newStatus }
}));
};

const createVehicle = () => {
const vin = prompt(‘VIN:’);
if (!vin) return;


const make = prompt('Make:') || '';
const model = prompt('Model:') || '';
const year = parseInt(prompt('Year:') || '2020');
const purchasePrice = parseFloat(prompt('Purchase Price:') || '0');
const location = prompt('Location:') || 'Lot A';

const vehicle: Vehicle = {
  id: crypto.randomUUID(),
  vin,
  make,
  model,
  year,
  purchasePrice,
  purchaseDate: new Date().toISOString(),
  status: 'available',
  location
};

agent.send(JSON.stringify({ type: 'inventory_update', payload: vehicle }));


};

const markVehicleSold = (vehicle: Vehicle) => {
const salePrice = parseFloat(prompt(‘Sale Price:’) || ‘0’);
if (salePrice === 0) return;


agent.send(JSON.stringify({
  type: 'inventory_update',
  payload: {
    ...vehicle,
    status: 'sold',
    salePrice,
    saleDate: new Date().toISOString()
  }
}));


};

const addService = async () => {
if (!selectedVehicle) return;


const serviceType = prompt('Service Type (e.g., Oil Change, Brakes):');
if (!serviceType) return;

const description = prompt('Description:') || '';
const cost = parseFloat(prompt('Cost:') || '0');
const serviceDate = prompt('Service Date (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];

const service = {
  id: crypto.randomUUID(),
  vehicleId: selectedVehicle.id,
  serviceType,
  description,
  cost,
  serviceDate
};

await fetch('/api/services', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(service)
});


};

const addComment = (entityType: string, entityId: string) => {
const comment = prompt(‘Add comment:’);
if (!comment) return;


const payload = {
  id: crypto.randomUUID(),
  entityType,
  entityId,
  userName,
  comment,
  createdAt: new Date().toISOString()
};

agent.send(JSON.stringify({ type: 'comment_add', payload }));


};

const selectVehicle = (vehicle: Vehicle) => {
setSelectedVehicle(vehicle);
loadServices(vehicle.id);
loadComments(‘vehicle’, vehicle.id);
};

return (
<div style={{ fontFamily: ‘-apple-system, BlinkMacSystemFont, “SF Pro Display”, sans-serif’, maxWidth: ‘1200px’, margin: ‘0 auto’, padding: ‘20px’ }}>
<header style={{ marginBottom: ‘30px’, borderBottom: ‘1px solid #e5e5e5’, paddingBottom: ‘20px’ }}>
<h1 style={{ fontSize: ‘34px’, fontWeight: ‘700’, margin: ‘0 0 10px 0’ }}>CarLot Manager</h1>
<p style={{ color: ‘#666’, margin: 0 }}>Logged in as: {userName}</p>
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
                  Assigned to: {task.assignee} • Due: {task.dueDate} • Created by: {task.createdBy}
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
              onClick={() => {
                loadComments('task', task.id);
                addComment('task', task.id);
              }}
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
                    Purchase: ${vehicle.purchasePrice.toLocaleString()}
                    {vehicle.salePrice && ` → Sale: $${vehicle.salePrice.toLocaleString()}`}
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
                      {service.serviceType}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                      {service.description}
                    </div>
                    <div style={{ fontSize: '13px', color: '#999' }}>
                      ${service.cost.toLocaleString()} • {service.serviceDate}
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
                      {comment.userName}
                    </div>
                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                      {comment.comment}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {new Date(comment.createdAt).toLocaleString()}
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
            ${analytics.totalRevenue.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
            Total Costs
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#FF3B30' }}>
            ${analytics.totalCost.toLocaleString()}
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: '#999', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase' }}>
            Net Profit
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: analytics.profit >= 0 ? '#34C759' : '#FF3B30' }}>
            ${analytics.profit.toLocaleString()}
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

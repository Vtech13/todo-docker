import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/tasks`)
      .then(response => response.json())
      .then(data => setTasks(data));
  }, []);

  const addTask = () => {
    fetch(`${process.env.REACT_APP_API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: newTask }),
    })
      .then(response => response.json())
      .then(task => setTasks([...tasks, task]));
    setNewTask('');
  };

  const updateTask = (id, updatedTask) => {
    fetch(`${process.env.REACT_APP_API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedTask),
    }).then(() => {
      setTasks(tasks.map(task => (task.id === id ? updatedTask : task)));
    });
  };

  const deleteTask = id => {
    fetch(`${process.env.REACT_APP_API_URL}/tasks/${id}`, {
      method: 'DELETE',
    }).then(() => {
      setTasks(tasks.filter(task => task.id !== id));
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>To-Do List</h1>
        <input
          type="text"
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="Nouvelle tâche"
        />
        <button onClick={addTask}>Ajouter</button>
        <ul>
          {tasks.map(task => (
            <li key={task.id}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() =>
                  updateTask(task.id, { ...task, completed: !task.completed })
                }
              />
              <input
                type="text"
                value={task.title}
                onChange={e =>
                  updateTask(task.id, { ...task, title: e.target.value })
                }
              />
              <button onClick={() => deleteTask(task.id)}>Supprimer</button>
            </li>
          ))}
        </ul>
      </header>
    </div>
  );
}

export default App;
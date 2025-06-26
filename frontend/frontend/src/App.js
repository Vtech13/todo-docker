import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' ou 'register'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Vérifie le token au chargement
  useEffect(() => {
    if (token) {
      fetch(`${process.env.REACT_APP_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => setUser(data.user))
        .catch(() => {
          setUser(null);
          setToken('');
          localStorage.removeItem('token');
        });
    }
  }, [token]);

  // Récupère les tâches si connecté
  useEffect(() => {
    if (token) {
      fetch(`${process.env.REACT_APP_API_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then(response => response.json())
        .then(data => setTasks(data));
    } else {
      setTasks([]);
    }
  }, [token]);

  // Gestion du callback Google OAuth2
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get('token');
    if (googleToken) {
      setToken(googleToken);
      localStorage.setItem('token', googleToken);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const addTask = () => {
    fetch(`${process.env.REACT_APP_API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: newTask }),
      credentials: 'include',
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
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updatedTask),
      credentials: 'include',
    }).then(() => {
      setTasks(tasks.map(task => (task.id === id ? { ...task, ...updatedTask } : task)));
    });
  };

  const deleteTask = id => {
    fetch(`${process.env.REACT_APP_API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    }).then(() => {
      setTasks(tasks.filter(task => task.id !== id));
    });
  };

  const handleAuthChange = e => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const url =
      authMode === 'login'
        ? `${process.env.REACT_APP_API_URL}/auth/login`
        : `${process.env.REACT_APP_API_URL}/auth/register`;
    const body =
      authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password, name: authForm.name };
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('token', data.token);
          setUser(data.user);
        } else {
          setError(data.error || 'Erreur inconnue');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erreur serveur');
        setLoading(false);
      });
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>To-Do List</h1>
        {user ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <span>Connecté en tant que <b>{user.name || user.email}</b></span>
              <button style={{ marginLeft: 10 }} onClick={handleLogout}>Déconnexion</button>
            </div>
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
          </>
        ) : (
          <div style={{ maxWidth: 300, margin: 'auto' }}>
            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <input
                  type="text"
                  name="name"
                  placeholder="Nom"
                  value={authForm.name}
                  onChange={handleAuthChange}
                  required
                />
              )}
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={authForm.email}
                onChange={handleAuthChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Mot de passe"
                value={authForm.password}
                onChange={handleAuthChange}
                required
              />
              <button type="submit" disabled={loading}>
                {authMode === 'login' ? 'Connexion' : 'Inscription'}
              </button>
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' ? "Créer un compte" : "J'ai déjà un compte"}
              </button>
              <button type="button" onClick={handleGoogleLogin} style={{ background: '#4285F4', color: 'white', marginTop: 10 }}>
                Connexion avec Google
              </button>
              {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
            </form>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
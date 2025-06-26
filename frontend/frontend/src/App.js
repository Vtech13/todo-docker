import React, { useState, useEffect } from 'react';
import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';

function LoginPage({ onAuth, loading, error, authMode, setAuthMode, authForm, setAuthForm, handleAuthChange, handleAuthSubmit, handleGoogleLogin }) {
  return (
    <div className="auth-bg">
      <div className="auth-container">
        <form className="auth-card" onSubmit={handleAuthSubmit}>
          <h2 style={{ marginBottom: 20 }}>{authMode === 'login' ? 'Connexion' : 'Inscription'}</h2>
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
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Chargement...' : (authMode === 'login' ? 'Connexion' : 'Inscription')}
          </button>
          <button
            type="button"
            className="auth-switch"
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            disabled={loading}
          >
            {authMode === 'login' ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Connexion avec Google
          </button>
          {error && <div className="auth-error">{error}</div>}
        </form>
      </div>
    </div>
  );
}

function TodoPage({ user, tasks, newTask, setNewTask, addTask, updateTask, deleteTask, handleLogout }) {
  const handleAddTask = () => {
    if (newTask.trim()) {
      addTask();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>To-Do List</h1>
        <div style={{ marginBottom: 20 }}>
          <span>Connecté en tant que <b>{user?.name || user?.email}</b></span>
          <button style={{ marginLeft: 10 }} onClick={handleLogout}>Déconnexion</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nouvelle tâche"
            style={{ marginRight: 10, padding: '8px' }}
          />
          <button onClick={handleAddTask} disabled={!newTask.trim()}>
            Ajouter
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map(task => (
            <li key={task.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: 10,
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '5px'
            }}>
              <input
                type="checkbox"
                checked={task.completed || false}
                onChange={() =>
                  updateTask(task.id, { ...task, completed: !task.completed })
                }
                style={{ marginRight: 10 }}
              />
              <input
                type="text"
                value={task.title || ''}
                onChange={e =>
                  updateTask(task.id, { ...task, title: e.target.value })
                }
                style={{ 
                  flex: 1, 
                  marginRight: 10, 
                  padding: '5px',
                  textDecoration: task.completed ? 'line-through' : 'none'
                }}
              />
              <button onClick={() => deleteTask(task.id)} style={{ padding: '5px 10px' }}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
        {tasks.length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#666' }}>
            Aucune tâche pour le moment. Ajoutez-en une !
          </p>
        )}
      </header>
    </div>
  );
}

function CallbackPage({ setToken, setUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleToken = params.get('token');
    
    if (googleToken) {
      setToken(googleToken);
      localStorage.setItem('token', googleToken);
      
      // Authentifier l'utilisateur avant de rediriger
      fetch(`${process.env.REACT_APP_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${googleToken}` },
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) throw new Error('Échec de l\'authentification');
          return res.json();
        })
        .then(data => {
          setUser(data.user);
          navigate('/', { replace: true });
        })
        .catch(err => {
          console.error('Erreur lors de l\'authentification:', err);
          setError('Erreur lors de la connexion Google');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        });
    } else {
      setError('Token manquant');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    }
  }, [location, setToken, setUser, navigate]);

  return (
    <div className="auth-bg">
      <div className="auth-card">
        {error ? (
          <div>
            <p style={{ color: 'red' }}>{error}</p>
            <p>Redirection vers la page de connexion...</p>
          </div>
        ) : (
          <p>Connexion Google en cours...</p>
        )}
      </div>
    </div>
  );
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login');
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
        .then(res => {
          if (!res.ok) throw new Error('Token invalide');
          return res.json();
        })
        .then(data => setUser(data.user))
        .catch(err => {
          console.error('Erreur de vérification du token:', err);
          setUser(null);
          setToken('');
          localStorage.removeItem('token');
        });
    }
  }, [token]);

  // Récupère les tâches si connecté
  useEffect(() => {
    if (token && user) {
      fetch(`${process.env.REACT_APP_API_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
        .then(response => {
          if (!response.ok) throw new Error('Erreur lors du chargement des tâches');
          return response.json();
        })
        .then(data => setTasks(Array.isArray(data) ? data : []))
        .catch(err => {
          console.error('Erreur lors du chargement des tâches:', err);
          setTasks([]);
        });
    } else {
      setTasks([]);
    }
  }, [token, user]);

  const addTask = () => {
    if (!newTask.trim()) return;

    fetch(`${process.env.REACT_APP_API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: newTask.trim() }),
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) throw new Error('Erreur lors de l\'ajout de la tâche');
        return response.json();
      })
      .then(task => {
        setTasks(prevTasks => [...prevTasks, task]);
        setNewTask('');
      })
      .catch(err => {
        console.error('Erreur lors de l\'ajout de la tâche:', err);
        alert('Erreur lors de l\'ajout de la tâche');
      });
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
    })
      .then(response => {
        if (!response.ok) throw new Error('Erreur lors de la mise à jour');
        return response.json();
      })
      .then(() => {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === id ? { ...task, ...updatedTask } : task
          )
        );
      })
      .catch(err => {
        console.error('Erreur lors de la mise à jour:', err);
        alert('Erreur lors de la mise à jour de la tâche');
      });
  };

  const deleteTask = id => {
    fetch(`${process.env.REACT_APP_API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(response => {
        if (!response.ok) throw new Error('Erreur lors de la suppression');
        setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
      })
      .catch(err => {
        console.error('Erreur lors de la suppression:', err);
        alert('Erreur lors de la suppression de la tâche');
      });
  };

  const handleAuthChange = e => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const url = authMode === 'login'
      ? `${process.env.REACT_APP_API_URL}/auth/login`
      : `${process.env.REACT_APP_API_URL}/auth/register`;
    
    const body = authMode === 'login'
      ? { email: authForm.email, password: authForm.password }
      : { email: authForm.email, password: authForm.password, name: authForm.name };
    
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('Erreur réseau');
        return res.json();
      })
      .then(data => {
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('token', data.token);
          setUser(data.user);
          setAuthForm({ email: '', password: '', name: '' });
        } else {
          setError(data.error || data.message || 'Erreur inconnue');
        }
      })
      .catch(err => {
        console.error('Erreur d\'authentification:', err);
        setError('Erreur de connexion au serveur');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setTasks([]);
    localStorage.removeItem('token');
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`;
  };

  // Redirection automatique selon l'état d'authentification
  function RequireAuth({ children }) {
    const location = useLocation();
    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  }

  function RedirectIfAuth({ children }) {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <RedirectIfAuth>
            <LoginPage
              onAuth={setUser}
              loading={loading}
              error={error}
              authMode={authMode}
              setAuthMode={setAuthMode}
              authForm={authForm}
              setAuthForm={setAuthForm}
              handleAuthChange={handleAuthChange}
              handleAuthSubmit={handleAuthSubmit}
              handleGoogleLogin={handleGoogleLogin}
            />
          </RedirectIfAuth>
        } />
        <Route path="/callback" element={
          <CallbackPage setToken={setToken} setUser={setUser} />
        } />
        <Route path="/" element={
          <RequireAuth>
            <TodoPage
              user={user}
              tasks={tasks}
              newTask={newTask}
              setNewTask={setNewTask}
              addTask={addTask}
              updateTask={updateTask}
              deleteTask={deleteTask}
              handleLogout={handleLogout}
            />
          </RequireAuth>
        } />
        <Route path="*" element={
          <div className="auth-bg">
            <div className="auth-card">404 - Page non trouvée</div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
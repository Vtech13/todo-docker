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

// Définir l'URL de l'API dynamiquement selon l'environnement
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function LoginPage({ onAuth, loading, error, authMode, setAuthMode, authForm, setAuthForm, handleAuthChange, handleAuthSubmit, handleGoogleLogin }) {
  console.log('LoginPage rendu');
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
          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
            onClick={() => console.log('Bouton submit cliqué')}
          >
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
  const inputRef = React.useRef(null);
  const [editingId, setEditingId] = React.useState(null);
  const [editValue, setEditValue] = React.useState('');
  const editInputRef = React.useRef(null);
  const [files, setFiles] = React.useState([]);

  // Focus automatique sur l'input de création de tâche
  React.useEffect(() => {
    if (inputRef.current && newTask === '' && editingId === null) {
      inputRef.current.focus();
    }
  }, [newTask, editingId]);

  // Focus automatique sur l'input d'édition
  React.useEffect(() => {
    if (editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  // Recharge la liste des fichiers à chaque ajout de tâche ou fichier
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setFiles)
        .catch(() => setFiles([]));
    }
  }, [tasks]);

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

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditValue(task.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const validateEdit = (task) => {
    if (editValue.trim() && editValue !== task.title) {
      updateTask(task.id, { ...task, title: editValue });
    }
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="App" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)' }}>
      <header className="App-header" style={{ background: 'none', minHeight: 'unset', color: '#282c34', boxShadow: 'none', marginBottom: 0 }}>
        <h1 style={{ margin: '40px 0 10px 0', fontWeight: 700, fontSize: '2.2rem', color: '#6366f1' }}>To-Do List</h1>
        <div style={{ marginBottom: 10, fontSize: '1rem', color: '#334155' }}>
          <span>Connecté en tant que <b>{user?.name || user?.email}</b></span>
          <button style={{ marginLeft: 16, background: '#f1f5f9', color: '#6366f1', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontWeight: 500 }} onClick={handleLogout}>Déconnexion</button>
        </div>
      </header>
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh', marginTop: 0 }}>
        <div className="todo-card" style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 32, minWidth: 340, maxWidth: 420, width: '100%', marginTop: 32 }}>
          {/* Champ d'ajout de tâche */}
          <form onSubmit={e => { e.preventDefault(); handleAddTask(); }} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input
              type="text"
              ref={inputRef}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nouvelle tâche..."
              style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '1rem', background: '#f8fafc' }}
              disabled={editingId !== null}
            />
            <button type="submit" disabled={!newTask.trim() || editingId !== null} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '10px 18px', fontSize: '1rem', cursor: (!newTask.trim() || editingId !== null) ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
              Ajouter
            </button>
          </form>

          {/* Formulaire d'upload de fichier */}
          <form
            className="file-upload-form"
            onSubmit={async e => {
              e.preventDefault();
              const file = e.target.elements.file.files[0];
              if (!file) return alert('Sélectionne un fichier');
              try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch(`${API_URL}/upload`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                  body: formData,
                });
                if (!response.ok) throw new Error('Erreur lors de l\'upload');
                const data = await response.json();
                alert('Fichier envoyé ! URL Azure : ' + data.url);
              } catch (err) {
                alert('Erreur lors de l\'upload : ' + err.message);
              }
              e.target.reset();
            }}
            style={{ marginBottom: 24 }}
          >
            <input type="file" name="file" />
            <button type="submit">Envoyer un fichier</button>
          </form>

          {/* Liste des tâches */}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map(task => (
              <li key={task.id} style={{ background: '#f8fafc', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Checkbox pour marquer comme fait */}
                <input
                  type="checkbox"
                  checked={!!task.completed}
                  onChange={() => updateTask(task.id, { ...task, completed: !task.completed })}
                  style={{ marginRight: 10, width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }}
                  disabled={editingId === task.id}
                />
                {editingId === task.id ? (
                  <>
                    <input
                      type="text"
                      ref={editInputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') validateEdit(task);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '1rem', background: 'white' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => validateEdit(task)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 500, cursor: 'pointer' }}>Valider</button>
                      <button onClick={cancelEdit} style={{ background: '#f1f5f9', color: '#6366f1', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 500, cursor: 'pointer' }}>Annuler</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: '1.05rem', color: task.completed ? '#94a3b8' : '#334155', textAlign: 'left', wordBreak: 'break-word', padding: '2px 0', textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.7 : 1 }}>{task.title}</span>
                    <button onClick={() => startEdit(task)} style={{ background: '#f1f5f9', color: '#6366f1', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 500, marginRight: 2, cursor: 'pointer' }}>Modifier</button>
                  </>
                )}
                <button onClick={() => deleteTask(task.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 500, cursor: 'pointer' }}>Supprimer</button>
              </li>
            ))}
          </ul>

          {tasks.length === 0 && (
            <p style={{ fontStyle: 'italic', color: '#64748b', marginTop: 18, textAlign: 'center' }}>
              Aucune tâche pour le moment. Ajoutez-en une !
            </p>
          )}

          {/* Liste des fichiers envoyés */}
          {files.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Fichiers envoyés :</h4>
              <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
                {files.map(f => (
                  <li key={f.name} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', flex: 1 }}>{f.name}</a>
                    <button
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 500, cursor: 'pointer' }}
                      onClick={async () => {
                        const token = localStorage.getItem('token');
                        if (window.confirm('Supprimer ce fichier ?')) {
                          await fetch(`${API_URL}/files/${encodeURIComponent(f.name)}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          setFiles(files => files.filter(file => file.name !== f.name));
                        }
                      }}
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
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
      fetch(`${API_URL}/auth/me`, {
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

// Déplace ces deux fonctions en dehors de AppRoutes
function RequireAuth({ user, children }) {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function RedirectIfAuth({ user, children }) {
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes({
  setToken, setUser, setAuthForm, setAuthMode, setLoading, setError,
  setTasks, setNewTask, setUserState, token, user, tasks, newTask,
  authMode, authForm, loading, error,
  addTask, updateTask, deleteTask
}) {
  const location = useLocation();

  // Détecte le token dans l'URL à l'arrivée sur /
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, document.title, '/');
    }
  }, [location.search, setToken]);

  return (
    <Routes>
      <Route path="/login" element={
        <RedirectIfAuth user={user}>
          <LoginPage
            onAuth={setUser}
            loading={loading}
            error={error}
            authMode={authMode}
            setAuthMode={setAuthMode}
            authForm={authForm}
            setAuthForm={setAuthForm}
            handleAuthChange={e => setAuthForm({ ...authForm, [e.target.name]: e.target.value })}
            handleAuthSubmit={e => {
              e.preventDefault();
              setLoading(true);
              setError('');
              const url = authMode === 'login'
                ? `${API_URL}/auth/login`
                : `${API_URL}/auth/register`;
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
                  setError('Erreur de connexion au serveur');
                })
                .finally(() => {
                  setLoading(false);
                });
            }}
            handleGoogleLogin={() => {
              window.location.href = `${API_URL}/auth/google`;
            }}
          />
        </RedirectIfAuth>
      } />
      <Route path="/" element={
        <RequireAuth user={user}>
          <TodoPage
            user={user}
            tasks={tasks}
            newTask={newTask}
            setNewTask={setNewTask}
            addTask={addTask}
            updateTask={updateTask}
            deleteTask={deleteTask}
            handleLogout={() => {
              setToken('');
              setUser(null);
              setTasks([]);
              localStorage.removeItem('token');
            }}
          />
        </RequireAuth>
      } />
      <Route path="*" element={
        <div className="auth-bg">
          <div className="auth-card">404 - Page non trouvée</div>
        </div>
      } />
    </Routes>
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
      fetch(`${API_URL}/auth/me`, {
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
      fetch(`${API_URL}/tasks`, {
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

    fetch(`${API_URL}/tasks`, {
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
    fetch(`${API_URL}/tasks/${id}`, {
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
    fetch(`${API_URL}/tasks/${id}`, {
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
    console.log('handleAuthSubmit appelé');
    setLoading(true);
    setError('');
    
    const url = authMode === 'login'
      ? `${API_URL}/auth/login`
      : `${API_URL}/auth/register`;
    
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
        console.log('Réponse login:', data);
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
    window.location.href = `${API_URL}/auth/google`;
  };

  // À placer dans un composant React
  async function uploadFile(file, token) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('Erreur lors de l\'upload');
    return response.json(); // { url: ... }
  }

  return (
    <Router>
      <AppRoutes
        setToken={setToken}
        setUser={setUser}
        setAuthForm={setAuthForm}
        setAuthMode={setAuthMode}
        setLoading={setLoading}
        setError={setError}
        setTasks={setTasks}
        setNewTask={setNewTask}
        setUserState={setUser}
        token={token}
        user={user}
        tasks={tasks}
        newTask={newTask}
        authMode={authMode}
        authForm={authForm}
        loading={loading}
        error={error}
        addTask={addTask}
        updateTask={updateTask}
        deleteTask={deleteTask}
      />
    </Router>
  );
}

export default App;
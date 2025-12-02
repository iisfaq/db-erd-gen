import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// import './i18n';

function App2() {
  const [name, setName] = React.useState("Chris");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  return (
    <input type="text" value={name} onChange={handleChange} />
  );
}


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

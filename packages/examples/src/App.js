import React from "react";
import "./App.css";
import { useAsync } from "@react-org/hooks";
// import useAsync from "@react-org/hooks/dist/use-async";
function App() {
  const asyncQuery = useAsync();
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

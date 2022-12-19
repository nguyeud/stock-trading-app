import React, { useState } from "react"
import ReactDOM from 'react-dom'
import '../src/App.css';
import Dashboard from '../src/components/Dashboard';
import ThemeContext from '../src/context/ThemeContext';
import StockContext from "../src/context/StockContext";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [stockSymbol, setStockSymbol] = useState("FB");
  return <ThemeContext.Provider value={{ darkMode, setDarkMode}}>
    <StockContext.Provider value={{ stockSymbol, setStockSymbol }}>
    <Dashboard />
    </StockContext.Provider>
  </ThemeContext.Provider>
}

export default App;

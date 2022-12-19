import { useState } from "react"
import 'C:/StudentWork/WorkSpace2/TradingAppProject/stock-trading-app/stock-react-board/src/App.css';
import Dashboard from 'C:/StudentWork/WorkSpace2/TradingAppProject/stock-trading-app/stock-react-board/src/components/Dashboard';
import ThemeContext from 'C:/StudentWork/WorkSpace2/TradingAppProject/stock-trading-app/stock-react-board/src/context/ThemeContext';
import StockContext from "C:/StudentWork/WorkSpace2/TradingAppProject/stock-trading-app/stock-react-board/src/context/StockContext";


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

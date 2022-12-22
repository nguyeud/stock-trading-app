import React, { useContext } from "react";
import ThemeContext from "../context/ThemeContext";

const ThemeIcon = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  document.getElementById("theme-toggle").addEventListener("click", () => {
    setDarkMode(!darkMode);
  });
};

export default ThemeIcon;

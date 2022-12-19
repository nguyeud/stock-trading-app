import React, { useContext } from "react";
import ThemeContext from "../context/ThemeContext";


const ThemeIcon = () => {
    const { darkMode, setDarkMode } = useContext(ThemeContext);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

  return <button className={`rounded-lg border-neutral-400 p-2 absolute right-8 xl:right:32 shadow-xl w-20 h-20 ${darkMode ? "shadow-yellow-500" : null
}`} 
  onClick={toggleDarkMode}
  ><div className={`cursor-pointer stroke-1 ${
    darkMode
      ? "fill-yellow-400 stroke-yellow-800 shadow-yellow-800"
      
      : "fill-none stroke-neutral-400"
  }`}>
    <img src="https://media.istockphoto.com/id/1334613123/vector/moon-and-star-black-icon-of-moon-for-night-pictogram-of-crescent-and-star-logo-for-sleep-and.jpg?s=612x612&w=0&k=20&c=Gy6DGTiwY2lsGPXRr2f7kqPELZEUtG1MsSEce1BkPdo="
        className="width:300px height:300px" />
        </div>
  </button>
};

export default ThemeIcon;
import React, { useContext, useState } from "react";
import SearchResults from "../components/SearchResults";
import ThemeContext from "../context/ThemeContext";
import { searchSymbols } from "../api/stock-api";


const Search = () => {
    const [input, setInput] = useState("");
    const [bestMatches, setBestMatches] = useState([]);

    const { darkMode } = useContext(ThemeContext);

    const clear = () => {
        setInput("");
        setBestMatches([]);
    };

    const updateBestMatches = async () => {
        try {
           if (input) {
            const searchResults = await searchSymbols(input);
            const result = searchResults.result;
            setBestMatches(result);
           }
        } catch (error) {
            setBestMatches([]);
            console.log(error);
        }
    };
    return <div className={`flex items-center my-4 border-2 rounded-md relative z-50 w-96 bg-white border-neutral-200 ${
        darkMode ? "bg-gray-900 border-gray-800" : "bg-white-neutral-200"
        }`}
        >
        <input type="text" value={input} className={`w-full px-4 py-2 focus:outline-none rounded-md ${
            darkMode ? "bg-gray-900" : null
        }`}
        placeholder="Search stock..."
        onChange={(event) => {
            setInput(event.target.value);
        }}
        onKeyDown={(event) => {
            if (event.key === "Enter") {
                updateBestMatches();
            }
        }}
        />

        {input && (
        <button onClick={clear} className={`h-8 w-8 m-1 p-2 ${darkMode ? "bg-gray-900 border-gray-800" : "bg-white-neutral-200"}`}>
            <img src="https://static.thenounproject.com/png/2222192-200.png"></img>
        </button>
        )}
        <button
        onClick={updateBestMatches}
        className="h-8 w-8 bg-indigo-600 rounded-md flex justify-center items-center m-1 p-2 transition duration-300 hover:ring-2 ring-indigo-400"
      >
        <img src="https://cdn-icons-png.flaticon.com/512/3917/3917754.png" className="h-4 w-4 fill-gray-100" />
      </button>
      
      {input && bestMatches.length > 0 ? (
      <SearchResults results={bestMatches} /> 
      ): null}
      {window.onclick = function(event) {
        if (!event.target.matches(document.getElementById("listDrop"))) {
            setInput("");
        setBestMatches([]);
        }
      }}
    </div>
    
};

export default Search;
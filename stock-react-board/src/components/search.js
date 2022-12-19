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
        <button onClick={clear} className="m-1">
            <img src="data:image/png;base64,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" className="h-4 w-4 fill-gray-500" />
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
      
    </div>
};

export default Search;
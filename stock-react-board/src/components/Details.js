import React, { useContext } from "react";
import Card from "../components/card";
import ThemeContext from "../context/ThemeContext";

const Details = ({ details }) => {
    const {darkMode} = useContext(ThemeContext);
  const detailsList = {
    name: "Name",
    country: "Country",
    currency: "Currency",
    exchange: "Exchange",
    ipo: "IPO Date",
    marketCapitalization: "Market Capitalization",
    finnhubIndustry: "Industry",
  };

  const convertMillionToBillion = (number) => {
    if (isNaN(number)) {
      return ""
    }
    return (number / 1000).toFixed(2) + "B";
  };

  return (
    <Card>
      <ul className={`w-full h-full flex-col justify-between divide-y-1 ${
        darkMode ? "divide-gray-800" : null
      }`}
      >
        {Object.keys(detailsList).map((item) => {
          return (
            <li key={item} className="flex-1 flex justify-between items-center">
              <span>{detailsList[item]}</span>
              <span className="font-bold">
                {item === "marketCapitalization" 
                  ? `${convertMillionToBillion(details[item])}`
                  : details[item]}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

export default Details;

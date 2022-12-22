import React from "react";
import Search from "../components/search";
import ThemeIcon from "../components/ThemeIcon";

const Header = ({ name }) => {
  return (
    <>
      <div className="flex w-full items-center">
        <h1 className="text-5xl min-w-1/2 w-1/2">{name}</h1>
        <Search />
      </div>
      <ThemeIcon />
    </>
  );
};

export default Header;
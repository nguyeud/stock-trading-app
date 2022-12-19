import React from "react";
import Search from "../components/search";
import ThemeIcon from "../components/ThemeIcon";

const Header = ({ name }) => {
  return (
    <>
      <div className="xl:px-32">
        <h1 className="text-5xl">{name}</h1>
        <Search />
      </div>
      <ThemeIcon />
    </>
  );
};

export default Header;
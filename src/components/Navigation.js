"use client";
import React from "react";
import Link from "next/link";

const Navigation = () => {
  return (
    <nav className="bg-black p-4 text-white  w-full">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="https://www.stealthwork.app" className="text-2xl font-bold">
          StealthWork
        </Link>
        {/* <button onClick={toggleMenu} className="md:hidden">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button> */}
        <div className="hidden md:flex space-x-8">
          {/* Desktop menu items */}
          <Link
            href="/"
            className="hover:text-gray-300 transition duration-300"
          >
            Home
          </Link>
          <Link
            href="/preview"
            className="hover:text-gray-300 transition duration-300"
          >
            Preview CSV
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

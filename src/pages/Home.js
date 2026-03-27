import React from 'react';
import Navbar from '../components/Navbar';
import BuildInPeace from '../components/BuildInPeace';

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex flex-col items-center justify-start flex-1 px-4 sm:px-10 text-center mt-10">
        <p className="mt-10 text-xl sm:text-2xl mb-4">
          Construisons la paix ensemble.
        </p>
        <BuildInPeace />
      </main>
    </div>
  );
};

export default Home;

"use client";

import { useState } from "react";

export default function DomainMarketplace() {
  const [activeTab, setActiveTab] = useState("browse");

  const tabs = [
    { id: "trading", label: "Trading", count: "25" },
    { id: "browse", label: "Browse Domains", count: "854K" },
    { id: "myspace", label: "My Space", count: "12" },
    { id: "chat", label: "Chat", count: "5" }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "trading":
        return (
          <div className="text-center py-20">
            <h3 className="text-white text-2xl font-bold mb-4">Trading Dashboard</h3>
            <p className="text-gray-400">Manage your domain trades and transactions</p>
          </div>
        );
      case "browse":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Domain Cards */}
            {[
              { name: "crypto.doma", price: "0.5 ETH", status: "Available" },
              { name: "nft.doma", price: "1.2 ETH", status: "Available" },
              { name: "defi.doma", price: "0.8 ETH", status: "Available" },
              { name: "web3.doma", price: "2.1 ETH", status: "Available" },
              { name: "dao.doma", price: "1.5 ETH", status: "Available" },
              { name: "metaverse.doma", price: "3.2 ETH", status: "Available" }
            ].map((domain, index) => (
              <div
                key={index}
                className="flex flex-col justify-between"
                style={{
                  width: '389.5px',
                  height: '189px',
                  borderRadius: '30px',
                  borderWidth: '1px',
                  paddingTop: '20px',
                  paddingRight: '16px',
                  paddingBottom: '20px',
                  paddingLeft: '16px',
                  gap: '20px',
                  background: '#121212',
                  border: '1px solid',
                  borderImageSource: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)'
                }}
              >
                <div className="flex-1">
                  <h3 
                    className="text-white mb-2"
                    style={{
                      fontFamily: 'var(--font-space-mono), monospace',
                      fontWeight: 700,
                      fontSize: '20px',
                      lineHeight: '100%',
                      letterSpacing: '0%'
                    }}
                  >
                    {domain.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-2">{domain.status}</p>
                  <p className="text-purple-400 font-bold">{domain.price}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button 
                    className="text-center"
                    style={{
                      width: '95px',
                      height: '40px',
                      borderRadius: '20px',
                      borderWidth: '1px',
                      paddingTop: '10px',
                      paddingRight: '16px',
                      paddingBottom: '10px',
                      paddingLeft: '16px',
                      gap: '8px',
                      border: '1px solid #FFFFFF',
                      background: 'transparent',
                      color: 'white'
                    }}
                  >
                    Offer
                  </button>
                  <button 
                    style={{
                      width: '95px',
                      height: '40px',
                      borderRadius: '20px',
                      paddingTop: '10px',
                      paddingRight: '16px',
                      paddingBottom: '10px',
                      paddingLeft: '16px',
                      gap: '8px',
                      background: '#773BAC'
                    }}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      case "myspace":
        return (
          <div className="text-center py-20">
            <h3 className="text-white text-2xl font-bold mb-4">My Space</h3>
            <p className="text-gray-400">View and manage your owned domains</p>
          </div>
        );
      case "chat":
        return (
          <div className="text-center py-20">
            <h3 className="text-white text-2xl font-bold mb-4">Chat</h3>
            <p className="text-gray-400">Connect with other domain enthusiasts</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="relative py-20 px-6 lg:px-12">
      {/* Background */}
      <div className="absolute inset-0 bg-black"></div>
      
      {/* Background dots */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url('/background_dots.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 
            className="text-white mb-6"
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontWeight: 700,
              fontSize: '38px',
              lineHeight: '100%',
              letterSpacing: '0px'
            }}
          >
            Simple Steps, Great Features
          </h2>
          <p 
            className="text-white max-w-2xl mx-auto"
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontWeight: 400,
              fontSize: '20px',
              lineHeight: '100%',
              letterSpacing: '0px'
            }}
          >
            This can only be just the beginning of what is possible
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex items-end justify-between">
            {/* Horizontal Stacked Tabs */}
            <div className="flex items-end">
              <button 
                className="flex items-center space-x-2 px-6 py-4 transition-colors rounded-t-lg relative z-30"
                style={{
                  backgroundColor: '#191919',
                  boxShadow: '-5px 0px 10px 0px #00000080 inset'
                }}
              >
                <span className="text-white font-medium">Trading</span>
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">25</span>
              </button>
              <button 
                className="flex items-center space-x-2 px-6 py-4 rounded-t-lg relative z-40 -ml-2"
                style={{
                  backgroundColor: '#191919',
                  boxShadow: '-5px 0px 10px 0px #00000080 inset',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.4)',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.4)'
                }}
              >
                <span className="text-white font-medium">Browse Domains</span>
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">854K</span>
              </button>
              <button 
                className="flex items-center space-x-2 px-6 py-4 transition-colors rounded-t-lg relative z-20 -ml-2"
                style={{
                  backgroundColor: '#191919',
                  boxShadow: '-5px 0px 10px 0px #00000080 inset'
                }}
              >
                <span className="text-white font-medium">My Space</span>
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">12</span>
              </button>
              <button 
                className="flex items-center space-x-2 px-6 py-4 transition-colors rounded-t-lg relative z-10 -ml-2"
                style={{
                  backgroundColor: '#191919',
                  boxShadow: '-5px 0px 10px 0px #00000080 inset'
                }}
              >
                <span className="text-white font-medium">Chat</span>
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">5</span>
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
          
        
        </div>

        {/* Content Container */}
        <div 
          className="flex flex-col"
          style={{
            width: '1268.5px',
            height: '909px',
            borderWidth: '1px',
            opacity: 1,
            paddingTop: '50px',
            paddingRight: '30px',
            paddingBottom: '50px',
            paddingLeft: '30px',
            gap: '40px',
            borderTopRightRadius: '20px',
            borderBottomRightRadius: '20px',
            borderBottomLeftRadius: '20px',
            backgroundColor: '#121212',
            border: '1px solid',
            borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(255, 255, 255, 0.2) 67.21%)',
            borderImageSlice: 1
          }}
        >
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-white font-medium">Filter By:</span>
              <select className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400">
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="taken">Taken</option>
              </select>
              <select className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400">
                <option value="all">All</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <button className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors">
                Apply Filter
              </button>
            </div>
          </div>

          {/* Domain Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => {
              // Color pattern: white/light gray, green, orange (repeating)
              const colors = ['text-gray-300', 'text-green-400', 'text-orange-400'];
              const domainColor = colors[i % 3];
              
              return (
                <div 
                  key={i} 
                  className="flex flex-col hover:scale-105 transition-transform"
                  style={{
                    width: '389.5px',
                    height: '189px',
                    borderRadius: '30px',
                    borderWidth: '1px',
                    opacity: 1,
                    paddingTop: '20px',
                    paddingRight: '16px',
                    paddingBottom: '20px',
                    paddingLeft: '16px',
                    gap: '20px',
                    backgroundColor: '#121212',
                    border: '1px solid',
                    borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)',
                    borderImageSlice: 1
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">T</span>
                      </div>
                      <div>
                        <h3 className={`${domainColor} font-bold text-lg`}>test.io</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-lg font-semibold">0.4 ETH</p>
                      <p className="text-gray-400 text-sm">$1,354.36645</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">Domain Insight:</span>
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">7 char</span>
                      </div>
                      <p className="text-gray-400 text-sm">Domain Owner: 0x...928</p>
                      <p className="text-gray-400 text-sm">Domain Expires: 10-09-2026</p>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <button 
                        className="text-white hover:opacity-90 transition-opacity font-medium"
                        style={{
                          width: '95px',
                          height: '40px',
                          borderRadius: '20px',
                          opacity: 1,
                          paddingTop: '10px',
                          paddingRight: '16px',
                          paddingBottom: '10px',
                          paddingLeft: '16px',
                          gap: '8px',
                          backgroundColor: '#773BAC'
                        }}
                      >
                        Buy
                      </button>
                      <button 
                        className="text-white hover:bg-white/10 transition-colors font-medium flex items-center justify-center"
                        style={{
                          width: '95px',
                          height: '40px',
                          borderRadius: '20px',
                          borderWidth: '1px',
                          opacity: 1,
                          paddingTop: '10px',
                          paddingRight: '16px',
                          paddingBottom: '10px',
                          paddingLeft: '16px',
                          gap: '8px',
                          border: '1px solid #FFFFFF',
                          backgroundColor: 'transparent'
                        }}
                      >
                        Offer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View More Button */}
          <div className="text-center">
            <button 
              className="bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              style={{
                fontFamily: 'var(--font-space-mono), monospace'
              }}
            >
              View more
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Hero() {
  return (
    <div className="min-h-screen   relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute bg-[#000000] inset-0 b"></div>
      
      {/* Background dots - on top */}
      <div 
        className="absolute inset-0 opacity-70 z-10"
        style={{
          backgroundImage: "url('/background_dots.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between p-6 lg:px-12 lg:py-8">
        {/* Logo Section */}
        <div className="flex items-center">
          <div className="bg-white rounded-lg px-4 py-3 shadow-lg">
            <img 
              src="/logo.svg" 
              alt="Domain Space Logo" 
              className="h-10 w-auto"
            />
          </div>
        </div>
        
        {/* Navigation Section */}
        <nav className="hidden lg:flex items-center space-x-8">
          <button className="flex items-center space-x-2 text-white hover:text-purple-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 10c0-4.42-3.58-8-8-8s-8 3.58-8 8c0 1.57.46 3.03 1.24 4.26L10 18l6.76-3.74C17.54 13.03 18 11.57 18 10zM10 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <span className="font-medium">Messages</span>
          </button>
          <button className="flex items-center space-x-2 text-white hover:text-purple-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
            <span className="font-medium">Analytics</span>
          </button>
        </nav>
        
        {/* Right Section - Search & Wallet */}
        <div className="flex items-center space-x-4">
          {/* Search Button */}
          <button className="flex items-center space-x-2 text-white hover:text-purple-300 transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <span className="hidden md:inline font-medium">Search</span>
          </button>
          
          {/* Wallet Address */}
          <div className="glass rounded-lg px-4 py-2 border border-white/20">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-mono">0xCcad...F42b</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-purple-300 text-sm font-medium">Sepolia</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-20 flex items-center min-h-[calc(100vh-80px)] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full max-w-7xl mx-auto">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Purple glow behind headline */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow"></div>
            
            <div className="space-y-6">
              <h1 
                className="text-white"
                style={{
                  fontFamily: 'var(--font-bitter), serif',
                  fontWeight: 800,
                  fontSize: '72px',
                  lineHeight: '92px',
                  letterSpacing: '0%'
                }}
              >
                Grab your space
                <br />
                On-chain with
                <br />
                <span className="gradient-text">DOMA</span>
              </h1>
              
              <p 
                className=" text-white"
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontWeight: 400,
                  fontSize: '22px',
                  lineHeight: '100%',
                  letterSpacing: '0%'
                }}
              >
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cursus imperdiet sed idt.
              </p>
              
              <button 
                className="bg-white hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                style={{
                  width: '215px',
                  height: '66px',
                  borderRadius: '40px',
                  opacity: 1,
                  paddingTop: '24px',
                  paddingRight: '40px',
                  paddingBottom: '24px',
                  paddingLeft: '40px',
                  gap: '10px',
                  backgroundColor: 'white'
                }}
              >
                <span 
                  style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontWeight: 400,
                    fontSize: '20px',
                    lineHeight: '18px',
                    letterSpacing: '0%',
                    color: '#000000'
                  }}
                >
                  Get started
                </span>
              </button>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute bottom-20 left-0 w-4 h-4 bg-blue-400 rounded-full animate-float"></div>
            <div className="absolute top-40 -left-8 w-3 h-3 bg-pink-400 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
          </div>

          {/* Right Visual Area */}
          <div className="relative">
            {/* Hero Image */}
            <div className="relative w-full h-96 lg:h-[500px] flex items-center justify-center">
              <img 
                src="/hero_image.svg" 
                alt="Domain Space Hero Visual" 
                className="w-full h-full object-contain absolute inset-0 z-0"
              />
              
              {/* Statistics overlay */}
              <div className="absolute top-8 right-8 text-right">
                <div className="text-3xl font-bold text-white">$25B+</div>
                <div className="text-sm text-gray-300">Worth of Domain Sold</div>
              </div>
              
              <div className="absolute bottom-8 left-8 text-left">
                <div className="text-3xl font-bold text-white">986K+</div>
                <div className="text-sm text-gray-300">Domains Created</div>
              </div>
            </div>
            
            {/* Decorative stars outside */}
            <div className="absolute -bottom-8 -right-8 w-6 h-6 bg-yellow-400 rounded-full animate-twinkle"></div>
            <div className="absolute -top-8 -right-8 w-4 h-4 bg-yellow-300 rounded-full animate-twinkle" style={{animationDelay: '1s'}}></div>
          </div>
        </div>
      </main>
    </div>
  );
}

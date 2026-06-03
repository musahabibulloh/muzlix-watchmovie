import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Play, Star, Plus, TrendingUp, Menu, Film, MonitorPlay, ChevronLeft, Heart, MessageSquare, Code, Download, Lock } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8081';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isPlayingOverlay, setIsPlayingOverlay] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // New states for the UI
  const [genres, setGenres] = useState([]);
  const [activeTab, setActiveTab] = useState('popular');
  const [activeGenre, setActiveGenre] = useState('');

  useEffect(() => {
    const handleContextMenu = (e: any) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    let isMounted = true;
    const fetchInitialData = async () => {
      setLoading(true);
      let retries = 6;
      while (retries > 0 && isMounted) {
        try {
          await axios.get(`${API_BASE_URL}/genres`);
          if (isMounted) {
            fetchGenres();
            fetchMovies(1);
          }
          break;
        } catch (err) {
          retries--;
          if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
          } else if (isMounted) {
            setLoading(false);
          }
        }
      }
    };

    fetchInitialData();

    return () => { isMounted = false; };
  }, [isUnlocked]);

  const fetchGenres = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/genres`);
      const data = response.data || [];
      if (data.length > 0) {
        setGenres(data.map((g: any) => g.name));
        setActiveGenre(data[0].name);
      }
    } catch (err) {
      console.error("Error fetching genres:", err);
    }
  };

  const fetchMovies = async (pageNum = 1, genre = activeGenre) => {
    try {
      setLoading(true);
      
      let url = `${API_BASE_URL}/popular/movies?page=${pageNum}`;
      if (genre && genre !== 'All' && genre !== '') {
        url = `${API_BASE_URL}/genres/${genre.toLowerCase()}?page=${pageNum}`;
      }
      
      const response = await axios.get(url);
      const data = response.data.data || response.data || [];
      const newMovies = Array.isArray(data) ? data : [];
      
      if (newMovies.length === 0) {
        setHasMore(false);
        if (pageNum === 1) setMovies([]);
      } else {
        setHasMore(true);
        setMovies(newMovies); // Replace current movies instead of appending
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e, pageNum = 1) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchMovies(1);
      return;
    }
    
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      // Bypass backend for search to avoid Cloudflare blocks, fetch directly via Electron hidden window
      let rawData = [];
      const electron = (window as any).require ? (window as any).require('electron') : null;
      if (electron && electron.ipcRenderer) {
        const response = await electron.ipcRenderer.invoke('search-movies', searchQuery, pageNum);
        rawData = response.data || [];
      } else {
        const response = await axios.get(`https://gudangvape.com/search.php?s=${encodeURIComponent(searchQuery)}&page=${pageNum}`);
        rawData = response.data.data || [];
      }
      
      const newMovies = Array.isArray(rawData) ? rawData.map((item: any) => ({
        _id: item.slug || '',
        title: item.title || '',
        type: item.type === 'series' ? 'series' : 'movie',
        posterImg: item.poster ? `https://poster.showcdnx.com/wp-content/uploads/${item.poster}` : ''
      })) : [];
      
      if (newMovies.length === 0) {
        setHasMore(false);
        if (pageNum === 1) setMovies([]);
      } else {
        setHasMore(true);
        setMovies(newMovies); // Replace movies for pagination
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error searching movies:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage < 1) return;
    if (searchQuery.trim()) {
      handleSearch(null, newPage);
    } else {
      fetchMovies(newPage);
    }
  };

  const handleMovieClick = async (movieId, type = 'movie') => {
    try {
      setSelectedMovie(movieId);
      setIsPlayingOverlay(false);
      setSelectedServerIndex(0);
      setSelectedSeason(1);
      setSelectedEpisode(1);
      setDetailsLoading(true);
      let endpointPrefix = type === 'series' ? 'series' : 'movies';
      let details = null;

      try {
        const response = await axios.get(`${API_BASE_URL}/${endpointPrefix}/${movieId}`);
        details = response.data.data || response.data;
      } catch (err) {
        // Fallback: if we guessed 'movies' but it's actually a 'series' (or vice versa), try the other endpoint
        endpointPrefix = endpointPrefix === 'movies' ? 'series' : 'movies';
        const fallbackResponse = await axios.get(`${API_BASE_URL}/${endpointPrefix}/${movieId}`);
        details = fallbackResponse.data.data || fallbackResponse.data;
      }

      if (!details) throw new Error("Details not found");
      
      try {
        const streamResponse = await axios.get(`${API_BASE_URL}/${endpointPrefix}/${movieId}/streams`);
        const streams = streamResponse.data.data || streamResponse.data || [];
        details.movieUrls = streams.map((s: any) => s.url).filter(Boolean);
      } catch (err) {
        console.error("Error fetching streams:", err);
        details.movieUrls = [];
      }

      setMovieDetails(details);
    } catch (error) {
      console.error("Error fetching movie details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchSeriesStreams = async (season, episode) => {
    try {
      setIsPlayingOverlay(false);
      const streamResponse = await axios.get(`${API_BASE_URL}/series/${selectedMovie}/streams?season=${season}&episode=${episode}`);
      const streams = streamResponse.data.data || streamResponse.data || [];
      const newUrls = streams.map((s: any) => s.url).filter(Boolean);
      setMovieDetails(prev => ({...prev, movieUrls: newUrls}));
      setSelectedServerIndex(0);
      setIsPlayingOverlay(true);
    } catch (err) {
      console.error("Error fetching series streams:", err);
    }
  };

  const goBack = () => {
    setSelectedMovie(null);
    setMovieDetails(null);
    setSelectedServerIndex(0);
    setSelectedSeason(1);
    setSelectedEpisode(1);
  };

  const handleUnlock = (e: any) => {
    e.preventDefault();
    if (passwordInput === 'musaganteng123') {
      setIsUnlocked(true);
    } else {
      setPasswordError(true);
    }
  };

  const featuredMovie = movies.length > 0 ? movies[0] : null;

  if (!isUnlocked) {
    return (
      <div className="min-h-screen w-full bg-[#000000] text-gray-100 flex flex-col relative overflow-hidden font-sans items-center justify-center p-6">
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-[#000000] to-[#0a0000]"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-lg bg-[#121212] p-8 md:p-12 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-gray-800 flex flex-col items-center text-center">
           <div className="bg-[#e50914] p-4 rounded-full shadow-[0_10px_20px_rgba(229,9,20,0.3)] mb-6">
              <Lock size={32} className="text-white" />
           </div>
           
           <h1 className="text-2xl font-black mb-4 tracking-wider uppercase text-white">Security Lock</h1>
           
           <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-10">
              Aplikasi dekstop untuk menonton movie bersubtitle indonesia ini dibuat untuk pembelajaran developer <strong className="text-white">Musa Habibulloh Al Faruq</strong>, tolong jangan menyebar luaskan aplikasi ini selain kepentingan tester dan survey dari developer.
           </p>

           <form onSubmit={handleUnlock} className="w-full flex flex-col gap-5">
              <div>
                 <input 
                   type="password" 
                   value={passwordInput}
                   onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                   placeholder="Masukkan sandi khusus..."
                   className={`w-full bg-[#0a0a0a] border ${passwordError ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-[#e50914]'} text-white px-6 py-4 rounded-xl text-sm focus:outline-none transition-colors text-center font-medium tracking-widest`}
                 />
                 {passwordError && <p className="text-red-500 text-xs mt-3 font-semibold">Sandi salah, silakan coba lagi.</p>}
              </div>
              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-[#e50914] to-[#ff5b73] text-white font-bold tracking-widest uppercase py-4 rounded-xl shadow-[0_10px_20px_rgba(229,9,20,0.3)] hover:scale-[1.02] transition-transform"
              >
                Masuk
              </button>
           </form>
        </div>
      </div>
    );
  }

  if (selectedMovie) {
    return (
      <div className="min-h-screen w-full bg-[#000000] text-gray-100 flex flex-col relative overflow-hidden font-sans">
        
        {/* Cinematic Blurred Poster Background */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
          {movieDetails && (
            <img 
              src={movieDetails.posterImg || movieDetails.poster || 'https://via.placeholder.com/1200x800'} 
              className="w-full h-full object-cover blur-[100px] scale-110 opacity-70 mix-blend-screen"
              alt="Backdrop"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-[#000000]/30"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-transparent to-[#000000]"></div>
        </div>

        {/* Top Search Bar (Floating) */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 text-gray-300 border-b border-gray-700 pb-2 px-6">
            <Search size={18} className="text-gray-400" />
            <span className="text-sm tracking-[0.2em] font-medium uppercase">Search...</span>
          </div>
        </div>
        
        {/* Vertical watermark text */}
        <div className="hidden lg:block absolute left-12 top-1/2 -translate-y-1/2 -rotate-90 text-gray-700 tracking-[0.3em] text-xs font-bold z-20 origin-center whitespace-nowrap">
          by MUZLIX
        </div>

        <div className="relative z-10 p-6 md:p-12 lg:p-16 flex-1 flex flex-col items-center justify-center max-w-[1400px] mx-auto w-full min-h-screen">
          <button 
            onClick={goBack}
            className="absolute top-8 left-8 text-white/80 hover:text-white transition-colors font-bold flex items-center gap-2 text-sm uppercase tracking-wider group bg-black/10 px-5 py-2.5 rounded-full border border-white/20 hover:bg-black/20 backdrop-blur-md z-30"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back
          </button>

          {detailsLoading ? (
            <div className="flex-1 flex justify-center items-center h-full">
              <div className="w-12 h-12 border-4 border-white/80 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : movieDetails ? (
            <div className="w-full flex flex-col items-center max-w-5xl">
              
              {/* Minimalist Info Above Player */}
              <div className="text-center mb-10 w-full mt-16 md:mt-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-3 text-white drop-shadow-lg tracking-tight">
                  {movieDetails.title}
                </h1>
                <p className="text-white/90 font-medium text-sm md:text-base tracking-wide drop-shadow-md">
                  {movieDetails.year || '2026'} • {movieDetails.rating || 'N/A'} • {(movieDetails.genres || []).join(', ')}
                </p>
              </div>

              {/* Dribbble Style Player Card (Dark Mode) */}
              <div className="relative w-full max-w-4xl mx-auto mt-4 mb-20">
                
                {/* Floating Top Accent Box */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-4/5 max-w-md h-12 bg-[#1a1a1a] rounded-t-3xl opacity-90 blur-[1px] -z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] border-t border-gray-800"></div>

                {/* Main Dark Container */}
                <div className="bg-[#121212] rounded-[2.5rem] p-3 pb-16 shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative z-10 transition-transform duration-500 hover:scale-[1.01] border border-gray-800/60">
                  
                  {/* Video Screen Container */}
                  <div className="bg-[#000000] w-full aspect-video rounded-[2rem] overflow-hidden relative shadow-inner border border-gray-900">
                    {isPlayingOverlay && movieDetails.movieUrls && movieDetails.movieUrls.length > 0 ? (
                      <iframe 
                        src={movieDetails.movieUrls[selectedServerIndex]} 
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black">
                        <img 
                          src={movieDetails.posterImg || movieDetails.poster} 
                          className="w-full h-full object-cover opacity-40 blur-[2px] scale-105" 
                          alt="Poster Background"
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar Icons */}
                  <div className="absolute bottom-5 left-0 right-0 px-10 flex justify-between items-center text-gray-500">
                     <div className="flex gap-8">
                       <Heart size={22} className="hover:text-red-500 cursor-pointer transition-colors" />
                       <MessageSquare size={22} className="hover:text-blue-500 cursor-pointer transition-colors" />
                     </div>
                     <div className="flex gap-8">
                       <Code size={22} className="hover:text-white cursor-pointer transition-colors" />
                       <Download size={22} className="hover:text-white cursor-pointer transition-colors" />
                     </div>
                  </div>
                </div>

                {/* Center Play Button Overlay (Red/Pink Gradient) */}
                {!isPlayingOverlay && (
                  <div 
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center cursor-pointer group" 
                    onClick={() => setIsPlayingOverlay(true)}
                  >
                    {/* Dark cutout effect border */}
                    <div className="bg-[#0a0a0a] p-3.5 rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.8)] transform transition-transform duration-300 group-hover:scale-110">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#ff5b73] to-[#e50914] rounded-full flex items-center justify-center shadow-[0_10px_20px_rgba(229,9,20,0.3)]">
                         <Play fill="white" size={32} className="text-white ml-2 drop-shadow-md" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Server Selection */}
              {movieDetails.movieUrls && movieDetails.movieUrls.length > 1 && (
                <div className="w-full max-w-3xl mx-auto flex flex-col items-center mt-6 mb-8 relative z-20">
                  <h3 className="text-sm font-bold text-gray-500 mb-4 tracking-[0.2em] uppercase">Pilih Server Streaming</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {movieDetails.movieUrls.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedServerIndex(index)}
                        className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                          selectedServerIndex === index 
                            ? 'bg-[#e50914] text-white shadow-[0_4px_15px_rgba(229,9,20,0.4)] border border-[#e50914]' 
                            : 'bg-gray-900/60 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800/80'
                        }`}
                      >
                        Server {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Series Season/Episode Selection */}
              {movieDetails.type === 'series' && movieDetails.seasons && movieDetails.seasons.length > 0 && (
                <div className="w-full max-w-4xl mx-auto flex flex-col items-center mt-2 mb-8 relative z-20 bg-[#121212] p-6 rounded-[2rem] border border-gray-800/60 shadow-xl">
                  <h3 className="text-sm font-bold text-gray-400 mb-4 tracking-[0.2em] uppercase">Pilih Episode</h3>
                  <div className="flex flex-col md:flex-row gap-6 w-full items-start">
                    <select 
                      className="bg-[#1a1a1a] text-white border border-gray-700 px-4 py-3 rounded-xl focus:outline-none focus:border-[#e50914] min-w-[150px] font-semibold"
                      value={selectedSeason}
                      onChange={(e) => {
                        const newS = Number(e.target.value);
                        setSelectedSeason(newS);
                        setSelectedEpisode(1);
                        fetchSeriesStreams(newS, 1);
                      }}
                    >
                      {movieDetails.seasons.map(s => (
                        <option key={s.season} value={s.season}>Season {s.season}</option>
                      ))}
                    </select>
                    
                    <div className="flex flex-wrap gap-2 flex-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {Array.from({ length: (movieDetails.seasons.find(s => s.season === selectedSeason)?.totalEpisodes || 1) }).map((_, i) => (
                        <button
                          key={i+1}
                          onClick={() => {
                            setSelectedEpisode(i+1);
                            fetchSeriesStreams(selectedSeason, i+1);
                          }}
                          className={`w-12 h-12 rounded-xl font-bold flex items-center justify-center transition-all ${
                            selectedEpisode === i+1 
                              ? 'bg-[#e50914] text-white shadow-lg shadow-red-900/30' 
                              : 'bg-[#1a1a1a] text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-800'
                          }`}
                        >
                          {i+1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Movie Synopsis */}
              {movieDetails.synopsis && (
                <div className="w-full max-w-3xl mx-auto text-center mt-4 mb-24 px-4 relative z-20">
                  <h3 className="text-sm font-bold text-gray-500 mb-4 tracking-[0.2em] uppercase">Synopsis</h3>
                  <p className="text-gray-300 leading-relaxed text-base md:text-lg drop-shadow-md font-medium">
                    {movieDetails.synopsis}
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-4">
              <Film size={64} className="opacity-20" />
              <p className="text-2xl font-bold tracking-tight">Movie details not found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#000000] text-[#ffffff] flex flex-col font-sans selection:bg-[#e50914] selection:text-white">
      
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6 md:px-12 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex items-center gap-12">
          <h1 className="text-[#e50914] text-3xl md:text-4xl font-black tracking-tighter uppercase cursor-pointer">
            MUZLIX
          </h1>
          <nav className="hidden lg:flex gap-8 text-gray-300 font-semibold text-sm">
            <a href="#" className="text-white transition-colors">Home</a>
            <a href="#" className="hover:text-white transition-colors">Profil</a>
            <a href="#" className="hover:text-white transition-colors">Drama</a>
            <a href="#" className="hover:text-white transition-colors">Movie</a>
            <a href="#" className="hover:text-white transition-colors">Help</a>
          </nav>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <form onSubmit={handleSearch} className="relative group hidden sm:block">
             <Search size={18} className="text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
             <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-[#141414]/80 border border-gray-700 text-white pl-12 pr-4 py-2 rounded-full text-sm focus:outline-none focus:border-[#e50914] focus:bg-[#141414] transition-all w-48 focus:w-64 backdrop-blur-md"
             />
          </form>
          <button className="text-white hover:text-gray-300 transition-colors">
            <Menu size={32} />
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="relative w-full h-[70vh] md:h-[85vh] bg-[#141414]">
        {loading && !featuredMovie ? (
           <div className="w-full h-full flex items-center justify-center">
             <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : featuredMovie ? (
          <>
            <div className="absolute inset-0 w-full h-full">
              <img src={featuredMovie.posterImg} className="w-full h-full object-cover opacity-70" alt="Hero Backdrop" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/70 to-transparent"></div>
            </div>
            
            <div className="absolute bottom-[15%] md:bottom-[20%] left-6 md:left-12 lg:left-24 max-w-3xl z-10">
              <p className="text-gray-300 font-bold flex items-center gap-2 mb-3 text-xs md:text-sm tracking-widest uppercase">
                <span className="text-yellow-500 flex items-center gap-1"><Star size={14} fill="currentColor"/> {featuredMovie.rating || '9.1'}</span> 
                <span>|</span> {featuredMovie.year || '2026'} <span>|</span> Exciting Story <span>|</span> 2 Season
              </p>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tighter uppercase drop-shadow-2xl line-clamp-2 leading-none">
                {featuredMovie.title}
              </h1>
              <p className="text-gray-300 mb-10 text-sm md:text-lg line-clamp-3 max-w-xl font-medium drop-shadow-md">
                Series adapted from the webcomic entitled Out of the World by writer Jo Geum-san. Experience the thrilling adventure and intense drama that will keep you on the edge of your seat.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => handleMovieClick(featuredMovie._id, featuredMovie.type)} 
                  className="bg-[#e50914] hover:bg-[#f40612] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/30"
                >
                  <Play fill="currentColor" size={20} /> WATCH
                </button>
                <button className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all backdrop-blur-md">
                  <Plus size={20} /> ADD LIST
                </button>
              </div>
            </div>
            
            {/* Carousel Indicators Dummy */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
               <div className="w-8 h-1 bg-white/30 rounded-full"></div>
               <div className="w-8 h-1 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
               <div className="w-8 h-1 bg-white/30 rounded-full"></div>
            </div>
          </>
        ) : null}
      </div>

      {/* TRENDS NOW SECTION */}
      <main className="flex-1 px-6 md:px-12 lg:px-24 py-8 relative z-20 -mt-10 md:-mt-20">
        
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-white" size={28} />
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Trends Now</h2>
          </div>
          <div className="flex gap-6 text-sm font-semibold text-gray-500">
            <button 
               onClick={() => setActiveTab('popular')}
               className={`flex items-center gap-2 transition-colors ${activeTab === 'popular' ? 'text-white' : 'hover:text-gray-300'}`}
            >
               {activeTab === 'popular' ? <div className="w-2 h-2 rounded-full bg-[#e50914]"></div> : <TrendingUp size={16} />} 
               Popular
            </button>
            <button 
               onClick={() => setActiveTab('premium')}
               className={`flex items-center gap-2 transition-colors ${activeTab === 'premium' ? 'text-white' : 'hover:text-gray-300'}`}
            >
               <Star size={16} className={activeTab === 'premium' ? 'text-[#e50914]' : ''} /> Premium
            </button>
            <button 
               onClick={() => setActiveTab('recent')}
               className={`flex items-center gap-2 transition-colors ${activeTab === 'recent' ? 'text-white' : 'hover:text-gray-300'}`}
            >
               <Plus size={16} className={activeTab === 'recent' ? 'text-[#e50914]' : ''} /> Recently Added
            </button>
          </div>
        </div>
        
        {/* Genre Pills */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
          <button 
            onClick={() => { setActiveGenre(''); setSearchQuery(''); fetchMovies(1, ''); }}
            className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-all duration-300 ${
              activeGenre === '' 
              ? 'bg-[#e50914] text-white shadow-lg shadow-red-900/40' 
              : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All
          </button>
          {genres.map((genre) => (
            <button 
              key={genre} 
              onClick={() => { setActiveGenre(genre); setSearchQuery(''); fetchMovies(1, genre); }}
              className={`px-6 py-2 rounded-full whitespace-nowrap font-bold text-sm transition-all duration-300 ${
                activeGenre === genre 
                ? 'bg-[#e50914] text-white shadow-lg shadow-red-900/40' 
                : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {loading ? (
           <div className="flex justify-center items-center h-64">
             <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 md:gap-x-6 gap-y-10">
              {movies.map((movie, index) => {
                 // For the UI match, let's assign dummy ratings if missing to match the screenshot
                 const dummyRating = (7.0 + (index % 3)).toFixed(1);
                 const rating = movie.rating && movie.rating !== "N/A" ? movie.rating : dummyRating;
                 
                 return (
                  <div 
                    key={movie._id || movie.id || index} 
                    onClick={() => handleMovieClick(movie._id || movie.id, movie.type)}
                    className="group flex flex-col cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#141414] rounded-xl mb-4 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(229,9,20,0.3)]">
                      <img 
                        src={movie.posterImg || movie.poster || 'https://via.placeholder.com/300x450'} 
                        alt={movie.title} 
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-[#e50914] p-4 rounded-full transform scale-50 group-hover:scale-100 transition-transform duration-300">
                           <Play fill="currentColor" size={24} className="text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="px-1 flex flex-col">
                      <h3 className="font-bold text-base text-white line-clamp-1 mb-1">
                        {movie.title}
                      </h3>
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
                        <span>{movie.year || '2026'}</span>
                        <div className="flex items-center gap-1">
                           <Star size={12} fill="currentColor" className="text-[#e50914]" /> 
                           <span className="text-yellow-500">{rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                 )
              })}
            </div>
            
            <div className="flex justify-center items-center mt-12 mb-8 gap-4">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1 || loading}
                className="px-6 py-2 border-2 border-gray-800 hover:border-gray-500 hover:bg-gray-800/50 text-white rounded-full font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Page</span>
                <span className="text-white font-bold text-lg">{page}</span>
              </div>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={!hasMore || loading}
                className="px-6 py-2 border-2 border-[#e50914] hover:bg-[#e50914] text-white rounded-full font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
            <Film size={64} className="opacity-20" />
            <p className="text-xl font-medium">No movies found.</p>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-900 bg-[#0a0a0a] pt-12 pb-8 px-6 md:px-12 lg:px-24">
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 text-sm text-gray-400 mb-12">
            <div className="flex flex-col gap-2">
               <h4 className="text-white font-bold mb-2">Resource</h4>
               <a href="#" className="hover:text-white transition-colors">About Blockbuster</a>
               <a href="#" className="hover:text-white transition-colors">Contact Us, Forums</a>
               <a href="#" className="hover:text-white transition-colors">ON Movie Indonesia</a>
               <a href="#" className="hover:text-white transition-colors">Blog, Help Center</a>
            </div>
            <div className="flex flex-col gap-2">
               <h4 className="text-white font-bold mb-2">Legal</h4>
               <a href="#" className="hover:text-white transition-colors">Terms Of Use</a>
               <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
               <a href="#" className="hover:text-white transition-colors">Security</a>
            </div>
            <div className="flex flex-col gap-2">
               <h4 className="text-white font-bold mb-2">Account</h4>
               <a href="#" className="hover:text-white transition-colors">My Account</a>
               <a href="#" className="hover:text-white transition-colors">Watchlist</a>
               <a href="#" className="hover:text-white transition-colors">Collections</a>
               <a href="#" className="hover:text-white transition-colors">User Guide</a>
            </div>
            <div className="flex flex-col gap-2 col-span-2 md:col-span-1 lg:col-span-2">
               <h4 className="text-white font-bold mb-2">NewsLetter</h4>
               <p className="text-gray-500 text-xs mb-4">Subscribe to our newsletter system now to get latest news from us.</p>
               <div className="flex">
                  <input type="text" placeholder="Email Address" className="bg-[#141414] border border-gray-800 rounded-l-md px-4 py-2 w-full text-white focus:outline-none focus:border-[#e50914]" />
                  <button className="bg-[#e50914] text-white px-4 py-2 rounded-r-md font-bold text-xs uppercase tracking-wider">Subscribe</button>
               </div>
            </div>
         </div>
         <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 border-t border-gray-900 pt-8">
            <p>IDN Netflix Indonesia - Call us (+62) 823 4567 8910</p>
            <p>©2026 NontonDesktop. All Right Reserved.</p>
         </div>
      </footer>

    </div>
  );
}
